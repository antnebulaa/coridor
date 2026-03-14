import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';
import { PassportService } from '@/services/PassportService';
import { DepositService } from '@/services/DepositService';
import { getServerTranslation } from '@/lib/serverTranslations';

const t = getServerTranslation('emails');

// POST /api/cron/deposit-resolution — Auto-resolve + deadline reminders + overdue + penalties
export async function POST() {
  try {
    const now = new Date();

    // === 1. Auto-resolve expired partial agreements (existing logic) ===
    const expired = await prisma.depositResolution.findMany({
      where: {
        status: 'PARTIAL_AGREED',
        partialDeadline: { lt: now },
      },
      include: {
        inspection: {
          include: {
            application: {
              include: {
                listing: {
                  include: {
                    rentalUnit: {
                      include: { property: { select: { ownerId: true } } },
                    },
                  },
                },
                candidateScope: { select: { creatorUserId: true } },
              },
            },
          },
        },
      },
    });

    let resolved = 0;

    for (const resolution of expired) {
      await prisma.depositResolution.update({
        where: { id: resolution.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
        },
      });

      resolved++;

      // Update rental history (Passeport Locatif)
      PassportService.onCleanExit(resolution.inspection.applicationId).catch(console.error);

      // SecurityDeposit transition
      try {
        const secDep = await prisma.securityDeposit.findUnique({
          where: { applicationId: resolution.inspection.applicationId },
        });
        if (secDep) {
          await DepositService.transition(secDep.id, 'RESOLVED', {
            actorType: 'cron',
            description: 'Auto-résolution — délai 14 jours expiré',
          });
        }
      } catch (e) { console.error('[Cron] SecurityDeposit resolve failed:', e); }

      // Notify both parties
      const landlordId = resolution.inspection.application.listing.rentalUnit.property.ownerId;
      const tenantId = resolution.inspection.application.candidateScope?.creatorUserId;
      const inspectionId = resolution.inspectionId;

      for (const userId of [landlordId, tenantId]) {
        if (!userId) continue;

        await createNotification({
          userId,
          type: 'inspection',
          title: t('deposit.resolution.notifTitle'),
          message: t('deposit.resolution.notifMessage'),
          link: `/inspection/${inspectionId}/deductions`,
        });

        sendPushNotification({
          userId,
          title: t('deposit.resolution.pushTitle'),
          body: t('deposit.resolution.pushBody'),
          url: `/inspection/${inspectionId}/deductions`,
        });
      }
    }

    // === 2. J-7 pre-deadline reminders ===
    let preDeadlineReminders = 0;
    try {
      preDeadlineReminders = await DepositService.sendPreDeadlineReminders();
    } catch (e) { console.error('[Cron] Pre-deadline reminders failed:', e); }

    // === 3. Overdue detection + penalty calculation ===
    let overdueResult = { checked: 0, newOverdue: 0, penaltiesUpdated: 0 };
    try {
      overdueResult = await DepositService.checkAllOverdue();
    } catch (e) { console.error('[Cron] Overdue check failed:', e); }

    // === 4. J+15 post-deadline reminders (second reminder + suggest formal notice) ===
    let postDeadlineReminders = 0;
    try {
      postDeadlineReminders = await DepositService.sendPostDeadlineReminders();
    } catch (e) { console.error('[Cron] Post-deadline reminders failed:', e); }

    return NextResponse.json({
      ok: true,
      resolved,
      checked: expired.length,
      preDeadlineReminders,
      overdue: overdueResult,
      postDeadlineReminders,
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    console.error('[Cron DepositResolution] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
