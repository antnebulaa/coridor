"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeMessagesOptions {
    userId: string | undefined;
    conversationId?: string; // Optional: subscribe to specific conversation for live updates
    onNewMessage?: (payload: any) => void;
    onNewVisit?: (payload: any) => void;
}

/**
 * Hook to subscribe to realtime notifications via Supabase Broadcast
 * 
 * Uses refs for callbacks to prevent constant resubscription when parent components re-render.
 */
const useRealtimeNotifications = ({
    userId,
    conversationId,
    onNewMessage,
    onNewVisit,
}: UseRealtimeMessagesOptions) => {

    // Use refs to hold current callbacks so we don't need to resubscribe when they change
    const onNewMessageRef = useRef(onNewMessage);
    const onNewVisitRef = useRef(onNewVisit);

    // Update refs when props change
    useEffect(() => {
        onNewMessageRef.current = onNewMessage;
        onNewVisitRef.current = onNewVisit;
    }, [onNewMessage, onNewVisit]);

    // Subscribe to USER-LEVEL channel for global notifications
    useEffect(() => {
        if (!supabase || !userId) {
            return;
        }

        console.log('[Realtime] Subscribing to user channel:', userId);

        const channel: RealtimeChannel = supabase
            .channel(`user:${userId}`)
            .on('broadcast', { event: 'new_message' }, (payload) => {
                console.log('[Realtime] User channel - Message received:', payload);
                if (onNewMessageRef.current) onNewMessageRef.current(payload.payload);
            })
            .subscribe((status) => {
                console.log('[Realtime] User channel status:', status);
            });

        return () => {
            if (supabase) supabase.removeChannel(channel);
        };
    }, [userId]); // Removed onNewMessage from deps!

    // Subscribe to CONVERSATION-SPECIFIC channel (optional)
    useEffect(() => {
        if (!supabase || !conversationId) {
            return;
        }

        console.log('[Realtime] Subscribing to conversation:', conversationId);

        const channel: RealtimeChannel = supabase
            .channel(`conversation:${conversationId}`)
            .on('broadcast', { event: 'new_message' }, (payload) => {
                console.log('[Realtime] Conversation channel - Message received:', payload);
                // We rely on user channel for callback generally, but for specific conv updates
                // we can also trigger it if needed. To avoid double alerts, maybe valid check?
                // For now, let's allow it as router.refresh() is idempotent/safe mostly.
                if (onNewMessageRef.current) onNewMessageRef.current(payload.payload);
            })
            .subscribe((status) => {
                console.log('[Realtime] Conversation channel status:', status);
            });

        return () => {
            if (supabase) supabase.removeChannel(channel);
        };
    }, [conversationId]); // Removed onNewMessage from deps!

    // Subscribe to landlord visit notifications
    useEffect(() => {
        if (!supabase || !userId) {
            return;
        }

        console.log('[Realtime] Subscribing to landlord visits:', userId);

        const channel: RealtimeChannel = supabase
            .channel(`landlord:${userId}`)
            .on('broadcast', { event: 'new_visit' }, (payload) => {
                console.log('[Realtime] Visit received:', payload);
                if (onNewVisitRef.current) onNewVisitRef.current(payload.payload);
            })
            .subscribe((status) => {
                console.log('[Realtime] Landlord channel status:', status);
            });

        return () => {
            if (supabase) supabase.removeChannel(channel);
        };
    }, [userId]); // Removed onNewVisit from deps!
};

export default useRealtimeNotifications;
