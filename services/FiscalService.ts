import prisma from "@/libs/prismadb";

export interface LineDetailItem {
  label: string;
  amountCents: number;
  sublabel?: string; // e.g. "Jan-Déc 2025" or "Assurance PNO"
}

export interface LineInfo {
  label: string;
  amount: number;
  details: LineDetailItem[];
}

// Deductibility rules per category (French regime reel - declaration 2044)
const DEDUCTIBILITY_RULES: Record<string, 'FULL' | 'PARTIAL' | 'NONE' | 'MANUAL'> = {
  TAX_PROPERTY: 'FULL',        // 100% deductible (simplified — TEOM part is recoverable but we treat total as deductible)
  INSURANCE: 'FULL',            // Assurance PNO = entirely deductible
  INSURANCE_GLI: 'FULL',        // GLI = entirely deductible
  MAINTENANCE: 'FULL',          // Travaux d'entretien = deductible
  CARETAKER: 'PARTIAL',         // Non-recoverable part = deductible
  ELEVATOR: 'PARTIAL',          // Non-recoverable part = deductible
  GENERAL_CHARGES: 'PARTIAL',   // Non-recoverable part = deductible
  BUILDING_CHARGES: 'PARTIAL',  // Non-recoverable part = deductible
  ELECTRICITY_COMMON: 'PARTIAL',// Non-recoverable part = deductible
  HEATING_COLLECTIVE: 'PARTIAL',// Non-recoverable part = deductible
  COLD_WATER: 'NONE',           // Fully recoverable, not deductible
  HOT_WATER: 'NONE',            // Fully recoverable, not deductible
  ELECTRICITY_PRIVATE: 'NONE',  // Tenant charge
  METERS: 'NONE',               // Recoverable
  PARKING: 'NONE',              // Not deductible
  OTHER: 'MANUAL',              // User decides
};

export class FiscalService {
  /**
   * Calculate the deductible amount for an expense based on its category.
   * Returns amount in cents, or null for MANUAL category.
   */
  static calculateDeductible(expense: {
    category: string;
    amountTotalCents: number;
    amountRecoverableCents?: number | null;
    recoverableRatio?: number;
    isRecoverable?: boolean;
  }): number | null {
    const rule = DEDUCTIBILITY_RULES[expense.category];

    if (!rule || rule === 'MANUAL') return null;
    if (rule === 'NONE') return 0;
    if (rule === 'FULL') return expense.amountTotalCents;

    // PARTIAL: deductible = total - recoverable
    const recoverable = expense.amountRecoverableCents
      ?? Math.round(expense.amountTotalCents * (expense.recoverableRatio || 0));
    return Math.max(0, expense.amountTotalCents - recoverable);
  }

  /**
   * Generate a fiscal summary for a property for a given year.
   * Groups deductible expenses by fiscal category for declaration 2044.
   */
  static async generateFiscalSummary(propertyId: string, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // 1. Fetch all expenses for the year
    const expenses = await prisma.expense.findMany({
      where: {
        propertyId,
        dateOccurred: { gte: startOfYear, lte: endOfYear },
      },
      orderBy: { dateOccurred: 'asc' },
    });

    // 2. Calculate deductible amounts per fiscal category + track detail items
    const categories = {
      insurance: { label: "Primes d'assurance", amount: 0, line: '223' },
      taxProperty: { label: 'Taxe foncière', amount: 0, line: '227' },
      maintenance: { label: "Travaux d'entretien et réparation", amount: 0, line: '224' },
      copro: { label: 'Charges de copropriété (non récupérables)', amount: 0, line: '221' },
      other: { label: 'Autres charges déductibles', amount: 0, line: '221' },
    };

    // Track expense details per 2044 line
    const lineDetails: Record<string, LineDetailItem[]> = {
      '221': [], '223': [], '224': [], '227': [],
    };

    let totalDeductible = 0;

    const CATEGORY_LABELS: Record<string, string> = {
      INSURANCE: 'Assurance PNO',
      INSURANCE_GLI: 'Assurance GLI',
      TAX_PROPERTY: 'Taxe foncière',
      MAINTENANCE: 'Travaux d\'entretien',
      GENERAL_CHARGES: 'Charges générales',
      BUILDING_CHARGES: 'Charges d\'immeuble',
      ELEVATOR: 'Ascenseur',
      CARETAKER: 'Gardiennage',
      ELECTRICITY_COMMON: 'Électricité parties communes',
      HEATING_COLLECTIVE: 'Chauffage collectif',
      OTHER: 'Autres charges',
    };

    const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

    for (const exp of expenses) {
      const deductible = exp.amountDeductibleCents ?? this.calculateDeductible(exp) ?? 0;

      if (deductible <= 0) continue;

      totalDeductible += deductible;

      const detailItem: LineDetailItem = {
        label: exp.label || CATEGORY_LABELS[exp.category] || exp.category,
        amountCents: deductible,
        sublabel: exp.dateOccurred ? formatDate(exp.dateOccurred) : undefined,
      };

      switch (exp.category) {
        case 'INSURANCE':
        case 'INSURANCE_GLI':
          categories.insurance.amount += deductible;
          lineDetails['223'].push(detailItem);
          break;
        case 'TAX_PROPERTY':
          categories.taxProperty.amount += deductible;
          lineDetails['227'].push(detailItem);
          break;
        case 'MAINTENANCE':
          categories.maintenance.amount += deductible;
          lineDetails['224'].push(detailItem);
          break;
        case 'GENERAL_CHARGES':
        case 'BUILDING_CHARGES':
        case 'ELEVATOR':
        case 'CARETAKER':
          categories.copro.amount += deductible;
          lineDetails['221'].push(detailItem);
          break;
        default:
          categories.other.amount += deductible;
          lineDetails['221'].push(detailItem);
          break;
      }
    }

    // 3. Calculate gross rental income from RentReceipts
    // Find all leases for this property with tenant name
    const leases = await prisma.rentalApplication.findMany({
      where: {
        leaseStatus: 'SIGNED',
        listing: {
          rentalUnit: { propertyId },
        },
      },
      include: {
        candidateScope: {
          select: {
            creatorUser: { select: { name: true } },
          },
        },
      },
    });

    const leaseIds = leases.map(l => l.id);
    const revenueDetails: LineDetailItem[] = [];

    let grossIncomeCents = 0;
    if (leaseIds.length > 0) {
      const receipts = await prisma.rentReceipt.findMany({
        where: {
          rentalApplicationId: { in: leaseIds },
          periodStart: { gte: startOfYear },
          periodEnd: { lte: endOfYear },
        },
        orderBy: { periodStart: 'asc' },
      });

      // Group receipts by lease for detail
      const receiptsByLease: Record<string, { total: number; count: number }> = {};
      for (const r of receipts) {
        if (!receiptsByLease[r.rentalApplicationId]) {
          receiptsByLease[r.rentalApplicationId] = { total: 0, count: 0 };
        }
        receiptsByLease[r.rentalApplicationId].total += r.totalAmountCents;
        receiptsByLease[r.rentalApplicationId].count += 1;
      }
      grossIncomeCents = receipts.reduce((sum, r) => sum + r.totalAmountCents, 0);

      // Build detail items per lease
      for (const lease of leases) {
        const data = receiptsByLease[lease.id];
        if (!data) continue;
        const tenantName = lease.candidateScope?.creatorUser?.name || 'Locataire';
        revenueDetails.push({
          label: tenantName,
          amountCents: data.total,
          sublabel: `${data.count} quittance${data.count > 1 ? 's' : ''}`,
        });
      }
    }

    // If no receipts, try to estimate from LeaseFinancials
    if (grossIncomeCents === 0 && leaseIds.length > 0) {
      const financials = await prisma.leaseFinancials.findMany({
        where: {
          rentalApplicationId: { in: leaseIds },
          startDate: { lte: endOfYear },
          OR: [
            { endDate: null },
            { endDate: { gte: startOfYear } },
          ],
        },
      });

      // Simple estimate: monthly rent * 12
      for (const f of financials) {
        const monthlyTotal = f.baseRentCents + f.serviceChargesCents;
        grossIncomeCents += monthlyTotal * 12;

        const lease = leases.find(l => l.id === f.rentalApplicationId);
        const tenantName = lease?.candidateScope?.creatorUser?.name || 'Locataire';
        revenueDetails.push({
          label: tenantName,
          amountCents: monthlyTotal * 12,
          sublabel: 'Estimation (loyer × 12)',
        });
      }
    }

    const managementFeesCents = 2000; // Forfait 20€ (ligne 222)
    const netIncomeCents = grossIncomeCents - totalDeductible - managementFeesCents;

    // Build line 230 details (sum of all charge lines)
    const line230Details: LineDetailItem[] = [
      { label: "Frais d'administration et de gestion (l.221)", amountCents: categories.copro.amount + categories.other.amount },
      { label: 'Forfait de gestion (l.222)', amountCents: managementFeesCents },
      { label: "Primes d'assurance (l.223)", amountCents: categories.insurance.amount },
      { label: "Réparation, entretien (l.224)", amountCents: categories.maintenance.amount },
      { label: 'Taxes foncières (l.227)', amountCents: categories.taxProperty.amount },
    ].filter(d => d.amountCents > 0);

    // Build line 420 details (revenue - charges)
    const line420Details: LineDetailItem[] = [
      { label: 'Loyers bruts encaissés (l.211)', amountCents: grossIncomeCents },
      { label: 'Total des charges (l.230)', amountCents: -(totalDeductible + managementFeesCents) },
    ];

    return {
      year,
      propertyId,
      grossIncomeCents,
      totalDeductibleCents: totalDeductible,
      managementFeesCents,
      netIncomeCents,
      categories,
      expenseCount: expenses.length,
      // Declaration 2044 lines with details
      lines: {
        '211': { label: 'Loyers bruts encaissés', amount: grossIncomeCents, details: revenueDetails } as LineInfo,
        '221': { label: "Frais d'administration et de gestion", amount: categories.copro.amount + categories.other.amount, details: lineDetails['221'] } as LineInfo,
        '222': { label: 'Autres frais de gestion (forfait)', amount: managementFeesCents, details: [{ label: 'Forfait fixe prévu par l\'administration fiscale', amountCents: managementFeesCents, sublabel: '20 € par bien' }] } as LineInfo,
        '223': { label: "Primes d'assurance", amount: categories.insurance.amount, details: lineDetails['223'] } as LineInfo,
        '224': { label: "Dépenses de réparation, d'entretien", amount: categories.maintenance.amount, details: lineDetails['224'] } as LineInfo,
        '227': { label: 'Taxes foncières', amount: categories.taxProperty.amount, details: lineDetails['227'] } as LineInfo,
        '230': { label: 'Total des charges', amount: totalDeductible + managementFeesCents, details: line230Details } as LineInfo,
        '420': { label: 'Résultat foncier', amount: netIncomeCents, details: line420Details } as LineInfo,
      },
    };
  }

  /**
   * Generate a fiscal summary across ALL properties for a user.
   */
  static async generateAllPropertiesSummary(userId: string, year: number) {
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      select: {
        id: true, addressLine1: true, city: true, zipCode: true,
        images: { select: { url: true }, orderBy: { order: 'asc' }, take: 1 },
      },
    });

    const summaries = [];
    let totalGross = 0;
    let totalDeductible = 0;
    let totalNet = 0;

    for (const prop of properties) {
      const summary = await this.generateFiscalSummary(prop.id, year);
      summaries.push({
        ...summary,
        property: prop,
      });
      totalGross += summary.grossIncomeCents;
      totalDeductible += summary.totalDeductibleCents + summary.managementFeesCents;
      totalNet += summary.netIncomeCents;
    }

    return {
      year,
      properties: summaries,
      totalGrossIncomeCents: totalGross,
      totalDeductibleCents: totalDeductible,
      totalNetIncomeCents: totalNet,
    };
  }
}
