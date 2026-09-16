'use client';

import { useEffect, useRef, useState } from 'react';

export interface WebSocketEvent {
  type: string;
  message: string;
  payload?: any;
}

export function useWebSocket(onEvent?: (event: WebSocketEvent) => void) {
  const [connected, setConnected] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (typeof window === 'undefined') return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/api/ws';
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connect = () => {
      if (!isMounted.current) return;

      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (isMounted.current) {
            setConnected(true);
            console.log('⚡ Connected to FixFlow Real-Time WebSocket Hub');
          }
        };

        socket.onmessage = (msg) => {
          if (!isMounted.current) return;
          try {
            const event = JSON.parse(msg.data);
            if (onEvent) {
              onEvent(event);
            }
          } catch (e) {
            console.error('Failed to parse WS message', e);
          }
        };

        socket.onclose = () => {
          if (isMounted.current) {
            setConnected(false);
            reconnectTimer = setTimeout(connect, 4000);
          }
        };

        socket.onerror = (err) => {
          // Suppress unmounted development connection resets
          if (isMounted.current && socket?.readyState === WebSocket.OPEN) {
            console.warn('WebSocket warning:', err);
          }
        };
      } catch (err) {
        console.error('Failed to initialize WebSocket:', err);
      }
    };

    connect();

    return () => {
      isMounted.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null; // Prevent reconnect on component unmount
        socket.onerror = null;
        socket.close();
      }
    };
  }, []);

  return { connected };
}