'use client';

import { useEffect } from 'react';

export default function BackButtonHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | null = null;

    async function setup() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import('@capacitor/app');

        const listener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });

        cleanup = () => {
          listener.remove();
        };
      } catch (e) {
        console.warn('BackButtonHandler: setup failed', e);
      }
    }

    setup();

    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}
