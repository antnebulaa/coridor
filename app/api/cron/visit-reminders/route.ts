import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import { sendPushNotification } from "@/app/lib/sendPushNotification";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/libs/notifications";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
                title: 'Visite annulée automatiquement',
                message: `Votre visite du ${visitDate} à ${visit.startTime} a été annulée car vous ne l'avez pas confirmée dans les 24h.`,
                link: '/dashboard'
            });

            sendPushNotification({
                userId: visit.candidateId,
                title: 'Visite annulée',
                body: `Votre visite du ${visitDate} à ${visit.startTime} a été annulée (non confirmée sous 24h).`,
                url: '/dashboard',
                type: 'visit'
            }).catch(err => console.error("[Push] Failed:", err));

            if (visit.candidate.email) {
                sendEmail(
                    visit.candidate.email,
                    `Visite annulée - ${visitDate}`,
                    `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #111;">Visite annulée</h2>
                        <p>Bonjour ${visit.candidate.name || ''},</p>
                        <p>Votre visite prévue le <strong>${visitDate} à ${visit.startTime}</strong> a été automatiquement annulée car vous ne l'avez pas confirmée dans les 24 heures.</p>
                        <p>Si vous souhaitez toujours visiter ce bien, vous pouvez réserver un nouveau créneau.</p>
                        <p style="color: #666; margin-top: 24px; font-size: 14px;">— L'équipe Coridor</p>
                    </div>
                    `
                ).catch(err => console.error("[Email] Failed:", err));
            }

            // Notify landlord
            await createNotification({
                userId: landlordId,
                type: 'visit',
                title: 'Visite annulée (non confirmée)',
                message: `La visite de ${visit.candidate.name || 'un candidat'} du ${visitDate} à ${visit.startTime} a été annulée automatiquement (non confirmée sous 24h).`,
                link: '/calendar'
            });

            sendPushNotification({
                userId: landlordId,
                title: 'Visite annulée automatiquement',
                body: `La visite de ${visit.candidate.name || 'un candidat'} du ${visitDate} n'a pas été confirmée et a été annulée.`,
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
                title: 'Confirmez votre visite',
                message: `Rappel : confirmez votre visite du ${visitDate} à ${visit.startTime} avant qu'elle ne soit annulée automatiquement.`,
                link: '/dashboard'
            });

            // Push notification
            sendPushNotification({
                userId: visit.candidateId,
                title: '⏰ Confirmez votre visite',
                body: `Plus que 12h pour confirmer votre visite du ${visitDate} à ${visit.startTime}`,
                url: '/dashboard',
                type: 'visit'
            }).catch(err => console.error("[Push] Failed:", err));

            // Email reminder
            if (visit.candidate.email) {
                sendEmail(
                    visit.candidate.email,
                    `Rappel : confirmez votre visite du ${visitDate}`,
                    `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #111;">Confirmez votre visite</h2>
                        <p>Bonjour ${visit.candidate.name || ''},</p>
                        <p>Vous avez réservé une visite pour le <strong>${visitDate} à ${visit.startTime}</strong>.</p>
                        <p>Il vous reste <strong>12 heures</strong> pour confirmer votre présence, sinon la visite sera automatiquement annulée.</p>
                        <p style="margin-top: 24px;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr'}/dashboard"
                               style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                                Confirmer ma visite
                            </a>
                        </p>
                        <p style="color: #666; margin-top: 24px; font-size: 14px;">— L'équipe Coridor</p>
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
