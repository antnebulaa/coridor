import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.coridor.app',
  appName: 'Coridor',
  webDir: 'out',

  // Remote URL mode: WebView loads from Vercel deployment
  // In dev, set CAPACITOR_SERVER_URL=http://192.168.x.x:3000
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://coridor.fr',
    cleartext: !!process.env.CAPACITOR_SERVER_URL, // Allow HTTP in dev only
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FAF7F2',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FAF7F2',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#FAF7F2',
  },

  ios: {
    backgroundColor: '#FAF7F2',
    contentInset: 'automatic',
    scheme: 'Coridor',
  },
};

export default config;
