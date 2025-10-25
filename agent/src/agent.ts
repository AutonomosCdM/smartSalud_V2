/**
 * SmartSaludAgent - Durable Object Implementation
 *
 * Autonomous agent with persistent state for managing appointment confirmations.
 * Implements multi-step workflows, multi-model fallback, and human-in-the-loop.
 */

import { DurableObject } from 'cloudflare:workers';

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

    // Agent info endpoint
    if (url.pathname === '/info') {
      return new Response(JSON.stringify({
        conversationCount: this.state.conversationHistory.length,
        pendingAppointments: this.state.pendingAppointments.size,
        patients: this.state.patientContext.size
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle message endpoint (for testing)
    if (url.pathname === '/message' && request.method === 'POST') {
      const { from, message } = await request.json() as { from: string; message: string };
      const response = await this.handleMessage(from, message);
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  /**
   * Core message handling with multi-model intent detection
   */
  private async handleMessage(from: string, message: string): Promise<any> {
    // Store in conversation history
    this.state.conversationHistory.push({
      from,
      content: message,
      timestamp: Date.now()
    });

    // TODO: Implement multi-model intent detection
    // 1. Try Groq (primary)
    // 2. Fallback to Workers AI
    // 3. Last resort: regex patterns

    // Persist state
    await this.ctx.storage.put('state', this.state);

    return {
      success: true,
      response: 'Message received - full implementation coming soon'
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
   */
  private async detectIntent(message: string): Promise<string> {
    try {
      // Primary: Groq
      return await this.groqIntentDetection(message);
    } catch (error) {
      try {
        // Fallback: Workers AI
        return await this.workersAIIntentDetection(message);
      } catch (error) {
        // Last resort: Regex patterns
        return this.regexIntentDetection(message);
      }
    }
  }

  private async groqIntentDetection(message: string): Promise<string> {
    // TODO: Implement Groq API call
    throw new Error('Not implemented');
  }

  private async workersAIIntentDetection(message: string): Promise<string> {
    // TODO: Implement Workers AI call
    throw new Error('Not implemented');
  }

  private regexIntentDetection(message: string): string {
    const lower = message.toLowerCase();

    if (/(confirmar|confirm|sí|si|yes)/i.test(lower)) {
      return 'confirm';
    }
    if (/(cancelar|cancel|no)/i.test(lower)) {
      return 'cancel';
    }
    if (/(cambiar|reagendar|reschedule|move)/i.test(lower)) {
      return 'reschedule';
    }

    return 'unknown';
  }
}
