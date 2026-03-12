'use server';

import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { FiscalService } from "@/services/FiscalService";
import { InvestmentSimulatorService } from "@/services/InvestmentSimulatorService";
import {
  FinancialReport,
  PropertyOccupation,
  PropertyMonthData,
  Declaration2044Line,
  DataInvite,
} from "@/lib/finances/types";
import {
  calculateYearlyLoanInterest,
  calculateRemainingDebt,
} from "@/lib/finances/expenseTo2044Mapping";

/**
 * Build a human-readable property label like "Appartement T2" or "Maison Studio".
 * Mirrors the i18n key `properties.card.category`.
 */
function getPropertyLabel(
  prop: { category: string; city: string | null; rentalUnits: { type: string; roomCount: number | null; listings: { roomCount: number | null }[] }[] }
): string {
  // For colocation, pick the ENTIRE_PLACE unit (the physical property), not a private room
  const entireUnit = prop.rentalUnits.find(u => u.type === 'ENTIRE_PLACE');
  const unit = entireUnit || prop.rentalUnits[0];
  const listing = unit?.listings[0];
  // Prefer the listing roomCount (may override), then the unit roomCount
  const rooms = listing?.roomCount || unit?.roomCount || 1;
  const type = rooms <= 1 ? 'Studio' : `T${rooms}`;
  return `${prop.category} ${type}`;
}

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
    // 1. Properties with latest listing + investment/loan data
    prisma.property.findMany({
      where: { ownerId: currentUser.id },
      select: {
        id: true,
        purchasePrice: true,
        purchaseDate: true,
        estimatedCurrentValue: true,
        estimatedValueDate: true,
        loanAmount: true,
        loanRate: true,
        loanStartDate: true,
        loanEndDate: true,
        loanMonthlyPayment: true,
        loanBank: true,
        hasNoLoan: true,
        category: true,
        city: true,
        address: true,
        addressLine1: true,
        createdAt: true,
        rentalUnits: {
          select: {
            type: true,
            roomCount: true,
            listings: {
              take: 1,
              orderBy: { createdAt: 'desc' as const },
              select: {
                id: true,
                title: true,
                roomCount: true,
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

  // Use estimated value if available, otherwise purchase price
  const totalEstimatedValueEuros = properties.reduce(
    (sum, p) => sum + (p.estimatedCurrentValue || p.purchasePrice || 0),
    0
  );
  const estimatedValue =
    totalEstimatedValueEuros > 0 ? totalEstimatedValueEuros * 100 : null;

  const netYield = estimatedValue
    ? (netResult / estimatedValue) * 100
    : totalPurchasePrice
      ? (netResult / totalPurchasePrice) * 100
      : null;

  const prevNetResult = prevRevenue - prevExpenses;
  const prevYield = (estimatedValue || totalPurchasePrice)
    ? (prevNetResult / (estimatedValue || totalPurchasePrice!)) * 100
    : null;
  const netYieldTrend =
    netYield !== null && prevYield !== null && prevYield !== 0
      ? netYield - prevYield
      : null;

  // ── Capital gain (uses InvestmentSimulatorService) ────────
  let grossCapitalGain: number | null = null;
  let netCapitalGain: number | null = null;
  let capitalGainTax: number | null = null;

  if (totalPurchasePrice && estimatedValue && estimatedValue > totalPurchasePrice) {
    grossCapitalGain = estimatedValue - totalPurchasePrice;

    // For net capital gain, we need per-property calculation with holding years
    let totalNetGain = 0;
    let totalTax = 0;
    let hasValidCalc = false;

    for (const prop of properties) {
      if (!prop.purchasePrice || !prop.purchaseDate) continue;
      const value = prop.estimatedCurrentValue || prop.purchasePrice;
      if (value <= prop.purchasePrice) continue;

      const holdingYears = Math.max(0, Math.floor(
        (now.getTime() - new Date(prop.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      ));

      // Works expenses for this property (MAINTENANCE category)
      const propWorks = expenses
        .filter(e => e.propertyId === prop.id && ['MAINTENANCE'].includes(e.category))
        .reduce((s, e) => s + e.amountTotalCents, 0) / 100;

      // Forfait travaux 15% si détention > 5 ans, prendre le plus avantageux
      const worksCost = holdingYears >= 5
        ? Math.max(propWorks, Math.round(prop.purchasePrice * 0.15))
        : propWorks;

      const result = InvestmentSimulatorService.calculateCapitalGainTax({
        purchasePrice: prop.purchasePrice,
        notaryFees: Math.round(prop.purchasePrice * 0.075),
        renovationCost: worksCost,
        resalePrice: value,
        holdingYears,
      });

      totalNetGain += result.netGain;
      totalTax += result.total;
      hasValidCalc = true;
    }

    if (hasValidCalc) {
      netCapitalGain = Math.round(totalNetGain * 100); // euros → cents
      capitalGainTax = Math.round(totalTax * 100);
    }
  }

  // ── Debt & Equity ────────────────────────────────────────
  let totalDebt: number | null = null;
  const debtParts: string[] = [];

  for (const prop of properties) {
    // Fallback: use purchaseDate as loan start if loanStartDate is missing
    const loanStart = prop.loanStartDate || prop.purchaseDate;
    const remaining = calculateRemainingDebt(
      prop.loanAmount, prop.loanRate, loanStart, prop.loanEndDate
    );
    if (remaining !== null && remaining > 0) {
      totalDebt = (totalDebt || 0) + remaining * 100; // euros → cents
      const title = getPropertyLabel(prop);
      debtParts.push(`${title}: ${new Intl.NumberFormat('fr-FR').format(remaining)} €`);
    }
  }

  const debtDetails = debtParts.length > 0 ? debtParts.join(' · ') : null;
  const netEquity = estimatedValue && totalDebt !== null
    ? estimatedValue - totalDebt
    : estimatedValue;

  // ── Loan interest for 2044 (line 250) ────────────────────
  let totalYearlyInterest = 0;
  for (const prop of properties) {
    const loanStart = prop.loanStartDate || prop.purchaseDate;
    totalYearlyInterest += calculateYearlyLoanInterest(
      prop.loanAmount, prop.loanRate, loanStart, prop.loanEndDate, year
    );
  }

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
      title: getPropertyLabel(prop),
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

    // Loan interest (ligne 250) — calculated from Property loan data
    if (totalYearlyInterest > 0) {
      declaration2044.push({
        ligne: '250',
        description: "Intérêts d'emprunt",
        montant: totalYearlyInterest,
        type: 'charge',
        autoCategories: false,
      });
    }

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

  // ── Data invites — progressive collection (V2) ────────────
  const dataInvites: DataInvite[] = [];

  // P1: acquisition (purchasePrice + purchaseDate + acquisitionMode combined)
  // Missing = no purchasePrice (which means mode + value + date haven't been filled)
  const missingAcquisition = properties.filter(p => !p.purchasePrice);
  if (missingAcquisition.length > 0) {
    const first = missingAcquisition[0];
    dataInvites.push({
      field: 'acquisition',
      priority: 1,
      title: "D'où vient ce bien ?",
      description: "Achat, héritage ou donation — renseignez l'origine pour découvrir votre rendement réel et comparer avec le Livret A",
      unlocks: 'Rendement net · Comparatif placements',
      doodleName: 'sitting-reading',
      color: 'blue',
      propertyId: first.id,
      propertyTitle: getPropertyLabel(first),
      propertyAddress: first.address || first.addressLine1 || first.city || '',
      extraCount: missingAcquisition.length - 1,
    });
  }

  // P2: estimatedValue (only if at least 1 property has acquisition data)
  const hasAcquisition = properties.some(p => p.purchasePrice);
  const missingEstimated = properties.filter(p => !p.estimatedCurrentValue);
  if (hasAcquisition && missingEstimated.length > 0) {
    const first = missingEstimated[0];
    dataInvites.push({
      field: 'estimatedValue',
      priority: 2,
      title: 'Combien vaut votre bien aujourd\'hui ?',
      description: 'Découvrez votre plus-value et votre patrimoine net',
      unlocks: 'Patrimoine total · Plus-value · Equity',
      doodleName: 'meditating',
      color: 'purple',
      propertyId: first.id,
      propertyTitle: getPropertyLabel(first),
      propertyAddress: first.address || first.addressLine1 || first.city || '',
      extraCount: missingEstimated.length - 1,
    });
  }

  // P3: loan (only if at least 1 property has estimatedCurrentValue)
  // Skip properties that already have loan data OR explicitly said "no loan"
  const hasEstimated = properties.some(p => p.estimatedCurrentValue);
  const missingLoan = properties.filter(p =>
    !p.loanAmount && !p.hasNoLoan && p.purchasePrice
  );
  if (hasEstimated && missingLoan.length > 0) {
    const first = missingLoan[0];
    dataInvites.push({
      field: 'loan',
      priority: 3,
      title: 'Avez-vous un crédit sur ce bien ?',
      description: 'Renseignez votre emprunt pour voir votre equity nette et vos intérêts déductibles',
      unlocks: 'Equity nette · Capital restant dû · Intérêts déductibles',
      doodleName: 'float',
      color: 'emerald',
      propertyId: first.id,
      propertyTitle: getPropertyLabel(first),
      propertyAddress: first.address || first.addressLine1 || first.city || '',
      extraCount: missingLoan.length - 1,
    });
  }

  // Only show ONE invite at a time (the highest priority missing data)
  const activeInvites = dataInvites.slice(0, 1);

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
    estimatedValue,
    totalPurchasePrice,
    grossCapitalGain,
    netCapitalGain,
    capitalGainTax,
    totalDebt,
    debtDetails,
    netEquity: netEquity ?? null,
    equityTrend: null, // Would need previous year estimated values to compute
    occupancyRate: Math.round(occupancyRate),
    occupiedMonths: totalOccMonths,
    totalMonths: totalPossibleMonths,
    monthlyCashflow,
    properties: propertyOccupations,
    declaration2044,
    hasPowensConnection: !!bankConnection,
    availableYears,
    dataInvites: activeInvites,
  };
}
