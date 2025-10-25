/**
 * Broadcast utility for sending real-time updates to dashboard
 */

import type { Env } from '../index';
import type { BroadcastMessage } from '../websocket/broadcaster';

export class BroadcastService {
  constructor(private env: Env) {}

  /**
   * Broadcast workflow update to dashboard
   */
  async broadcastWorkflowUpdate(data: any): Promise<void> {
    const message: BroadcastMessage = {
      type: 'WORKFLOW_UPDATE',
      data,
      timestamp: Date.now(),
    };

    await this.broadcast(message);
  }

  /**
   * Broadcast appointment update to dashboard
   */
  async broadcastAppointmentUpdate(data: any): Promise<void> {
    const message: BroadcastMessage = {
      type: 'APPOINTMENT_UPDATED',
      data,
      timestamp: Date.now(),
    };

    await this.broadcast(message);
  }

  /**
   * Broadcast escalation alert to dashboard
   */
  async broadcastEscalation(data: any): Promise<void> {
    const message: BroadcastMessage = {
      type: 'ESCALATION_ALERT',
      data,
      timestamp: Date.now(),
    };

    await this.broadcast(message);
  }

  /**
   * Broadcast voice call started notification
   */
  async broadcastVoiceCallStarted(data: any): Promise<void> {
    const message: BroadcastMessage = {
      type: 'VOICE_CALL_STARTED',
      data,
      timestamp: Date.now(),
    };

    await this.broadcast(message);
  }

  /**
   * Send message to broadcaster Durable Object
   */
  private async broadcast(message: BroadcastMessage): Promise<void> {
    try {
      const id = this.env.BROADCASTER.idFromName('dashboard-broadcaster');
      const broadcaster = this.env.BROADCASTER.get(id);

      const response = await broadcaster.fetch('http://broadcaster/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('[BroadcastService] Failed to broadcast:', await response.text());
      } else {
        const result = await response.json();
        console.log(`[BroadcastService] Broadcast successful: ${message.type} to ${result.clientCount} clients`);
      }
    } catch (error) {
      console.error('[BroadcastService] Broadcast error:', error);
      // Don't throw - broadcasts are non-critical
    }
  }
}
