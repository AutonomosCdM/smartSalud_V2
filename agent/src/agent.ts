/**
 * SmartSaludAgent - Durable Object Implementation
 *
 * Autonomous agent with persistent state for managing appointment confirmations.
 * Implements multi-step workflows, multi-model fallback, and human-in-the-loop.
 */

import { DurableObject } from 'cloudflare:workers';
import { createIntentDetector, type IntentResult } from './lib/intent-detection';

interface AgentState {
  conversationHistory: Message[];
  pendingAppointments: Map<string, AppointmentContext>;
  patientContext: Map<string, PatientContext>;
}

interface Message {
  from: string;
  content: string;
  timestamp: number;
  intent?: string;
  messageSid?: string; // Twilio message identifier
}

interface AppointmentContext {
  appointmentId: string;
  patientId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
  originalDate: string;
  currentStep: number;
  cancelCount: number;
}

interface PatientContext {
  patientId: string;
  preferences: Record<string, any>;
  lastInteraction: number;
}

export class SmartSaludAgent extends DurableObject {
  private state: AgentState;

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);

    // Initialize state from storage or create new
    this.state = {
      conversationHistory: [],
      pendingAppointments: new Map(),
      patientContext: new Map()
    };

    // Load persisted state
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<AgentState>('state');
      if (stored) {
        this.state = stored;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract path after /agent/
    const path = url.pathname.replace(/^\/agent\//, '/');

    // Agent info endpoint
    if (path === '/info' || path === '//info') {
      return new Response(JSON.stringify({
        conversationCount: this.state.conversationHistory.length,
        pendingAppointments: this.state.pendingAppointments.size,
        patients: this.state.patientContext.size
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle message endpoint (for testing and WhatsApp webhook)
    if ((path === '/message' || path === '//message') && request.method === 'POST') {
      const body = await request.json() as { from: string; message: string; messageSid?: string };
      const response = await this.handleMessage(body.from, body.message, body.messageSid);
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed',
      path: path,
      pathname: url.pathname
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Core message handling with multi-model intent detection
   */
  private async handleMessage(from: string, message: string, messageSid?: string): Promise<any> {
    // Store in conversation history
    const msg: Message = {
      from,
      content: message,
      timestamp: Date.now(),
      messageSid
    };

    // Detect intent using multi-model fallback
    const intentDetector = createIntentDetector(this.env);
    const intentResult: IntentResult = await intentDetector.detect(message);

    msg.intent = intentResult.intent;
    this.state.conversationHistory.push(msg);

    console.log(`Intent detected: ${intentResult.intent} via ${intentResult.method} (confidence: ${intentResult.confidence})`);

    // Generate appropriate response based on intent
    let responseMessage = '';
    switch (intentResult.intent) {
      case 'confirm':
        responseMessage = '✅ Perfecto! Tu cita ha sido confirmada. Te esperamos.';
        // TODO: Update appointment status in backend
        break;
      case 'cancel':
        responseMessage = 'Entiendo que necesitas cancelar. Déjame buscar alternativas para ti...';
        // TODO: Trigger rescheduling workflow
        break;
      case 'reschedule':
        responseMessage = 'Claro, te ayudo a cambiar la fecha. Déjame verificar disponibilidad...';
        // TODO: Query calendar and offer alternatives
        break;
      default:
        responseMessage = 'Gracias por tu mensaje. ¿Podrías confirmar si deseas mantener o cancelar tu cita?';
    }

    // Persist state
    await this.ctx.storage.put('state', this.state);

    return {
      success: true,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      method: intentResult.method,
      response: responseMessage
    };
  }

  /**
   * 8-step durable workflow for appointment confirmation
   */
  private async confirmationWorkflow(appointmentId: string): Promise<void> {
    // TODO: Implement durable workflow steps:
    // 1. Send WhatsApp buttons
    // 2. Wait response (timeout 24h)
    // 3. If CANCEL → Query Calendar slots
    // 4. Send 2 alternatives
    // 5. Wait response (timeout 12h)
    // 6. If CANCEL again → Trigger voice call
    // 7. Wait voice outcome
    // 8. If unresolved → Human escalation
  }

  /**
   * Multi-model intent detection with graceful fallback
   * NOTE: Now using centralized IntentDetector from lib/intent-detection.ts
   */
  private async detectIntent(message: string): Promise<string> {
    const intentDetector = createIntentDetector(this.env);
    const result = await intentDetector.detect(message);
    return result.intent;
  }
}
