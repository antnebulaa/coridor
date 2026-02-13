import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface IParams {
    visitId?: string;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await params;

    if (!visitId || typeof visitId !== 'string') {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const visit = await prisma.visit.findUnique({
        where: { id: visitId },
        include: {
            listing: {
                include: {
                    rentalUnit: {
                        include: {
                            property: true
                        }
                    }
                }
            }
        }
    });

    if (!visit) {
        return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Only the candidate who booked can confirm
    if (visit.candidateId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can only confirm PENDING visits
    if (visit.status !== 'PENDING') {
        return NextResponse.json({ error: "Visit is not pending confirmation" }, { status: 400 });
    }

    // Confirm the visit
    const confirmedVisit = await prisma.visit.update({
        where: { id: visitId },
        data: {
            status: 'CONFIRMED',
            confirmedAt: new Date()
        }
    });

    // Update rental application status
    const application = await prisma.rentalApplication.findFirst({
        where: {
            listingId: visit.listingId,
            candidateScope: {
                creatorUserId: currentUser.id
            }
        }
    });

    if (application) {
        await prisma.rentalApplication.update({
            where: { id: application.id },
            data: { status: 'VISIT_CONFIRMED' }
        });
    }

    // Notify landlord
    const landlordId = visit.listing.rentalUnit.property.ownerId;
    const visitDate = format(new Date(visit.date), 'dd/MM/yyyy', { locale: fr });

    // In-app notification
    const { createNotification } = await import("@/libs/notifications");
    await createNotification({
        userId: landlordId,
        type: 'visit',
        title: 'Visite confirmée',
        message: `${currentUser.name || 'Un candidat'} a confirmé sa visite du ${visitDate} à ${visit.startTime}.`,
        link: '/calendar'
    });

    // Push notification
    const { sendPushNotification } = await import("@/app/lib/sendPushNotification");
    sendPushNotification({
        userId: landlordId,
        title: "Visite confirmée ✓",
        body: `${currentUser.name || 'Un candidat'} a confirmé sa visite du ${visitDate} à ${visit.startTime}`,
        url: `/calendar`,
        type: 'visit'
    }).catch(err => console.error("[Push] Failed to notify landlord:", err));

    // Email notification to landlord
    const landlord = await prisma.user.findUnique({
        where: { id: landlordId },
        select: { email: true, name: true }
    });

    if (landlord?.email) {
        const { sendEmail } = await import("@/lib/email");
        sendEmail(
            landlord.email,
            `Visite confirmée - ${visitDate} à ${visit.startTime}`,
            `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #111;">Visite confirmée</h2>
                <p>Bonjour ${landlord.name || ''},</p>
                <p><strong>${currentUser.name || 'Un candidat'}</strong> a confirmé sa présence pour la visite prévue le <strong>${visitDate} à ${visit.startTime}</strong>.</p>
                <p style="margin-top: 24px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr'}/calendar"
                       style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                        Voir mon calendrier
                    </a>
                </p>
                <p style="color: #666; margin-top: 24px; font-size: 14px;">— L'équipe Coridor</p>
            </div>
            `
        ).catch(err => console.error("[Email] Failed to notify landlord:", err));
    }

    return NextResponse.json(confirmedVisit);
}
