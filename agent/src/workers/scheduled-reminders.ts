/**
 * Scheduled Reminders Worker
 *
 * Runs every hour via cron trigger to send 48-hour appointment reminders.
 * Queries FastAPI backend for upcoming appointments and sends WhatsApp messages.
 */

import { createTwilioService } from '../integrations/twilio-whatsapp';

export interface UpcomingAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  specialty: string;
  appointment_date: string; // ISO 8601 format
  appointment_time: string; // HH:MM format
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface ReminderResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Main scheduled worker function
 * Called by Cloudflare Workers cron trigger (every hour)
 */
export async function processScheduledReminders(env: any): Promise<ReminderResult> {
  console.log('🕐 Scheduled reminders worker started:', new Date().toISOString());

  const result: ReminderResult = {
    total: 0,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Step 1: Fetch upcoming appointments from FastAPI backend
    const appointments = await fetchUpcomingAppointments(env);
    result.total = appointments.length;

    if (appointments.length === 0) {
      console.log('✅ No appointments requiring reminders at this time');
      return result;
    }

    console.log(`📋 Found ${appointments.length} appointments requiring reminders`);

    // Step 2: Initialize Twilio service
    const twilioService = createTwilioService(env);

    // Step 3: Send WhatsApp reminder for each appointment
    for (const appointment of appointments) {
      try {
        await sendReminderForAppointment(appointment, twilioService, env);
        result.sent++;
        console.log(`✅ Reminder sent for appointment ${appointment.id}`);
      } catch (error) {
        result.failed++;
        const errorMsg = `Failed to send reminder for appointment ${appointment.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // Rate limiting: Wait 1 second between messages to avoid Twilio throttling
      await sleep(1000);
    }

    console.log(
      `✅ Reminders completed: ${result.sent} sent, ${result.failed} failed out of ${result.total}`
    );
  } catch (error) {
    console.error('❌ Critical error in scheduled reminders worker:', error);
    result.errors.push(
      `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Fetch upcoming appointments from FastAPI backend
 * Query: appointments in the next 47-49 hours (48h ± 1h buffer)
 */
async function fetchUpcomingAppointments(env: any): Promise<UpcomingAppointment[]> {
  const backendUrl = env.BACKEND_API_URL || 'http://localhost:8000';
  const endpoint = `${backendUrl}/api/appointments/upcoming?hours=48`;

  console.log(`📡 Fetching appointments from: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'smartSalud-Agent/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Backend API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as any;
    const appointments: UpcomingAppointment[] = data.appointments || data || [];

    console.log(`📊 Received ${appointments.length} appointments from backend`);

    return appointments;
  } catch (error) {
    console.error('❌ Failed to fetch appointments from backend:', error);
    throw new Error(
      `Backend communication failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Send WhatsApp reminder for a single appointment
 */
async function sendReminderForAppointment(
  appointment: UpcomingAppointment,
  twilioService: any,
  env: any
): Promise<void> {
  // Format date/time for display
  const appointmentDate = formatDate(appointment.appointment_date);
  const appointmentTime = appointment.appointment_time;

  // Send WhatsApp message with buttons
  const sendResult = await twilioService.sendAppointmentReminder(
    appointment.patient_phone,
    {
      doctorName: appointment.doctor_name,
      date: appointmentDate,
      time: appointmentTime,
      specialty: appointment.specialty,
    }
  );

  if (!sendResult.success) {
    throw new Error(sendResult.error || 'Failed to send WhatsApp message');
  }

  // Store reminder sent status in backend
  await markReminderSent(appointment.id, sendResult.messageSid!, env);

  console.log(
    `📱 Reminder sent to ${appointment.patient_name} (${appointment.patient_phone})`
  );
}

/**
 * Mark reminder as sent in backend database
 */
async function markReminderSent(
  appointmentId: string,
  messageSid: string,
  env: any
): Promise<void> {
  const backendUrl = env.BACKEND_API_URL || 'http://localhost:8000';
  const endpoint = `${backendUrl}/api/appointments/${appointmentId}/reminder`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminder_sent_at: new Date().toISOString(),
        reminder_message_sid: messageSid,
        reminder_type: '48h_confirmation',
      }),
    });

    if (!response.ok) {
      console.warn(
        `⚠️ Failed to update reminder status in backend: ${response.status}`
      );
    }
  } catch (error) {
    console.warn('⚠️ Failed to mark reminder as sent in backend:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Format ISO date string to human-readable Spanish format
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('es-MX', options);
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
