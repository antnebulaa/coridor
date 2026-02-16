import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { RentReceiptService } from "@/services/RentReceiptService";

/**
 * Cron job — Génération automatique de quittances.
 * Tourne le 5 de chaque mois pour le mois précédent.
 *
 * Pour chaque bail signé (leaseStatus = SIGNED), génère une quittance
 * si elle n'existe pas encore pour le mois précédent.
 */
export async function GET(request: Request) {
  try {
    // Vérifier cron secret
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting rent receipt generation...");

    const now = new Date();
    // Le mois précédent
    const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-12
    const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    // Trouver tous les baux signés
    const signedLeases = await prisma.rentalApplication.findMany({
      where: {
        leaseStatus: 'SIGNED'
      },
      select: {
        id: true
      }
    });

    console.log(`[Cron] Found ${signedLeases.length} signed leases`);

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const lease of signedLeases) {
      try {
        // Vérifier si quittance existe déjà
        const periodStart = new Date(targetYear, targetMonth - 1, 1);
        const existing = await prisma.rentReceipt.findUnique({
          where: {
            rentalApplicationId_periodStart: {
              rentalApplicationId: lease.id,
              periodStart
            }
          }
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Générer la quittance
        const receipt = await RentReceiptService.generateReceipt(lease.id, targetYear, targetMonth);

        // Envoyer notification + email
        await RentReceiptService.sendReceiptNotification(receipt.id);

        generated++;
        console.log(`[Cron] Generated receipt for lease ${lease.id} (${targetMonth}/${targetYear})`);
      } catch (err: any) {
        errors++;
        console.error(`[Cron] Error generating receipt for lease ${lease.id}:`, err.message);
      }
    }

    console.log(`[Cron] Receipt generation completed. Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors}`);

    return NextResponse.json({
      success: true,
      period: `${targetMonth}/${targetYear}`,
      totalLeases: signedLeases.length,
      generated,
      skipped,
      errors
    });
  } catch (error) {
    console.error("[Cron] Fatal error in receipt generation:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
