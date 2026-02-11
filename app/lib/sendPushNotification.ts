import prisma from "@/libs/prismadb";
import webPush from "web-push";

// Configure VAPID keys
try {
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webPush.setVapidDetails(
            process.env.NEXT_PUBLIC_VAPID_EMAIL || "mailto:admin@example.com",
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    } else {
        console.warn("VAPID keys are missing. Push notifications will not work.");
    }
} catch (error) {
    console.error("Failed to set VAPID details:", error);
}

interface PushNotificationOptions {
    userId: string;
    title: string;
    body: string;
    url: string;
    icon?: string;
    type?: 'message' | 'visit' | 'application' | 'like'; // NEW: Notification type for preferences
}

/**
 * Send a push notification to a specific user across all their devices
 * Respects user's notification preferences and Do Not Disturb hours
 * @param options Notification details (userId, title, body, url, icon, type)
 * @returns Number of successfully sent notifications
 */
export async function sendPushNotification(options: PushNotificationOptions): Promise<number> {
    const { userId, title, body, url, icon = "/icon.png", type } = options;

    try {
        // Check user preferences
        const preferences = await prisma.notificationPreferences.findUnique({
            where: { userId },
        });

        // If preferences exist, check if this notification type is enabled
        if (preferences) {
            const typeEnabled = {
                message: preferences.enableMessages,
                visit: preferences.enableVisits,
                application: preferences.enableApplications,
                like: preferences.enableLikes,
            };

            if (type && !typeEnabled[type]) {
                console.log(`[Push] Notification type "${type}" is disabled for user ${userId}`);
                return 0;
            }

            // Check Do Not Disturb hours
            if (preferences.dndStartHour !== null && preferences.dndEndHour !== null) {
                const now = new Date();
                const currentHour = now.getHours();
                const { dndStartHour, dndEndHour } = preferences;

                // Handle DND spanning midnight
                const isInDND = dndStartHour < dndEndHour
                    ? (currentHour >= dndStartHour && currentHour < dndEndHour)
                    : (currentHour >= dndStartHour || currentHour < dndEndHour);

                if (isInDND) {
                    console.log(`[Push] DND active for user ${userId} (${currentHour}:00)`);
                    return 0;
                }
            }
        }

        // Fetch all subscriptions for this user
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId },
        });

        if (subscriptions.length === 0) {
            console.log(`[Push] No subscriptions found for user ${userId}`);
            return 0;
        }

        console.log(`[Push] Sending to ${subscriptions.length} device(s) for user ${userId}`);

        // Prepare notification payload
        const payload = JSON.stringify({
            title,
            body,
            url,
            icon,
        });

        // Send to all devices
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webPush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: sub.keys as any,
                        },
                        payload
                    );
                    return { status: 'fulfilled', id: sub.id };
                } catch (error: any) {
                    console.error(`[Push] Failed for subscription ${sub.id}:`, error.statusCode, error.message);

                    // Delete expired subscriptions
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        console.log(`[Push] Deleting expired subscription ${sub.id}`);
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    }
                    throw error;
                }
            })
        );

        // Count successful sends
        const sentCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[Push] Successfully sent to ${sentCount}/${subscriptions.length} devices`);

        return sentCount;
    } catch (error) {
        console.error("[Push] Error sending notification:", error);
        return 0;
    }
}
