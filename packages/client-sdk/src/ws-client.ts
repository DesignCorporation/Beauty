import { io, Socket } from 'socket.io-client';

export interface BeautyWebSocketOptions {
  wsUrl?: string;
  wsPath?: string;
  withCredentials?: boolean;
  transports?: Array<'websocket' | 'polling'>;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

// Gateway exposes Socket.IO on /socket.io (without /api prefix).
const DEFAULT_WS_PATH = '/socket.io';

export function connectWebSocket(options: BeautyWebSocketOptions = {}): Socket {
  const socket = io(options.wsUrl || window.location.origin, {
    path: options.wsPath || DEFAULT_WS_PATH,
    withCredentials: options.withCredentials ?? true,
    transports: options.transports || ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: options.reconnectionAttempts ?? 5,
    reconnectionDelay: options.reconnectionDelay ?? 1000
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[BeautyWebSocket] init', {
      wsUrl: options.wsUrl || window.location.origin,
      wsPath: options.wsPath || DEFAULT_WS_PATH
    });
  }

  return socket;
}
