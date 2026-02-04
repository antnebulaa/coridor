import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[Supabase Server] URL or Service Role Key not configured. Realtime features disabled.");
}

// Server-side Supabase client with service role (bypasses RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

if (!supabaseAdmin) {
    console.error("[Supabase Server] Failed to initialize supabaseAdmin - Check SUPABASE_SERVICE_ROLE_KEY");
} else {
    console.log("[Supabase Server] supabaseAdmin initialized successfully");
}

/**
 * Helper to send a broadcast and clean up
 */
async function sendBroadcast(channelName: string, event: string, payload: any) {
    if (!supabaseAdmin) {
        console.error("[Broadcast] CANNOT SEND: No supabaseAdmin client");
        return;
    }

    console.log(`[Broadcast] Attempting to send '${event}' to '${channelName}'`);
    const channel = supabaseAdmin.channel(channelName);

    return new Promise<void>((resolve) => {
        // Add timeout to prevent hanging (reduced to 2s)
        const timeout = setTimeout(() => {
            console.error(`[Broadcast] TIMEOUT (2s) waiting for subscription to ${channelName}`);
            // Don't await removal here to avoid locking
            supabaseAdmin?.removeChannel(channel);
            resolve();
        }, 2000);

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                clearTimeout(timeout);
                // console.log(`[Broadcast] Channel ${channelName} SUBSCRIBED, sending payload...`); // noisy log
                try {
                    await channel.send({
                        type: 'broadcast',
                        event,
                        payload
                    });
                    console.log(`[Broadcast] SUCCESS: Sent to ${channelName}`);
                } catch (err) {
                    console.error(`[Broadcast] ERROR sending to ${channelName}:`, err);
                }

                // Proper cleanup
                await supabaseAdmin?.removeChannel(channel);
                resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                clearTimeout(timeout);
                console.error(`[Broadcast] FAILED to subscribe to ${channelName}. Status: ${status}`);
                supabaseAdmin?.removeChannel(channel);
                resolve();
            }
        });
    });
}

/**
 * Broadcast a new message to:
 * 1. The specific conversation channel (for live updates when viewing)
 * 2. All other participants' user channels (for notifications when NOT viewing)
 */
export async function broadcastNewMessage(
    conversationId: string,
    recipientUserIds: string[],
    message: any
) {
    // Broadcast to conversation channel (for viewers of this conversation)
    await sendBroadcast(`conversation:${conversationId}`, 'new_message', message);

    // Broadcast to each recipient's personal channel (for global notifications)
    for (const userId of recipientUserIds) {
        if (userId !== message.senderId) {
            // Add a small delay to avoid choking the single supabaseAdmin socket connection
            // causing timeouts on subsequent subscriptions
            await new Promise(r => setTimeout(r, 50));
            await sendBroadcast(`user:${userId}`, 'new_message', message);
        }
    }
}

/**
 * Broadcast a visit event to a landlord's channel
 */
export async function broadcastNewVisit(landlordId: string, visit: any) {
    await sendBroadcast(`landlord:${landlordId}`, 'new_visit', visit);
}
