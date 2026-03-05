import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { RentReceiptService } from "@/services/RentReceiptService";
import { DocumentService } from "@/services/DocumentService";
import { findConversationByListingAndUsers } from "@/lib/findConversation";

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

        // Index receipt as Coridor document in conversation
        try {
          const app = await prisma.rentalApplication.findUnique({
            where: { id: lease.id },
            select: {
              listingId: true,
              listing: { select: { rentalUnit: { select: { property: { select: { ownerId: true } } } } } },
              candidateScope: { select: { creatorUserId: true } },
            },
          });

          const landlordId = app?.listing?.rentalUnit?.property?.ownerId;
          const tenantId = app?.candidateScope?.creatorUserId;
          const listingId = app?.listingId;

          if (landlordId && tenantId && listingId) {
            const conversationId = await findConversationByListingAndUsers(listingId, [landlordId, tenantId]);
            if (conversationId) {
              const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
              const monthLabel = `${monthNames[targetMonth - 1]} ${targetYear}`;

              const msg = await prisma.message.create({
                data: {
                  body: `CORIDOR_DOCUMENT|quittance|Quittance de loyer — ${monthLabel}|/api/receipts/${receipt.id}/download`,
                  conversation: { connect: { id: conversationId } },
                  sender: { connect: { id: landlordId } },
                  seen: { connect: { id: landlordId } },
                },
              });

              await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() },
              });

              await DocumentService.createCoridorDocument({
                conversationId,
                messageId: msg.id,
                fileName: `quittance-${targetMonth}-${targetYear}.pdf`,
                fileType: 'application/pdf',
                fileSize: 0,
                fileUrl: `/api/receipts/${receipt.id}/download`,
                coridorType: 'quittance',
                coridorRef: receipt.id,
                label: `Quittance de loyer — ${monthLabel}`,
              });
            }
          }
        } catch (docErr) {
          console.error(`[Cron] Error indexing receipt document:`, docErr);
        }

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
