'use client';

import { useState, useEffect } from 'react';
import { PassportCompletionData } from '@/lib/passportCompletion';

interface UsePassportCompletionResult {
    data: PassportCompletionData | null;
    isLoading: boolean;
    error: string | null;
}

// Default discovery state (no data yet)
const DISCOVERY_DEFAULT: PassportCompletionData = {
    percent: 0,
    state: 'discovery',
    earnedBadges: [],
    nextStep: null,
    remainingSteps: [],
    overallScore: null,
    percentileRank: null,
};

export default function usePassportCompletion(): UsePassportCompletionResult {
    const [data, setData] = useState<PassportCompletionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchCompletion() {
            try {
                const res = await fetch('/api/passport/completion');

                if (!res.ok) {
                    if (res.status === 404) {
                        // No tenant profile — show discovery state
                        if (!cancelled) setData(DISCOVERY_DEFAULT);
                        return;
                    }
                    throw new Error('Failed to fetch passport completion');
                }

                const json = await res.json();
                if (!cancelled) setData(json);
            } catch (err: any) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        fetchCompletion();

        return () => { cancelled = true; };
    }, []);

    return { data, isLoading, error };
}
