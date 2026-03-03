'use client';

import { useEffect } from 'react';

export default function CapacitorInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function init() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        // --- StatusBar ---
        try {
          const { StatusBar, Style } = await import('@capacitor/status-bar');
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#FAF7F2' });
          if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setOverlaysWebView({ overlay: false });
          }
        } catch (e) {
          console.warn('CapacitorInit: StatusBar error', e);
        }

        // --- SplashScreen ---
        try {
          const { SplashScreen } = await import('@capacitor/splash-screen');
          await SplashScreen.hide();
        } catch (e) {
          console.warn('CapacitorInit: SplashScreen error', e);
        }

        // --- Keyboard ---
        try {
          const { Keyboard } = await import('@capacitor/keyboard');
          await Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-open');
          });
          await Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-open');
          });
        } catch (e) {
          console.warn('CapacitorInit: Keyboard error', e);
        }

        // --- Push Notifications ---
        try {
          const { initPushNotifications } = await import('@/lib/pushNotifications');
          await initPushNotifications();
        } catch (e) {
          console.warn('CapacitorInit: Push error', e);
        }

        // --- Deep Links ---
        try {
          const { App } = await import('@capacitor/app');
          App.addListener('appUrlOpen', (event) => {
            const url = new URL(event.url);
            if (url.hostname === 'coridor.fr') {
              window.location.href = url.pathname + url.search;
            }
          });
        } catch (e) {
          console.warn('CapacitorInit: Deep links error', e);
        }
      } catch (e) {
        console.warn('CapacitorInit: setup failed', e);
      }
    }

    init();
  }, []);

  return null;
}
