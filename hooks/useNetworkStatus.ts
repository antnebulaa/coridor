'use client';

import { useState, useEffect } from 'react';
import { isNative } from '@/lib/platform';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    if (isNative()) {
      let cleanup: (() => void) | null = null;

      async function setup() {
        try {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);

          const listener = await Network.addListener('networkStatusChange', (s) => {
            setIsOnline(s.connected);
            setConnectionType(s.connectionType);
          });

          cleanup = () => { listener.remove(); };
        } catch (e) {
          console.warn('Network plugin error:', e);
        }
      }

      setup();
      return () => { cleanup?.(); };
    } else {
      setIsOnline(navigator.onLine);
      const online = () => setIsOnline(true);
      const offline = () => setIsOnline(false);
      window.addEventListener('online', online);
      window.addEventListener('offline', offline);
      return () => {
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offline);
      };
    }
  }, []);

  return { isOnline, connectionType };
}
