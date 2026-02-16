import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

/**
 * GET /api/rent-tracking/summary
 *
 * Retourne un résumé agrégé du suivi des loyers pour le propriétaire connecté :
 * - Nombre de loyers en retard ce mois
 * - Total trackés sur 12 mois
 * - Total payés sur 12 mois
 * - Taux de recouvrement
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer tous les baux du propriétaire
    const applications = await prisma.rentalApplication.findMany({
      where: {
        leaseStatus: "SIGNED",
        listing: {
          rentalUnit: {
            property: { ownerId: currentUser.id },
          },
        },
      },
      select: { id: true },
    });

    const applicationIds = applications.map((a) => a.id);

    if (applicationIds.length === 0) {
      return NextResponse.json({
        currentMonthLate: 0,
        totalTracked: 0,
        totalPaid: 0,
        recoveryRate: 100,
      });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Loyers en retard ce mois (LATE, REMINDER_SENT, OVERDUE, CRITICAL)
    const currentMonthLate = await prisma.rentPaymentTracking.count({
      where: {
        rentalApplicationId: { in: applicationIds },
        periodMonth: currentMonth,
        periodYear: currentYear,
        status: { in: ["LATE", "REMINDER_SENT", "OVERDUE", "CRITICAL"] },
      },
    });

    // Stats sur 12 mois glissants
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const allTrackings = await prisma.rentPaymentTracking.findMany({
      where: {
        rentalApplicationId: { in: applicationIds },
        expectedDate: { gte: twelveMonthsAgo },
      },
      select: { status: true },
    });

    const totalTracked = allTrackings.length;
    const totalPaid = allTrackings.filter(
      (t) => t.status === "PAID" || t.status === "MANUALLY_CONFIRMED"
    ).length;

    const recoveryRate =
      totalTracked > 0 ? Math.round((totalPaid / totalTracked) * 100) : 100;

    return NextResponse.json({
      currentMonthLate,
      totalTracked,
      totalPaid,
      recoveryRate,
    });
  } catch (error) {
    console.error("[API] Error fetching rent tracking summary:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
