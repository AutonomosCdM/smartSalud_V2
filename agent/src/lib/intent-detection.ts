/**
 * Multi-Model Intent Detection
 *
 * Implements graceful fallback chain:
 * 1. Groq (primary - fast, high-quality)
 * 2. Cloudflare Workers AI (fallback - reliable)
 * 3. Regex patterns (last resort - basic)
 */

import Groq from 'groq-sdk';

export type Intent = 'confirm' | 'cancel' | 'reschedule' | 'unknown';

export interface IntentResult {
  intent: Intent;
  confidence: number;
  method: 'groq' | 'workers-ai' | 'regex';
  rawResponse?: any;
}

export class IntentDetector {
  private groqClient: Groq | null = null;
  private ai: any; // Cloudflare Workers AI binding

  constructor(private env: any) {
    // Initialize Groq client if API key is available
    if (env.GROQ_API_KEY) {
      this.groqClient = new Groq({
        apiKey: env.GROQ_API_KEY,
      });
    }

    // Store Workers AI binding
    this.ai = env.AI;
  }

  /**
   * Main intent detection with automatic fallback
   */
  async detect(message: string): Promise<IntentResult> {
    // Try Groq first (primary)
    if (this.groqClient) {
      try {
        const result = await this.detectWithGroq(message);
        console.log('Intent detected via Groq:', result);
        return result;
      } catch (error) {
        console.warn('Groq intent detection failed, falling back:', error);
      }
    }

    // Fallback to Workers AI
    if (this.ai) {
      try {
        const result = await this.detectWithWorkersAI(message);
        console.log('Intent detected via Workers AI:', result);
        return result;
      } catch (error) {
        console.warn('Workers AI intent detection failed, using regex:', error);
      }
    }

    // Last resort: regex patterns
    const result = this.detectWithRegex(message);
    console.log('Intent detected via regex:', result);
    return result;
  }

  /**
   * Primary: Groq-based intent detection
   * Uses llama-3.3-70b-versatile for fast, accurate classification
   */
  private async detectWithGroq(message: string): Promise<IntentResult> {
    if (!this.groqClient) {
      throw new Error('Groq client not initialized');
    }

    const completion = await this.groqClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for medical appointment confirmations.
Classify the user's message into ONE of these intents:
- "confirm": User wants to confirm the appointment (e.g., "sí", "confirmar", "ok", "está bien")
- "cancel": User wants to cancel (e.g., "no", "cancelar", "no puedo")
- "reschedule": User wants to change the date/time (e.g., "cambiar", "otro día", "reagendar")
- "unknown": Cannot determine intent

Respond with ONLY the intent word, nothing else.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 10,
    });

    const intent = completion.choices[0]?.message?.content?.trim().toLowerCase() as Intent;

    // Validate intent
    if (!['confirm', 'cancel', 'reschedule', 'unknown'].includes(intent)) {
      throw new Error(`Invalid intent from Groq: ${intent}`);
    }

    return {
      intent,
      confidence: 0.9,
      method: 'groq',
      rawResponse: completion,
    };
  }

  /**
   * Fallback: Cloudflare Workers AI intent detection
   * Uses @cf/meta/llama-3.1-8b-instruct
   */
  private async detectWithWorkersAI(message: string): Promise<IntentResult> {
    if (!this.ai) {
      throw new Error('Workers AI not available');
    }

    const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: `Classify this message as: confirm, cancel, reschedule, or unknown.
Respond with ONLY one word.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const intent = response.response?.trim().toLowerCase() as Intent;

    // Validate intent
    if (!['confirm', 'cancel', 'reschedule', 'unknown'].includes(intent)) {
      throw new Error(`Invalid intent from Workers AI: ${intent}`);
    }

    return {
      intent,
      confidence: 0.7,
      method: 'workers-ai',
      rawResponse: response,
    };
  }

  /**
   * Last resort: Simple regex-based intent detection
   * Fast, free, but less accurate
   */
  private detectWithRegex(message: string): IntentResult {
    const normalized = message.toLowerCase().trim();

    // Confirm patterns
    if (
      /(^|\s)(sí|si|yes|ok|confirmo|confirmar|está bien|de acuerdo|perfecto|va|dale|1)/i.test(
        normalized
      )
    ) {
      return { intent: 'confirm', confidence: 0.6, method: 'regex' };
    }

    // Cancel patterns
    if (
      /(^|\s)(no|nop|cancelar|cancel|no puedo|imposible|no voy|2)/i.test(
        normalized
      )
    ) {
      return { intent: 'cancel', confidence: 0.6, method: 'regex' };
    }

    // Reschedule patterns
    if (
      /(cambiar|reagendar|reschedule|otro día|otra hora|mover|posponer|adelantar)/i.test(
        normalized
      )
    ) {
      return { intent: 'reschedule', confidence: 0.6, method: 'regex' };
    }

    // Default: unknown
    return { intent: 'unknown', confidence: 0.3, method: 'regex' };
  }
}

/**
 * Factory function to create IntentDetector from environment
 */
export function createIntentDetector(env: any): IntentDetector {
  return new IntentDetector(env);
}
