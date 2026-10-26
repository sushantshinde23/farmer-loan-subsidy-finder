/**
 * Real-Time WebSocket and Event Delivery Service for Farmer Loan & Subsidy Finder
 * Provides bidirectional communication, automatic reconnect with exponential backoff,
 * SSE fallback, and event dispatching for instant application status and notification updates.
 */

export type RealtimeEventType =
  | 'APPLICATION_STATUS_UPDATED'
  | 'APPLICATION_CREATED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_UPDATED'
  | 'HEARTBEAT'
  | 'CONNECTED';

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  payload: T;
  timestamp: string;
  targetUserId?: string;
}

export type RealtimeEventHandler<T = any> = (event: RealtimeEvent<T>) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private sse: EventSource | null = null;
  private handlers: Map<RealtimeEventType, Set<RealtimeEventHandler>> = new Map();
  private reconnectTimeout: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private isConnecting = false;
  private isManuallyClosed = false;
  private currentUserId: string | null = null;
  private pingInterval: any = null;
  private _isConnected = false;

  constructor() {
    // Listen for storage or auth events if needed
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public setUserId(userId: string | null) {
    this.currentUserId = userId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN && userId) {
      this.send({ type: 'SUBSCRIBE', userId });
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isManuallyClosed = false;
    this.isConnecting = true;

    try {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${wsProtocol}//${host}/ws`;

      console.log(`[RealtimeService] Connecting to WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[RealtimeService] WebSocket connected successfully');
        this._isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Subscribe with current user ID if available
        if (this.currentUserId) {
          this.send({ type: 'SUBSCRIBE', userId: this.currentUserId });
        }

        // Setup client heartbeat ping every 25 seconds
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ type: 'PING' });
          }
        }, 25000);

        this.emitLocalEvent('CONNECTED', { status: 'CONNECTED', transport: 'websocket' });
      };

      this.ws.onmessage = (messageEvent) => {
        try {
          const raw = messageEvent.data;
          const data: RealtimeEvent = JSON.parse(raw);

          if (data.type === 'HEARTBEAT' || (data as any).type === 'PONG') {
            return;
          }

          console.log(`[RealtimeService] Received event: ${data.type}`, data.payload);
          this.dispatch(data);
        } catch (err) {
          console.warn('[RealtimeService] Failed to parse incoming WebSocket message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[RealtimeService] WebSocket encountered an error:', err);
        // Fall back to SSE if WS fails repeatedly
        if (this.reconnectAttempts > 2 && !this.sse) {
          this.startSseFallback();
        }
      };

      this.ws.onclose = () => {
        this._isConnected = false;
        this.isConnecting = false;
        if (this.pingInterval) clearInterval(this.pingInterval);

        if (!this.isManuallyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      console.warn('[RealtimeService] Connection creation failed, falling back:', e);
      this.scheduleReconnect();
    }
  }

  private startSseFallback() {
    if (this.sse || typeof window === 'undefined') return;
    try {
      console.log('[RealtimeService] Starting Server-Sent Events (SSE) fallback stream');
      const sseUrl = `/api/realtime/stream${this.currentUserId ? `?userId=${encodeURIComponent(this.currentUserId)}` : ''}`;
      this.sse = new EventSource(sseUrl);

      this.sse.onopen = () => {
        console.log('[RealtimeService] SSE fallback connected');
        this._isConnected = true;
      };

      this.sse.onmessage = (ev) => {
        try {
          const data: RealtimeEvent = JSON.parse(ev.data);
          this.dispatch(data);
        } catch (parseErr) {
          // ignore heartbeats
        }
      };

      this.sse.onerror = () => {
        if (this.sse) {
          this.sse.close();
          this.sse = null;
        }
      };
    } catch (e) {
      console.warn('[RealtimeService] SSE fallback could not be established:', e);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[RealtimeService] Max reconnection attempts reached. Retrying at longer interval.');
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect();
      }, 30000);
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    console.log(`[RealtimeService] Scheduling reconnect attempt #${this.reconnectAttempts} in ${backoffMs}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, backoffMs);
  }

  public send(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public on<T = any>(type: RealtimeEventType, handler: RealtimeEventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as RealtimeEventHandler);

    return () => {
      const set = this.handlers.get(type);
      if (set) {
        set.delete(handler as RealtimeEventHandler);
      }
    };
  }

  private dispatch(event: RealtimeEvent) {
    // 1. Trigger registered handlers for this event type
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(event);
        } catch (err) {
          console.error(`[RealtimeService] Handler failed for ${event.type}:`, err);
        }
      });
    }

    // 2. Also dispatch a DOM custom event for loose coupling across pages
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`krishi:${event.type.toLowerCase().replace(/_/g, '-')}`, {
          detail: event
        })
      );
    }
  }

  private emitLocalEvent(type: RealtimeEventType, payload: any) {
    this.dispatch({
      type,
      payload,
      timestamp: new Date().toISOString()
    });
  }

  public disconnect() {
    this.isManuallyClosed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    this._isConnected = false;
  }
}

export const realtimeService = new RealtimeService();
