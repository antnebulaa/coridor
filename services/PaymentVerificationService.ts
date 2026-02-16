import prisma from "@/libs/prismadb";

interface AnalysisResult {
  found: boolean;
  badgeLevel?: string | null;
  verifiedMonths?: number;
  punctualityRate?: number;
  avgAmount?: number;
  paymentDay?: number;
}

export class PaymentVerificationService {
  /**
   * Analyze the payment history for a user based on their bank transactions
   * categorized as 'Rent'. Determines badge eligibility and punctuality.
   */
  static async analyzePaymentHistory(userId: string): Promise<AnalysisResult> {
    // 1. Fetch active bank connection
    const bankConnection = await prisma.bankConnection.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!bankConnection) {
      return { found: false };
    }

    // 2. Fetch all rent transactions for this connection
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        bankConnectionId: bankConnection.id,
        category: "Rent",
      },
      orderBy: { date: "asc" },
    });

    if (!transactions || transactions.length === 0) {
      return { found: false };
    }

    // 3. Group transactions by year-month
    const monthMap = new Map<
      string,
      { date: Date; amount: number; day: number }[]
    >();

    for (const tx of transactions) {
      const txDate = new Date(tx.date);
      const yearMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap.has(yearMonth)) {
        monthMap.set(yearMonth, []);
      }
      monthMap.get(yearMonth)!.push({
        date: txDate,
        amount: tx.amount, // Negative for debits
        day: txDate.getDate(),
      });
    }

    // 4. Need at least 3 months of data
    const verifiedMonths = monthMap.size;
    if (verifiedMonths < 3) {
      return { found: false };
    }

    // 5. Calculate punctuality: payment before the 15th of the month
    let onTimePays = 0;
    const totalPays = monthMap.size;
    const allDays: number[] = [];
    const allAmounts: number[] = [];

    for (const [, payments] of monthMap) {
      // Take the earliest payment in the month as the representative
      const earliest = payments.reduce((a, b) =>
        a.day < b.day ? a : b
      );

      if (earliest.day <= 15) {
        onTimePays++;
      }

      allDays.push(earliest.day);

      // Sum all rent payments in the month (amounts are negative, so use abs)
      const monthTotal = payments.reduce(
        (sum, p) => sum + Math.abs(p.amount),
        0
      );
      allAmounts.push(monthTotal);
    }

    const punctualityRate = (onTimePays / totalPays) * 100;

    // 6. Determine badge level
    let badgeLevel: string | null = null;
    if (verifiedMonths >= 24) {
      badgeLevel = "GOLD";
    } else if (verifiedMonths >= 12) {
      badgeLevel = "SILVER";
    } else if (verifiedMonths >= 6) {
      badgeLevel = "BRONZE";
    }

    // 7. Calculate average amount
    const avgAmount =
      allAmounts.reduce((sum, a) => sum + a, 0) / allAmounts.length;

    // 8. Most frequent payment day
    const dayCounts: Record<number, number> = {};
    for (const day of allDays) {
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    const paymentDay = parseInt(
      Object.entries(dayCounts).reduce((a, b) =>
        a[1] >= b[1] ? a : b
      )[0]
    );

    return {
      found: true,
      badgeLevel,
      verifiedMonths,
      punctualityRate: Math.round(punctualityRate * 100) / 100,
      avgAmount: Math.round(avgAmount),
      paymentDay,
    };
  }

  /**
   * Analyze payment history and update the TenantProfile with badge info.
   */
  static async updateBadge(userId: string) {
    const result = await PaymentVerificationService.analyzePaymentHistory(userId);

    const updateData: Record<string, unknown> = {
      verifiedMonths: result.verifiedMonths ?? 0,
      punctualityRate: result.punctualityRate ?? null,
      lastVerifiedAt: new Date(),
      verificationStatus: result.found ? "VERIFIED" : "FAILED",
      badgeLevel: result.found ? (result.badgeLevel ?? null) : null,
    };

    // If a badge is earned, mark rent as verified
    if (result.found && result.badgeLevel) {
      updateData.rentVerified = true;
    }

    const updated = await prisma.tenantProfile.update({
      where: { userId },
      data: updateData,
    });

    return {
      badgeLevel: updated.badgeLevel,
      verifiedMonths: updated.verifiedMonths,
      punctualityRate: updated.punctualityRate,
      lastVerifiedAt: updated.lastVerifiedAt,
      verificationStatus: updated.verificationStatus,
    };
  }
}
