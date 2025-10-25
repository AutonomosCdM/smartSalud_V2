import { DurableObject } from 'cloudflare:workers';

interface WebSocketClient {
  socket: WebSocket;
  connectedAt: number;
  lastPing?: number;
}

export interface BroadcastMessage {
  type: 'WORKFLOW_UPDATE' | 'ESCALATION_ALERT' | 'VOICE_CALL_STARTED' | 'APPOINTMENT_UPDATED';
  data: any;
  timestamp: number;
}

/**
 * DashboardBroadcaster - Durable Object for managing WebSocket connections
 * Handles real-time updates to connected staff dashboards
 */
export class DashboardBroadcaster extends DurableObject {
  private clients: Map<string, WebSocketClient> = new Map();
  private pingInterval?: number;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    // Start ping interval to keep connections alive
    this.startPingInterval();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade endpoint
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    // Broadcast endpoint (called by workflows)
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request);
    }

    // Stats endpoint
    if (url.pathname === '/stats') {
      return this.handleStats();
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    this.ctx.acceptWebSocket(server);

    const clientId = crypto.randomUUID();
    this.clients.set(clientId, {
      socket: server,
      connectedAt: Date.now(),
    });

    console.log(`[DashboardBroadcaster] New client connected: ${clientId}, Total: ${this.clients.size}`);

    // Send initial connection message
    server.send(JSON.stringify({
      type: 'CONNECTED',
      clientId,
      timestamp: Date.now(),
    }));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    try {
      const message: BroadcastMessage = await request.json();

      console.log(`[DashboardBroadcaster] Broadcasting message: ${message.type} to ${this.clients.size} clients`);

      this.broadcast(message);

      return new Response(JSON.stringify({
        success: true,
        clientCount: this.clients.size
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[DashboardBroadcaster] Broadcast error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private handleStats(): Response {
    const stats = {
      connectedClients: this.clients.size,
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        connectedAt: client.connectedAt,
        lastPing: client.lastPing,
        uptime: Date.now() - client.connectedAt,
      })),
    };

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: BroadcastMessage): void {
    const data = JSON.stringify(message);
    const deadClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      try {
        client.socket.send(data);
      } catch (error) {
        console.error(`[DashboardBroadcaster] Failed to send to client ${clientId}:`, error);
        deadClients.push(clientId);
      }
    });

    // Clean up dead connections
    deadClients.forEach(id => {
      console.log(`[DashboardBroadcaster] Removing dead client: ${id}`);
      this.clients.delete(id);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);

      if (data.type === 'PING') {
        // Update last ping time
        const client = Array.from(this.clients.values()).find(c => c.socket === ws);
        if (client) {
          client.lastPing = Date.now();
        }

        // Send PONG response
        ws.send(JSON.stringify({
          type: 'PONG',
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      console.error('[DashboardBroadcaster] Error handling message:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const clientId = Array.from(this.clients.entries()).find(([_, c]) => c.socket === ws)?.[0];

    if (clientId) {
      console.log(`[DashboardBroadcaster] Client disconnected: ${clientId}, code: ${code}, reason: ${reason}`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle WebSocket error
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[DashboardBroadcaster] WebSocket error:', error);

    const clientId = Array.from(this.clients.entries()).find(([_, c]) => c.socket === ws)?.[0];
    if (clientId) {
      this.clients.delete(clientId);
    }
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPingInterval(): void {
    // Ping every 30 seconds
    this.pingInterval = setInterval(() => {
      this.broadcast({
        type: 'WORKFLOW_UPDATE',
        data: { ping: true },
        timestamp: Date.now(),
      });
    }, 30000) as unknown as number;
  }

  /**
   * Cleanup on object destruction
   */
  async alarm(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }
}
