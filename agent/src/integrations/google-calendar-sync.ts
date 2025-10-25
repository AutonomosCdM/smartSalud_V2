/**
 * Google Calendar Bidirectional Sync
 *
 * Provides integration with Google Calendar API for:
 * 1. Creating events when appointments are confirmed
 * 2. Updating events when appointments are rescheduled
 * 3. Syncing doctor's calendar blocks with available slots
 */

import { google } from 'googleapis';

interface AppointmentEvent {
  id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  specialty: string;
  scheduled_time: number; // Unix timestamp
  duration_minutes?: number;
  status: string;
}

interface CalendarConfig {
  serviceAccountEmail?: string;
  privateKey?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  calendarId: string; // Doctor's calendar ID (usually email)
}

export class GoogleCalendarSync {
  private calendar: any;
  private config: CalendarConfig;

  constructor(config: CalendarConfig) {
    this.config = config;

    let auth: any;

    // Support both Service Account and OAuth2 authentication
    if (config.serviceAccountEmail && config.privateKey) {
      // Service Account (server-to-server)
      auth = new google.auth.JWT({
        email: config.serviceAccountEmail,
        key: config.privateKey,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
    } else if (config.clientId && config.clientSecret && config.refreshToken) {
      // OAuth2 (with refresh token)
      const oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        'http://localhost'
      );
      oauth2Client.setCredentials({ refresh_token: config.refreshToken });
      auth = oauth2Client;
    } else {
      throw new Error('Invalid calendar configuration: missing required credentials');
    }

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  /**
   * Create calendar event when appointment is confirmed
   */
  async createAppointmentEvent(appointment: AppointmentEvent): Promise<string | null> {
    try {
      const startTime = new Date(appointment.scheduled_time * 1000);
      const endTime = new Date(startTime.getTime() + (appointment.duration_minutes || 30) * 60000);

      const event = {
        summary: `📋 ${appointment.patient_name} - ${appointment.specialty}`,
        description: `Cita médica confirmada\n\nPaciente: ${appointment.patient_name}\nTeléfono: ${appointment.patient_phone}\nID Cita: ${appointment.id}\n\n🤖 Creado automáticamente por smartSalud`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Santiago',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Santiago',
        },
        colorId: '10', // Green = Confirmed
        extendedProperties: {
          private: {
            smartSaludAppointmentId: appointment.id,
            source: 'smartSalud',
          },
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.config.calendarId,
        resource: event,
      });

      console.log('[GoogleCalendar] Event created:', {
        appointmentId: appointment.id,
        calendarEventId: response.data.id,
        timestamp: new Date().toISOString(),
      });

      return response.data.id;
    } catch (error) {
      console.error('[GoogleCalendar] Error creating event:', {
        appointmentId: appointment.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Update calendar event when appointment is rescheduled
   */
  async updateAppointmentEvent(
    calendarEventId: string,
    newScheduledTime: number,
    durationMinutes?: number
  ): Promise<boolean> {
    try {
      const startTime = new Date(newScheduledTime * 1000);
      const endTime = new Date(startTime.getTime() + (durationMinutes || 30) * 60000);

      await this.calendar.events.patch({
        calendarId: this.config.calendarId,
        eventId: calendarEventId,
        resource: {
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Santiago',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Santiago',
          },
          colorId: '5', // Yellow = Rescheduled
        },
      });

      console.log('[GoogleCalendar] Event updated:', {
        calendarEventId,
        newTime: startTime.toISOString(),
      });

      return true;
    } catch (error) {
      console.error('[GoogleCalendar] Error updating event:', {
        calendarEventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Cancel calendar event when appointment is cancelled
   */
  async cancelAppointmentEvent(calendarEventId: string): Promise<boolean> {
    try {
      await this.calendar.events.patch({
        calendarId: this.config.calendarId,
        eventId: calendarEventId,
        resource: {
          colorId: '11', // Red = Cancelled
          summary: '❌ [CANCELADA] ',
        },
      });

      console.log('[GoogleCalendar] Event cancelled:', { calendarEventId });
      return true;
    } catch (error) {
      console.error('[GoogleCalendar] Error cancelling event:', {
        calendarEventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get doctor's busy slots to exclude from available times
   * Used when offering alternative appointment times
   */
  async getDoctorBusySlots(startDate: Date, endDate: Date): Promise<Array<{ start: Date; end: Date }>> {
    try {
      const response = await this.calendar.events.list({
        calendarId: this.config.calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const busySlots = (response.data.items || []).map((event: any) => ({
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
      }));

      console.log('[GoogleCalendar] Fetched busy slots:', {
        count: busySlots.length,
        dateRange: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      });

      return busySlots;
    } catch (error) {
      console.error('[GoogleCalendar] Error fetching busy slots:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Webhook handler for Calendar change notifications
   * Called when doctor modifies events directly in Google Calendar
   */
  async handleWebhookNotification(channelId: string, resourceId: string): Promise<void> {
    try {
      // Fetch the changed event
      const response = await this.calendar.events.list({
        calendarId: this.config.calendarId,
        maxResults: 10,
        orderBy: 'updated',
      });

      // Find events with smartSalud extendedProperties
      const smartSaludEvents = (response.data.items || []).filter((event: any) =>
        event.extendedProperties?.private?.source === 'smartSalud'
      );

      console.log('[GoogleCalendar] Webhook notification received:', {
        channelId,
        resourceId,
        smartSaludEventsCount: smartSaludEvents.length,
      });

      // TODO: Sync changes back to smartSalud database
      // This would notify patients if doctor moved their appointment
    } catch (error) {
      console.error('[GoogleCalendar] Error handling webhook:', {
        channelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Factory function to create GoogleCalendarSync instance
 * Handles missing credentials gracefully for demo/dev environments
 */
export function createCalendarSync(env: any): GoogleCalendarSync | null {
  try {
    // Check if Calendar credentials are available
    if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_CALENDAR_ID) {
      console.warn('[GoogleCalendar] Credentials not configured, Calendar sync disabled');
      return null;
    }

    const config: CalendarConfig = {
      serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newlines in key
      calendarId: env.GOOGLE_CALENDAR_ID,
    };

    return new GoogleCalendarSync(config);
  } catch (error) {
    console.error('[GoogleCalendar] Failed to initialize:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
