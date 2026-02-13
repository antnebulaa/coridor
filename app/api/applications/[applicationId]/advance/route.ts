import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { ApplicationStatus } from "@prisma/client";

interface IParams {
    applicationId: string;
}

const VALID_TARGETS: ApplicationStatus[] = ["SHORTLISTED", "FINALIST", "SELECTED"];

export async function POST(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await params;
    if (!applicationId || typeof applicationId !== "string") {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { targetStatus } = body as { targetStatus: ApplicationStatus };

    if (!targetStatus || !VALID_TARGETS.includes(targetStatus)) {
        return NextResponse.json({ error: "Invalid targetStatus" }, { status: 400 });
    }

    const application = await prisma.rentalApplication.findUnique({
        where: { id: applicationId },
        include: {
            listing: {
                include: {
                    rentalUnit: {
                        include: { property: true }
                    }
                }
            },
            candidateScope: {
                include: {
                    creatorUser: {
                        select: { id: true, name: true, firstName: true, email: true }
                    }
                }
            }
        }
    });

    if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const ownerId = application.listing.rentalUnit.property.ownerId;
    if (ownerId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedApplication = await prisma.rentalApplication.update({
        where: { id: applicationId },
        data: { status: targetStatus }
    });

    const { createNotification } = await import("@/libs/notifications");
    const { sendPushNotification } = await import("@/app/lib/sendPushNotification");
    const { sendEmail } = await import("@/lib/email");

    const selectedCandidate = application.candidateScope.creatorUser;
    const listingTitle = application.listing.title;

    if (targetStatus === "SELECTED") {
        await createNotification({
            userId: selectedCandidate.id,
            type: "application",
            title: "Candidature retenue !",
            message: `Votre candidature pour "${listingTitle}" a ete retenue. Felicitations !`,
            link: "/dashboard/applications"
        });

        sendPushNotification({
            userId: selectedCandidate.id,
            title: "Candidature retenue !",
            body: `Votre candidature pour "${listingTitle}" a ete retenue !`,
            url: "/dashboard/applications",
            type: "application"
        }).catch((err) => console.error("[Push] Failed:", err));

        if (selectedCandidate.email) {
            sendEmail(
                selectedCandidate.email,
                `Candidature retenue - ${listingTitle}`,
                `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #111;">Candidature retenue</h2>
                    <p>Bonjour ${selectedCandidate.firstName || selectedCandidate.name || ""},</p>
                    <p>Nous avons le plaisir de vous informer que votre candidature pour <strong>"${listingTitle}"</strong> a ete retenue !</p>
                    <p>Le proprietaire va prendre contact avec vous pour la suite.</p>
                    <p style="margin-top: 24px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://coridor.fr"}/dashboard/applications"
                           style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                            Voir ma candidature
                        </a>
                    </p>
                    <p style="color: #666; margin-top: 24px; font-size: 14px;">-- L'equipe Coridor</p>
                </div>
                `
            ).catch((err) => console.error("[Email] Failed:", err));
        }

        const otherApplications = await prisma.rentalApplication.findMany({
            where: {
                listingId: application.listingId,
                id: { not: applicationId },
                status: { notIn: ["REJECTED", "ACCEPTED"] }
            },
            include: {
                candidateScope: {
                    include: {
                        creatorUser: {
                            select: { id: true, name: true, firstName: true, email: true }
                        }
                    }
                }
            }
        });

        const rejectionReason = "Un autre candidat a ete retenu";

        for (const other of otherApplications) {
            await prisma.rentalApplication.update({
                where: { id: other.id },
                data: {
                    status: "REJECTED",
                    rejectedAt: new Date(),
                    rejectionReason
                }
            });

            const candidate = other.candidateScope.creatorUser;

            await createNotification({
                userId: candidate.id,
                type: "application",
                title: "Candidature non retenue",
                message: `Votre candidature pour "${listingTitle}" n'a pas ete retenue. Motif : ${rejectionReason}`,
                link: "/dashboard/applications"
            });

            sendPushNotification({
                userId: candidate.id,
                title: "Candidature non retenue",
                body: `Votre candidature pour "${listingTitle}" n'a pas ete retenue.`,
                url: "/dashboard/applications",
                type: "application"
            }).catch((err) => console.error("[Push] Failed:", err));

            if (candidate.email) {
                sendEmail(
                    candidate.email,
                    `Candidature non retenue - ${listingTitle}`,
                    `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #111;">Candidature non retenue</h2>
                        <p>Bonjour ${candidate.firstName || candidate.name || ""},</p>
                        <p>Nous vous informons que votre candidature pour <strong>"${listingTitle}"</strong> n'a pas ete retenue.</p>
                        <p><strong>Motif :</strong> ${rejectionReason}</p>
                        <p>Ne vous decouragez pas, d'autres opportunites vous attendent sur Coridor.</p>
                        <p style="margin-top: 24px;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://coridor.fr"}/listings"
                               style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                                Continuer ma recherche
                            </a>
                        </p>
                        <p style="color: #666; margin-top: 24px; font-size: 14px;">-- L'equipe Coridor</p>
                    </div>
                    `
                ).catch((err) => console.error("[Email] Failed:", err));
            }
        }
    }

    return NextResponse.json(updatedApplication);
}
