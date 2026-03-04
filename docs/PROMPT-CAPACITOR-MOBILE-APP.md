# Intégration Capacitor — App Mobile Coridor (Android + iOS)

## Contexte

Coridor est une webapp Next.js App Router déployée sur Vercel. On ajoute Capacitor pour créer une app native Android (prioritaire) et iOS qui wrappent l'app web existante en mode WebView (pointant vers l'URL Vercel de production). Aucune réécriture du code existant — on ajoute une couche native par-dessus.

**Approche :** Remote URL mode (WebView → `https://coridor.fr`). L'app mobile est un navigateur amélioré qui donne accès aux APIs natives (caméra, push, haptics, etc.) tout en gardant 100% du code serveur Next.js sur Vercel.

**Priorité :** Android d'abord (publication Google Play), iOS ensuite (TestFlight → App Store).

---

## PHASE 1 — Installation et configuration de base

### 1.1 Installer Capacitor dans le projet existant

```bash
# Core + CLI
npm install @capacitor/core
npm install -D @capacitor/cli

# Initialiser Capacitor
npx cap init "Coridor" "fr.coridor.app" --web-dir out

# Plateformes
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

### 1.2 Configuration Capacitor

Créer/modifier `capacitor.config.ts` à la racine du projet :

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.coridor.app',
  appName: 'Coridor',
  
  // MODE REMOTE : pointe vers l'app Vercel
  // En dev, pointer vers le serveur local
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://coridor.fr',
    cleartext: false, // HTTPS uniquement en prod
    // En dev local, décommenter :
    // url: 'http://192.168.x.x:3000',
    // cleartext: true,
  },
  
  // Plugins config
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FAF7F2', // ivoire Coridor
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT', // texte sombre sur fond clair
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

  // Config Android
  android: {
    allowMixedContent: false,
    backgroundColor: '#FAF7F2',
    buildOptions: {
      // keystorePath: 'keys/coridor.keystore', // Pour la release
      // keystoreAlias: 'coridor',
    },
  },

  // Config iOS
  ios: {
    backgroundColor: '#FAF7F2',
    contentInset: 'automatic',
    scheme: 'Coridor',
  },
};

export default config;
```

### 1.3 Scripts npm

Ajouter dans `package.json` :

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "cap:sync": "npx cap sync",
    "cap:android": "npx cap open android",
    "cap:ios": "npx cap open ios",
    "cap:android:run": "npx cap run android",
    "cap:ios:run": "npx cap run ios",
    "cap:dev:android": "CAPACITOR_SERVER_URL=http://192.168.1.XXX:3000 npx cap run android --livereload",
    "cap:dev:ios": "CAPACITOR_SERVER_URL=http://192.168.1.XXX:3000 npx cap run ios --livereload"
  }
}
```

**Note :** Remplacer `192.168.1.XXX` par l'IP locale réelle du Mac d'Adrien.

### 1.4 .gitignore

Ajouter :

```gitignore
# Capacitor
android/app/build/
android/.gradle/
android/local.properties
ios/App/Pods/
ios/App/output/
*.keystore
```

**NE PAS ignorer** `android/` et `ios/` — ils doivent être versionnés car ils contiennent des configurations natives spécifiques (permissions, icônes, splash, etc.).

---

## PHASE 2 — Plugins natifs essentiels

### 2.1 Plugins à installer

```bash
# Essentiels
npm install @capacitor/app           # Lifecycle (back button, deep links)
npm install @capacitor/status-bar     # Contrôle de la status bar
npm install @capacitor/splash-screen  # Écran de lancement
npm install @capacitor/keyboard       # Gestion clavier mobile
npm install @capacitor/haptics        # Vibrations tactiles
npm install @capacitor/share          # Partage natif (annonces)
npm install @capacitor/browser        # Ouvrir liens externes

# Push Notifications
npm install @capacitor/push-notifications

# Caméra (EDL, photos profil)
npm install @capacitor/camera

# Stockage local (cache offline, préférences)
npm install @capacitor/preferences

# Réseau (détecter online/offline)
npm install @capacitor/network

# Toast natif
npm install @capacitor/toast

# Après installation de tous les plugins :
npx cap sync
```

### 2.2 Service de détection plateforme

Créer `lib/platform.ts` :

```typescript
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isWeb = Capacitor.getPlatform() === 'web';

/**
 * Exécute une fonction uniquement en contexte natif.
 * Retourne le fallback (ou undefined) en mode web.
 */
export async function nativeOnly<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (isNative) {
    return fn();
  }
  return fallback;
}
```

### 2.3 Gestion du bouton retour Android

Créer `components/native/BackButtonHandler.tsx` :

```typescript
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';

export function BackButtonHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handler = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // Sur la page d'accueil, demander confirmation avant de quitter
        App.exitApp();
      }
    });

    return () => {
      handler.then(h => h.remove());
    };
  }, [router]);

  return null;
}
```

Intégrer dans `app/[locale]/layout.tsx` :

```tsx
import { BackButtonHandler } from '@/components/native/BackButtonHandler';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <BackButtonHandler />
        {children}
      </body>
    </html>
  );
}
```

### 2.4 Push Notifications

Créer `lib/pushNotifications.ts` :

```typescript
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  // Demander la permission
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  // S'enregistrer
  await PushNotifications.register();

  // Écouter le token FCM
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push token:', token.value);
    
    // Envoyer le token au serveur pour l'associer à l'utilisateur
    await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: token.value,
        platform: Capacitor.getPlatform() 
      }),
    });
  });

  // Écouter les notifications reçues (app au premier plan)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
    // Afficher un toast ou une notification in-app
  });

  // Écouter les clics sur les notifications
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push action:', action);
    const data = action.notification.data;
    
    // Navigation selon le type de notification
    if (data.type === 'rent_reminder') {
      window.location.href = `/fr/dashboard/payments`;
    } else if (data.type === 'new_application') {
      window.location.href = `/fr/properties/${data.propertyId}/applications`;
    } else if (data.type === 'message') {
      window.location.href = `/fr/messages/${data.conversationId}`;
    } else if (data.type === 'guide') {
      window.location.href = `/fr/guide`;
    }
  });

  // Erreur d'enregistrement
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
  });
}
```

**API route côté serveur :**

Créer `app/api/push/register/route.ts` :

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token, platform } = await request.json();

  await prisma.pushToken.upsert({
    where: {
      userId_platform: {
        userId: session.user.id,
        platform,
      },
    },
    update: { token, updatedAt: new Date() },
    create: {
      userId: session.user.id,
      token,
      platform,
    },
  });

  return NextResponse.json({ success: true });
}
```

**Modèle Prisma :**

```prisma
model PushToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String
  platform  String   // "android" | "ios"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, platform])
}
```

### 2.5 Caméra native (pour EDL)

Créer `hooks/useNativeCamera.ts` :

```typescript
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export function useNativeCamera() {
  
  const takePhoto = async (): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback web : utiliser input file
      return null; 
    }
    
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080,
        correctOrientation: true,
      });
      
      return image.base64String 
        ? `data:image/${image.format};base64,${image.base64String}` 
        : null;
    } catch (error) {
      console.error('Camera error:', error);
      return null;
    }
  };

  const pickFromGallery = async (): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) return null;
    
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 1920,
        height: 1080,
      });
      
      return image.base64String 
        ? `data:image/${image.format};base64,${image.base64String}` 
        : null;
    } catch (error) {
      console.error('Gallery error:', error);
      return null;
    }
  };

  return { 
    takePhoto, 
    pickFromGallery, 
    isNative: Capacitor.isNativePlatform() 
  };
}
```

### 2.6 Partage natif des annonces

Créer `hooks/useNativeShare.ts` :

```typescript
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export function useNativeShare() {
  
  const shareListing = async (listing: {
    title: string;
    address: string;
    rent: number;
    id: string;
  }) => {
    const url = `https://coridor.fr/fr/listings/${listing.id}`;
    const text = `${listing.title} — ${listing.rent}€/mois à ${listing.address}`;
    
    if (Capacitor.isNativePlatform()) {
      await Share.share({
        title: listing.title,
        text: text,
        url: url,
        dialogTitle: 'Partager cette annonce',
      });
    } else {
      // Fallback web : navigator.share ou copier le lien
      if (navigator.share) {
        await navigator.share({ title: listing.title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        // Afficher un toast "Lien copié"
      }
    }
  };

  return { shareListing };
}
```

### 2.7 Détection réseau (online/offline)

Créer `hooks/useNetworkStatus.ts` :

```typescript
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Natif : utiliser le plugin Network
      Network.getStatus().then(status => {
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
      });

      const handler = Network.addListener('networkStatusChange', status => {
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
      });

      return () => { handler.then(h => h.remove()); };
    } else {
      // Web : utiliser navigator.onLine
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
```

### 2.8 Composant offline banner

Créer `components/native/OfflineBanner.tsx` :

```typescript
'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-center py-2 text-sm font-medium safe-top">
      Pas de connexion internet — certaines fonctionnalités sont indisponibles
    </div>
  );
}
```

---

## PHASE 3 — Safe Area et adaptations mobiles

### 3.1 Safe Area CSS

L'app tourne dans une WebView et doit respecter les safe areas (notch iPhone, barre de navigation Android, etc.).

Ajouter dans `app/globals.css` :

```css
/* Safe area insets pour Capacitor */
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

/* Classe utilitaire pour le padding top (header) */
.safe-top {
  padding-top: var(--safe-area-top);
}

/* Classe utilitaire pour le padding bottom (nav, boutons sticky) */
.safe-bottom {
  padding-bottom: var(--safe-area-bottom);
}

/* Le body doit avoir le viewport-fit=cover */
/* Ajouté via le meta viewport dans layout.tsx */
```

### 3.2 Meta viewport

Modifier le `<head>` dans `app/[locale]/layout.tsx` :

```tsx
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" 
/>
```

- `viewport-fit=cover` : permet d'utiliser tout l'écran (sous le notch)
- `maximum-scale=1.0, user-scalable=no` : empêche le zoom involontaire sur les inputs (comportement natif)

### 3.3 Initialisation au démarrage

Créer `components/native/CapacitorInit.tsx` :

```typescript
'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { initPushNotifications } from '@/lib/pushNotifications';

export function CapacitorInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const init = async () => {
      // Status bar transparente avec texte sombre
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#FAF7F2' });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setOverlaysWebView({ overlay: false });
        }
      } catch (e) {
        console.warn('StatusBar error:', e);
      }

      // Masquer le splash screen
      await SplashScreen.hide();

      // Init push notifications (demande permission)
      await initPushNotifications();

      // Keyboard : scroll automatique vers l'input actif
      Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('keyboard-open');
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
      });
    };

    init();
  }, []);

  return null;
}
```

Intégrer dans le layout racine :

```tsx
import { CapacitorInit } from '@/components/native/CapacitorInit';
import { BackButtonHandler } from '@/components/native/BackButtonHandler';
import { OfflineBanner } from '@/components/native/OfflineBanner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <CapacitorInit />
        <BackButtonHandler />
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
```

---

## PHASE 4 — Assets et branding

### 4.1 Icône de l'app

Préparer une icône source de 1024×1024px (PNG, pas de transparence pour iOS).

Installer le plugin de génération :

```bash
npm install -D @capacitor/assets
```

Placer les fichiers sources :

```
assets/
  icon-only.png          ← 1024×1024, icône Coridor (cuivre sur fond ivoire)
  icon-foreground.png    ← 1024×1024, premier plan (pour adaptive icon Android)
  icon-background.png    ← 1024×1024, arrière-plan uni (ivoire #FAF7F2)
  splash.png             ← 2732×2732, écran de lancement (logo centré)
  splash-dark.png        ← 2732×2732, version dark mode
```

Générer les assets :

```bash
npx capacitor-assets generate
```

Cela génère automatiquement toutes les tailles requises pour Android et iOS.

### 4.2 Splash screen

Le splash screen affiche le logo Coridor centré sur fond ivoire (#FAF7F2).

Design :
- Fond : `#FAF7F2` (ivoire Coridor)
- Logo : logo Coridor cuivre centré, ~40% de la largeur de l'écran
- Pas de spinner, pas de texte
- Durée : 2 secondes max (masqué automatiquement quand l'app est prête)
- Version dark mode : fond `#1A1A1A` (encre), logo blanc/cuivre

---

## PHASE 5 — Deep links

### 5.1 Configuration

Les deep links permettent d'ouvrir l'app mobile quand l'utilisateur clique sur un lien `coridor.fr` depuis n'importe où (email, SMS, autre app).

**Android — `android/app/src/main/AndroidManifest.xml` :**

Ajouter dans l'`<activity>` principale :

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="coridor.fr" />
</intent-filter>
```

**iOS — dans Xcode :**

Ajouter un Associated Domain : `applinks:coridor.fr`

**Côté serveur Vercel :**

Créer `public/.well-known/assetlinks.json` (Android) :

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "fr.coridor.app",
    "sha256_cert_fingerprints": ["XX:XX:XX:..."]
  }
}]
```

Créer `public/.well-known/apple-app-site-association` (iOS) :

```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.fr.coridor.app",
      "paths": ["*"]
    }]
  }
}
```

### 5.2 Gestion côté app

Le listener dans `CapacitorInit.tsx` gère déjà les deep links via le plugin `@capacitor/app` :

```typescript
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', (event) => {
  // event.url = "https://coridor.fr/fr/listings/abc123"
  const path = new URL(event.url).pathname;
  // Next.js router navigue vers ce path
  window.location.href = path;
});
```

---

## PHASE 6 — Firebase Cloud Messaging (Push)

### 6.1 Android

Firebase est requis pour les push notifications Android.

1. Créer un projet Firebase (console.firebase.google.com)
2. Ajouter une app Android (`fr.coridor.app`)
3. Télécharger `google-services.json` et le placer dans `android/app/`
4. Les dépendances Gradle sont ajoutées automatiquement par le plugin `@capacitor/push-notifications`

### 6.2 iOS (quand on y sera)

1. Ajouter une app iOS dans le même projet Firebase
2. Télécharger `GoogleService-Info.plist` → `ios/App/App/`
3. Configurer les APNs (Apple Push Notification service) dans Firebase
4. Activer la capability "Push Notifications" dans Xcode

### 6.3 Service d'envoi côté serveur

Créer `services/PushService.ts` :

```typescript
import admin from 'firebase-admin';
import { prisma } from '@/lib/prisma';

// Initialiser Firebase Admin (une seule fois)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export class PushService {
  
  /**
   * Envoyer une notification push à un utilisateur
   */
  static async sendToUser(
    userId: string, 
    notification: { title: string; body: string; data?: Record<string, string> }
  ) {
    const tokens = await prisma.pushToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) return;

    const messages = tokens.map(t => ({
      token: t.token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#C4713B', // cuivre Coridor
          channelId: 'coridor_default',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    }));

    const results = await admin.messaging().sendEach(messages);
    
    // Nettoyer les tokens invalides
    results.responses.forEach((resp, idx) => {
      if (resp.error?.code === 'messaging/registration-token-not-registered') {
        prisma.pushToken.delete({ where: { id: tokens[idx].id } });
      }
    });
  }

  /**
   * Notifications types Coridor
   */
  static async notifyNewApplication(landlordId: string, listingTitle: string, propertyId: string) {
    await this.sendToUser(landlordId, {
      title: 'Nouvelle candidature',
      body: `Vous avez reçu une candidature pour "${listingTitle}"`,
      data: { type: 'new_application', propertyId },
    });
  }

  static async notifyRentReminder(tenantId: string, amount: string) {
    await this.sendToUser(tenantId, {
      title: 'Rappel de loyer',
      body: `Votre loyer de ${amount}€ est dû dans 3 jours`,
      data: { type: 'rent_reminder' },
    });
  }

  static async notifyMessage(userId: string, senderName: string, conversationId: string) {
    await this.sendToUser(userId, {
      title: 'Nouveau message',
      body: `${senderName} vous a envoyé un message`,
      data: { type: 'message', conversationId },
    });
  }

  static async notifyLeaseReady(tenantId: string, leaseId: string) {
    await this.sendToUser(tenantId, {
      title: 'Bail prêt à signer',
      body: 'Votre bail est prêt ! Signez-le directement dans l\'app.',
      data: { type: 'lease_ready', leaseId },
    });
  }

  static async notifyGuideAvailable(userId: string) {
    await this.sendToUser(userId, {
      title: 'Guide du Savoir-Vivre',
      body: 'Votre guide du savoir-vivre locatif est prêt ! Découvrez-le.',
      data: { type: 'guide' },
    });
  }

  static async notifyDepositReturned(tenantId: string, amount: string) {
    await this.sendToUser(tenantId, {
      title: 'Dépôt de garantie restitué',
      body: `Votre dépôt de ${amount}€ a été restitué`,
      data: { type: 'deposit_returned' },
    });
  }
}
```

---

## PHASE 7 — Adaptations UX spécifiques mobile

### 7.1 Navigation bottom tab bar

Sur mobile natif, remplacer la sidebar desktop par une bottom tab bar :

```
┌────────────────────────────────────┐
│                                    │
│         [Contenu page]             │
│                                    │
├────────────────────────────────────┤
│  🏠       🔍      💬     👤      │
│ Accueil  Annonces Messages Profil  │
└────────────────────────────────────┘
```

Créer `components/native/BottomTabBar.tsx` :

```typescript
'use client';

import { Capacitor } from '@capacitor/core';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Search, MessageCircle, User } from 'lucide-react';

const TABS = [
  { href: '/fr/dashboard', icon: Home, label: 'Accueil' },
  { href: '/fr/listings', icon: Search, label: 'Annonces' },
  { href: '/fr/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/fr/profile', icon: User, label: 'Profil' },
];

export function BottomTabBar() {
  const pathname = usePathname();
  
  // Afficher uniquement en contexte natif OU sur mobile web
  // (optionnel : tu peux aussi l'afficher sur mobile web)
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 safe-bottom md:hidden">
      <div className="flex justify-around items-center h-14">
        {TABS.map(tab => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full
                ${isActive ? 'text-amber-600' : 'text-neutral-400'}`}
            >
              <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Note :** La bottom tab bar est utile aussi pour la PWA mobile, pas uniquement Capacitor. L'afficher sur `md:hidden` (mobile) quelle que soit la plateforme.

### 7.2 Haptics sur les actions clés

Ajouter du feedback tactile sur les actions importantes :

```typescript
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function hapticLight() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticSuccess() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.notification({ type: NotificationType.Success });
}

export async function hapticError() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.notification({ type: NotificationType.Error });
}
```

Utiliser dans les composants :
- `hapticLight()` → tap sur un bouton, changement de tab
- `hapticSuccess()` → candidature envoyée, bail signé, EDL terminé
- `hapticError()` → erreur de formulaire, paiement échoué

---

## FICHIERS

### Nouveaux fichiers (15)

| Fichier | Rôle |
|---------|------|
| `capacitor.config.ts` | Configuration Capacitor |
| `android/` | Projet Android Studio (auto-généré) |
| `ios/` | Projet Xcode (auto-généré) |
| `lib/platform.ts` | Détection plateforme (isNative, isAndroid, isIOS) |
| `lib/pushNotifications.ts` | Init + listeners push notifications |
| `lib/haptics.ts` | Wrappers feedback tactile |
| `hooks/useNativeCamera.ts` | Hook caméra native (EDL) |
| `hooks/useNativeShare.ts` | Hook partage natif (annonces) |
| `hooks/useNetworkStatus.ts` | Hook détection online/offline |
| `components/native/CapacitorInit.tsx` | Initialisation au démarrage |
| `components/native/BackButtonHandler.tsx` | Gestion bouton retour Android |
| `components/native/OfflineBanner.tsx` | Bannière mode hors-ligne |
| `components/native/BottomTabBar.tsx` | Navigation tab bar mobile |
| `services/PushService.ts` | Envoi push côté serveur (Firebase) |
| `app/api/push/register/route.ts` | API enregistrement token push |

### Fichiers modifiés (4)

| Fichier | Modification |
|---------|-------------|
| `package.json` | Dépendances Capacitor + scripts |
| `.gitignore` | Exclusions build natif |
| `app/[locale]/layout.tsx` | CapacitorInit + BackButtonHandler + OfflineBanner + meta viewport |
| `app/globals.css` | Variables CSS safe-area |

### Modèle Prisma

```prisma
model PushToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String
  platform  String   // "android" | "ios"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, platform])
}
```

---

## PUBLICATION

### Google Play Store

1. **Créer le compte** : console.play.google.com → 25$ one-time
2. **Générer la release APK/AAB** :
   ```bash
   cd android
   ./gradlew assembleRelease   # APK
   ./gradlew bundleRelease     # AAB (recommandé pour le store)
   ```
3. **Signer l'app** : générer un keystore (`keytool -genkey ...`), configurer dans `android/app/build.gradle`
4. **Fiche store** : titre, description, screenshots (min 2), icône, catégorie "Finance" ou "Maison & Propriété"
5. **Test interne** : uploader l'AAB → test interne → inviter les beta testeurs par email
6. **Publication** : quand les tests sont OK → promouvoir en production → review Google (24-72h)

### App Store (quand prêt)

1. **Compte Apple Developer** : developer.apple.com → 99$/an
2. **Build dans Xcode** : `npx cap open ios` → Product → Archive → Upload to App Store Connect
3. **TestFlight** : distribuer aux beta testeurs (jusqu'à 10 000)
4. **Publication** : soumettre pour review Apple (24h-7j, plus strict)

---

## SÉQUENCE D'IMPLÉMENTATION

### Sprint 1 — Fondation (1-2 jours)
- [ ] Installer Capacitor + plugins de base
- [ ] Configurer `capacitor.config.ts` en mode remote URL
- [ ] Générer les projets android/ et ios/
- [ ] Safe area CSS + meta viewport
- [ ] CapacitorInit + BackButtonHandler
- [ ] Tester sur phone Android en USB
- [ ] Vérifier que toute l'app fonctionne dans la WebView

### Sprint 2 — Features natives (1-2 jours)
- [ ] Push notifications (Firebase + PushService)
- [ ] Caméra native (intégrer dans EDL)
- [ ] Partage natif (annonces)
- [ ] Haptics sur les actions clés
- [ ] Détection réseau + OfflineBanner
- [ ] BottomTabBar mobile

### Sprint 3 — Branding + Polish (1 jour)
- [ ] Icône app (1024×1024, palette Coridor)
- [ ] Splash screen (logo cuivre sur fond ivoire)
- [ ] Générer tous les assets (`capacitor-assets generate`)
- [ ] Deep links (assetlinks.json + AASA)
- [ ] Tester deep links depuis email

### Sprint 4 — Publication (1 jour)
- [ ] Créer le compte Google Play Developer (25$)
- [ ] Préparer la fiche store (screenshots, description)
- [ ] Signer l'app (keystore)
- [ ] Uploader en test interne
- [ ] Inviter les beta testeurs
- [ ] Valider avec les retours → publier en production

---

## VÉRIFICATIONS

- [ ] `npx cap sync` → 0 erreurs
- [ ] App Android s'ouvre et charge coridor.fr correctement
- [ ] Safe area respectée (pas de contenu sous le notch/status bar)
- [ ] Bouton retour Android fonctionne (back = historique, home = exit)
- [ ] Push notifications : permission demandée, token enregistré en base
- [ ] Push notifications : notification reçue en foreground et background
- [ ] Clic sur notification → navigation vers la bonne page
- [ ] Caméra native fonctionne (prendre photo + galerie)
- [ ] Partage natif fonctionne (annonces)
- [ ] Haptics sur bouton postuler, signature, complétion EDL
- [ ] Bannière offline affichée quand pas de connexion
- [ ] Splash screen affiché puis masqué au chargement
- [ ] Icône app correcte sur le home screen
- [ ] Deep link : clic sur lien coridor.fr → ouvre l'app
- [ ] Bottom tab bar affichée sur mobile, masquée sur desktop
- [ ] Build Android release : `./gradlew bundleRelease` → 0 erreurs
- [ ] npm run build → 0 erreurs (pas de régression web)
- [ ] L'app web continue de fonctionner normalement dans le navigateur
