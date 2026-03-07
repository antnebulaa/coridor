import prisma from "@/libs/prismadb";
import { getPowensTransactions } from "@/app/lib/powens";

// ── Types ───────────────────────────────────────────────────────────────────

interface IncomeSource {
    normalizedLabel: string;
    transactionCount: number;
    totalAmount: number;
    averageAmount: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface MonthlyIncome {
    month: string; // "2026-01"
    amount: number;
    transactionCount: number;
}

export interface FreelanceIncomeAnalysis {
    monthlySmoothedIncome: number;
    annualIncome: number;
    sources: IncomeSource[];
    monthlyBreakdown: MonthlyIncome[];
    periodStart: Date;
    periodEnd: Date;
    monthsCovered: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    verifiedAt: Date;
    transactionCount: number;
}

// ── Detection Constants ─────────────────────────────────────────────────────

const PRO_BANK_KEYWORDS = [
    'SHINE', 'QONTO', 'BLANK', 'FINOM', 'MANAGER.ONE', 'MANAGR',
    'ANYTIME', 'MEMO BANK', 'PROPULSE', 'COMPTE PRO', 'CPT PRO',
];

const LEGAL_FORM_KEYWORDS = [
    'EI', 'EIRL', 'EURL', 'SARL', 'SAS', 'SASU', 'SA',
    'SCI', 'SCM', 'SCP', 'SELARL',
    'MICRO', 'AUTO-ENTREPRENEUR', 'AE',
    'CONSULTING', 'CONSEIL', 'FREELANCE',
];

// Sorted longest-first for greedy match
const TRANSFER_PREFIXES = [
    'VIREMENT INSTANTANE', 'VIREMENT SEPA', 'VIREMENT RECU',
    'VIR EUROPEEN', 'VIR INSTANTANE', 'VIR SEPA', 'VIR INST',
    'VIR RECU', 'VIR DE', 'VIREMENT', 'VIR',
];

const FREELANCE_JOB_TYPES = [
    'indépendant', 'profession libérale', 'micro-entrepreneur',
    'auto-entrepreneur', 'freelance', 'gérant', 'chef d\'entreprise',
    'dirigeant', 'consultant',
];

const MIN_AMOUNT = 500;
const MIN_RECURRENCE = 3;
const MIN_AVERAGE = 1000;

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeLabel(label: string): string {
    let normalized = label.toUpperCase().trim();

    // Remove transfer prefixes (longest first)
    for (const prefix of TRANSFER_PREFIXES) {
        if (normalized.startsWith(prefix)) {
            normalized = normalized.slice(prefix.length).trim();
            break; // only strip one prefix
        }
    }

    // Remove long alphanumeric references (account numbers, refs)
    normalized = normalized.replace(/\b[A-Z0-9]{15,}\b/g, '');

    // Remove dates in label
    normalized = normalized.replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, '');

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

function hasProBankKeyword(label: string): boolean {
    const upper = label.toUpperCase();
    return PRO_BANK_KEYWORDS.some(kw => upper.includes(kw));
}

function hasLegalFormKeyword(label: string): boolean {
    const upper = label.toUpperCase();
    return LEGAL_FORM_KEYWORDS.some(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(upper);
    });
}

function matchesUserName(label: string, firstName?: string | null, lastName?: string | null): boolean {
    const upper = label.toUpperCase();

    if (lastName && lastName.length >= 3) {
        if (upper.includes(lastName.toUpperCase())) return true;
    }

    if (firstName && lastName && firstName.length >= 2 && lastName.length >= 2) {
        const fullName = `${firstName} ${lastName}`.toUpperCase();
        const reversed = `${lastName} ${firstName}`.toUpperCase();
        if (upper.includes(fullName) || upper.includes(reversed)) return true;
    }

    return false;
}

function determineSourceConfidence(
    label: string,
    firstName?: string | null,
    lastName?: string | null,
): 'HIGH' | 'MEDIUM' | 'LOW' {
    const hasProBank = hasProBankKeyword(label);
    const hasLegalForm = hasLegalFormKeyword(label);
    const hasName = matchesUserName(label, firstName, lastName);

    // HIGH: neo-bank keyword OR legal form + user name
    if (hasProBank) return 'HIGH';
    if (hasLegalForm && hasName) return 'HIGH';

    // MEDIUM: user name + passes recurrence (checked by caller)
    if (hasName) return 'MEDIUM';

    // LOW: recurrence + amount only, no name match
    return 'LOW';
}

function getMonthKey(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class FreelanceIncomeService {

    /**
     * Check if a jobType string indicates a freelance/independent profile.
     */
    static isFreelanceProfile(jobType?: string | null): boolean {
        if (!jobType) return false;
        const lower = jobType.toLowerCase();
        return FREELANCE_JOB_TYPES.some(t => lower.includes(t));
    }

    /**
     * Analyze raw Powens transactions to detect freelance income.
     * Transactions are the raw Powens API objects (tx.value, tx.wording, etc.).
     */
    static async analyzeIncome(
        userId: string,
        rawTransactions: any[],
    ): Promise<FreelanceIncomeAnalysis | null> {

        // Get user name for matching
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { firstName: true, lastName: true, name: true },
        });

        const firstName = user?.firstName;
        const lastName = user?.lastName;

        // If no explicit first/last, try to split name
        let derivedFirst = firstName;
        let derivedLast = lastName;
        if (!derivedFirst && !derivedLast && user?.name) {
            const parts = user.name.trim().split(/\s+/);
            if (parts.length >= 2) {
                derivedFirst = parts[0];
                derivedLast = parts.slice(1).join(' ');
            }
        }

        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Step 1: Filter credit transactions > MIN_AMOUNT within 12 months
        const credits = rawTransactions.filter((tx: any) => {
            const amount = tx.value;
            if (amount <= 0) return false;
            if (amount < MIN_AMOUNT) return false;

            const txDate = new Date(tx.date || tx.rdate);
            return txDate >= oneYearAgo && txDate <= now;
        });

        if (credits.length === 0) return null;

        // Step 2: Normalize labels and group by emitter
        const emitterMap = new Map<string, { transactions: any[]; totalAmount: number }>();

        for (const tx of credits) {
            const rawLabel = tx.custom_wording || tx.wording || tx.original_wording || '';
            const normalized = normalizeLabel(rawLabel);
            if (!normalized) continue;

            const existing = emitterMap.get(normalized);
            if (existing) {
                existing.transactions.push(tx);
                existing.totalAmount += tx.value;
            } else {
                emitterMap.set(normalized, {
                    transactions: [tx],
                    totalAmount: tx.value,
                });
            }
        }

        // Step 3: Identify pro emitters
        const proSources: IncomeSource[] = [];

        // Find the emitter with the highest cumulative amount (for "principal emitter" criterion)
        let maxCumulativeEmitter = '';
        let maxCumulative = 0;
        for (const [label, data] of emitterMap) {
            if (data.totalAmount > maxCumulative) {
                maxCumulative = data.totalAmount;
                maxCumulativeEmitter = label;
            }
        }

        for (const [label, data] of emitterMap) {
            const count = data.transactions.length;
            const avgAmount = data.totalAmount / count;

            // Must have recurrence >= 3
            if (count < MIN_RECURRENCE) continue;

            // Must have average > 1000€
            if (avgAmount < MIN_AVERAGE) continue;

            // Determine confidence
            const confidence = determineSourceConfidence(label, derivedFirst, derivedLast);

            // LOW confidence must be the principal emitter
            if (confidence === 'LOW' && label !== maxCumulativeEmitter) continue;

            proSources.push({
                normalizedLabel: label,
                transactionCount: count,
                totalAmount: Math.round(data.totalAmount),
                averageAmount: Math.round(avgAmount),
                confidence,
            });
        }

        if (proSources.length === 0) return null;

        // Step 4: Calculate smoothed income
        const totalAnnualIncome = proSources.reduce((sum, s) => sum + s.totalAmount, 0);
        const monthlySmoothed = Math.round(totalAnnualIncome / 12);

        // Step 5: Build monthly breakdown (12 entries, including 0€ months)
        const monthlyMap = new Map<string, { amount: number; count: number }>();

        // Initialize all 12 months
        for (let i = 0; i < 12; i++) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            const key = getMonthKey(d);
            monthlyMap.set(key, { amount: 0, count: 0 });
        }

        // Fill with pro source transactions
        for (const source of proSources) {
            const emitterData = emitterMap.get(source.normalizedLabel);
            if (!emitterData) continue;
            for (const tx of emitterData.transactions) {
                const txDate = new Date(tx.date || tx.rdate);
                const key = getMonthKey(txDate);
                const entry = monthlyMap.get(key);
                if (entry) {
                    entry.amount += tx.value;
                    entry.count++;
                }
            }
        }

        const monthlyBreakdown: MonthlyIncome[] = Array.from(monthlyMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month,
                amount: Math.round(data.amount),
                transactionCount: data.count,
            }));

        const monthsCovered = monthlyBreakdown.filter(m => m.amount > 0).length;

        // Step 6: Global confidence = highest among sources
        const confidenceOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const bestConfidence = proSources.reduce((best, s) =>
            confidenceOrder[s.confidence] > confidenceOrder[best] ? s.confidence : best,
            'LOW' as 'HIGH' | 'MEDIUM' | 'LOW'
        );

        const totalTransactions = proSources.reduce((sum, s) => sum + s.transactionCount, 0);

        return {
            monthlySmoothedIncome: monthlySmoothed,
            annualIncome: Math.round(totalAnnualIncome),
            sources: proSources,
            monthlyBreakdown,
            periodStart: oneYearAgo,
            periodEnd: now,
            monthsCovered,
            confidence: bestConfidence,
            verifiedAt: now,
            transactionCount: totalTransactions,
        };
    }

    /**
     * Analyze and persist results to TenantProfile.
     */
    static async analyzeAndSave(userId: string, rawTransactions: any[]): Promise<FreelanceIncomeAnalysis | null> {
        const analysis = await FreelanceIncomeService.analyzeIncome(userId, rawTransactions);

        if (!analysis) {
            // No freelance income detected — clear any stale data
            await prisma.tenantProfile.update({
                where: { userId },
                data: {
                    freelanceSmoothedIncome: null,
                    freelanceAnnualIncome: null,
                    freelanceIncomeConfidence: null,
                    freelanceIncomeVerifiedAt: new Date(),
                    freelanceIncomeMonths: null,
                    freelanceIncomeSources: null,
                    freelanceIncomeBreakdown: null,
                },
            });
            return null;
        }

        await prisma.tenantProfile.update({
            where: { userId },
            data: {
                freelanceSmoothedIncome: analysis.monthlySmoothedIncome,
                freelanceAnnualIncome: analysis.annualIncome,
                freelanceIncomeConfidence: analysis.confidence,
                freelanceIncomeVerifiedAt: analysis.verifiedAt,
                freelanceIncomeMonths: analysis.monthsCovered,
                freelanceIncomeSources: analysis.sources as any,
                freelanceIncomeBreakdown: analysis.monthlyBreakdown as any,
            },
        });

        console.log(`[FreelanceIncome] Saved for user ${userId}: ${analysis.monthlySmoothedIncome}€/month (${analysis.confidence}), ${analysis.sources.length} sources`);
        return analysis;
    }

    /**
     * Re-fetch transactions from Powens and re-analyze.
     * Used by the "Refresh" button.
     */
    static async refreshFromPowens(userId: string): Promise<FreelanceIncomeAnalysis | null> {
        const bankConnection = await prisma.bankConnection.findFirst({
            where: { userId, isActive: true },
            select: { accessToken: true },
        });

        if (!bankConnection?.accessToken) {
            throw new Error('No active bank connection');
        }

        const data = await getPowensTransactions(bankConnection.accessToken);
        const transactions = data.transactions || [];

        return FreelanceIncomeService.analyzeAndSave(userId, transactions);
    }
}
