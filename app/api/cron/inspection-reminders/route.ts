import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { sendPushNotification } from "@/app/lib/sendPushNotification";
import { createNotification } from "@/libs/notifications";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Cron job for EDL (inspection) reminders.
 * Should run daily at 7 AM.
 *
 * Logic:
 * - J-1: Inspections scheduled for tomorrow → reminder to landlord + tenant
 * - Jour J: Inspections scheduled for today → reminder to landlord + tenant
 *
 * URL: /api/cron/inspection-reminders
 * Authorization: Bearer token (CRON_SECRET)
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('[Cron] Starting inspection reminders job...');

    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrow = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));

    // Fetch all DRAFT inspections with scheduledAt for today or tomorrow
    const inspections = await prisma.inspection.findMany({
      where: {
        status: 'DRAFT',
        scheduledAt: { not: null },
        OR: [
          { scheduledAt: { gte: today, lte: todayEnd } },
          { scheduledAt: { gte: tomorrow, lte: tomorrowEnd } },
        ],
      },
      include: {
        landlord: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
        application: {
          select: {
            listing: {
              select: {
                title: true,
                rentalUnit: {
                  select: {
                    property: {
                      select: { city: true, address: true, addressLine1: true },
                    },
                  },
                },
              },
            },
            listingId: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${inspections.length} inspections to remind`);

    let remindedCount = 0;

    for (const insp of inspections) {
      const scheduledAt = insp.scheduledAt!;
      const isToday = scheduledAt >= today && scheduledAt <= todayEnd;
      const dateStr = format(scheduledAt, "EEEE d MMMM 'à' HH'h'mm", { locale: fr });
      const typeLabel = insp.type === 'ENTRY' ? "d'entrée" : 'de sortie';
      const address = insp.application.listing.rentalUnit.property.address
        || insp.application.listing.rentalUnit.property.addressLine1
        || insp.application.listing.rentalUnit.property.city
        || '';

      const title = isToday
        ? `État des lieux aujourd'hui`
        : `État des lieux demain`;

      const body = isToday
        ? `Rappel : état des lieux ${typeLabel} prévu ${dateStr}${address ? ` — ${address}` : ''}.`
        : `Rappel : état des lieux ${typeLabel} prévu ${dateStr}${address ? ` — ${address}` : ''}.`;

      // Notify landlord
      if (insp.landlordId) {
        await createNotification({
          userId: insp.landlordId,
          type: 'inspection',
          title,
          message: body,
          link: `/inspection/${insp.id}`,
        });

        sendPushNotification({
          userId: insp.landlordId,
          title,
          body,
          url: `/inspection/${insp.id}`,
        }).catch(err => console.error("[Push] Failed:", err));
      }

      // Notify tenant
      if (insp.tenantId) {
        await createNotification({
          userId: insp.tenantId,
          type: 'inspection',
          title,
          message: body,
          link: `/inspection/${insp.id}`,
        });

        sendPushNotification({
          userId: insp.tenantId,
          title,
          body,
          url: `/inspection/${insp.id}`,
        }).catch(err => console.error("[Push] Failed:", err));
      }

      // Inject J-1 system message in conversation
      if (!isToday && insp.landlordId) {
        const conversation = await prisma.conversation.findFirst({
          where: {
            listingId: insp.application.listingId,
            users: {
              some: { id: insp.landlordId },
            },
          },
        });

        if (conversation) {
          // Check if reminder message already sent today
          const existingReminder = await prisma.message.findFirst({
            where: {
              conversationId: conversation.id,
              body: { startsWith: `INSPECTION_REMINDER|${insp.id}` },
              createdAt: { gte: today },
            },
          });

          if (!existingReminder) {
            await prisma.message.create({
              data: {
                body: `INSPECTION_REMINDER|${insp.id}|${insp.type}|${scheduledAt.toISOString()}`,
                conversation: { connect: { id: conversation.id } },
                sender: { connect: { id: insp.landlordId } },
                seen: { connect: { id: insp.landlordId } },
              },
            });

            await prisma.conversation.update({
              where: { id: conversation.id },
              data: { lastMessageAt: new Date() },
            });
          }
        }
      }

      remindedCount++;
    }

    console.log(`[Cron] Inspection reminders job complete. Reminded: ${remindedCount}`);

    return NextResponse.json({
      success: true,
      reminded: remindedCount,
    });
  } catch (error) {
    console.error("[Cron] Inspection reminders error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
