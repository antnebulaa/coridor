import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { ReminderEngine } from "@/services/ReminderEngine";

/**
 * GET /api/cron/legal-reminders
 *
 * Cron quotidien pour le systeme de rappels legaux.
 * Securise par CRON_SECRET (Bearer token).
 *
 * Etapes :
 * 1. Sync les rappels diagnostics pour tous les biens avec des baux signes
 * 2. Sync les rappels bail pour tous les baux signes
 * 3. Execute le cron quotidien (statuts + notifications + rappels fiscaux)
 * 4. Retourne les statistiques
 */
export async function GET(request: Request) {
  try {
    // Auth par CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting legal reminders sync...");

    // 1. Trouver toutes les proprietes qui ont des baux signes
    const properties = await prisma.property.findMany({
      where: {
        rentalUnits: {
          some: {
            listings: {
              some: {
                applications: {
                  some: { leaseStatus: 'SIGNED' }
                }
              }
            }
          }
        }
      },
      select: { id: true }
    });

    console.log(`[Cron] Found ${properties.length} properties with signed leases`);

    // 2. Sync diagnostics pour chaque propriete
    for (const prop of properties) {
      try {
        await ReminderEngine.syncRemindersForProperty(prop.id);
      } catch (err) {
        console.error(`[Cron] Failed to sync property ${prop.id}:`, err);
      }
    }

    // 3. Trouver tous les baux signes
    const leases = await prisma.rentalApplication.findMany({
      where: { leaseStatus: 'SIGNED' },
      select: { id: true }
    });

    console.log(`[Cron] Found ${leases.length} signed leases`);

    // 4. Sync rappels bail pour chaque bail
    for (const lease of leases) {
      try {
        await ReminderEngine.syncRemindersForLease(lease.id);
      } catch (err) {
        console.error(`[Cron] Failed to sync lease ${lease.id}:`, err);
      }
    }

    // 5. Cron quotidien (statuts + notifications + rappels fiscaux)
    const result = await ReminderEngine.dailyCronJob();

    console.log(`[Cron] Legal reminders completed: ${JSON.stringify(result)}`);

    return NextResponse.json({
      success: true,
      ...result,
      properties: properties.length,
      leases: leases.length
    });
  } catch (error) {
    console.error("[Cron] Fatal error in legal reminders:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
