
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    visitId?: string;
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { visitId } = await params;

    if (!visitId || typeof visitId !== 'string') {
        throw new Error('Invalid ID');
    }

    // Verify ownership (Candidate OR Landlord can cancel?)
    // User said "Annuler le rdv" on VisitCard which is for Tenants usually (since it says "Contacter" owner)
    // So we check if currentUser is the candidate OR the listing owner.

    const visit = await prisma.visit.findUnique({
        where: {
            id: visitId
        },
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
        return NextResponse.error();
    }

    const isCandidate = visit.candidateId === currentUser.id;
    const isOwner = visit.listing.rentalUnit.property.ownerId === currentUser.id;

    if (!isCandidate && !isOwner) {
        return NextResponse.error();
    }

    // Determine action: Delete or Status Cancelled?
    // User said "Annuler le rdv". Usually simpler to Delete for a MVP or set status to CANCELLED.
    // If I delete, it disappears. If I set Cancelled, it stays.
    // Given "Annuler le rdv", usually implies it's gone from schedule.
    // Let's DELETE for now to keep it clean, or update status if history needed.
    // VisitCard filters for CONFIRMED.
    // So setting to CANCELLED is safer logic.

    const cancelledVisit = await prisma.visit.update({
        where: {
            id: visitId
        },
        data: {
            status: "CANCELLED"
        }
    });

    // Send push notifications to both parties
    const { sendPushNotification } = await import("@/app/lib/sendPushNotification");
    const otherPartyId = isCandidate ? visit.listing.rentalUnit.property.ownerId : visit.candidateId;

    // Notify the other party
    sendPushNotification({
        userId: otherPartyId,
        title: "Visite annulée",
        body: `La visite prévue a été annulée par ${currentUser.name || 'l\'autre partie'}`,
        url: `/calendar`,
        type: 'visit'
    }).catch(err => console.error("[Push] Failed to notify:", err));

    return NextResponse.json(cancelledVisit);
}
