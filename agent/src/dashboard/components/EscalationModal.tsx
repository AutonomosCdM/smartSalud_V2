import { useState, useEffect } from 'react'
import { X, Phone, Calendar, XCircle, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react'

const AGENT_API = import.meta.env.VITE_AGENT_API || 'http://localhost:8787'

interface Conversation {
  id: string
  direction: string
  message_body: string
  intent: string | null
  confidence: number | null
  timestamp: number
}

interface EscalationModalProps {
  appointmentId: string | null
  patientName: string
  onClose: () => void
}

type ErrorState = {
  message: string
  type: 'error' | 'success'
} | null

// Sanitize input to prevent XSS
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 500) // Max 500 characters
}

export function EscalationModal({ appointmentId, patientName, onClose }: EscalationModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<ErrorState>(null)

  useEffect(() => {
    if (appointmentId) {
      fetchConversations()
    }
  }, [appointmentId])

  const fetchConversations = async () => {
    if (!appointmentId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${AGENT_API}/api/appointments/${appointmentId}/conversations`)

      if (!response.ok) {
        const status = response.status
        if (status === 404) throw new Error('Cita no encontrada')
        if (status === 500) throw new Error('Error del servidor. Intente nuevamente.')
        throw new Error(`Error al cargar conversaciones (${status})`)
      }

      const data = await response.json()
      setConversations(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar conversaciones'
      console.error('[EscalationModal] Error fetching conversations:', {
        appointmentId,
        error: errorMessage,
        timestamp: new Date().toISOString()
      })
      setError({ message: errorMessage, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (action: 'call' | 'offer_slot' | 'not_interested') => {
    if (!appointmentId) return

    // Sanitize notes before sending
    const sanitizedNotes = notes ? sanitizeInput(notes) : ''

    try {
      setResolving(true)
      setError(null)

      const response = await fetch(`${AGENT_API}/api/appointments/${appointmentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: sanitizedNotes })
      })

      if (!response.ok) {
        const status = response.status
        if (status === 404) throw new Error('Cita no encontrada')
        if (status === 400) throw new Error('Datos inválidos')
        if (status === 500) throw new Error('Error del servidor. Intente nuevamente.')
        throw new Error(`Error al resolver (${status})`)
      }

      const actionLabels = {
        call: 'Llamar Paciente',
        offer_slot: 'Ofrecer Slot',
        not_interested: 'No Interesado'
      }

      console.log('[EscalationModal] Resolution successful:', {
        appointmentId,
        action,
        timestamp: new Date().toISOString()
      })

      setError({
        message: `Resolución registrada: ${actionLabels[action]}`,
        type: 'success'
      })

      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al resolver'
      console.error('[EscalationModal] Error resolving:', {
        appointmentId,
        action,
        error: errorMessage,
        timestamp: new Date().toISOString()
      })
      setError({ message: errorMessage, type: 'error' })
    } finally {
      setResolving(false)
    }
  }

  if (!appointmentId) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Intervención Manual Requerida</h2>
            <p className="text-sm text-gray-600 mt-1">Paciente: {patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Error/Success Alert */}
        {error && (
          <div
            className={`mx-6 mt-4 p-4 rounded-lg flex items-center gap-3 ${
              error.type === 'error'
                ? 'bg-red-50 border-l-4 border-red-500'
                : 'bg-green-50 border-l-4 border-green-500'
            }`}
          >
            {error.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${error.type === 'error' ? 'text-red-900' : 'text-green-900'}`}>
              {error.message}
            </p>
          </div>
        )}

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Historial de Conversación
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-600">Cargando conversaciones...</p>
            </div>
          ) : conversations.length > 0 ? (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-4 rounded-lg ${
                    conv.direction === 'outbound' || conv.direction === 'system'
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'bg-green-50 border-l-4 border-green-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {conv.direction === 'outbound' ? '🤖 Bot' : conv.direction === 'system' ? '⚙️ Sistema' : '👤 Paciente'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(conv.timestamp * 1000).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900">{conv.message_body}</p>
                  {conv.intent && (
                    <div className="mt-2 text-xs text-gray-600">
                      Intent: {conv.intent} ({Math.round((conv.confidence || 0) * 100)}% confianza)
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No hay conversaciones registradas</p>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Agregar notas sobre la intervención..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleResolve('call')}
              disabled={resolving}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <Phone className="h-5 w-5" />
              <span>Llamar Paciente</span>
            </button>

            <button
              onClick={() => handleResolve('offer_slot')}
              disabled={resolving}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <Calendar className="h-5 w-5" />
              <span>Ofrecer Slot</span>
            </button>

            <button
              onClick={() => handleResolve('not_interested')}
              disabled={resolving}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              <XCircle className="h-5 w-5" />
              <span>No Interesado</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
