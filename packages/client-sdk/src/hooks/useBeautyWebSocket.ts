import { useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { connectWebSocket, type BeautyWebSocketOptions } from '../ws-client';

export interface UseBeautyWebSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  error: Error | null;
}

const DEFAULT_OPTIONS: BeautyWebSocketOptions = {};

export function useBeautyWebSocket(options: BeautyWebSocketOptions = DEFAULT_OPTIONS): UseBeautyWebSocketResult {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use JSON.stringify to stabilize options object for dependency array
  const optionsKey = JSON.stringify(options);
  const opts = useMemo(() => options, [optionsKey]);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const instance = connectWebSocket(opts);
    setSocket(instance);

    const onConnect = () => {
      if (mountedRef.current) {
        setIsConnected(true);
        setIsReconnecting(false);
        setError(null);
        if (process.env.NODE_ENV === 'development') {
          console.log('[BeautyWebSocket] connected', { id: instance.id });
        }
      }
    };

    const onDisconnect = (reason: string) => {
      if (mountedRef.current) {
        setIsConnected(false);
        setIsReconnecting(false);
        if (process.env.NODE_ENV === 'development') {
          console.log('[BeautyWebSocket] disconnected', { reason });
        }
      }
    };

    const onReconnectAttempt = () => {
      if (mountedRef.current) {
        setIsReconnecting(true);
      }
    };

    const onError = (err: Error) => {
      if (mountedRef.current) {
        setError(err);
        if (process.env.NODE_ENV === 'development') {
          console.error('[BeautyWebSocket] error', err);
        }
      }
    };

    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);
    instance.io.on('reconnect_attempt', onReconnectAttempt);
    instance.on('error', onError);

    return () => {
      mountedRef.current = false;
      instance.off('connect', onConnect);
      instance.off('disconnect', onDisconnect);
      instance.io.off('reconnect_attempt', onReconnectAttempt);
      instance.off('error', onError);
      // Only close if we created it and it's not a singleton being reused elsewhere 
      // (connectWebSocket returns a singleton instance for same options)
      // instance.close(); // Don't close singleton! connectWebSocket manages it.
    };
  }, [opts]); // opts is stable now

  return {
    socket,
    isConnected,
    isReconnecting,
    error
  };
}
