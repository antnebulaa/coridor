import { NextResponse } from "next/server";
import { RentCollectionService } from "@/services/RentCollectionService";

/**
 * GET /api/cron/rent-collection
 *
 * Cron quotidien pour le suivi automatique des loyers.
 * Sécurisé par CRON_SECRET (Bearer token).
 *
 * Étapes :
 * 1. Si 1er du mois -> generateMonthlyTracking()
 * 2. checkPayments()
 * 3. processReminders()
 */
export async function GET(request: Request) {
  try {
    // Auth par CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting rent collection tracking...");

    const now = new Date();
    let generationResult = null;

    // 1. Si 1er du mois -> générer les trackings
    if (now.getDate() === 1) {
      console.log("[Cron] First day of month — generating monthly trackings...");
      generationResult = await RentCollectionService.generateMonthlyTracking();
      console.log(
        `[Cron] Monthly tracking: created=${generationResult.created}, skipped=${generationResult.skipped}, errors=${generationResult.errors}`
      );
    }

    // 2. Vérifier les paiements via transactions bancaires
    console.log("[Cron] Checking payments...");
    const paymentResult = await RentCollectionService.checkPayments();
    console.log(
      `[Cron] Payments: checked=${paymentResult.checked}, matched=${paymentResult.matched}, partial=${paymentResult.partial}`
    );

    // 3. Traiter les relances
    console.log("[Cron] Processing reminders...");
    const reminderResult = await RentCollectionService.processReminders();
    console.log(
      `[Cron] Reminders: late=${reminderResult.lateNotified}, emails=${reminderResult.emailsSent}, overdue=${reminderResult.overdueNotified}, critical=${reminderResult.criticalNotified}`
    );

    console.log("[Cron] Rent collection tracking completed.");

    return NextResponse.json({
      success: true,
      generation: generationResult,
      payments: paymentResult,
      reminders: reminderResult,
    });
  } catch (error) {
    console.error("[Cron] Fatal error in rent collection:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
