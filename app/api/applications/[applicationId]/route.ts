import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    applicationId: string;
}

/**
 * PATCH /api/applications/[applicationId]
 *
 * Used to reject (decline) a rental application.
 * Body: { status: 'REJECTED', rejectionReason: string, conversationId?: string }
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await params;

    if (!applicationId || typeof applicationId !== 'string') {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status, rejectionReason, conversationId } = body;

    // Find application with listing ownership verification
    const application = await prisma.rentalApplication.findUnique({
        where: { id: applicationId },
        include: {
            listing: {
                include: {
                    rentalUnit: {
                        include: {
                            property: true
                        }
                    }
                }
            },
            candidateScope: {
                include: {
                    creatorUser: {
                        select: { id: true, name: true, email: true }
                    }
                }
            }
        }
    });

    if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Verify the current user is the landlord (property owner)
    const ownerId = application.listing.rentalUnit.property.ownerId;
    if (ownerId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle REJECTED status
    if (status === 'REJECTED') {
        if (!rejectionReason) {
            return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
        }

        // Update application status
        const updatedApplication = await prisma.rentalApplication.update({
            where: { id: applicationId },
            data: {
                status: 'REJECTED',
                rejectionReason,
                rejectedAt: new Date()
            }
        });

        const candidate = application.candidateScope.creatorUser;
        const listingTitle = application.listing.title;

        // Post system message in conversation
        if (conversationId) {
            await prisma.message.create({
                data: {
                    body: `APPLICATION_REJECTED|${rejectionReason}`,
                    conversation: { connect: { id: conversationId } },
                    sender: { connect: { id: currentUser.id } },
                    seen: { connect: { id: currentUser.id } }
                }
            });

            await prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: new Date() }
            });
        }

        // Send in-app notification to candidate
        const { createNotification } = await import("@/libs/notifications");
        await createNotification({
            userId: candidate.id,
            type: 'application',
            title: 'Candidature non retenue',
            message: `Votre candidature pour "${listingTitle}" n'a pas été retenue. Motif : ${rejectionReason}`,
            link: conversationId ? `/inbox/${conversationId}` : '/dashboard/applications'
        });

        // Send push notification
        const { sendPushNotification } = await import("@/app/lib/sendPushNotification");
        sendPushNotification({
            userId: candidate.id,
            title: 'Candidature non retenue',
            body: `Votre candidature pour "${listingTitle}" n'a pas été retenue.`,
            url: conversationId ? `/inbox/${conversationId}` : '/dashboard/applications',
            type: 'application'
        }).catch(err => console.error("[Push] Failed:", err));

        // Send email to candidate
        if (candidate.email) {
            const { sendEmail } = await import("@/lib/email");
            sendEmail(
                candidate.email,
                `Candidature non retenue - ${listingTitle}`,
                `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #111;">Candidature non retenue</h2>
                    <p>Bonjour ${candidate.name || ''},</p>
                    <p>Nous vous informons que votre candidature pour <strong>"${listingTitle}"</strong> n'a pas été retenue.</p>
                    <p><strong>Motif :</strong> ${rejectionReason}</p>
                    <p>Ne vous découragez pas, d'autres opportunités vous attendent sur Coridor.</p>
                    <p style="margin-top: 24px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr'}/listings"
                           style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                            Continuer ma recherche
                        </a>
                    </p>
                    <p style="color: #666; margin-top: 24px; font-size: 14px;">— L'équipe Coridor</p>
                </div>
                `
            ).catch(err => console.error("[Email] Failed:", err));
        }

        return NextResponse.json(updatedApplication);
    }

    return NextResponse.json({ error: "Unsupported status change" }, { status: 400 });
}
