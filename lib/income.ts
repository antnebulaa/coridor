/**
 * Centralized income resolution — single source of truth.
 *
 * Priority:
 *  1. Verified freelance smoothed income (Powens, confidence ≠ LOW)
 *  2. Declared net salary (manual input)
 */
export function getVerifiedIncome(profile: {
    netSalary?: number | null;
    freelanceSmoothedIncome?: number | null;
    freelanceIncomeConfidence?: string | null;
}): { amount: number; verified: boolean; label: string } {
    if (
        profile.freelanceSmoothedIncome &&
        profile.freelanceIncomeConfidence &&
        profile.freelanceIncomeConfidence !== 'LOW'
    ) {
        return {
            amount: profile.freelanceSmoothedIncome,
            verified: true,
            label: 'Revenu mensuel lissé',
        };
    }

    return {
        amount: profile.netSalary || 0,
        verified: false,
        label: 'Salaire net mensuel',
    };
}
