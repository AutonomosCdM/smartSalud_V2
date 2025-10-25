/**
 * Twilio WhatsApp Integration
 *
 * Handles sending WhatsApp messages with interactive buttons using Twilio API.
 * Supports appointment confirmation/cancellation flows.
 */

import Twilio from 'twilio';

export interface WhatsAppMessage {
  to: string; // Patient phone number in E.164 format (e.g., +521234567890)
  body: string;
  buttons?: WhatsAppButton[];
}

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string; // Format: whatsapp:+14155238886
}

export class TwilioWhatsAppService {
  private client: Twilio.Twilio;
  private fromNumber: string;

  constructor(config: TwilioConfig) {
    this.client = Twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
  }

  /**
   * Send WhatsApp message with interactive buttons for appointment confirmation
   */
  async sendAppointmentReminder(
    patientPhone: string,
    appointmentData: {
      doctorName: string;
      date: string;
      time: string;
      specialty: string;
    }
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const messageBody = this.buildReminderMessage(appointmentData);

      // Twilio WhatsApp doesn't support native interactive buttons yet
      // Using numbered options approach that works universally
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${patientPhone}`,
        body: messageBody,
      });

      console.log(`WhatsApp reminder sent to ${patientPhone}, SID: ${message.sid}`);

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build formatted reminder message with response options
   */
  private buildReminderMessage(data: {
    doctorName: string;
    date: string;
    time: string;
    specialty: string;
  }): string {
    return `🏥 *smartSalud - Recordatorio de Cita*

Tienes una cita programada para mañana:

👨‍⚕️ Doctor: ${data.doctorName}
🩺 Especialidad: ${data.specialty}
📅 Fecha: ${data.date}
🕐 Hora: ${data.time}

Por favor, confirma tu asistencia:

*Responde con:*
1️⃣ *CONFIRMAR* - Para confirmar tu cita
2️⃣ *CANCELAR* - Para cancelar y ver alternativas

_Tienes 24 horas para responder._`;
  }

  /**
   * Send follow-up message with alternative appointment slots
   */
  async sendAlternativeSlots(
    patientPhone: string,
    alternatives: Array<{ date: string; time: string }>
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const messageBody = this.buildAlternativesMessage(alternatives);

      const message = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${patientPhone}`,
        body: messageBody,
      });

      console.log(`Alternative slots sent to ${patientPhone}, SID: ${message.sid}`);

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      console.error('Failed to send alternatives message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build message with alternative appointment slots
   */
  private buildAlternativesMessage(
    alternatives: Array<{ date: string; time: string }>
  ): string {
    let message = `🔄 *Opciones alternativas disponibles:*\n\n`;

    alternatives.forEach((alt, index) => {
      message += `${index + 1}️⃣ ${alt.date} a las ${alt.time}\n`;
    });

    message += `\n*Responde con el número de tu preferencia* (1 o 2)`;

    return message;
  }

  /**
   * Send escalation notification to clinic staff
   */
  async sendEscalationAlert(
    staffPhone: string,
    patientName: string,
    appointmentId: string,
    reason: string
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const messageBody = `⚠️ *Escalación Requerida*

Paciente: ${patientName}
Cita ID: ${appointmentId}
Motivo: ${reason}

Se requiere intervención manual para resolver esta cita.`;

      const message = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${staffPhone}`,
        body: messageBody,
      });

      console.log(`Escalation alert sent, SID: ${message.sid}`);

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      console.error('Failed to send escalation alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Factory function to create TwilioWhatsAppService from environment
 */
export function createTwilioService(env: any): TwilioWhatsAppService {
  return new TwilioWhatsAppService({
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    fromNumber: env.TWILIO_WHATSAPP_NUMBER,
  });
}
