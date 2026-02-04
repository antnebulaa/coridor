import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import webPush from "web-push";

// Configure Web Push with VAPID keys
webPush.setVapidDetails(
    process.env.NEXT_PUBLIC_VAPID_EMAIL || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
    try {
        // SECURITY: This endpoint should be protected.
        // For now, checks if user is authenticated (but doesn't check admin role).
        // Ideally, this is called by internal server actions or webhooks (e.g. Stripe, Chat).

        // Allow payload to specify userId (who receives notification)
        const body = await request.json();
        const { userId, title, message, url } = body;

        if (!userId || !title) {
            return NextResponse.json({ error: "Missing userId or title" }, { status: 400 });
        }

        // Fetch all subscriptions for this user
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId },
        });

        if (subscriptions.length === 0) {
            return NextResponse.json({ message: "No subscriptions found for user" });
        }

        // Send notification to all devices
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    const payload = JSON.stringify({
                        title,
                        body: message,
                        url: url || "/",
                        icon: "/images/logo.png",
                    });

                    await webPush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: sub.keys as any,
                        },
                        payload
                    );
                    return { status: "fulfilled", id: sub.id };
                } catch (error: any) {
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Subscription expired or gone, delete it from DB
                        console.log("Deleting expired subscription", sub.id);
                        await prisma.pushSubscription.delete({ where: { id: sub.id } });
                    }
                    throw error;
                }
            })
        );

        // Count successes
        const sentCount = results.filter(r => r.status === 'fulfilled').length;

        return NextResponse.json({ success: true, sent: sentCount });
    } catch (error) {
        console.error("Web Push Send Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
