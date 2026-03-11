'use server';

import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { FiscalService } from "@/services/FiscalService";
import {
  FinancialReport,
  PropertyOccupation,
  PropertyMonthData,
  Declaration2044Line,
} from "@/lib/finances/types";

export default async function getFinancialReport(
  year: number
): Promise<FinancialReport | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  const now = new Date();

  // ── Parallel queries ───────────────────────────────────────
  const [
    properties,
    rentPayments,
    expenses,
    bankConnection,
    prevYearPayments,
    prevYearExpenses,
    leases,
  ] = await Promise.all([
    // 1. Properties with latest listing
    prisma.property.findMany({
      where: { ownerId: currentUser.id },
      select: {
        id: true,
        purchasePrice: true,
        city: true,
        address: true,
        addressLine1: true,
        createdAt: true,
        rentalUnits: {
          select: {
            listings: {
              take: 1,
              orderBy: { createdAt: 'desc' as const },
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    }),

    // 2. Rent payments for the year (PAID or MANUALLY_CONFIRMED)
    prisma.rentPaymentTracking.findMany({
      where: {
        periodYear: year,
        status: { in: ['PAID', 'MANUALLY_CONFIRMED'] },
        rentalApplication: {
          listing: {
            rentalUnit: {
              property: { ownerId: currentUser.id },
            },
          },
        },
      },
      select: {
        expectedAmountCents: true,
        detectedAmountCents: true,
        periodMonth: true,
        rentalApplication: {
          select: {
            listing: {
              select: {
                rentalUnit: {
                  select: { propertyId: true },
                },
              },
            },
          },
        },
      },
    }),

    // 3. All expenses for the year
    prisma.expense.findMany({
      where: {
        property: { ownerId: currentUser.id },
        dateOccurred: { gte: startOfYear, lte: endOfYear },
      },
      select: {
        amountTotalCents: true,
        category: true,
        dateOccurred: true,
        propertyId: true,
        amountDeductibleCents: true,
      },
    }),

    // 4. Bank connection (Powens badge)
    prisma.bankConnection.findFirst({
      where: { userId: currentUser.id },
      select: { id: true },
    }),

    // 5. Previous year payments (for trends)
    prisma.rentPaymentTracking.findMany({
      where: {
        periodYear: year - 1,
        status: { in: ['PAID', 'MANUALLY_CONFIRMED'] },
        rentalApplication: {
          listing: {
            rentalUnit: {
              property: { ownerId: currentUser.id },
            },
          },
        },
      },
      select: {
        expectedAmountCents: true,
        detectedAmountCents: true,
      },
    }),

    // 6. Previous year expenses (for trends)
    prisma.expense.findMany({
      where: {
        property: { ownerId: currentUser.id },
        dateOccurred: {
          gte: new Date(year - 1, 0, 1),
          lte: new Date(year - 1, 11, 31, 23, 59, 59),
        },
      },
      select: { amountTotalCents: true },
    }),

    // 7. Active/past leases for occupation data
    prisma.leaseFinancials.findMany({
      where: {
        rentalApplication: {
          leaseStatus: 'SIGNED',
          listing: {
            rentalUnit: {
              property: { ownerId: currentUser.id },
            },
          },
        },
      },
      select: {
        baseRentCents: true,
        serviceChargesCents: true,
        startDate: true,
        endDate: true,
        rentalApplication: {
          select: {
            listing: {
              select: {
                rentalUnit: {
                  select: { propertyId: true },
                },
              },
            },
            candidateScope: {
              select: {
                creatorUser: {
                  select: { name: true, firstName: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  // ── Revenue ────────────────────────────────────────────────
  const totalRevenue = rentPayments.reduce(
    (sum, p) => sum + (p.detectedAmountCents || p.expectedAmountCents),
    0
  );

  // ── Expenses ───────────────────────────────────────────────
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + e.amountTotalCents,
    0
  );

  // ── Net result & NOI ───────────────────────────────────────
  const netResult = totalRevenue - totalExpenses;
  const noi = netResult; // No financing model yet

  // ── Trends vs previous year ────────────────────────────────
  const prevRevenue = prevYearPayments.reduce(
    (sum, p) => sum + (p.detectedAmountCents || p.expectedAmountCents),
    0
  );
  const prevExpenses = prevYearExpenses.reduce(
    (sum, e) => sum + e.amountTotalCents,
    0
  );
  const prevNoi = prevRevenue - prevExpenses;
  const noiTrend = prevNoi !== 0 ? ((noi - prevNoi) / Math.abs(prevNoi)) * 100 : null;

  // ── Purchase price & yield ─────────────────────────────────
  const totalPurchasePriceEuros = properties.reduce(
    (sum, p) => sum + (p.purchasePrice || 0),
    0
  );
  const totalPurchasePrice =
    totalPurchasePriceEuros > 0 ? totalPurchasePriceEuros * 100 : null;

  const netYield = totalPurchasePrice
    ? (netResult / totalPurchasePrice) * 100
    : null;

  const prevNetResult = prevRevenue - prevExpenses;
  const prevYield = totalPurchasePrice
    ? (prevNetResult / totalPurchasePrice) * 100
    : null;
  const netYieldTrend =
    netYield !== null && prevYield !== null && prevYield !== 0
      ? netYield - prevYield
      : null;

  // ── Monthly cashflow for sparkline ─────────────────────────
  const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const monthlyCashflow = MONTH_LABELS.map((label, i) => {
    const monthNum = i + 1;
    const rev = rentPayments
      .filter(p => p.periodMonth === monthNum)
      .reduce((s, p) => s + (p.detectedAmountCents || p.expectedAmountCents), 0);
    const exp = expenses
      .filter(e => new Date(e.dateOccurred).getMonth() === i)
      .reduce((s, e) => s + e.amountTotalCents, 0);
    return { month: label, revenue: rev, expense: exp, net: rev - exp };
  });

  // ── Occupation per property ────────────────────────────────
  // Pre-compute per-property expenses by month for fixed costs
  const propExpensesByMonth = new Map<string, Map<number, number>>();
  for (const e of expenses) {
    const month = new Date(e.dateOccurred).getMonth(); // 0-11
    const key = e.propertyId;
    if (!propExpensesByMonth.has(key)) propExpensesByMonth.set(key, new Map());
    const monthMap = propExpensesByMonth.get(key)!;
    monthMap.set(month, (monthMap.get(month) || 0) + e.amountTotalCents);
  }

  // Pre-compute per-property rent payments by month
  const propPaymentsByMonth = new Map<string, Map<number, number>>();
  for (const p of rentPayments) {
    const propId = p.rentalApplication.listing.rentalUnit.propertyId;
    if (!propPaymentsByMonth.has(propId)) propPaymentsByMonth.set(propId, new Map());
    const monthMap = propPaymentsByMonth.get(propId)!;
    const amount = p.detectedAmountCents || p.expectedAmountCents;
    monthMap.set(p.periodMonth - 1, (monthMap.get(p.periodMonth - 1) || 0) + amount);
  }

  const propertyOccupations: PropertyOccupation[] = properties.map(prop => {
    const listing = prop.rentalUnits[0]?.listings[0];
    const propLeases = leases.filter(
      l => l.rentalApplication.listing.rentalUnit.propertyId === prop.id
    );

    // Count occupied months and build timeline
    let occupiedMonths = 0;
    const monthlyTimeline: PropertyMonthData[] = [];

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m + 1, 0);

      // Find the active lease for this month
      const activeLease = propLeases.find(l => {
        const start = new Date(l.startDate);
        const end = l.endDate ? new Date(l.endDate) : new Date(9999, 0);
        return start <= monthEnd && end >= monthStart;
      });

      const isOccupied = !!activeLease;
      if (isOccupied) occupiedMonths++;

      // Revenue from payments this month
      const revenue = propPaymentsByMonth.get(prop.id)?.get(m) || 0;

      // Fixed costs this month (expenses that run regardless of occupancy)
      const fixedCosts = propExpensesByMonth.get(prop.id)?.get(m) || 0;

      // Lost rent = expected rent from most recent lease if vacant
      const expectedRent = activeLease
        ? 0
        : propLeases.length > 0
          ? propLeases[0].baseRentCents + propLeases[0].serviceChargesCents
          : 0;

      const cost = isOccupied ? 0 : expectedRent + fixedCosts;

      monthlyTimeline.push({
        month: m + 1,
        revenue,
        cost,
        lostRent: isOccupied ? 0 : expectedRent,
        fixedCosts: isOccupied ? 0 : fixedCosts,
      });
    }

    const annualResult = monthlyTimeline.reduce(
      (sum, m) => sum + m.revenue - m.cost, 0
    );

    // Current active lease (for tenant name, rent, etc.)
    const currentActiveLease = propLeases.find(l => {
      const start = new Date(l.startDate);
      const end = l.endDate ? new Date(l.endDate) : new Date(9999, 0);
      return start <= now && end >= now;
    });

    const leaseEnd = currentActiveLease?.endDate ? new Date(currentActiveLease.endDate) : null;
    const leaseMonthsRemaining = leaseEnd
      ? Math.max(
          0,
          Math.round(
            (leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
          )
        )
      : null;

    const addr = prop.address || prop.addressLine1 || prop.city || '';

    // Tenant name: "Prénom N." format
    const creator = currentActiveLease?.rentalApplication?.candidateScope?.creatorUser;
    let tenantName: string | null = null;
    if (creator) {
      const first = creator.firstName || creator.name?.split(' ')[0];
      const last = creator.name?.split(' ').slice(1).join(' ');
      tenantName = first
        ? last
          ? `${first} ${last.charAt(0)}.`
          : first
        : null;
    }

    return {
      id: prop.id,
      listingId: listing?.id || null,
      title: listing?.title || addr || 'Bien',
      address: addr,
      tenantName,
      monthlyRent: currentActiveLease
        ? currentActiveLease.baseRentCents + currentActiveLease.serviceChargesCents
        : null,
      occupiedMonths,
      totalMonths: 12,
      leaseEndDate: leaseEnd?.toISOString() || null,
      leaseMonthsRemaining,
      isVacant: !currentActiveLease,
      annualResult,
      monthlyTimeline,
    };
  });

  // ── Global occupation ──────────────────────────────────────
  const totalOccMonths = propertyOccupations.reduce(
    (s, p) => s + p.occupiedMonths,
    0
  );
  const totalPossibleMonths = propertyOccupations.length * 12;
  const occupancyRate =
    totalPossibleMonths > 0
      ? (totalOccMonths / totalPossibleMonths) * 100
      : 0;

  // ── Declaration 2044 via FiscalService ─────────────────────
  let declaration2044: Declaration2044Line[] = [];
  try {
    // Aggregate fiscal data across all properties
    const fiscalSummaries = await Promise.all(
      properties.map(p => FiscalService.generateFiscalSummary(p.id, year))
    );

    // Sum all categories across properties
    const aggregated = {
      insurance: 0,
      taxProperty: 0,
      maintenance: 0,
      copro: 0,
      other: 0,
      managementFees: 0,
      grossIncome: 0,
    };

    for (const summary of fiscalSummaries) {
      aggregated.insurance += summary.categories.insurance.amount;
      aggregated.taxProperty += summary.categories.taxProperty.amount;
      aggregated.maintenance += summary.categories.maintenance.amount;
      aggregated.copro += summary.categories.copro.amount;
      aggregated.other += summary.categories.other.amount;
      aggregated.managementFees += summary.managementFeesCents;
      aggregated.grossIncome += summary.grossIncomeCents;
    }

    // Use actual received revenue if available (more accurate than fiscal estimates)
    const grossIncomeEuros = totalRevenue > 0
      ? Math.round(totalRevenue / 100)
      : Math.round(aggregated.grossIncome / 100);

    const hasPowens = !!bankConnection;

    declaration2044 = [
      {
        ligne: '211',
        description: 'Loyers bruts encaissés',
        montant: grossIncomeEuros,
        type: 'revenu',
        autoCategories: hasPowens,
      },
      {
        ligne: '221',
        description: "Frais d'administration et gestion",
        montant: Math.round((aggregated.copro + aggregated.other) / 100),
        type: 'charge',
        autoCategories: hasPowens,
      },
      {
        ligne: '222',
        description: 'Autres frais de gestion (forfait)',
        montant: Math.round(aggregated.managementFees / 100),
        type: 'charge',
        autoCategories: false,
      },
      {
        ligne: '223',
        description: "Primes d'assurance",
        montant: Math.round(aggregated.insurance / 100),
        type: 'charge',
        autoCategories: hasPowens,
      },
      {
        ligne: '224',
        description: 'Réparations, entretien',
        montant: Math.round(aggregated.maintenance / 100),
        type: 'charge',
        autoCategories: hasPowens,
      },
      {
        ligne: '227',
        description: 'Taxes foncières',
        montant: Math.round(aggregated.taxProperty / 100),
        type: 'charge',
        autoCategories: hasPowens,
      },
    ];

    const totalCharges = declaration2044
      .filter(l => l.type === 'charge')
      .reduce((s, l) => s + l.montant, 0);

    declaration2044.push({
      ligne: '230',
      description: 'Total des charges',
      montant: totalCharges,
      type: 'total',
      autoCategories: false,
    });

    declaration2044.push({
      ligne: '420',
      description: 'Résultat foncier',
      montant: grossIncomeEuros - totalCharges,
      type: 'resultat',
      autoCategories: false,
    });
  } catch {
    // Fallback: basic declaration from raw totals
    const grossIncomeEuros = Math.round(totalRevenue / 100);
    const totalExpEuros = Math.round(totalExpenses / 100);
    declaration2044 = [
      {
        ligne: '211',
        description: 'Loyers bruts encaissés',
        montant: grossIncomeEuros,
        type: 'revenu',
        autoCategories: false,
      },
      {
        ligne: '230',
        description: 'Total des charges',
        montant: totalExpEuros,
        type: 'total',
        autoCategories: false,
      },
      {
        ligne: '420',
        description: 'Résultat foncier',
        montant: grossIncomeEuros - totalExpEuros,
        type: 'resultat',
        autoCategories: false,
      },
    ];
  }

  // ── Available years ────────────────────────────────────────
  const firstPropertyYear =
    properties.length > 0
      ? Math.min(...properties.map(p => new Date(p.createdAt).getFullYear()))
      : now.getFullYear();
  const availableYears: number[] = [];
  for (
    let y = Math.max(firstPropertyYear, now.getFullYear() - 4);
    y <= now.getFullYear();
    y++
  ) {
    availableYears.push(y);
  }

  // ── Return ─────────────────────────────────────────────────
  return {
    year,
    totalRevenue,
    totalExpenses,
    netResult,
    noi,
    noiTrend: noiTrend !== null ? Math.round(noiTrend * 10) / 10 : null,
    netYield: netYield !== null ? Math.round(netYield * 10) / 10 : null,
    netYieldTrend:
      netYieldTrend !== null ? Math.round(netYieldTrend * 10) / 10 : null,
    livretARate: 3.0,
    scpiRate: 4.5,
    estimatedValue: null, // No estimation model yet
    totalPurchasePrice,
    grossCapitalGain: null,
    netCapitalGain: null,
    totalDebt: null,
    debtDetails: null,
    netEquity: null,
    equityTrend: null,
    occupancyRate: Math.round(occupancyRate),
    occupiedMonths: totalOccMonths,
    totalMonths: totalPossibleMonths,
    monthlyCashflow,
    properties: propertyOccupations,
    declaration2044,
    hasPowensConnection: !!bankConnection,
    availableYears,
  };
}
