import React from "react";
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { RentReceiptService } from "@/services/RentReceiptService";
import ReactPDF from "@react-pdf/renderer";
import RentReceiptDocument from "@/components/documents/RentReceiptDocument";

// Helper to render PDF to Buffer (same pattern as lease PDF generation)
const renderToBuffer = async (element: React.ReactElement): Promise<Buffer> => {
  const stream = await ReactPDF.renderToStream(element as any);
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
};

interface IParams {
  receiptId: string;
}

export async function GET(
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
            },
            candidateScope: true
          }
        }
      }
    });

    if (!receipt) {
      return NextResponse.json({ error: "Quittance introuvable" }, { status: 404 });
    }

    // Vérifier l'accès
    const app = receipt.rentalApplication;
    const isOwner = app.listing.rentalUnit.property.ownerId === currentUser.id;
    const isTenant = app.candidateScope.creatorUserId === currentUser.id
      || app.candidateScope.membersIds.includes(currentUser.id);

    if (!isOwner && !isTenant) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Obtenir les données pour le PDF
    const data = await RentReceiptService.getReceiptData(params.receiptId);

    // Render le PDF côté serveur
    const pdfBuffer = await renderToBuffer(
      React.createElement(RentReceiptDocument, { data })
    );

    // Générer un nom de fichier
    const monthStr = data.periodStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const docType = data.isPartialPayment ? 'Recu' : 'Quittance';
    const fileName = `${docType}_${monthStr.replace(/\s/g, '_')}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      }
    });
  } catch (error: any) {
    console.error("RECEIPT DOWNLOAD ERROR:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
