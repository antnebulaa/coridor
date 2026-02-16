import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json({ error: "applicationId requis" }, { status: 400 });
    }

    // Vérifier que l'utilisateur a accès (propriétaire OU locataire)
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
        candidateScope: true
      }
    });

    if (!application) {
      return NextResponse.json({ error: "Bail introuvable" }, { status: 404 });
    }

    const isOwner = application.listing.rentalUnit.property.ownerId === currentUser.id;
    const isTenant = application.candidateScope.creatorUserId === currentUser.id
      || application.candidateScope.membersIds.includes(currentUser.id);

    if (!isOwner && !isTenant) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const receipts = await prisma.rentReceipt.findMany({
      where: { rentalApplicationId: applicationId },
      orderBy: { periodStart: 'desc' }
    });

    return NextResponse.json({
      receipts: receipts.map(r => ({
        id: r.id,
        periodStart: r.periodStart.toISOString(),
        periodEnd: r.periodEnd.toISOString(),
        rentAmountCents: r.rentAmountCents,
        chargesAmountCents: r.chargesAmountCents,
        totalAmountCents: r.totalAmountCents,
        isPartialPayment: r.isPartialPayment,
        pdfUrl: r.pdfUrl,
        sentAt: r.sentAt?.toISOString() || null,
        createdAt: r.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error("RECEIPTS LIST ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
