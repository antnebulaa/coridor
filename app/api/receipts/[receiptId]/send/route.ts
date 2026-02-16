import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { RentReceiptService } from "@/services/RentReceiptService";

interface IParams {
  receiptId: string;
}

export async function POST(
  request: Request,
  props: { params: Promise<IParams> }
) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const receipt = await prisma.rentReceipt.findUnique({
      where: { id: params.receiptId },
      include: {
        rentalApplication: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: { property: true }
                }
              }
            }
          }
        }
      }
    });

    if (!receipt) {
      return NextResponse.json({ error: "Quittance introuvable" }, { status: 404 });
    }

    // Seul le propriétaire peut renvoyer
    if (receipt.rentalApplication.listing.rentalUnit.property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await RentReceiptService.sendReceiptNotification(params.receiptId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("RECEIPT SEND ERROR:", error);
    return NextResponse.json({ error: error.message || "Erreur" }, { status: 500 });
  }
}
