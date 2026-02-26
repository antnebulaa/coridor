/**
 * Pure business rules for the security deposit state machine.
 * No external dependencies — fully testable without Prisma.
 */

export type DepositStatus =
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'HELD'
  | 'EXIT_INSPECTION'
  | 'RETENTIONS_PROPOSED'
  | 'PARTIALLY_RELEASED'
  | 'FULLY_RELEASED'
  | 'DISPUTED'
  | 'RESOLVED';

export type DepositEventType =
  | 'LEASE_SIGNED'
  | 'PAYMENT_DETECTED'
  | 'PAYMENT_CONFIRMED'
  | 'ENTRY_INSPECTION_DONE'
  | 'EXIT_INSPECTION_STARTED'
  | 'EXIT_INSPECTION_SIGNED'
  | 'RETENTIONS_PROPOSED'
  | 'TENANT_AGREED'
  | 'TENANT_PARTIAL_AGREED'
  | 'TENANT_DISPUTED'
  | 'PARTIAL_RELEASE'
  | 'FULL_RELEASE'
  | 'DEADLINE_WARNING'
  | 'DEADLINE_OVERDUE'
  | 'PENALTY_UPDATED'
  | 'FORMAL_NOTICE_GENERATED'
  | 'FORMAL_NOTICE_SENT'
  | 'CDC_DOSSIER_GENERATED'
  | 'TIMELINE_EXPORTED'
  | 'RESOLVED'
  | 'SECOND_REMINDER'
  | 'DEDUCTION_EXCEEDS_DEPOSIT';

// ── State Machine ────────────────────────────────────────────────────

/** Allowed events per status. */
export const TRANSITIONS: Record<DepositStatus, DepositEventType[]> = {
  AWAITING_PAYMENT: ['PAYMENT_DETECTED', 'PAYMENT_CONFIRMED'],
  PAID: [], // transient — auto-chains to HELD
  HELD: ['EXIT_INSPECTION_STARTED', 'EXIT_INSPECTION_SIGNED', 'ENTRY_INSPECTION_DONE'],
  EXIT_INSPECTION: ['RETENTIONS_PROPOSED'],
  RETENTIONS_PROPOSED: ['TENANT_AGREED', 'TENANT_PARTIAL_AGREED', 'TENANT_DISPUTED', 'FULL_RELEASE'],
  PARTIALLY_RELEASED: ['FULL_RELEASE', 'TENANT_DISPUTED'],
  FULLY_RELEASED: ['RESOLVED'],
  DISPUTED: ['RESOLVED'],
  RESOLVED: [],
};

/** Event → target status mapping. */
export const EVENT_TO_STATUS: Partial<Record<DepositEventType, DepositStatus>> = {
  PAYMENT_DETECTED: 'PAID',
  PAYMENT_CONFIRMED: 'PAID',
  EXIT_INSPECTION_STARTED: 'EXIT_INSPECTION',
  EXIT_INSPECTION_SIGNED: 'EXIT_INSPECTION',
  RETENTIONS_PROPOSED: 'RETENTIONS_PROPOSED',
  TENANT_AGREED: 'FULLY_RELEASED',
  TENANT_PARTIAL_AGREED: 'PARTIALLY_RELEASED',
  TENANT_DISPUTED: 'DISPUTED',
  PARTIAL_RELEASE: 'PARTIALLY_RELEASED',
  FULL_RELEASE: 'FULLY_RELEASED',
  RESOLVED: 'RESOLVED',
};

/** Check if a transition is valid. */
export function isValidTransition(status: DepositStatus, event: DepositEventType): boolean {
  return (TRANSITIONS[status] || []).includes(event);
}

/** Get target status for an event, or null if not mapped. */
export function getTargetStatus(event: DepositEventType): DepositStatus | null {
  return EVENT_TO_STATUS[event] ?? null;
}

// ── Penalty Calculation ──────────────────────────────────────────────

/**
 * Calculate penalty for overdue deposit return.
 * Art. 22 al. 2 loi 89-462: 10% of monthly rent per overdue month.
 */
export function calculatePenalty(monthlyRentCents: number | null, overdueMs: number): {
  overdueMonths: number;
  penaltyAmountCents: number;
} {
  const overdueMonths = Math.max(1, Math.ceil(overdueMs / (30 * 24 * 60 * 60 * 1000)));
  const penaltyAmountCents = monthlyRentCents
    ? Math.round(monthlyRentCents * 0.1 * overdueMonths)
    : 0;
  return { overdueMonths, penaltyAmountCents };
}

// ── Deduction Validation ─────────────────────────────────────────────

/**
 * Validate deductions against deposit amount.
 * Returns warning if deductions exceed deposit (never blocks).
 */
export function validateDeductions(
  depositAmountCents: number,
  totalDeductionsCents: number
): { isValid: boolean; warning?: string; surplusCents?: number } {
  if (totalDeductionsCents <= depositAmountCents) {
    return { isValid: true };
  }

  const surplusCents = totalDeductionsCents - depositAmountCents;
  return {
    isValid: true, // Never blocks — just warns
    warning: `Les retenues (${(totalDeductionsCents / 100).toFixed(2)}€) dépassent le montant du dépôt (${(depositAmountCents / 100).toFixed(2)}€). Le surplus de ${(surplusCents / 100).toFixed(2)}€ devra être réclamé directement au locataire.`,
    surplusCents,
  };
}

// ── Legal Deadline ───────────────────────────────────────────────────

/**
 * Calculate legal deadline months: 1 if EDL conforme, 2 if anomalies.
 */
export function getLegalDeadlineMonths(hasAnomalies: boolean): 1 | 2 {
  return hasAnomalies ? 2 : 1;
}

/**
 * Calculate legal deadline date from reference date.
 */
export function calculateLegalDeadlineDate(referenceDate: Date, months: number): Date {
  const deadline = new Date(referenceDate);
  deadline.setMonth(deadline.getMonth() + months);
  return deadline;
}

// ── Deposit Amount Calculation ───────────────────────────────────────

/**
 * Calculate deposit amount in cents.
 * If explicit amount provided, use that. Otherwise: 1× rent (unfurnished), 2× rent (furnished).
 */
export function calculateDepositAmount(
  explicitAmount: number | null,
  rentPrice: number,
  isFurnished: boolean
): number {
  if (explicitAmount && explicitAmount > 0) {
    return explicitAmount * 100;
  }
  return rentPrice * (isFurnished ? 2 : 1) * 100;
}
