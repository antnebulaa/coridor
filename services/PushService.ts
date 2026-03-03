import admin from 'firebase-admin';
import prisma from '@/libs/prismadb';

// Initialize Firebase Admin lazily (once)
function getFirebaseApp() {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[PushService] Firebase credentials missing — native push disabled');
    return null;
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export class PushService {

  /**
   * Send a native push notification to a user via FCM.
   * Complements the existing web push (VAPID) system.
   */
  static async sendToUser(
    userId: string,
    notification: { title: string; body: string; data?: Record<string, string> }
  ): Promise<number> {
    const app = getFirebaseApp();
    if (!app) return 0;

    const tokens = await prisma.pushToken.findMany({
      where: { userId },
    });

    if (tokens.length === 0) return 0;

    const messages = tokens.map((t) => ({
      token: t.token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#C4713B',
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

    try {
      const results = await admin.messaging().sendEach(messages);

      // Clean up invalid tokens
      results.responses.forEach((resp, idx) => {
        if (resp.error?.code === 'messaging/registration-token-not-registered') {
          prisma.pushToken.delete({ where: { id: tokens[idx].id } }).catch(() => {});
        }
      });

      const sent = results.responses.filter((r) => r.success).length;
      console.log(`[PushService] Sent ${sent}/${tokens.length} native push to user ${userId}`);
      return sent;
    } catch (e) {
      console.error('[PushService] sendEach failed:', e);
      return 0;
    }
  }

  // ---- Convenience methods matching existing notification types ----

  static async notifyNewApplication(landlordId: string, listingTitle: string) {
    await this.sendToUser(landlordId, {
      title: 'Nouvelle candidature',
      body: `Vous avez reçu une candidature pour "${listingTitle}"`,
      data: { type: 'application' },
    });
  }

  static async notifyMessage(userId: string, senderName: string, conversationId: string) {
    await this.sendToUser(userId, {
      title: 'Nouveau message',
      body: `${senderName} vous a envoyé un message`,
      data: { type: 'message', conversationId },
    });
  }

  static async notifyVisit(userId: string, listingTitle: string) {
    await this.sendToUser(userId, {
      title: 'Visite programmée',
      body: `Une visite est programmée pour "${listingTitle}"`,
      data: { type: 'visit' },
    });
  }

  static async notifyLeaseReady(tenantId: string) {
    await this.sendToUser(tenantId, {
      title: 'Bail prêt à signer',
      body: 'Votre bail est prêt ! Signez-le directement dans l\'app.',
      data: { type: 'lease' },
    });
  }
}
