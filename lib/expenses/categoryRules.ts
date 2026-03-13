/**
 * Server-side enforcement of recoverability rules by expense category.
 *
 * Certain categories are NEVER recoverable (taxe fonciere, assurances, etc.).
 * This ensures the rule is enforced server-side, not just in the UI.
 */

/** Categories forced to non-recoverable (false). null = no override, use user input. */
export const FORCED_RECOVERABILITY: Record<string, boolean | null> = {
    TAX_PROPERTY: false,
    INSURANCE: false,
    INSURANCE_GLI: false,
    ELECTRICITY_PRIVATE: false,
    PARKING: false,
    OTHER: false,
};

/**
 * Enforce server-side recoverability rules.
 * If the category has a forced rule, override the user input.
 */
export function enforceRecoverability(category: string, isRecoverable: boolean): boolean {
    const forced = FORCED_RECOVERABILITY[category];
    if (forced !== null && forced !== undefined) return forced;
    return isRecoverable;
}
