import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { ApplicationStatus } from "@prisma/client";
import { getServerTranslation } from '@/lib/serverTranslations';

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
                        select: { id: true, name: true, firstName: true, email: true, pseudonymFull: true }
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
    const t = getServerTranslation('emails');

    if (targetStatus === "SELECTED") {
        // Notify landlord about identity reveal
        await createNotification({
            userId: currentUser.id,
            type: "application",
            title: t('application.identityRevealed.title'),
            message: t('application.identityRevealed.message', { candidateName: selectedCandidate.pseudonymFull || t('application.identityRevealed.defaultCandidate') }),
            link: `/inbox`
        });

        await createNotification({
            userId: selectedCandidate.id,
            type: "application",
            title: t('application.selected.title'),
            message: t('application.selected.message', { title: listingTitle }),
            link: "/dashboard/applications"
        });

        sendPushNotification({
            userId: selectedCandidate.id,
            title: t('application.selected.title'),
            body: t('application.selected.pushBody', { title: listingTitle }),
            url: "/dashboard/applications",
            type: "application"
        }).catch((err) => console.error("[Push] Failed:", err));

        if (selectedCandidate.email) {
            sendEmail(
                selectedCandidate.email,
                t('application.selected.emailSubject', { title: listingTitle }),
                `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #111;">${t('application.selected.emailHeading')}</h2>
                    <p>${t('application.selected.emailGreeting', { name: selectedCandidate.firstName || selectedCandidate.name || '' })}</p>
                    <p>${t('application.selected.emailBody', { title: listingTitle })}</p>
                    <p>${t('application.selected.emailFollowUp')}</p>
                    <p style="margin-top: 24px;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://coridor.fr"}/dashboard/applications"
                           style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                            ${t('application.selected.emailCta')}
                        </a>
                    </p>
                    <p style="color: #666; margin-top: 24px; font-size: 14px;">${t('application.selected.emailSignature')}</p>
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
                            select: { id: true, name: true, firstName: true, email: true, pseudonymFull: true }
                        }
                    }
                }
            }
        });

        const rejectionReason = t('application.rejected.reason');

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
                title: t('application.rejected.title'),
                message: t('application.rejected.message', { title: listingTitle, reason: rejectionReason }),
                link: "/dashboard/applications"
            });

            sendPushNotification({
                userId: candidate.id,
                title: t('application.rejected.title'),
                body: t('application.rejected.pushBody', { title: listingTitle }),
                url: "/dashboard/applications",
                type: "application"
            }).catch((err) => console.error("[Push] Failed:", err));

            if (candidate.email) {
                sendEmail(
                    candidate.email,
                    t('application.rejected.emailSubject', { title: listingTitle }),
                    `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #111;">${t('application.rejected.emailHeading')}</h2>
                        <p>${t('application.rejected.emailGreeting', { name: candidate.firstName || candidate.name || '' })}</p>
                        <p>${t('application.rejected.emailBody', { title: listingTitle })}</p>
                        <p><strong>${t('application.rejected.emailReasonLabel')}</strong> ${rejectionReason}</p>
                        <p>${t('application.rejected.emailEncouragement')}</p>
                        <p style="margin-top: 24px;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://coridor.fr"}/listings"
                               style="background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                                ${t('application.rejected.emailCta')}
                            </a>
                        </p>
                        <p style="color: #666; margin-top: 24px; font-size: 14px;">${t('application.rejected.emailSignature')}</p>
                    </div>
                    `
                ).catch((err) => console.error("[Email] Failed:", err));
            }
        }
    }

    return NextResponse.json(updatedApplication);
}
