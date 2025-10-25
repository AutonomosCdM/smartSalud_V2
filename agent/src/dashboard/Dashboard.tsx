import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const AGENT_API = import.meta.env.VITE_AGENT_API || 'http://localhost:8787'

interface Appointment {
  id: string
  patient_name: string
  patient_phone: string
  doctor_name: string
  specialty: string
  appointment_date: string
  status: string
  workflow_status: string
  current_step: string
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className}`}>{children}</div>
)

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pb-4">{children}</div>
)

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-lg font-semibold">{children}</h3>
)

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
)

export function Dashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stats calculadas de las citas
  const stats = {
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === 'CONFIRMED').length,
    pending: appointments.filter(a => a.current_step === 'SEND_INITIAL_REMINDER').length,
    voice_active: appointments.filter(a => a.status === 'VOICE_CALL_ACTIVE').length,
    needs_human: appointments.filter(a => a.status === 'NEEDS_HUMAN_INTERVENTION').length,
  }

  useEffect(() => {
    fetchAppointments()
    const interval = setInterval(fetchAppointments, 10000) // Refresh cada 10s
    return () => clearInterval(interval)
  }, [])

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${AGENT_API}/api/appointments?hours=48`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setAppointments(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const translateStatus = (status: string) => {
    const translations: Record<string, string> = {
      'CONFIRMED': 'Confirmada',
      'PENDING_CONFIRMATION': 'Pendiente',
      'VOICE_CALL_ACTIVE': 'Llamada Activa',
      'NEEDS_HUMAN_INTERVENTION': 'Requiere Intervención',
      'CANCELLED': 'Cancelada',
    }
    return translations[status] || status
  }

  const getStatusColor = (status: string) => {
    if (status === 'CONFIRMED') return 'bg-green-100 text-green-800'
    if (status === 'NEEDS_HUMAN_INTERVENTION') return 'bg-red-100 text-red-800'
    if (status === 'VOICE_CALL_ACTIVE') return 'bg-orange-100 text-orange-800'
    if (status === 'PENDING_CONFIRMATION') return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const statsConfig = [
    {
      name: 'Total Citas',
      value: stats.total,
      icon: Calendar,
      color: 'from-blue-400 to-blue-500',
    },
    {
      name: 'Confirmadas',
      value: stats.confirmed,
      icon: CheckCircle,
      color: 'from-green-400 to-green-500',
    },
    {
      name: 'Pendientes',
      value: stats.pending,
      icon: Clock,
      color: 'from-amber-400 to-amber-500',
    },
    {
      name: 'Llamada Activa',
      value: stats.voice_active,
      icon: Calendar,
      color: 'from-orange-400 to-orange-500',
    },
    {
      name: 'Requiere Atención',
      value: stats.needs_human,
      icon: AlertCircle,
      color: 'from-red-400 to-red-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
              <p className="text-gray-600">
                Monitoreo en tiempo real - Próximas 48 horas
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-600">En vivo</span>
              </div>
              <button
                onClick={fetchAppointments}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
              >
                {loading ? '⟳ Actualizando...' : '🔄 Actualizar'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {statsConfig.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.name}
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color}`}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
        )}

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Citas (48 horas)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && appointments.length === 0 ? (
              <p className="text-sm text-gray-600">Cargando...</p>
            ) : appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{apt.patient_name}</p>
                      <p className="text-sm text-gray-600">
                        Dr. {apt.doctor_name} • {apt.specialty}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {apt.patient_phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {new Date(apt.appointment_date).toLocaleDateString('es-CL')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(apt.appointment_date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className={`inline-block mt-1 rounded-full px-2 py-1 text-xs ${getStatusColor(apt.status)}`}>
                        {translateStatus(apt.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-600">
                <p>No hay citas programadas en las próximas 48 horas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
