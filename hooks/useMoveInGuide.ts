'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MoveInStep, MoveInStepId } from '@/lib/moveInGuide';

interface MoveInGuideData {
  id: string;
  rentalApplicationId: string;
  storiesShownAt: string | null;
  steps: MoveInStep[];
  createdAt: string;
  updatedAt: string;
}

export function useMoveInGuide(applicationId: string | undefined) {
  const [guide, setGuide] = useState<MoveInGuideData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuide = useCallback(async () => {
    if (!applicationId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/move-in-guide/${applicationId}`);
      if (res.status === 404) {
        setGuide(null);
        setIsLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch guide');

      const data = await res.json();
      setGuide(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchGuide();
  }, [fetchGuide]);

  const toggleStep = useCallback(async (stepId: MoveInStepId) => {
    if (!guide || !applicationId) return;

    const currentStep = guide.steps.find(s => s.id === stepId);
    if (!currentStep) return;

    const newCompleted = !currentStep.completed;

    // Optimistic update
    setGuide(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map(s =>
          s.id === stepId
            ? { ...s, completed: newCompleted, completedAt: newCompleted ? new Date().toISOString() : undefined }
            : s
        ),
      };
    });

    try {
      const res = await fetch(`/api/move-in-guide/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, completed: newCompleted }),
      });

      if (!res.ok) throw new Error('Failed to update step');

      const updated = await res.json();
      setGuide(updated);
    } catch {
      // Revert optimistic update
      setGuide(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: prev.steps.map(s =>
            s.id === stepId
              ? { ...s, completed: !newCompleted, completedAt: currentStep.completedAt }
              : s
          ),
        };
      });
    }
  }, [guide, applicationId]);

  const markStoriesShown = useCallback(async () => {
    if (!applicationId) return;

    try {
      const res = await fetch(`/api/move-in-guide/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storiesShown: true }),
      });

      if (!res.ok) throw new Error('Failed to mark stories shown');

      const updated = await res.json();
      setGuide(updated);
    } catch (err) {
      console.error('Failed to mark stories shown:', err);
    }
  }, [applicationId]);

  return { guide, isLoading, error, toggleStep, markStoriesShown, refetch: fetchGuide };
}
