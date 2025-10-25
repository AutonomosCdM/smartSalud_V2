import React, { useEffect, useRef } from 'react';
import { Appointment } from './AppointmentCard';

interface EscalationAlertProps {
  appointments: Appointment[];
  onResolve: (appointmentId: string) => void;
  onView: (appointmentId: string) => void;
}

export function EscalationAlert({ appointments, onResolve, onView }: EscalationAlertProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousCountRef = useRef(0);

  const escalatedAppointments = appointments.filter(
    (apt) => apt.status === 'NEEDS_HUMAN'
  );

  useEffect(() => {
    // Play alert sound when new escalation arrives
    if (escalatedAppointments.length > previousCountRef.current) {
      playAlertSound();
    }
    previousCountRef.current = escalatedAppointments.length;
  }, [escalatedAppointments.length]);

  const playAlertSound = () => {
    // Create simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Play twice
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 800;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.5);
    }, 300);
  };

  if (escalatedAppointments.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-full z-50">
      <div className="bg-red-600 text-white rounded-lg shadow-2xl p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🚨</span>
          <div>
            <h3 className="font-bold text-lg">Atención Requerida</h3>
            <p className="text-sm opacity-90">
              {escalatedAppointments.length}{' '}
              {escalatedAppointments.length === 1 ? 'paciente requiere' : 'pacientes requieren'}{' '}
              intervención humana
            </p>
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {escalatedAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white/10 backdrop-blur rounded-md p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{apt.patientName}</p>
                  <p className="text-sm opacity-90">{apt.patientPhone}</p>
                </div>
              </div>

              {apt.workflow?.metadata?.escalationReason && (
                <p className="text-sm mb-3 bg-white/10 p-2 rounded">
                  {apt.workflow.metadata.escalationReason}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => onView(apt.id)}
                  className="flex-1 bg-white text-red-600 hover:bg-gray-100 text-sm font-medium py-2 px-3 rounded transition-colors"
                >
                  Ver Detalles
                </button>
                <button
                  onClick={() => onResolve(apt.id)}
                  className="flex-1 bg-red-800 hover:bg-red-900 text-white text-sm font-medium py-2 px-3 rounded transition-colors"
                >
                  Resolver
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
