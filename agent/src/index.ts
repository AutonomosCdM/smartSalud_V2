/**
 * smartSalud Agent - Cloudflare Worker Entry Point
 *
 * Main entry point for the autonomous appointment management agent.
 * Handles WhatsApp webhooks, durable workflows, and multi-model orchestration.
 */

export { SmartSaludAgent } from './agent';

export interface Env {
  // Durable Object binding
  AGENT: DurableObjectNamespace;

  // Cloudflare Workers AI binding
  AI: any;

  // Secrets (set via wrangler secret)
  GROQ_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_WHATSAPP_NUMBER: string;
  ELEVENLABS_API_KEY: string;

  // Environment variables (set in wrangler.toml)
  BACKEND_API_URL: string;
  ENVIRONMENT: string;
}

/**
 * Main Worker handler
 * Routes incoming requests to appropriate handlers
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        version: '0.1.0',
        environment: env.ENVIRONMENT,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // WhatsApp webhook handler (Twilio)
    if (url.pathname === '/webhook/whatsapp') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      try {
        // Parse Twilio webhook form data
        const formData = await request.formData();
        const from = formData.get('From')?.toString() || '';
        const body = formData.get('Body')?.toString() || '';
        const messageSid = formData.get('MessageSid')?.toString() || '';

        console.log('📱 WhatsApp message received:', {
          from,
          body,
          messageSid,
          timestamp: new Date().toISOString()
        });

        // Route to Durable Object agent for stateful processing
        const id = env.AGENT.idFromName('smartsalud-agent');
        const agent = env.AGENT.get(id);

        const agentResponse = await agent.fetch(new Request(`${url.origin}/agent/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            message: body,
            messageSid
          })
        }));

        const result = await agentResponse.json() as any;

        // Return TwiML response (Twilio expects XML)
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${result.response || 'Mensaje recibido'}</Message>
</Response>`;

        return new Response(twiml, {
          headers: { 'Content-Type': 'text/xml' },
          status: 200
        });
      } catch (error) {
        console.error('❌ WhatsApp webhook error:', error);

        // Return error TwiML
        const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Lo siento, hubo un error procesando tu mensaje. Intenta nuevamente.</Message>
</Response>`;

        return new Response(errorTwiml, {
          headers: { 'Content-Type': 'text/xml' },
          status: 200 // Twilio expects 200 even on errors
        });
      }
    }

    // Durable Object handler (for stateful operations)
    if (url.pathname.startsWith('/agent/')) {
      const id = env.AGENT.idFromName('smartsalud-agent');
      const agent = env.AGENT.get(id);
      return agent.fetch(request);
    }

    // Default 404
    return new Response('Not Found', { status: 404 });
  },

  /**
   * Scheduled worker for proactive appointment reminders
   * Runs every hour to check for appointments 48h in advance
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('🕐 Scheduled worker triggered:', new Date(event.scheduledTime).toISOString());

    // Import scheduled reminders worker
    const { processScheduledReminders } = await import('./workers/scheduled-reminders');

    // Execute reminders workflow
    try {
      const result = await processScheduledReminders(env);
      console.log('✅ Scheduled reminders completed:', result);
    } catch (error) {
      console.error('❌ Scheduled reminders failed:', error);
      // Don't throw - we want the worker to continue running
    }
  }
};
