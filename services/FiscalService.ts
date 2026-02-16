import prisma from "@/libs/prismadb";

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

    // 2. Calculate deductible amounts per fiscal category
    const categories = {
      insurance: { label: "Primes d'assurance", amount: 0, line: '223' },
      taxProperty: { label: 'Taxe foncière', amount: 0, line: '227' },
      maintenance: { label: "Travaux d'entretien et réparation", amount: 0, line: '224' },
      copro: { label: 'Charges de copropriété (non récupérables)', amount: 0, line: '221' },
      other: { label: 'Autres charges déductibles', amount: 0, line: '221' },
    };

    let totalDeductible = 0;

    for (const exp of expenses) {
      const deductible = exp.amountDeductibleCents ?? this.calculateDeductible(exp) ?? 0;

      if (deductible <= 0) continue;

      totalDeductible += deductible;

      switch (exp.category) {
        case 'INSURANCE':
        case 'INSURANCE_GLI':
          categories.insurance.amount += deductible;
          break;
        case 'TAX_PROPERTY':
          categories.taxProperty.amount += deductible;
          break;
        case 'MAINTENANCE':
          categories.maintenance.amount += deductible;
          break;
        case 'GENERAL_CHARGES':
        case 'BUILDING_CHARGES':
        case 'ELEVATOR':
        case 'CARETAKER':
          categories.copro.amount += deductible;
          break;
        default:
          categories.other.amount += deductible;
          break;
      }
    }

    // 3. Calculate gross rental income from RentReceipts
    // Find all leases for this property
    const leases = await prisma.rentalApplication.findMany({
      where: {
        leaseStatus: 'SIGNED',
        listing: {
          rentalUnit: { propertyId },
        },
      },
      select: { id: true },
    });

    const leaseIds = leases.map(l => l.id);

    let grossIncomeCents = 0;
    if (leaseIds.length > 0) {
      const receipts = await prisma.rentReceipt.findMany({
        where: {
          rentalApplicationId: { in: leaseIds },
          periodStart: { gte: startOfYear },
          periodEnd: { lte: endOfYear },
        },
      });
      grossIncomeCents = receipts.reduce((sum, r) => sum + r.totalAmountCents, 0);
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
      }
    }

    const managementFeesCents = 2000; // Forfait 20€ (ligne 222)
    const netIncomeCents = grossIncomeCents - totalDeductible - managementFeesCents;

    return {
      year,
      propertyId,
      grossIncomeCents,
      totalDeductibleCents: totalDeductible,
      managementFeesCents,
      netIncomeCents,
      categories,
      expenseCount: expenses.length,
      // Declaration 2044 lines
      lines: {
        '211': { label: 'Loyers bruts encaissés', amount: grossIncomeCents },
        '221': { label: "Frais d'administration et de gestion", amount: categories.copro.amount + categories.other.amount },
        '222': { label: 'Autres frais de gestion (forfait)', amount: managementFeesCents },
        '223': { label: "Primes d'assurance", amount: categories.insurance.amount },
        '224': { label: "Dépenses de réparation, d'entretien", amount: categories.maintenance.amount },
        '227': { label: 'Taxes foncières', amount: categories.taxProperty.amount },
        '230': { label: 'Total des charges', amount: totalDeductible + managementFeesCents },
        '420': { label: 'Résultat foncier', amount: netIncomeCents },
      },
    };
  }

  /**
   * Generate a fiscal summary across ALL properties for a user.
   */
  static async generateAllPropertiesSummary(userId: string, year: number) {
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      select: { id: true, addressLine1: true, city: true, zipCode: true },
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
