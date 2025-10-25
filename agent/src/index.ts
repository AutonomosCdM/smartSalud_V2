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

  // Secrets (set via wrangler secret)
  GROQ_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  WHATSAPP_TOKEN: string;

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

    // WhatsApp webhook handler
    if (url.pathname === '/webhook/whatsapp') {
      // TODO: Implement WhatsApp webhook handling
      return new Response('WhatsApp webhook - Coming soon', { status: 501 });
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
    // TODO: Implement scheduled proactive reminders
    console.log('Scheduled worker triggered:', new Date(event.scheduledTime).toISOString());
  }
};
