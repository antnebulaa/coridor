import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { sendPushNotification } from "@/app/lib/sendPushNotification";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/libs/notifications";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getServerTranslation } from '@/lib/serverTranslations';

const t = getServerTranslation('emails');

/**
 * Cron job for visit confirmation reminders and auto-cancellation.
 * Should run every hour.
 *
 * Logic:
 * - PENDING visits created > 12h ago without reminder → send reminder
 * - PENDING visits created > 24h ago → auto-cancel
 *
 * URL: /api/cron/visit-reminders
 * Authorization: Bearer token (CRON_SECRET)
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

        if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log('[Cron] Starting visit reminders job...');

        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Auto-cancel: PENDING visits created more than 24h ago
        const visitsToCancel = await prisma.visit.findMany({
            where: {
                status: 'PENDING',
                createdAt: { lt: twentyFourHoursAgo }
            },
            include: {
                candidate: {
                    select: { id: true, name: true, email: true }
                },
                listing: {
                    include: {
                        rentalUnit: {
                            include: {
                                property: {
                                    select: { ownerId: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log(`[Cron] Found ${visitsToCancel.length} visits to auto-cancel`);

        for (const visit of visitsToCancel) {
            await prisma.visit.update({
                where: { id: visit.id },
                data: { status: 'CANCELLED' }
            });

            const visitDate = format(new Date(visit.date), 'EEEE d MMMM', { locale: fr });
            const landlordId = visit.listing.rentalUnit.property.ownerId;

            // Notify candidate
            await createNotification({
                userId: visit.candidateId,
                type: 'visit',
                title: t('visit.cancelled.notifTitle'),
                message: t('visit.cancelled.notifMessage', { date: visitDate, time: visit.startTime }),
                link: '/dashboard'
            });

            sendPushNotification({
                userId: visit.candidateId,
                title: t('visit.cancelled.pushTitle'),
                body: t('visit.cancelled.pushBody', { date: visitDate, time: visit.startTime }),
                url: '/dashboard',
                type: 'visit'
            }).catch(err => console.error("[Push] Failed:", err));

            if (visit.candidate.email) {
                sendEmail(
                    visit.candidate.email,
                    t('visit.cancelled.emailSubject', { date: visitDate }),
                    `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #111;">${t('visit.cancelled.emailHeading')}</h2>
                        <p>${t('visit.cancelled.emailBody', { name: visit.candidate.name || '', date: visitDate, time: visit.startTime })}</p>
                        <p>${t('visit.cancelled.emailRebook')}</p>
                        <p style="color: #666; margin-top: 24px; font-size: 14px;">${t('visit.cancelled.emailSignature')}</p>
                    </div>
                    `
                ).catch(err => console.error("[Email] Failed:", err));
            }

            // Notify landlord
            await createNotification({
                userId: landlordId,
                type: 'visit',
                title: t('visit.cancelled.landlordNotifTitle'),
                message: t('visit.cancelled.landlordNotifMessage', { name: visit.candidate.name || 'un candidat', date: visitDate, time: visit.startTime }),
                link: '/calendar'
            });

            sendPushNotification({
                userId: landlordId,
                title: t('visit.cancelled.landlordPushTitle'),
                body: t('visit.cancelled.landlordPushBody', { name: visit.candidate.name || 'un candidat', date: visitDate }),
                url: '/calendar',
                type: 'visit'
            }).catch(err => console.error("[Push] Failed:", err));
        }

        // 2. Send reminders: PENDING visits created > 12h ago, reminder not yet sent
        const visitsToRemind = await prisma.visit.findMany({
            where: {
                status: 'PENDING',
                createdAt: { lt: twelveHoursAgo },
                reminderSentAt: null
            },
            include: {
                candidate: {
                    select: { id: true, name: true, email: true }
                },
                listing: {
                    select: { title: true }
                }
            }
        });

        console.log(`[Cron] Found ${visitsToRemind.length} visits to remind`);

        for (const visit of visitsToRemind) {
            const visitDate = format(new Date(visit.date), 'EEEE d MMMM', { locale: fr });

            // Mark reminder as sent
            await prisma.visit.update({
                where: { id: visit.id },
                data: { reminderSentAt: new Date() }
            });

            // In-app notification
            await createNotification({
                userId: visit.candidateId,
                type: 'visit',
                title: t('visit.reminder.notifTitle'),
                message: t('visit.reminder.notifMessage', { date: visitDate, time: visit.startTime }),
                link: '/dashboard'
            });

            // Push notification
            sendPushNotification({
                userId: visit.candidateId,
                title: t('visit.reminder.pushTitle'),
                body: t('visit.reminder.pushBody', { date: visitDate, time: visit.startTime }),
                url: '/dashboard',
                type: 'visit'
            }).catch(err => console.error("[Push] Failed:", err));

            // Email reminder
            if (visit.candidate.email) {
                sendEmail(
                    visit.candidate.email,
                    t('visit.reminder.emailSubject', { date: visitDate }),
                    `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #111;">${t('visit.reminder.emailHeading')}</h2>
                        <p>${t('visit.reminder.emailBody', { name: visit.candidate.name || '', date: visitDate, time: visit.startTime })}</p>
                        <p style="margin-top: 24px;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr'}/dashboard"
                               style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                                ${t('visit.reminder.emailCta')}
                            </a>
                        </p>
                        <p style="color: #666; margin-top: 24px; font-size: 14px;">${t('visit.reminder.emailSignature')}</p>
                    </div>
                    `
                ).catch(err => console.error("[Email] Failed:", err));
            }
        }

        console.log(`[Cron] Visit reminders job complete. Cancelled: ${visitsToCancel.length}, Reminded: ${visitsToRemind.length}`);

        return NextResponse.json({
            success: true,
            cancelled: visitsToCancel.length,
            reminded: visitsToRemind.length
        });

    } catch (error) {
        console.error("[Cron] Visit reminders error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
