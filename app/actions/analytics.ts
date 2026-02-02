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
    yieldNetNet: number; // Percent
    propertyValue: number;

    // Expense Breakdown
    totalDeductible: number;
    totalRecoverable: number;

    // Evolution
    netBenefitEvolution: number | null;
    totalExpensesEvolution: number | null;
    totalIncomeEvolution: number | null;
    yieldGrossEvolution: number | null;
    yieldNetEvolution: number | null;
    yieldNetNetEvolution: number | null;

    // Previous Values (for display context)
    totalIncomePrev: number | null;
    yieldGrossPrev: number | null;
    yieldNetPrev: number | null;
    yieldNetNetPrev: number | null;

    // Additional
    vacancyLoss: number;
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

// Update signature
export async function getFinancialAnalytics(propertyId: string | null | undefined, year: number): Promise<AnalyticData> {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // 1. Determine Scope & Fetch Property Value
    let propertyValue = 0;
    let targetPropertyIds: string[] = [];

    if (propertyId) {
        // Single Property Mode
        targetPropertyIds = [propertyId];
        const property = await prisma.property.findUnique({
            where: { id: propertyId }
        });
        propertyValue = property?.purchasePrice || 0;
    } else {
        // Global Mode (All properties)
        const allProperties = await prisma.property.findMany({
            where: { ownerId: currentUser.id }
        });
        targetPropertyIds = allProperties.map(p => p.id);
        propertyValue = allProperties.reduce((sum, p) => sum + (p.purchasePrice || 0), 0);
    }

    // 2. Calculate Income (Rent)
    const applications = await prisma.rentalApplication.findMany({
        where: {
            listing: {
                rentalUnit: {
                    propertyId: { in: targetPropertyIds }
                }
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

                // Add Rent (Base + Charges)
                monthlyIncome[m] += (fin.baseRentCents + fin.serviceChargesCents);
            }
        }
    }

    // 3. Calculate Expenses
    const expenses = await prisma.expense.findMany({
        where: {
            propertyId: { in: targetPropertyIds },
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

    // Net Net Yield (Estimated after Tax)
    // Default assumption: Flat Tax ~30% impact on the Net Yield
    // Only apply tax if positive benefit.
    const yieldNetNet = yieldNet > 0 ? yieldNet * 0.7 : yieldNet;

    // 5. Calculate Evolution (Recursive call for N-1)
    // Avoid infinite recursion by checking year > 2000 or similar if needed, but normally user picks recent years.
    // Ideally we just want NetBenefit N-1.
    // Calling the full function is expensive but simplest for now given the logic is there.
    let netBenefitEvolution: number | null = null;
    let totalExpensesEvolution: number | null = null;
    let totalIncomeEvolution: number | null = null;
    let yieldGrossEvolution: number | null = null;
    let yieldNetEvolution: number | null = null;
    let yieldNetNetEvolution: number | null = null;

    // Previous Values
    let totalIncomePrev: number | null = null;
    let yieldGrossPrev: number | null = null;
    let yieldNetPrev: number | null = null;
    let yieldNetNetPrev: number | null = null;

    // --- NEW: Vacancy Loss Calculation (YTD) ---
    // We calculate "Manque à Gagner" based on Time Elapsed to avoid showing future vacancy as a loss.

    const now = new Date();
    const isCurrentYear = year === now.getFullYear();
    const isPastYear = year < now.getFullYear();

    // 1. Calculate Fraction of Year Elapsed
    let fractionOfYear = 0;
    const daysInYear = ((year % 4 === 0 && year % 100 > 0) || year % 400 === 0) ? 366 : 365;

    if (isPastYear) {
        fractionOfYear = 1.0;
    } else if (isCurrentYear) {
        const startOfYear = new Date(year, 0, 1);
        const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
        const daysElapsed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        fractionOfYear = Math.min(daysElapsed / daysInYear, 1.0);
    } else {
        fractionOfYear = 0.0;
    }

    // 2. Calculate Potential Rent YTD
    // Sum of (Monthly Listing Price * 12) * fraction
    let totalAnnualPotential = 0;

    const listings = await prisma.listing.findMany({
        where: {
            rentalUnit: {
                propertyId: { in: targetPropertyIds }
            }
        },
        include: { rentalUnit: true }
    });

    const processedUnits = new Set<string>();

    for (const listing of listings) {
        if (!processedUnits.has(listing.rentalUnitId)) {
            processedUnits.add(listing.rentalUnitId);
            if (listing.price) {
                totalAnnualPotential += (listing.price * 100 * 12);
            }
        }
    }

    const potentialRentYTD = totalAnnualPotential * fractionOfYear;

    // 3. Calculate Real Income YTD
    // We approximate this from the already computed monthlyIncome array.
    let realIncomeYTD = 0;

    if (isPastYear) {
        realIncomeYTD = totalIncomeCents; // Full year
    } else if (isCurrentYear) {
        // Sum full months + pro-rata current month
        const currentMonthIndex = now.getMonth(); // 0..11

        for (let i = 0; i < currentMonthIndex; i++) {
            realIncomeYTD += monthlyIncome[i];
        }

        // Add current month pro-rata
        const currentMonthIncome = monthlyIncome[currentMonthIndex];
        const daysInCurrentMonth = new Date(year, currentMonthIndex + 1, 0).getDate();
        const currentMonthRatio = Math.min(now.getDate() / daysInCurrentMonth, 1.0);

        realIncomeYTD += (currentMonthIncome * currentMonthRatio);
    }

    const vacancyLossCents = Math.max(0, potentialRentYTD - realIncomeYTD);

    try {
        const prevYear = year - 1;
        const startPrev = new Date(prevYear, 0, 1);
        const endPrev = new Date(prevYear, 11, 31);

        // Income N-1
        let incomePrevCents = 0;
        let baseRentPrevCents = 0;

        for (const app of applications) {
            for (const fin of app.financials) {
                if (fin.startDate > endPrev) continue;
                if (fin.endDate && fin.endDate < startPrev) continue;
                // Add for months in prevYear
                for (let m = 0; m < 12; m++) {
                    const d = new Date(prevYear, m, 15);
                    if (d >= fin.startDate && (!fin.endDate || d <= fin.endDate)) {
                        incomePrevCents += (fin.baseRentCents + fin.serviceChargesCents);
                        baseRentPrevCents += fin.baseRentCents;
                    }
                }
            }
        }

        // Expenses N-1
        const expensesPrev = await prisma.expense.aggregate({
            where: {
                propertyId: { in: targetPropertyIds },
                dateOccurred: { gte: startPrev, lte: endPrev }
            },
            _sum: { amountTotalCents: true }
        });

        const expensesPrevCents = expensesPrev._sum.amountTotalCents || 0;
        const netBenefitPrevCents = incomePrevCents - expensesPrevCents;

        // --- Compute Evolutions ---

        // 1. Net Benefit
        if (netBenefitPrevCents !== 0) {
            netBenefitEvolution = ((netBenefitCents - netBenefitPrevCents) / Math.abs(netBenefitPrevCents)) * 100;
        }

        // 2. Total Expenses
        if (expensesPrevCents !== 0) {
            totalExpensesEvolution = ((totalExpensesCents - expensesPrevCents) / Math.abs(expensesPrevCents)) * 100;
        }

        // 3. Total Income
        if (incomePrevCents !== 0) {
            totalIncomeEvolution = ((totalIncomeCents - incomePrevCents) / incomePrevCents) * 100;
            totalIncomePrev = incomePrevCents / 100;
        } else if (totalIncomeCents > 0) {
            // Previous 0 -> High growth
            // Handle display elsewhere
        }

        // 4. Yields
        if (price > 0) {
            const yGrossPrev = ((baseRentPrevCents / 100) / price) * 100;
            const yNetPrev = ((netBenefitPrevCents / 100) / price) * 100;
            const yNetNetPrev = yNetPrev > 0 ? yNetPrev * 0.7 : yNetPrev;

            if (yGrossPrev !== 0) {
                yieldGrossEvolution = ((yieldGross - yGrossPrev) / yGrossPrev) * 100;
                yieldGrossPrev = yGrossPrev;
            }
            if (yNetPrev !== 0) {
                yieldNetEvolution = ((yieldNet - yNetPrev) / Math.abs(yNetPrev)) * 100;
                yieldNetPrev = yNetPrev;
            }
            if (yNetNetPrev !== 0) {
                yieldNetNetEvolution = ((yieldNetNet - yNetNetPrev) / Math.abs(yNetNetPrev)) * 100;
                yieldNetNetPrev = yNetNetPrev;
            }
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
        yieldNetNet: parseFloat(yieldNetNet.toFixed(2)),
        propertyValue: price,
        totalDeductible: totalDeductibleCents / 100,
        totalRecoverable: totalRecoverableCents / 100,
        netBenefitEvolution,
        totalExpensesEvolution,
        totalIncomeEvolution,
        yieldGrossEvolution,
        yieldNetEvolution,
        yieldNetNetEvolution,
        totalIncomePrev,
        yieldGrossPrev: yieldGrossPrev ? parseFloat(yieldGrossPrev.toFixed(2)) : null,
        yieldNetPrev: yieldNetPrev ? parseFloat(yieldNetPrev.toFixed(2)) : null,
        yieldNetNetPrev: yieldNetNetPrev ? parseFloat(yieldNetNetPrev.toFixed(2)) : null,
        vacancyLoss: vacancyLossCents / 100
    };
}
