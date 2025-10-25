import React from 'react';

export type AppointmentStatus =
  | 'CONFIRMED'
  | 'WAITING'
  | 'VOICE_ACTIVE'
  | 'NEEDS_HUMAN'
  | 'CANCELLED'
  | 'PROCESSING';

interface StatusBadgeProps {
  status: AppointmentStatus;
  currentStep?: string;
}

const statusConfig = {
  CONFIRMED: {
    emoji: '🟢',
    label: 'Confirmado',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  WAITING: {
    emoji: '🟡',
    label: 'Esperando',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  VOICE_ACTIVE: {
    emoji: '🟠',
    label: 'Llamada activa',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  NEEDS_HUMAN: {
    emoji: '🔴',
    label: 'Requiere atención',
    color: 'bg-red-100 text-red-800 border-red-200',
    pulse: true,
  },
  CANCELLED: {
    emoji: '⚫',
    label: 'Cancelado',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  PROCESSING: {
    emoji: '💬',
    label: 'Procesando',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    pulse: true,
  },
};

export function StatusBadge({ status, currentStep }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PROCESSING;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}>
      <span className="text-lg">{config.emoji}</span>
      <span className="text-sm font-medium">{config.label}</span>
      {currentStep && (
        <span className="text-xs opacity-75">({currentStep})</span>
      )}
    </div>
  );
}
