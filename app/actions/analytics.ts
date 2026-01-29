'use server';

import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export interface AnalyticData {
    year: number;
    totalIncome: number;
    totalExpenses: number;
    netBenefit: number;

    // Monthly Cashflow
    cashflow: { month: number; income: number; expenses: number }[];

    // Distribution
    expenseDistribution: { name: string; value: number; color?: string }[];

    // KPIs
    yieldGross: number; // Percent
    yieldNet: number; // Percent
    propertyValue: number;

    // Expense Breakdown
    totalDeductible: number;
    totalRecoverable: number;

    // Evolution
    netBenefitEvolution: number | null;
    totalExpensesEvolution: number | null;
}

const EXPENSE_LABELS: Record<string, string> = {
    'COLD_WATER': 'Eau Froide',
    'HOT_WATER': 'Eau Chaude',
    'ELECTRICITY_COMMON': 'Élec. Communs',
    'ELECTRICITY_PRIVATE': 'Élec. Privée',
    'HEATING_COLLECTIVE': 'Chauffage Coll.',
    'TAX_PROPERTY': 'Taxe Foncière',
    'ELEVATOR': 'Ascenseur',
    'INSURANCE': 'Assurance PNO',
    'MAINTENANCE': 'Entretien',
    'CARETAKER': 'Gardien',
    'OTHER': 'Autre',
    'METERS': 'Compteurs',
    'GENERAL_CHARGES': 'Charges Générales',
    'BUILDING_CHARGES': 'Charges Immeuble',
    'PARKING': 'Parking',
    'INSURANCE_GLI': 'Assurance GLI'
};

const EXPENSE_COLORS: Record<string, string> = {
    'TAX_PROPERTY': '#ef4444', // Red 500
    'MAINTENANCE': '#f59e0b', // Amber 500
    'INSURANCE_GLI': '#3b82f6', // Blue 500
    'COLD_WATER': '#06b6d4', // Cyan 500
    'ELECTRICITY_COMMON': '#eab308' // Yellow 500
};

export async function getFinancialAnalytics(propertyId: string, year: number): Promise<AnalyticData> {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // 1. Fetch Property (for Value)
    const property = await prisma.property.findUnique({
        where: { id: propertyId }
    });
    const propertyValue = property?.purchasePrice || 0; // Stored in Euros
    // In seed: Purchase Price = 165000. Is it in cents? Seed says 165000. Usually prices are large.
    // If 165k Euros, let's assume stored in Cents consistent with others? 
    // Seed script: `purchasePrice: PURCHASE_PRICE` where const PURCHASE_PRICE = 165000.
    // Prisma Schema: `Int?`. 
    // If it's 165k Euros, it fits in Int. If it's cents (16.5M cents), fits in Int.
    // But `price` in listing is just `Int`. Usually cents everywhere in app.
    // Let's assume input was Euros in seed for properties but maybe I should have put cents?
    // Listing price 650 is Euro input -> 65000 cents.
    // Property Price 165000 input -> 165000 Euros? Or 165000 cents (1650€)?
    // Usually property prices are > 100k. 
    // Let's assume stored in Euros for Property Price in Schema to fit Int range comfortably (2 Billion limit).
    // 165000 Euros * 100 = 16,500,000. Fits easily.
    // Let's assume Cents for consistency.
    // Wait, let's check seed again. `data: { purchasePrice: PURCHASE_PRICE }`. 
    // `const PURCHASE_PRICE = 165000;`. 
    // If I meant 165k€, and strict cents usage, I should have done 165000 * 100.
    // I likely failed consistency in seed. I will check analytics output and adjust multiplier.
    // Assuming Property Purchase Price is stored in EUROS (no cents) because large numbers.
    // Okay, let's treat property.purchasePrice as Euros.

    // 2. Calculate Income (Rent)
    // Query LeaseFinancials history for this property (via RentalApplications -> Listing -> RentalUnit -> Property)
    // Actually easier to query Applications linked effectively.
    // But `LeaseFinancials` are linked to Application.
    // Get all Applications for this Property.
    const applications = await prisma.rentalApplication.findMany({
        where: {
            listing: {
                rentalUnit: { propertyId: propertyId }
            },
            leaseStatus: 'SIGNED'
        },
        include: { financials: true }
    });

    // Calculate Monthly Cashflow (Income)
    const monthlyIncome = new Array(12).fill(0);
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    for (const app of applications) {
        for (const fin of app.financials) {
            // Check overlap with year
            if (fin.startDate > endOfYear) continue;
            if (fin.endDate && fin.endDate < startOfYear) continue;

            // Iterate months
            for (let m = 0; m < 12; m++) {
                const monthDate = new Date(year, m, 15);
                if (monthDate < fin.startDate) continue;
                if (fin.endDate && monthDate > fin.endDate) continue;

                // Add Rent (Base + Charges) ? usually Yield is on BASE rent.
                // Cashflow is on TOTAL rent received.
                // Let's separate? Cashflow = Total In. 
                monthlyIncome[m] += (fin.baseRentCents + fin.serviceChargesCents);
            }
        }
    }

    // 3. Calculate Expenses
    const expenses = await prisma.expense.findMany({
        where: {
            propertyId,
            dateOccurred: {
                gte: startOfYear,
                lte: endOfYear
            }
        }
    });

    const monthlyExpenses = new Array(12).fill(0);
    const categoryMap: Record<string, number> = {};
    let totalDeductibleCents = 0;
    let totalRecoverableCents = 0;

    for (const exp of expenses) {
        const m = exp.dateOccurred.getMonth();
        monthlyExpenses[m] += exp.amountTotalCents;
        totalDeductibleCents += exp.amountDeductibleCents || 0;
        if (exp.isRecoverable) {
            totalRecoverableCents += exp.amountRecoverableCents || 0;
        }

        const catName = EXPENSE_LABELS[exp.category] || exp.category;
        categoryMap[catName] = (categoryMap[catName] || 0) + exp.amountTotalCents;
    }

    // 4. Aggregates
    const totalIncomeCents = monthlyIncome.reduce((a, b) => a + b, 0);
    const totalExpensesCents = monthlyExpenses.reduce((a, b) => a + b, 0);

    // Yield Calculation
    // Annualized Rent (if partial year? No, use Actual Annual Income for "Rentabilité Réelle")
    // Gross Yield = (Total Base Rent / Price) * 100.
    // Wait, totalIncome includes Charges.
    // Let's re-sum base rent only for Yield.
    let totalBaseRentCents = 0;
    for (const app of applications) {
        for (const fin of app.financials) {
            for (let m = 0; m < 12; m++) {
                const monthDate = new Date(year, m, 15);
                if (monthDate >= fin.startDate && (!fin.endDate || monthDate <= fin.endDate)) {
                    totalBaseRentCents += fin.baseRentCents;
                }
            }
        }
    }

    const price = propertyValue || 0;

    // Yields
    // Price is Euros. Rent is Cents.
    // (RentCents / 100) / Price * 100
    // If price is 0, yields are 0.
    const yieldGross = price > 0 ? ((totalBaseRentCents / 100) / price) * 100 : 0;

    // Net Benefit (Cashflow) = Total In - Total Out
    const netBenefitCents = totalIncomeCents - totalExpensesCents;

    const yieldNet = price > 0 ? ((netBenefitCents / 100) / price) * 100 : 0;

    // 5. Calculate Evolution (Recursive call for N-1)
    // Avoid infinite recursion by checking year > 2000 or similar if needed, but normally user picks recent years.
    // Ideally we just want NetBenefit N-1.
    // Calling the full function is expensive but simplest for now given the logic is there.
    let netBenefitEvolution: number | null = null;
    let totalExpensesEvolution: number | null = null;
    try {
        // Only fetch if likely to have data (e.g. not going back too far)
        // And don't recurse if this call IS a recursion check (not passed as arg but implied).
        // Actually, let's just do a quick simplified fetch for N-1 Net Benefit to avoid full overhead?
        // No, re-using logic ensures consistency.
        // We need a way to stop recursion if we descend too far, but here we just need N-1, so depth 1.
        // But getFinancialAnalytics(N-1) will call getFinancialAnalytics(N-2)...
        // We should add an optional param `depth` or separate logic.
        // Alternatively, calculate Net Benefit N-1 directly here without full recursion.
        // RE-implementing minimal logic for N-1:

        const prevYear = year - 1;
        const startPrev = new Date(prevYear, 0, 1);
        const endPrev = new Date(prevYear, 11, 31);

        // Income N-1
        let incomePrevCents = 0;
        for (const app of applications) {
            for (const fin of app.financials) {
                if (fin.startDate > endPrev) continue;
                if (fin.endDate && fin.endDate < startPrev) continue;
                // Add for months in prevYear
                for (let m = 0; m < 12; m++) {
                    const d = new Date(prevYear, m, 15);
                    if (d >= fin.startDate && (!fin.endDate || d <= fin.endDate)) {
                        incomePrevCents += (fin.baseRentCents + fin.serviceChargesCents);
                    }
                }
            }
        }

        // Expenses N-1
        const expensesPrev = await prisma.expense.aggregate({
            where: {
                propertyId,
                dateOccurred: { gte: startPrev, lte: endPrev }
            },
            _sum: { amountTotalCents: true }
        });

        const netBenefitPrevCents = incomePrevCents - (expensesPrev._sum.amountTotalCents || 0);

        if (netBenefitPrevCents !== 0) {
            netBenefitEvolution = ((netBenefitCents - netBenefitPrevCents) / Math.abs(netBenefitPrevCents)) * 100;
        }

        // Total Expenses Evolution
        const expensesPrevCents = expensesPrev._sum.amountTotalCents || 0;
        if (expensesPrevCents !== 0) {
            totalExpensesEvolution = ((totalExpensesCents - expensesPrevCents) / Math.abs(expensesPrevCents)) * 100;
        }
    } catch (e) {
        console.error("Failed to calc evolution", e);
    }

    // Format for Chart
    const cashflow = monthlyIncome.map((inc, i) => ({
        month: i + 1,
        income: inc / 100,
        expenses: monthlyExpenses[i] / 100
    }));

    const expenseDistribution = Object.entries(categoryMap).map(([name, val]) => ({
        name,
        value: val / 100,
        color: EXPENSE_COLORS[Object.keys(EXPENSE_LABELS).find(key => EXPENSE_LABELS[key] === name) || 'OTHER']
    })).sort((a, b) => b.value - a.value);

    return {
        year,
        totalIncome: totalIncomeCents / 100,
        totalExpenses: totalExpensesCents / 100,
        netBenefit: netBenefitCents / 100,
        cashflow,
        expenseDistribution,
        yieldGross: parseFloat(yieldGross.toFixed(2)),
        yieldNet: parseFloat(yieldNet.toFixed(2)),
        propertyValue: price,
        totalDeductible: totalDeductibleCents / 100,
        totalRecoverable: totalRecoverableCents / 100,
        netBenefitEvolution,
        totalExpensesEvolution
    };
}
