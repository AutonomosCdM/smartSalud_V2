/**
 * smartSalud Agent - Cloudflare Worker Entry Point
 *
 * Main entry point for the autonomous appointment management agent.
 * Handles WhatsApp webhooks, durable workflows, and multi-model orchestration.
 */

export { SmartSaludAgent } from './agent';
export { DashboardBroadcaster } from './websocket/broadcaster';

export interface Env {
  // Durable Object bindings
  AGENT: DurableObjectNamespace;
  BROADCASTER: DurableObjectNamespace;

  // D1 Database
  DB: D1Database;

  // Cloudflare Workers AI binding
  AI: any;

  // Secrets (set via wrangler secret)
  GROQ_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_WHATSAPP_NUMBER: string;
  ELEVENLABS_API_KEY: string;

  // Environment variables (set in wrangler.toml)
  ENVIRONMENT: string;
}

/**
 * Main Worker handler
 * Routes incoming requests to appropriate handlers
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Root endpoint - Welcome page
    if (url.pathname === '/') {
      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>smartSalud Agent - Sistema Autónomo de Gestión de Citas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 800px;
      padding: 60px 40px;
      text-align: center;
    }
    h1 { color: #667eea; font-size: 48px; margin-bottom: 20px; }
    .subtitle { color: #666; font-size: 20px; margin-bottom: 40px; }
    .status { background: #10b981; color: white; padding: 10px 20px; border-radius: 50px; display: inline-block; margin-bottom: 30px; }
    .endpoints {text-align: left; background: #f7f9fc; padding: 30px; border-radius: 12px; margin-top: 30px; }
    .endpoint { margin-bottom: 15px; font-family: monospace; font-size: 14px; }
    .badge { background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 10px; }
    a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 smartSalud Agent</h1>
    <p class="subtitle">Sistema Autónomo de Gestión de Citas Médicas</p>
    <div class="status">✅ ONLINE - Version 0.1.0</div>

    <div class="endpoints">
      <h2 style="margin-bottom: 20px; color: #333;">API Endpoints</h2>
      <div class="endpoint"><span class="badge">GET</span> <a href="/health">/health</a> - Health check</div>
      <div class="endpoint"><span class="badge">GET</span> <a href="/agent/info">/agent/info</a> - Agent status</div>
      <div class="endpoint"><span class="badge">POST</span> /webhook/whatsapp - WhatsApp webhook</div>
      <div class="endpoint"><span class="badge">POST</span> /agent/workflow/start - Start workflow</div>
      <div class="endpoint"><span class="badge">GET</span> /agent/workflow/status - Workflow status</div>
      <div class="endpoint"><span class="badge">WS</span> /dashboard/ws - WebSocket (Dashboard)</div>
      <div class="endpoint"><span class="badge">GET</span> /voice - Patient voice interface</div>
    </div>

    <p style="margin-top: 40px; color: #999; font-size: 14px;">
      Powered by Cloudflare Workers + Durable Objects + Groq AI<br>
      <a href="https://github.com/autonomos/smartsalud-v3">GitHub</a>
    </p>
  </div>
</body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

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

    // API: Get upcoming appointments from D1
    if (url.pathname === '/api/appointments' && request.method === 'GET') {
      const hours = Number(url.searchParams.get('hours')) || 48;
      const cutoffDate = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const { results } = await env.DB.prepare(
        'SELECT * FROM appointments WHERE appointment_date <= ? ORDER BY appointment_date ASC'
      ).bind(cutoffDate).all();

      return new Response(JSON.stringify(results), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
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

    // Dashboard WebSocket and broadcast endpoints
    if (url.pathname.startsWith('/dashboard/')) {
      const id = env.BROADCASTER.idFromName('dashboard-broadcaster');
      const broadcaster = env.BROADCASTER.get(id);
      return broadcaster.fetch(request);
    }

    // Voice interface (static HTML)
    if (url.pathname === '/voice' || url.pathname === '/voice/') {
      // Serve patient voice interface HTML
      // In production, this should be served from R2 or Workers Assets
      return new Response('Voice interface - see src/voice-interface/patient-view.html', {
        headers: { 'Content-Type': 'text/html' }
      });
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
