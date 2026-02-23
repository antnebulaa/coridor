'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DepositDeduction, DepositResolution } from '@prisma/client';

type DeductionWithElement = DepositDeduction & {
  element?: {
    id: string;
    name: string;
    category: string;
    nature: string[];
  } | null;
};

export function useDepositDeductions(inspectionId: string | undefined) {
  const [deductions, setDeductions] = useState<DeductionWithElement[]>([]);
  const [resolution, setResolution] = useState<DepositResolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Fetch deductions ───

  const fetchDeductions = useCallback(async () => {
    if (!inspectionId) return;
    try {
      const res = await fetch(`/api/inspection/${inspectionId}/deductions`);
      if (res.ok) {
        const data = await res.json();
        setDeductions(data);
      }
    } catch {
      // Silent fail
    }
  }, [inspectionId]);

  // ─── Fetch resolution ───

  const fetchResolution = useCallback(async () => {
    if (!inspectionId) return;
    try {
      const res = await fetch(`/api/inspection/${inspectionId}/deposit-resolution`);
      if (res.ok) {
        const data = await res.json();
        setResolution(data);
      }
    } catch {
      // Silent fail
    }
  }, [inspectionId]);

  useEffect(() => {
    if (!inspectionId) {
      setIsLoading(false);
      return;
    }
    Promise.all([fetchDeductions(), fetchResolution()]).finally(() => setIsLoading(false));
  }, [inspectionId, fetchDeductions, fetchResolution]);

  // ─── Add deduction (optimistic) ───

  const addDeduction = useCallback(async (data: {
    elementId?: string;
    description: string;
    repairCostCents: number;
    photoUrl?: string;
    entryPhotoUrl?: string;
  }) => {
    if (!inspectionId) return;

    // Optimistic: add with temp ID
    const tempId = `temp_${Date.now()}`;
    const tempDeduction: DeductionWithElement = {
      id: tempId,
      inspectionId,
      elementId: data.elementId || null,
      description: data.description,
      repairCostCents: data.repairCostCents,
      vetustePct: 0,
      tenantShareCents: data.repairCostCents, // Will be recalculated by server
      photoUrl: data.photoUrl || null,
      entryPhotoUrl: data.entryPhotoUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setDeductions(prev => [...prev, tempDeduction]);

    try {
      const res = await fetch(`/api/inspection/${inspectionId}/deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        setDeductions(prev => prev.map(d => d.id === tempId ? result : d));
        return result;
      } else {
        // Rollback
        setDeductions(prev => prev.filter(d => d.id !== tempId));
      }
    } catch {
      setDeductions(prev => prev.filter(d => d.id !== tempId));
    }
  }, [inspectionId]);

  // ─── Update deduction ───

  const updateDeduction = useCallback(async (
    deductionId: string,
    data: { description?: string; repairCostCents?: number; vetustePct?: number }
  ) => {
    if (!inspectionId) return;

    // Optimistic
    setDeductions(prev => prev.map(d =>
      d.id === deductionId ? { ...d, ...data } : d
    ));

    try {
      const res = await fetch(`/api/inspection/${inspectionId}/deductions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deductionId, ...data }),
      });
      if (res.ok) {
        const result = await res.json();
        setDeductions(prev => prev.map(d => d.id === deductionId ? { ...d, ...result } : d));
      } else {
        fetchDeductions(); // rollback
      }
    } catch {
      fetchDeductions();
    }
  }, [inspectionId, fetchDeductions]);

  // ─── Delete deduction ───

  const removeDeduction = useCallback(async (deductionId: string) => {
    if (!inspectionId) return;

    const prev = deductions;
    setDeductions(d => d.filter(dd => dd.id !== deductionId));

    try {
      const res = await fetch(
        `/api/inspection/${inspectionId}/deductions?deductionId=${deductionId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        setDeductions(prev);
      }
    } catch {
      setDeductions(prev);
    }
  }, [inspectionId, deductions]);

  // ─── Create proposal ───

  const createProposal = useCallback(async () => {
    if (!inspectionId) return;

    const res = await fetch(`/api/inspection/${inspectionId}/deposit-resolution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const result = await res.json();
      setResolution(result);
      return result;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create proposal');
  }, [inspectionId]);

  // ─── Tenant response ───

  const respondToProposal = useCallback(async (action: 'agree' | 'partial_agree' | 'dispute', data?: {
    partialAgreedAmount?: number;
    disputeReason?: string;
  }) => {
    if (!inspectionId) return;

    const res = await fetch(`/api/inspection/${inspectionId}/deposit-resolution`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    if (res.ok) {
      const result = await res.json();
      setResolution(result);
      return result;
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to respond');
  }, [inspectionId]);

  // ─── Resolve ───

  const resolveDeposit = useCallback(async () => {
    if (!inspectionId) return;

    const res = await fetch(`/api/inspection/${inspectionId}/deposit-resolution`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve' }),
    });
    if (res.ok) {
      const result = await res.json();
      setResolution(result);
      return result;
    }
  }, [inspectionId]);

  // ─── Computed values ───

  const totalDeductionsCents = deductions.reduce((sum, d) => sum + d.tenantShareCents, 0);

  return {
    deductions,
    resolution,
    isLoading,
    totalDeductionsCents,
    addDeduction,
    updateDeduction,
    removeDeduction,
    createProposal,
    respondToProposal,
    resolveDeposit,
    refetch: () => Promise.all([fetchDeductions(), fetchResolution()]),
  };
}
