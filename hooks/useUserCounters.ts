import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useRealtimeNotifications from "./useRealtimeNotifications";

interface UserCounters {
    unreadCount: number;
    hasPendingAlert: boolean;
    isLoading: boolean;
}

const useUserCounters = (currentUser?: any) => {
    const [counters, setCounters] = useState<UserCounters>({
        unreadCount: 0,
        hasPendingAlert: false,
        isLoading: true
    });

    const router = useRouter();

    const fetchCounters = useCallback(async () => {
        if (!currentUser) {
            setCounters(prev => ({ ...prev, isLoading: false }));
            return;
        }

        try {
            const { data } = await axios.get('/api/user/counters');
            setCounters({
                unreadCount: data.unreadCount,
                hasPendingAlert: data.hasPendingAlert,
                isLoading: false
            });
        } catch (error) {
            console.error("Failed to fetch user counters", error);
            setCounters(prev => ({ ...prev, isLoading: false }));
        }
    }, [currentUser]);

    // Initial fetch
    useEffect(() => {
        fetchCounters();
    }, [fetchCounters]);

    // Realtime subscription - refetch on new message
    useRealtimeNotifications({
        userId: currentUser?.id,
        onNewMessage: (payload) => {
            console.log("UserCounters: New message received, refetching counters...", payload);
            // Refetch counters when new message arrives
            fetchCounters();
        },
    });

    return counters;
};

export default useUserCounters;

