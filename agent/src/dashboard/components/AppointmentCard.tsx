import React from 'react';
import { StatusBadge, AppointmentStatus } from './StatusBadge';

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  specialty: string;
  dateTime: string;
  status: AppointmentStatus;
  workflow?: {
    workflowId: string;
    status: string;
    currentStep: string;
    outcome?: string;
    metadata?: any;
  };
}

interface AppointmentCardProps {
  appointment: Appointment;
  onManualCall?: () => void;
  onIntervene?: () => void;
  onViewHistory?: () => void;
}

export function AppointmentCard({
  appointment,
  onManualCall,
  onIntervene,
  onViewHistory,
}: AppointmentCardProps) {
  const appointmentDate = new Date(appointment.dateTime);
  const isUrgent = appointment.status === 'NEEDS_HUMAN';
  const canTriggerVoice = appointment.status === 'WAITING' || appointment.status === 'PROCESSING';

  return (
    <div
      className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all hover:shadow-lg ${
        isUrgent ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{appointment.patientName}</h3>
          <p className="text-sm text-gray-600">{appointment.patientPhone}</p>
        </div>
        <StatusBadge
          status={appointment.status}
          currentStep={appointment.workflow?.currentStep}
        />
      </div>

      {/* Appointment Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Doctor:</span>
          <span className="text-gray-900">{appointment.doctorName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Especialidad:</span>
          <span className="text-gray-900">{appointment.specialty}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Fecha:</span>
          <span className="text-gray-900">
            {appointmentDate.toLocaleDateString('es-CL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Hora:</span>
          <span className="text-gray-900">
            {appointmentDate.toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Workflow Info */}
      {appointment.workflow && (
        <div className="bg-gray-50 rounded-md p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Workflow
            </span>
            <span className="text-xs text-gray-500">
              ID: {appointment.workflow.workflowId.slice(0, 8)}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Estado:</span> {appointment.workflow.status}
          </div>
          {appointment.workflow.metadata?.escalationReason && (
            <div className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded">
              <span className="font-medium">Razón:</span>{' '}
              {appointment.workflow.metadata.escalationReason}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {canTriggerVoice && onManualCall && (
          <button
            onClick={onManualCall}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
          >
            📞 Llamada de Voz
          </button>
        )}

        {isUrgent && onIntervene && (
          <button
            onClick={onIntervene}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors animate-pulse"
          >
            👤 Intervenir
          </button>
        )}

        {onViewHistory && (
          <button
            onClick={onViewHistory}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-2 px-4 rounded-md transition-colors"
          >
            📋 Historial
          </button>
        )}
      </div>
    </div>
  );
}
