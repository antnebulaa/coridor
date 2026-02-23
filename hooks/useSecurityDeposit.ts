import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSecurityDeposit(applicationId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    applicationId ? `/api/deposit/${applicationId}` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: timeline, mutate: mutateTimeline } = useSWR(
    applicationId ? `/api/deposit/${applicationId}/timeline` : null,
    fetcher
  );

  const deposit = data?.error ? null : data;

  // Computed values
  const isOverdue = deposit?.isOverdue ?? false;

  const daysUntilDeadline = (() => {
    if (!deposit?.legalDeadline) return null;
    const diff = new Date(deposit.legalDeadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  })();

  const daysOverdue = (() => {
    if (!deposit?.legalDeadline || !deposit?.isOverdue) return 0;
    const diff = Date.now() - new Date(deposit.legalDeadline).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const penaltyAmount = deposit?.penaltyAmountCents
    ? deposit.penaltyAmountCents / 100
    : 0;

  const progress = (() => {
    if (!deposit) return 0;
    const statusProgress: Record<string, number> = {
      AWAITING_PAYMENT: 10,
      PAID: 20,
      HELD: 30,
      EXIT_INSPECTION: 50,
      RETENTIONS_PROPOSED: 60,
      PARTIALLY_RELEASED: 75,
      FULLY_RELEASED: 90,
      DISPUTED: 70,
      RESOLVED: 100,
    };
    return statusProgress[deposit.status] ?? 0;
  })();

  const currentStep = (() => {
    if (!deposit) return null;
    const stepLabels: Record<string, string> = {
      AWAITING_PAYMENT: 'En attente du versement',
      PAID: 'Versement confirmé',
      HELD: 'Dépôt détenu',
      EXIT_INSPECTION: 'EDL de sortie',
      RETENTIONS_PROPOSED: 'Retenues proposées',
      PARTIALLY_RELEASED: 'Restitution partielle',
      FULLY_RELEASED: 'Dépôt restitué',
      DISPUTED: 'Contestation en cours',
      RESOLVED: 'Dossier clos',
    };
    return stepLabels[deposit.status] ?? deposit.status;
  })();

  // Actions
  const confirmPayment = async () => {
    const res = await fetch(`/api/deposit/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_payment' }),
    });
    if (!res.ok) throw new Error('Failed to confirm payment');
    mutate();
    mutateTimeline();
  };

  const confirmRefund = async (refundedAmountCents?: number) => {
    const res = await fetch(`/api/deposit/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_refund', refundedAmountCents }),
    });
    if (!res.ok) throw new Error('Failed to confirm refund');
    mutate();
    mutateTimeline();
  };

  const exportTimeline = async () => {
    const res = await fetch(`/api/deposit/${applicationId}/export-timeline`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to export timeline');
    const data = await res.json();
    mutateTimeline();
    return data.url;
  };

  return {
    deposit,
    timeline: timeline?.error ? [] : (timeline ?? []),
    isLoading,
    error,
    confirmPayment,
    confirmRefund,
    exportTimeline,
    mutate,
    // Computed
    isOverdue,
    daysUntilDeadline,
    daysOverdue,
    penaltyAmount,
    currentStep,
    progress,
  };
}
