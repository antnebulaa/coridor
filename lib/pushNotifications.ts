/**
 * Native push notifications initialization (Capacitor).
 * Registers for FCM token and forwards it to the server.
 * Only runs on native platforms (Android/iOS).
 */

export async function initPushNotifications() {
  if (typeof window === 'undefined') return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    // Register with FCM/APNs
    await PushNotifications.register();

    // Listen for the FCM token
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push Native] Token:', token.value);

      // Send token to our server
      try {
        await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.value,
            platform: Capacitor.getPlatform(),
          }),
        });
      } catch (e) {
        console.error('[Push Native] Failed to register token:', e);
      }
    });

    // Notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push Native] Received in foreground:', notification);
    });

    // User tapped on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push Native] Action performed:', action);
      const data = action.notification.data;

      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.type === 'message' && data?.conversationId) {
        window.location.href = `/fr/inbox/${data.conversationId}`;
      } else if (data?.type === 'application' && data?.listingId) {
        window.location.href = `/fr/dashboard`;
      } else if (data?.type === 'visit') {
        window.location.href = `/fr/calendar`;
      }
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push Native] Registration error:', error);
    });
  } catch (e) {
    console.warn('[Push Native] Init failed:', e);
  }
}
