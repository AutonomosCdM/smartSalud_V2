import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: number;
  clientId?: string;
}

export interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[useWebSocket] Already connected');
      return;
    }

    console.log(`[useWebSocket] Connecting to ${url}...`);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[useWebSocket] Connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();

        // Start ping interval
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
          }
        }, 30000);

        // Store interval for cleanup
        (ws as any).__pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          // Skip ping/pong messages
          if (message.type === 'PONG' || message.data?.ping) {
            return;
          }

          console.log('[useWebSocket] Message received:', message.type);

          setLastMessage(message);
          setMessages((prev) => [...prev, message]);
        } catch (error) {
          console.error('[useWebSocket] Failed to parse message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[useWebSocket] Disconnected');
        setConnected(false);
        onDisconnect?.();

        // Clear ping interval
        if ((ws as any).__pingInterval) {
          clearInterval((ws as any).__pingInterval);
        }

        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[useWebSocket] Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('[useWebSocket] Max reconnect attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('[useWebSocket] Error:', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[useWebSocket] Connection error:', error);
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[useWebSocket] Cannot send message, not connected');
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    messages,
    lastMessage,
    send,
    clearMessages,
    reconnect: connect,
    disconnect,
  };
}
