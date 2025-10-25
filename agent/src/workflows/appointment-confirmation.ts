/**
 * Appointment Confirmation Workflow
 * Phase 2: 8-Step Durable Workflow with Auto-Retry
 *
 * Flow:
 * 1. Send initial reminder → 2. Wait response → 3. Process cancel? →
 * 4. Send alternatives → 5. Wait selection → 6. Voice call? →
 * 7. Wait voice outcome → 8. Human escalation
 */

import {
  WorkflowState,
  WorkflowStep,
  WorkflowStatus,
  WorkflowOutcome,
  WorkflowStepExecution,
  WorkflowConfig,
  WorkflowEvent,
  DEFAULT_WORKFLOW_CONFIG,
} from './types';

export class AppointmentConfirmationWorkflow {
  private state: WorkflowState;
  private config: WorkflowConfig;
  private env: any;
  private storage: DurableObjectStorage;

  constructor(
    appointmentId: string,
    patientPhone: string,
    appointmentDetails: any,
    env: any,
    storage: DurableObjectStorage
  ) {
    this.env = env;
    this.storage = storage;
    this.config = DEFAULT_WORKFLOW_CONFIG;

    // Initialize workflow state
    this.state = {
      workflowId: `wf-${appointmentId}-${Date.now()}`,
      appointmentId,
      patientPhone,
      status: 'PENDING',
      currentStep: 'SEND_INITIAL_REMINDER',
      steps: this.initializeSteps(),
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        originalAppointment: appointmentDetails,
      },
    };
  }

  /**
   * Load existing workflow from storage
   */
  static async load(
    storage: DurableObjectStorage,
    env: any
  ): Promise<AppointmentConfirmationWorkflow | null> {
    const state = await storage.get<WorkflowState>('workflow_state');
    if (!state) return null;

    const workflow = Object.create(AppointmentConfirmationWorkflow.prototype);
    workflow.state = state;
    workflow.config = DEFAULT_WORKFLOW_CONFIG;
    workflow.env = env;
    workflow.storage = storage;

    return workflow;
  }

  /**
   * Initialize step execution tracking
   */
  private initializeSteps(): WorkflowStepExecution[] {
    return this.config.steps.map((config) => ({
      step: config.step,
      status: 'pending',
      attempts: 0,
    }));
  }

  /**
   * Start workflow execution
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting workflow: ${this.state.workflowId}`);
    this.state.status = 'RUNNING';
    await this.persistState();

    // Execute first step
    await this.executeCurrentStep();
  }

  /**
   * Execute current workflow step with retry logic
   */
  private async executeCurrentStep(): Promise<void> {
    const stepIndex = this.getCurrentStepIndex();
    const stepExecution = this.state.steps[stepIndex];
    const stepConfig = this.config.steps[stepIndex];

    console.log(`📍 Executing step: ${stepExecution.step} (attempt ${stepExecution.attempts + 1})`);

    stepExecution.status = 'running';
    stepExecution.startedAt = new Date();
    stepExecution.attempts += 1;

    try {
      // Execute step with timeout
      const result = await this.executeStepWithTimeout(
        stepExecution.step,
        stepConfig.timeoutMs
      );

      // Step succeeded
      stepExecution.status = 'completed';
      stepExecution.completedAt = new Date();
      stepExecution.result = result;

      console.log(`✅ Step completed: ${stepExecution.step}`);

      // Check if workflow should continue or wait
      if (this.isWaitingStep(stepExecution.step)) {
        this.state.status = 'WAITING';
        console.log(`⏸️ Workflow waiting for external event on step: ${stepExecution.step}`);
      } else {
        // Move to next step
        await this.moveToNextStep();
      }

      await this.persistState();
    } catch (error: any) {
      console.error(`❌ Step failed: ${stepExecution.step}`, error);
      await this.handleStepFailure(stepExecution, stepConfig, error);
    }
  }

  /**
   * Execute step logic with timeout
   */
  private async executeStepWithTimeout(
    step: WorkflowStep,
    timeoutMs: number
  ): Promise<any> {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Step timeout')), timeoutMs)
    );

    const executionPromise = this.executeStep(step);

    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Execute specific step logic
   */
  private async executeStep(step: WorkflowStep): Promise<any> {
    switch (step) {
      case 'SEND_INITIAL_REMINDER':
        return await this.sendInitialReminder();

      case 'WAIT_INITIAL_RESPONSE':
        return await this.waitForResponse();

      case 'PROCESS_CANCELLATION':
        return await this.processCancellation();

      case 'SEND_ALTERNATIVES':
        return await this.sendAlternatives();

      case 'WAIT_ALTERNATIVE_RESPONSE':
        return await this.waitForResponse();

      case 'TRIGGER_VOICE_CALL':
        return await this.triggerVoiceCall();

      case 'WAIT_VOICE_OUTCOME':
        return await this.waitForVoiceOutcome();

      case 'ESCALATE_TO_HUMAN':
        return await this.escalateToHuman();

      default:
        throw new Error(`Unknown step: ${step}`);
    }
  }

  /**
   * Handle step failure with retry logic
   */
  private async handleStepFailure(
    stepExecution: WorkflowStepExecution,
    stepConfig: any,
    error: Error
  ): Promise<void> {
    stepExecution.lastError = error.message;

    // Check if we can retry
    if (stepExecution.attempts < stepConfig.maxRetries) {
      console.log(`🔄 Retrying step: ${stepExecution.step} (${stepExecution.attempts}/${stepConfig.maxRetries})`);

      // Calculate retry delay with exponential backoff
      const delay = stepConfig.exponentialBackoff
        ? stepConfig.retryDelayMs * Math.pow(2, stepExecution.attempts - 1)
        : stepConfig.retryDelayMs;

      stepExecution.status = 'pending';
      await this.persistState();

      // Schedule retry
      await this.sleep(delay);
      await this.executeCurrentStep();
    } else {
      // Max retries exceeded
      console.error(`💥 Step failed permanently: ${stepExecution.step}`);
      stepExecution.status = 'failed';
      this.state.status = 'FAILED';
      this.state.outcome = 'ERROR';

      await this.persistState();

      // Optionally rollback or escalate
      if (this.config.enableRollback) {
        await this.rollback();
      }
    }
  }

  /**
   * Move to next step in workflow
   */
  private async moveToNextStep(): Promise<void> {
    const currentIndex = this.getCurrentStepIndex();
    const nextIndex = currentIndex + 1;

    if (nextIndex < this.state.steps.length) {
      this.state.currentStep = this.state.steps[nextIndex].step;
      console.log(`➡️ Moving to next step: ${this.state.currentStep}`);
      await this.executeCurrentStep();
    } else {
      // Workflow completed
      console.log(`🏁 Workflow completed: ${this.state.workflowId}`);
      this.state.status = 'COMPLETED';
      this.state.metadata.completedAt = new Date();
      await this.persistState();
    }
  }

  /**
   * Handle external event (patient response, timeout, etc.)
   */
  async handleEvent(event: WorkflowEvent): Promise<void> {
    console.log(`📨 Workflow event received: ${event.type}`, event.payload);

    if (this.state.status !== 'WAITING') {
      console.warn('⚠️ Received event but workflow not in WAITING state');
      return;
    }

    const stepIndex = this.getCurrentStepIndex();
    const stepExecution = this.state.steps[stepIndex];

    // Complete the waiting step
    stepExecution.status = 'completed';
    stepExecution.completedAt = new Date();
    stepExecution.result = event.payload;

    // Process event and determine next action
    await this.processEvent(event);

    this.state.status = 'RUNNING';
    await this.persistState();

    // Continue workflow
    await this.moveToNextStep();
  }

  /**
   * Process event and update workflow state
   */
  private async processEvent(event: WorkflowEvent): Promise<void> {
    switch (event.type) {
      case 'PATIENT_RESPONSE':
        const intent = event.payload.intent;

        if (intent === 'confirm') {
          // Patient confirmed - workflow can complete early
          this.state.outcome = 'CONFIRMED';
          this.state.status = 'COMPLETED';
          this.state.metadata.completedAt = new Date();
          console.log('✅ Patient confirmed appointment - workflow completing early');

          // Sync to Google Calendar (Phase 5)
          await this.syncToCalendar('CONFIRMED');
        } else if (intent === 'cancel') {
          // Patient cancelled - continue to alternatives flow
          console.log('🔄 Patient cancelled - proceeding to alternatives');
        }
        break;

      case 'TIMEOUT':
        console.log('⏰ Timeout occurred - proceeding to next escalation');
        break;

      case 'VOICE_COMPLETED':
        if (event.payload.resolved) {
          this.state.outcome = 'RESOLVED_BY_VOICE';
          this.state.status = 'COMPLETED';
          this.state.metadata.completedAt = new Date();
        }
        break;
    }
  }

  // ============ STEP IMPLEMENTATIONS ============

  private async sendInitialReminder(): Promise<any> {
    console.log('📱 Sending initial WhatsApp reminder...');

    const { TwilioWhatsAppService } = await import('../integrations/twilio-whatsapp');
    const twilioService = new TwilioWhatsAppService({
      accountSid: this.env.TWILIO_ACCOUNT_SID,
      authToken: this.env.TWILIO_AUTH_TOKEN,
      fromNumber: this.env.TWILIO_WHATSAPP_NUMBER,
    });

    // Extract date and time from dateTime string
    const [date, time] = this.state.metadata.originalAppointment.dateTime.split(' ');

    await twilioService.sendAppointmentReminder(
      this.state.patientPhone,
      {
        doctorName: this.state.metadata.originalAppointment.doctorName,
        specialty: this.state.metadata.originalAppointment.specialty,
        date,
        time,
      }
    );

    return { sent: true, timestamp: new Date() };
  }

  private async waitForResponse(): Promise<any> {
    // This is a no-op - actual waiting happens via handleEvent()
    console.log('⏳ Waiting for patient response...');
    return { waiting: true };
  }

  private async processCancellation(): Promise<any> {
    console.log('🔍 Querying alternative appointment slots...');

    // Call FastAPI to get available slots
    // Endpoint: GET /api/appointments/{appointment_id}/alternatives
    const response = await fetch(
      `${this.env.BACKEND_API_URL}/api/appointments/${this.state.appointmentId}/alternatives`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch alternatives: ${response.statusText}`);
    }

    const data = await response.json() as {
      appointment_id: number;
      current_date: string;
      alternatives: Array<{
        slot_date: string; // ISO datetime from FastAPI
        available: boolean;
      }>;
    };

    // Convert to workflow format
    const alternatives = data.alternatives.map((alt, index) => ({
      dateTime: new Date(alt.slot_date).toISOString().replace('T', ' ').substring(0, 16),
      slotId: `slot-${index + 1}`,
    }));

    // Store alternatives in metadata
    this.state.metadata.alternativesOffered = alternatives;

    console.log(`✅ Found ${alternatives.length} alternative slots`);
    return { alternatives: this.state.metadata.alternativesOffered };
  }

  private async sendAlternatives(): Promise<any> {
    console.log('📱 Sending alternative appointment options...');

    const { TwilioWhatsAppService } = await import('../integrations/twilio-whatsapp');
    const twilioService = new TwilioWhatsAppService({
      accountSid: this.env.TWILIO_ACCOUNT_SID,
      authToken: this.env.TWILIO_AUTH_TOKEN,
      fromNumber: this.env.TWILIO_WHATSAPP_NUMBER,
    });

    // Convert alternatives to expected format
    const formattedAlternatives = this.state.metadata.alternativesOffered!.map((alt) => {
      const [date, time] = alt.dateTime.split(' ');
      return { date, time };
    });

    await twilioService.sendAlternativeSlots(
      this.state.patientPhone,
      formattedAlternatives
    );

    return { sent: true, timestamp: new Date() };
  }

  private async triggerVoiceCall(): Promise<any> {
    console.log('📞 Triggering ElevenLabs voice call...');

    // TODO: Integrate ElevenLabs Conversational AI
    // For now, return mock
    this.state.metadata.voiceCallSid = `voice-${Date.now()}`;

    return { callSid: this.state.metadata.voiceCallSid };
  }

  private async waitForVoiceOutcome(): Promise<any> {
    console.log('⏳ Waiting for voice call outcome...');
    return { waiting: true };
  }

  private async escalateToHuman(): Promise<any> {
    console.log('🚨 Escalating to human intervention...');

    const { TwilioWhatsAppService } = await import('../integrations/twilio-whatsapp');
    const twilioService = new TwilioWhatsAppService({
      accountSid: this.env.TWILIO_ACCOUNT_SID,
      authToken: this.env.TWILIO_AUTH_TOKEN,
      fromNumber: this.env.TWILIO_WHATSAPP_NUMBER,
    });

    // Notify staff
    await twilioService.sendEscalationAlert(
      this.env.STAFF_PHONE_NUMBER || '+5215512345678', // Fallback to test number
      this.state.patientPhone, // Patient name/phone
      this.state.appointmentId, // Appointment ID
      'Patient cancelled twice and voice call unsuccessful' // Reason
    );

    this.state.metadata.escalationReason = 'Multiple cancellations - human intervention required';
    this.state.outcome = 'ESCALATED_TO_HUMAN';

    return { escalated: true, timestamp: new Date() };
  }

  // ============ HELPERS ============

  private getCurrentStepIndex(): number {
    return this.state.steps.findIndex((s) => s.step === this.state.currentStep);
  }

  private isWaitingStep(step: WorkflowStep): boolean {
    return (
      step === 'WAIT_INITIAL_RESPONSE' ||
      step === 'WAIT_ALTERNATIVE_RESPONSE' ||
      step === 'WAIT_VOICE_OUTCOME'
    );
  }

  private async rollback(): Promise<void> {
    console.log('↩️ Rolling back workflow...');
    // Implement rollback logic if needed
    // For now, just log
  }

  private async persistState(): Promise<void> {
    this.state.metadata.updatedAt = new Date();
    await this.storage.put('workflow_state', this.state);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============ PUBLIC API ============

  getState(): WorkflowState {
    return { ...this.state };
  }

  getStatus(): WorkflowStatus {
    return this.state.status;
  }

  getOutcome(): WorkflowOutcome | undefined {
    return this.state.outcome;
  }

  /**
   * Phase 5: Sync appointment to Google Calendar
   */
  private async syncToCalendar(action: 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED'): Promise<void> {
    console.log(`📅 [Calendar] Starting sync - Action: ${action}`);
    try {
      const { createCalendarSync } = await import('../integrations/google-calendar-sync');
      const calendarSync = createCalendarSync(this.env);

      if (!calendarSync) {
        console.warn('[Calendar] Sync disabled (no credentials configured)');
        return;
      }

      console.log(`📅 [Calendar] Sync initialized successfully`);
      const appointment = this.state.metadata.originalAppointment;
      console.log(`📅 [Calendar] Appointment data:`, {
        id: this.state.appointmentId,
        patient: appointment.patient_name,
        scheduled: appointment.scheduled_time,
      });

      switch (action) {
        case 'CONFIRMED':
          const eventId = await calendarSync.createAppointmentEvent({
            id: this.state.appointmentId,
            patient_name: appointment.patient_name || 'Paciente',
            patient_phone: this.state.patientPhone,
            doctor_name: appointment.doctor_name || 'Doctor',
            specialty: appointment.specialty || 'Consulta',
            scheduled_time: appointment.scheduled_time,
            duration_minutes: appointment.duration_minutes || 30,
            status: 'CONFIRMED',
          });

          if (eventId) {
            this.state.metadata.calendarEventId = eventId;
            console.log(`📅 [Calendar] Event created: ${eventId}`);
          }
          break;

        case 'RESCHEDULED':
          if (this.state.metadata.calendarEventId) {
            await calendarSync.updateAppointmentEvent(
              this.state.metadata.calendarEventId,
              appointment.scheduled_time,
              appointment.duration_minutes || 30
            );
            console.log(`📅 [Calendar] Event updated: ${this.state.metadata.calendarEventId}`);
          }
          break;

        case 'CANCELLED':
          if (this.state.metadata.calendarEventId) {
            await calendarSync.cancelAppointmentEvent(this.state.metadata.calendarEventId);
            console.log(`📅 [Calendar] Event cancelled: ${this.state.metadata.calendarEventId}`);
          }
          break;
      }

      await this.persistState();
    } catch (error) {
      console.error('[Calendar] Sync error:', error instanceof Error ? error.message : 'Unknown error');
      // Don't fail workflow if calendar sync fails
    }
  }

  async cancel(): Promise<void> {
    console.log(`🛑 Cancelling workflow: ${this.state.workflowId}`);
    this.state.status = 'CANCELLED';

    // Sync cancellation to Calendar
    await this.syncToCalendar('CANCELLED');

    await this.persistState();
  }
}
