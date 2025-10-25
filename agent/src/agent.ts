/**
 * SmartSaludAgent - Durable Object Implementation
 *
 * Autonomous agent with persistent state for managing appointment confirmations.
 * Implements multi-step workflows, multi-model fallback, and human-in-the-loop.
 */

import { DurableObject } from 'cloudflare:workers';
import { createIntentDetector, type IntentResult } from './lib/intent-detection';
import { AppointmentConfirmationWorkflow } from './workflows/appointment-confirmation';
import type { WorkflowEvent } from './workflows/types';

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
  workflowId?: string; // Link to active workflow
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

    // Start workflow endpoint
    if (path === '/workflow/start' && request.method === 'POST') {
      const body = await request.json() as { appointmentId: string; patientPhone: string; appointmentDetails: any };
      const response = await this.startWorkflow(body.appointmentId, body.patientPhone, body.appointmentDetails);
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get workflow status endpoint
    if (path === '/workflow/status' && request.method === 'GET') {
      const workflow = await AppointmentConfirmationWorkflow.load(this.ctx.storage, this.env);
      if (!workflow) {
        return new Response(JSON.stringify({ error: 'No active workflow' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify(workflow.getState()), {
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
   * Now integrated with Phase 2 durable workflows
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

    // Check if there's an active workflow
    const workflow = await AppointmentConfirmationWorkflow.load(this.ctx.storage, this.env);

    if (workflow && workflow.getStatus() === 'WAITING') {
      // Workflow is waiting for patient response - send event
      console.log('📨 Sending patient response to active workflow');

      const event: WorkflowEvent = {
        type: 'PATIENT_RESPONSE',
        payload: {
          intent: intentResult.intent,
          message: message,
          confidence: intentResult.confidence
        },
        timestamp: new Date()
      };

      await workflow.handleEvent(event);
      await this.ctx.storage.put('state', this.state);

      return {
        success: true,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        method: intentResult.method,
        workflowStatus: workflow.getStatus(),
        response: 'Workflow processing your response...'
      };
    }

    // No active workflow - generate standalone response
    let responseMessage = '';
    switch (intentResult.intent) {
      case 'confirm':
        responseMessage = '✅ Perfecto! Tu cita ha sido confirmada. Te esperamos.';
        // Update appointment status in backend
        break;
      case 'cancel':
        responseMessage = 'Entiendo que necesitas cancelar. Déjame buscar alternativas para ti...';
        // Could trigger workflow here if needed
        break;
      case 'reschedule':
        responseMessage = 'Claro, te ayudo a cambiar la fecha. Déjame verificar disponibilidad...';
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
   * Start a new appointment confirmation workflow
   * Called by scheduled worker or manually triggered
   */
  async startWorkflow(appointmentId: string, patientPhone: string, appointmentDetails: any): Promise<any> {
    console.log(`🚀 Starting workflow for appointment ${appointmentId}`);

    // Create and start workflow
    const workflow = new AppointmentConfirmationWorkflow(
      appointmentId,
      patientPhone,
      appointmentDetails,
      this.env,
      this.ctx.storage
    );

    await workflow.start();

    // Update appointment context
    const context: AppointmentContext = {
      appointmentId,
      patientId: appointmentDetails.patientId || 'unknown',
      status: 'pending',
      originalDate: appointmentDetails.dateTime,
      currentStep: 1,
      cancelCount: 0,
      workflowId: workflow.getState().workflowId
    };

    this.state.pendingAppointments.set(appointmentId, context);
    await this.ctx.storage.put('state', this.state);

    return {
      success: true,
      workflowId: workflow.getState().workflowId,
      status: workflow.getStatus()
    };
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
