/**
 * Workflow Types and State Machine Definitions
 * Phase 2: 8-Step Durable Workflow with Auto-Retry
 */

export type WorkflowStep =
  | 'SEND_INITIAL_REMINDER'      // Step 1: Send WhatsApp with buttons
  | 'WAIT_INITIAL_RESPONSE'      // Step 2: Wait for patient response (24h timeout)
  | 'PROCESS_CANCELLATION'       // Step 3: If CANCEL, query available slots
  | 'SEND_ALTERNATIVES'          // Step 4: Send 2 alternative time options
  | 'WAIT_ALTERNATIVE_RESPONSE'  // Step 5: Wait for slot selection (12h timeout)
  | 'TRIGGER_VOICE_CALL'         // Step 6: If CANCEL again, initiate ElevenLabs call
  | 'WAIT_VOICE_OUTCOME'         // Step 7: Wait for voice conversation result
  | 'ESCALATE_TO_HUMAN';         // Step 8: Human intervention required

export type WorkflowStatus =
  | 'PENDING'      // Workflow not started yet
  | 'RUNNING'      // Currently executing
  | 'WAITING'      // Waiting for external event (response, timeout)
  | 'COMPLETED'    // Successfully finished
  | 'FAILED'       // Failed after max retries
  | 'CANCELLED';   // Manually cancelled

export type WorkflowOutcome =
  | 'CONFIRMED'              // Patient confirmed original appointment
  | 'RESCHEDULED'            // Patient selected alternative slot
  | 'RESOLVED_BY_VOICE'      // Voice call successfully resolved
  | 'ESCALATED_TO_HUMAN'     // Requires human intervention
  | 'TIMEOUT'                // Patient didn't respond in time
  | 'ERROR';                 // Technical error occurred

export interface WorkflowStepConfig {
  step: WorkflowStep;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  exponentialBackoff: boolean;
}

export interface WorkflowStepExecution {
  step: WorkflowStep;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  startedAt?: Date;
  completedAt?: Date;
  lastError?: string;
  result?: any;
}

export interface WorkflowState {
  workflowId: string;
  appointmentId: string;
  patientPhone: string;
  status: WorkflowStatus;
  currentStep: WorkflowStep;
  steps: WorkflowStepExecution[];
  outcome?: WorkflowOutcome;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    originalAppointment: {
      doctorName: string;
      specialty: string;
      dateTime: string;
    };
    alternativesOffered?: Array<{
      dateTime: string;
      slotId: string;
    }>;
    voiceCallSid?: string;
    escalationReason?: string;
  };
}

export interface WorkflowConfig {
  steps: WorkflowStepConfig[];
  globalTimeout: number; // 48 hours default
  enableRetries: boolean;
  enableRollback: boolean;
}

/**
 * Default workflow configuration
 */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  globalTimeout: 48 * 60 * 60 * 1000, // 48 hours in ms
  enableRetries: true,
  enableRollback: true,
  steps: [
    {
      step: 'SEND_INITIAL_REMINDER',
      maxRetries: 3,
      retryDelayMs: 5000,
      timeoutMs: 30000, // 30s to send message
      exponentialBackoff: true,
    },
    {
      step: 'WAIT_INITIAL_RESPONSE',
      maxRetries: 1, // No retries for waiting
      retryDelayMs: 0,
      timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
      exponentialBackoff: false,
    },
    {
      step: 'PROCESS_CANCELLATION',
      maxRetries: 3,
      retryDelayMs: 2000,
      timeoutMs: 10000, // 10s to query DB
      exponentialBackoff: true,
    },
    {
      step: 'SEND_ALTERNATIVES',
      maxRetries: 3,
      retryDelayMs: 5000,
      timeoutMs: 30000,
      exponentialBackoff: true,
    },
    {
      step: 'WAIT_ALTERNATIVE_RESPONSE',
      maxRetries: 1,
      retryDelayMs: 0,
      timeoutMs: 12 * 60 * 60 * 1000, // 12 hours
      exponentialBackoff: false,
    },
    {
      step: 'TRIGGER_VOICE_CALL',
      maxRetries: 2, // Voice calls are expensive, limit retries
      retryDelayMs: 10000,
      timeoutMs: 60000, // 1 min to initiate call
      exponentialBackoff: true,
    },
    {
      step: 'WAIT_VOICE_OUTCOME',
      maxRetries: 1,
      retryDelayMs: 0,
      timeoutMs: 15 * 60 * 1000, // 15 minutes max call duration
      exponentialBackoff: false,
    },
    {
      step: 'ESCALATE_TO_HUMAN',
      maxRetries: 3,
      retryDelayMs: 5000,
      timeoutMs: 30000,
      exponentialBackoff: true,
    },
  ],
};

export interface WorkflowEvent {
  type: 'PATIENT_RESPONSE' | 'TIMEOUT' | 'VOICE_COMPLETED' | 'MANUAL_TRIGGER';
  payload: any;
  timestamp: Date;
}
