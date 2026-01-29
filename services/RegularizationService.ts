import prisma from "@/libs/prismadb";

export interface RegularizationStatement {
    year: number;
    periodStart: Date;
    periodEnd: Date;

    totalProvisionsReceivedCents: number;
    totalRecoverableExpensesCents: number;

    balanceCents: number; // Positive = Due by Tenant. Negative = Owed to Tenant.

    expenses: any[]; // List of expenses included
    provisionsBreakdown: any[]; // Debug/Display info about provisions calculation
}

export class RegularizationService {

    /**
     * Generate the full regularization statement for a given year and application (Lease)
     */
    static async generateStatement(applicationId: string, propertyId: string, year: number): Promise<RegularizationStatement> {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        // 1. Calculate Provisions (Credits)
        const { total: totalProvisions, breakdown } = await this.calculateProvisions(applicationId, startOfYear, endOfYear);

        // 2. Calculate Recoverable Expenses (Debits)
        const { total: totalRecoverable, expenses } = await this.calculateRecoverable(propertyId, startOfYear, endOfYear);

        // 3. Balance
        // Balance = Expenses - Provisions
        // If Expenses (1000) > Provisions (800) => Balance = 200 (Tenant owes 200)
        // If Expenses (800) < Provisions (1000) => Balance = -200 (Landlord owes 200)
        const balance = totalRecoverable - totalProvisions;

        return {
            year,
            periodStart: startOfYear,
            periodEnd: endOfYear,
            totalProvisionsReceivedCents: totalProvisions,
            totalRecoverableExpensesCents: totalRecoverable,
            balanceCents: balance,
            expenses,
            provisionsBreakdown: breakdown
        };
    }

    /**
     * Calculate total provisions received based on LeaseFinancials history on a daily pro-rata basis.
     */
    static async calculateProvisions(applicationId: string, periodStart: Date, periodEnd: Date) {
        // Fetch financials overlapping the period
        const financials = await prisma.leaseFinancials.findMany({
            where: {
                rentalApplicationId: applicationId,
                startDate: { lte: periodEnd },
                OR: [
                    { endDate: null },
                    { endDate: { gte: periodStart } }
                ]
            },
            orderBy: { startDate: 'asc' }
        });

        let totalCents = 0;
        const breakdown = [];

        // Logic: For each financial record, determine the intersection with [periodStart, periodEnd]
        for (const record of financials) {
            // Intersection Start = Max(RecordStart, PeriodStart)
            const overlapStart = record.startDate > periodStart ? record.startDate : periodStart;

            // Intersection End = Min(RecordEnd ?? Infinity, PeriodEnd)
            const recordEnd = record.endDate || periodEnd; // If null, assume active until at least periodEnd
            const overlapEnd = recordEnd < periodEnd ? recordEnd : periodEnd;

            // Calculate duration in days (Inclusive? Usually dates are discrete days)
            // If start = Jan 1, End = Jan 31. Duration = 31 days? 
            // Let's use milliseconds difference + 1 day?
            // Safer: treat dates as noon to avoid timezone 00:00 issues, or just standard diff.
            const oneDayMs = 1000 * 60 * 60 * 24;
            // Ensure we are comparing same-time dates (normalize to UTC midnight or similar?)
            // Assuming database dates are simplified Dates (Y-M-D).

            const startMs = overlapStart.getTime();
            const endMs = overlapEnd.getTime();

            if (endMs < startMs) continue; // No overlap

            const durationDays = Math.floor((endMs - startMs) / oneDayMs) + 1;

            if (durationDays <= 0) continue;

            // Monthly Charge -> Daily Charge
            // Method: (Monthly * 12) / 365
            const yearlyCharge = record.serviceChargesCents * 12;
            const dailyCharge = yearlyCharge / 365; // Approx

            const totalForPeriod = Math.round(dailyCharge * durationDays);

            totalCents += totalForPeriod;

            breakdown.push({
                financialId: record.id,
                monthlyAmount: record.serviceChargesCents,
                startDate: overlapStart,
                endDate: overlapEnd,
                days: durationDays,
                total: totalForPeriod
            });
        }

        return { total: totalCents, breakdown };
    }

    /**
     * Calculate total recoverable expenses for the property in the given period.
     * Only considers 'isRecoverable: true' and NOT YET finalized (unless we are re-calculating, but typically we want fresh calc).
     * Actually, if we are simulating a regularization, we might want ALL recoverable expenses of that year, 
     * regardless of whether they were finalized (if we are viewing history) or not.
     * 
     * BUT, for the *Creation* Wizard, we usually filter filter by `isFinalized: false` OR explicitly selecting a year.
     * If I verify a past year, I want to see the expenses that WERE matched.
     * 
     * For this service, let's fetch ALL recoverable expenses for the year. 
     * Filtering finalized/not finalized is a UI/Controller concern (e.g. "Don't double count expenses already reconciled in another report").
     * 
     * However, simpler: Query `isRecoverable: true` AND `dateOccurred` in year.
     */
    static async calculateRecoverable(propertyId: string, periodStart: Date, periodEnd: Date) {
        const expenses = await prisma.expense.findMany({
            where: {
                propertyId: propertyId,
                isRecoverable: true,
                dateOccurred: {
                    gte: periodStart,
                    lte: periodEnd
                }
            },
            orderBy: { dateOccurred: 'asc' }
        });

        const total = expenses.reduce((acc, exp) => {
            // Use calculated amount if available, else standard fallback
            const amount = exp.amountRecoverableCents ?? Math.round(exp.amountTotalCents * (exp.recoverableRatio || 1.0));
            return acc + amount;
        }, 0);

        return { total, expenses };
    }
}
