import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

    useEffect(() => {
        let isMounted = true;

        const fetchCounters = async () => {
            if (!currentUser) {
                if (isMounted) {
                    setCounters(prev => ({ ...prev, isLoading: false }));
                }
                return;
            }

            try {
                const { data } = await axios.get('/api/user/counters');
                if (isMounted) {
                    setCounters({
                        unreadCount: data.unreadCount,
                        hasPendingAlert: data.hasPendingAlert,
                        isLoading: false
                    });
                }
            } catch (error) {
                console.error("Failed to fetch user counters", error);
                if (isMounted) {
                    setCounters(prev => ({ ...prev, isLoading: false }));
                }
            }
        };

        fetchCounters();

        return () => {
            isMounted = false;
        };
    }, [currentUser]); // Re-fetch if user changes, or add a polling interval/trigger here if needed

    return counters;
};

export default useUserCounters;
