import { describe, it, expect } from 'vitest';
import {
  TRANSITIONS,
  EVENT_TO_STATUS,
  isValidTransition,
  getTargetStatus,
  calculatePenalty,
  validateDeductions,
  getLegalDeadlineMonths,
  calculateLegalDeadlineDate,
  calculateDepositAmount,
} from '@/lib/depositRules';
import type { DepositStatus, DepositEventType } from '@/lib/depositRules';

// ── State Machine: Valid Transitions ──────────────────────────────────

describe('State Machine — valid transitions', () => {
  const validCases: [DepositStatus, DepositEventType, DepositStatus][] = [
    ['AWAITING_PAYMENT', 'PAYMENT_DETECTED', 'PAID'],
    ['AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'PAID'],
    ['HELD', 'EXIT_INSPECTION_STARTED', 'EXIT_INSPECTION'],
    ['HELD', 'EXIT_INSPECTION_SIGNED', 'EXIT_INSPECTION'],
    ['HELD', 'ENTRY_INSPECTION_DONE', undefined as any], // no target status mapped
    ['EXIT_INSPECTION', 'RETENTIONS_PROPOSED', 'RETENTIONS_PROPOSED'],
    ['RETENTIONS_PROPOSED', 'TENANT_AGREED', 'FULLY_RELEASED'],
    ['RETENTIONS_PROPOSED', 'TENANT_PARTIAL_AGREED', 'PARTIALLY_RELEASED'],
    ['RETENTIONS_PROPOSED', 'TENANT_DISPUTED', 'DISPUTED'],
    ['RETENTIONS_PROPOSED', 'FULL_RELEASE', 'FULLY_RELEASED'],
    ['PARTIALLY_RELEASED', 'FULL_RELEASE', 'FULLY_RELEASED'],
    ['PARTIALLY_RELEASED', 'TENANT_DISPUTED', 'DISPUTED'],
    ['FULLY_RELEASED', 'RESOLVED', 'RESOLVED'],
    ['DISPUTED', 'RESOLVED', 'RESOLVED'],
  ];

  it.each(validCases)(
    '%s + %s → %s',
    (status, event, expectedTarget) => {
      expect(isValidTransition(status, event)).toBe(true);
      if (expectedTarget) {
        expect(getTargetStatus(event)).toBe(expectedTarget);
      }
    }
  );
});

// ── State Machine: Invalid Transitions ──────────────────────────────

describe('State Machine — invalid transitions', () => {
  const invalidCases: [DepositStatus, DepositEventType][] = [
    // Can't skip stages
    ['AWAITING_PAYMENT', 'TENANT_AGREED'],
    ['AWAITING_PAYMENT', 'FULL_RELEASE'],
    ['AWAITING_PAYMENT', 'RESOLVED'],
    ['AWAITING_PAYMENT', 'RETENTIONS_PROPOSED'],

    // HELD can't go backwards or skip
    ['HELD', 'PAYMENT_CONFIRMED'],
    ['HELD', 'TENANT_AGREED'],
    ['HELD', 'RESOLVED'],
    ['HELD', 'RETENTIONS_PROPOSED'],

    // EXIT_INSPECTION is limited
    ['EXIT_INSPECTION', 'PAYMENT_CONFIRMED'],
    ['EXIT_INSPECTION', 'TENANT_AGREED'],
    ['EXIT_INSPECTION', 'RESOLVED'],
    ['EXIT_INSPECTION', 'FULL_RELEASE'],

    // RETENTIONS_PROPOSED has specific allowed events
    ['RETENTIONS_PROPOSED', 'PAYMENT_CONFIRMED'],
    ['RETENTIONS_PROPOSED', 'EXIT_INSPECTION_SIGNED'],

    // Terminal states can't progress
    ['FULLY_RELEASED', 'TENANT_DISPUTED'],
    ['FULLY_RELEASED', 'FULL_RELEASE'],
    ['DISPUTED', 'FULL_RELEASE'],
    ['DISPUTED', 'TENANT_AGREED'],

    // RESOLVED is terminal — nothing allowed
    ['RESOLVED', 'FULL_RELEASE'],
    ['RESOLVED', 'TENANT_DISPUTED'],
    ['RESOLVED', 'PAYMENT_CONFIRMED'],
    ['RESOLVED', 'RESOLVED'],
  ];

  it.each(invalidCases)(
    '%s + %s → rejected',
    (status, event) => {
      expect(isValidTransition(status, event)).toBe(false);
    }
  );
});

// ── PAID is transient ───────────────────────────────────────────────

describe('PAID is transient', () => {
  it('has no allowed transitions (auto-chains to HELD)', () => {
    expect(TRANSITIONS.PAID).toEqual([]);
  });

  it('PAYMENT_DETECTED maps to PAID (not HELD)', () => {
    expect(EVENT_TO_STATUS.PAYMENT_DETECTED).toBe('PAID');
  });

  it('PAYMENT_CONFIRMED maps to PAID (not HELD)', () => {
    expect(EVENT_TO_STATUS.PAYMENT_CONFIRMED).toBe('PAID');
  });
});

// ── RESOLVED is terminal ────────────────────────────────────────────

describe('RESOLVED is terminal', () => {
  it('has no allowed transitions', () => {
    expect(TRANSITIONS.RESOLVED).toEqual([]);
  });

  it('rejects all events', () => {
    const allEvents: DepositEventType[] = [
      'LEASE_SIGNED', 'PAYMENT_DETECTED', 'PAYMENT_CONFIRMED',
      'EXIT_INSPECTION_STARTED', 'EXIT_INSPECTION_SIGNED',
      'RETENTIONS_PROPOSED', 'TENANT_AGREED', 'TENANT_DISPUTED',
      'FULL_RELEASE', 'RESOLVED',
    ];
    for (const event of allEvents) {
      expect(isValidTransition('RESOLVED', event)).toBe(false);
    }
  });
});

// ── Penalty Calculation ─────────────────────────────────────────────

describe('calculatePenalty', () => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  it('calculates 10% of monthly rent per overdue month', () => {
    // 800€/month rent, 35 days overdue → 2 months → 160€
    const result = calculatePenalty(80000, 35 * MS_PER_DAY);
    expect(result.overdueMonths).toBe(2);
    expect(result.penaltyAmountCents).toBe(Math.round(80000 * 0.1 * 2)); // 16000 = 160€
  });

  it('minimum 1 month overdue', () => {
    // 1 day overdue → still 1 month
    const result = calculatePenalty(80000, 1 * MS_PER_DAY);
    expect(result.overdueMonths).toBe(1);
    expect(result.penaltyAmountCents).toBe(8000); // 80€
  });

  it('handles 3 months overdue', () => {
    const result = calculatePenalty(80000, 85 * MS_PER_DAY); // ~2.8 months → ceil = 3
    expect(result.overdueMonths).toBe(3);
    expect(result.penaltyAmountCents).toBe(Math.round(80000 * 0.1 * 3)); // 24000 = 240€
  });

  it('returns 0 penalty when no monthly rent', () => {
    const result = calculatePenalty(null, 60 * MS_PER_DAY);
    expect(result.overdueMonths).toBe(2);
    expect(result.penaltyAmountCents).toBe(0);
  });

  it('handles exactly 30 days (1 month boundary)', () => {
    const result = calculatePenalty(100000, 30 * MS_PER_DAY);
    expect(result.overdueMonths).toBe(1);
    expect(result.penaltyAmountCents).toBe(10000); // 100€
  });

  it('handles exactly 60 days (2 month boundary)', () => {
    const result = calculatePenalty(100000, 60 * MS_PER_DAY);
    expect(result.overdueMonths).toBe(2);
    expect(result.penaltyAmountCents).toBe(20000); // 200€
  });
});

// ── Deduction Validation ─────────────────────────────────────────────

describe('validateDeductions', () => {
  it('valid when deductions <= deposit amount', () => {
    const result = validateDeductions(80000, 50000);
    expect(result.isValid).toBe(true);
    expect(result.warning).toBeUndefined();
    expect(result.surplusCents).toBeUndefined();
  });

  it('valid when deductions equal deposit amount', () => {
    const result = validateDeductions(80000, 80000);
    expect(result.isValid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('valid with warning when deductions exceed deposit (never blocks)', () => {
    const result = validateDeductions(80000, 120000);
    expect(result.isValid).toBe(true); // NEVER blocks
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain('1200.00€');
    expect(result.warning).toContain('800.00€');
    expect(result.surplusCents).toBe(40000); // 400€ surplus
  });

  it('calculates surplus correctly', () => {
    const result = validateDeductions(50000, 75000);
    expect(result.surplusCents).toBe(25000); // 250€
  });

  it('handles zero deposit', () => {
    const result = validateDeductions(0, 10000);
    expect(result.isValid).toBe(true);
    expect(result.surplusCents).toBe(10000);
  });
});

// ── Legal Deadline ───────────────────────────────────────────────────

describe('getLegalDeadlineMonths', () => {
  it('1 month when EDL is conforme (no anomalies)', () => {
    expect(getLegalDeadlineMonths(false)).toBe(1);
  });

  it('2 months when EDL has anomalies', () => {
    expect(getLegalDeadlineMonths(true)).toBe(2);
  });
});

describe('calculateLegalDeadlineDate', () => {
  it('adds 1 month correctly', () => {
    const ref = new Date('2026-01-15');
    const deadline = calculateLegalDeadlineDate(ref, 1);
    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(1); // Feb
    expect(deadline.getDate()).toBe(15);
  });

  it('adds 2 months correctly', () => {
    const ref = new Date('2026-01-15');
    const deadline = calculateLegalDeadlineDate(ref, 2);
    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(2); // March
    expect(deadline.getDate()).toBe(15);
  });

  it('handles year boundary', () => {
    const ref = new Date('2025-12-01');
    const deadline = calculateLegalDeadlineDate(ref, 2);
    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(1); // Feb 2026
  });

  it('does not mutate input date', () => {
    const ref = new Date('2026-01-15');
    const origTime = ref.getTime();
    calculateLegalDeadlineDate(ref, 2);
    expect(ref.getTime()).toBe(origTime);
  });
});

// ── Deposit Amount Calculation ───────────────────────────────────────

describe('calculateDepositAmount', () => {
  it('uses explicit amount when provided (in cents)', () => {
    expect(calculateDepositAmount(800, 900, false)).toBe(80000);
  });

  it('1× rent for unfurnished', () => {
    expect(calculateDepositAmount(null, 800, false)).toBe(80000);
  });

  it('2× rent for furnished', () => {
    expect(calculateDepositAmount(null, 800, true)).toBe(160000);
  });

  it('1× rent for unfurnished', () => {
    expect(calculateDepositAmount(null, 600, false)).toBe(60000);
  });

  it('prefers explicit over calculated', () => {
    // Explicit 500€, even though rent is 800€
    expect(calculateDepositAmount(500, 800, false)).toBe(50000);
  });

  it('falls back to calculation when explicit is 0', () => {
    expect(calculateDepositAmount(0, 800, false)).toBe(80000);
  });
});

// ── Completeness Checks ─────────────────────────────────────────────

describe('State Machine completeness', () => {
  it('every status has a TRANSITIONS entry', () => {
    const allStatuses: DepositStatus[] = [
      'AWAITING_PAYMENT', 'PAID', 'HELD', 'EXIT_INSPECTION',
      'RETENTIONS_PROPOSED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED',
      'DISPUTED', 'RESOLVED',
    ];
    for (const status of allStatuses) {
      expect(TRANSITIONS).toHaveProperty(status);
      expect(Array.isArray(TRANSITIONS[status])).toBe(true);
    }
  });

  it('every EVENT_TO_STATUS event maps to a valid status', () => {
    const allStatuses = Object.keys(TRANSITIONS);
    for (const [, status] of Object.entries(EVENT_TO_STATUS)) {
      expect(allStatuses).toContain(status);
    }
  });

  it('every allowed event in TRANSITIONS has a target status mapping', () => {
    for (const [, events] of Object.entries(TRANSITIONS)) {
      for (const event of events) {
        // All events that trigger transitions should map to a target status
        // Exception: ENTRY_INSPECTION_DONE doesn't change status
        if (event !== 'ENTRY_INSPECTION_DONE') {
          expect(EVENT_TO_STATUS).toHaveProperty(event);
        }
      }
    }
  });
});
