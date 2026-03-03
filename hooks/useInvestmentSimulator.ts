'use client';

import { useState, useCallback } from 'react';
import type { InvestmentInput, InvestmentResult } from '@/services/InvestmentSimulatorService';

export function useInvestmentSimulator() {
  const [result, setResult] = useState<InvestmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(async (input: InvestmentInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la simulation');
      }

      const data: InvestmentResult = await res.json();
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (name: string, input: InvestmentInput): Promise<{ id: string } | { error: string }> => {
    setError(null);
    try {
      const res = await fetch('/api/simulator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, inputs: input }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || 'Erreur lors de la sauvegarde';
        setError(msg);
        return { error: msg };
      }

      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { error: message };
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    isLoading,
    error,
    simulate,
    save,
    reset,
  };
}
