import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { RentReceiptService } from "@/services/RentReceiptService";
import { hasFeature } from '@/lib/features';


export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check feature access
    const canGenerateReceipts = await hasFeature(currentUser.id, 'AUTO_RECEIPTS');
    if (!canGenerateReceipts) {
      return NextResponse.json(
        { error: 'La génération de quittances nécessite un abonnement Essentiel ou Pro.' },
        { status: 403 }
      );
    }


    const body = await request.json();
    const { applicationId, year, month } = body;

    if (!applicationId || !year || !month) {
      return NextResponse.json({ error: "applicationId, year et month sont requis" }, { status: 400 });
    }

    // Vérifier que l'utilisateur est bien le propriétaire du bail
    // (via listing → rentalUnit → property → ownerId)
    const prisma = (await import("@/libs/prismadb")).default;
    const application = await prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          include: {
            rentalUnit: {
              include: { property: true }
            }
          }
        }
      }
    });

    if (!application || application.listing.rentalUnit.property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const receipt = await RentReceiptService.generateReceipt(applicationId, year, month);

    // Envoyer la notification au locataire
    await RentReceiptService.sendReceiptNotification(receipt.id);

    return NextResponse.json({ success: true, receipt });
  } catch (error: any) {
    console.error("RECEIPT GENERATE ERROR:", error);
    return NextResponse.json({ error: error.message || "Erreur lors de la génération" }, { status: 500 });
  }
}
