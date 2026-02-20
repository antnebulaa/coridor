import React from 'react';
import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import ReactPDF from '@react-pdf/renderer';
import InspectionDocument from '@/components/documents/InspectionDocument';
import type { InspectionPdfData } from '@/components/documents/InspectionDocument';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';

type Params = { params: Promise<{ inspectionId: string }> };

const renderToBuffer = async (element: React.ReactElement): Promise<Buffer> => {
  const stream = await ReactPDF.renderToStream(element as any);
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
};

// POST /api/inspection/[inspectionId]/generate-pdf — Generate the final PDF
export async function POST(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        landlord: { select: { name: true } },
        tenant: { select: { name: true } },
        application: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: {
                    property: {
                      select: { ownerId: true, address: true, city: true, zipCode: true },
                    },
                  },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
        meters: true,
        keys: true,
        rooms: {
          include: {
            elements: { include: { photos: true } },
            photos: true,
          },
          orderBy: { order: 'asc' },
        },
        photos: true,
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isLandlord = inspection.application.listing.rentalUnit.property.ownerId === currentUser.id;
    const isTenant = inspection.application.candidateScope?.creatorUserId === currentUser.id;

    if (!isLandlord && !isTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // The inspection must be signed
    if (inspection.status !== 'SIGNED' && inspection.status !== 'LOCKED') {
      return NextResponse.json({ error: 'Inspection must be signed before generating PDF' }, { status: 400 });
    }

    // Build address
    const prop = inspection.application.listing.rentalUnit.property;
    const address = [prop.address, prop.zipCode, prop.city].filter(Boolean).join(', ');

    // Build PDF data
    const pdfData: InspectionPdfData = {
      type: inspection.type as 'ENTRY' | 'EXIT',
      date: new Date(inspection.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      address,
      landlordName: inspection.landlord?.name || 'Bailleur',
      tenantName: inspection.tenant?.name || 'Locataire',
      tenantPresent: inspection.tenantPresent,
      representativeName: inspection.representativeName,
      landlordSignatureSvg: inspection.landlordSignature ? (inspection.landlordSignature as any).svg : null,
      tenantSignatureSvg: inspection.tenantSignature ? (inspection.tenantSignature as any).svg : null,
      landlordSignedAt: inspection.landlordSignedAt?.toISOString() ?? null,
      tenantSignedAt: inspection.tenantSignedAt?.toISOString() ?? null,
      tenantReserves: inspection.tenantReserves,
      meters: inspection.meters.map((m) => ({
        type: m.type,
        meterNumber: m.meterNumber,
        indexValue: m.indexValue,
        photoUrl: m.photoUrl,
        noGas: m.noGas,
      })),
      keys: inspection.keys.map((k) => ({
        type: k.type,
        quantity: k.quantity,
      })),
      rooms: inspection.rooms.map((room) => ({
        name: room.name,
        roomType: room.roomType,
        observations: room.observations,
        elements: room.elements.map((el) => ({
          name: el.name,
          category: el.category,
          nature: el.nature,
          condition: el.condition,
          isAbsent: el.isAbsent,
          observations: el.observations,
          degradationTypes: el.degradationTypes,
          photos: el.photos.map((p) => ({
            url: p.url,
            thumbnailUrl: p.thumbnailUrl,
            type: p.type,
          })),
        })),
        photos: room.photos.map((p) => ({
          url: p.url,
          thumbnailUrl: p.thumbnailUrl,
          type: p.type,
        })),
      })),
    };

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InspectionDocument, { data: pdfData })
    );

    // Upload to Cloudinary (unsigned upload)
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), `edl-${inspectionId}.pdf`);
    formData.append('upload_preset', 'airbnb-clone');
    formData.append('resource_type', 'auto');
    formData.append('folder', 'inspection-pdfs');

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: 'POST', body: formData }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('[Inspection PDF Upload] Cloudinary error:', err);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    const pdfUrl = uploadData.secure_url;

    // Store PDF URL on the inspection
    await prisma.inspection.update({
      where: { id: inspectionId },
      data: { pdfUrl },
    });

    // Inject system message in conversation
    const landlordId = inspection.application.listing.rentalUnit.property.ownerId;
    const candidateId = inspection.application.candidateScope?.creatorUserId;

    if (landlordId && candidateId) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          listingId: inspection.application.listingId,
          users: { every: { id: { in: [landlordId, candidateId] } } },
        },
      });

      if (conversation) {
        await prisma.message.create({
          data: {
            body: `INSPECTION_PDF_READY|${inspectionId}|${pdfUrl}`,
            conversation: { connect: { id: conversation.id } },
            sender: { connect: { id: currentUser.id } },
            seen: { connect: { id: currentUser.id } },
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });
      }

      // Notify both parties
      for (const userId of [landlordId, candidateId]) {
        await createNotification({
          userId,
          type: 'inspection',
          title: "PDF de l'état des lieux disponible",
          message: "Le PDF de l'état des lieux est prêt. Vous pouvez le consulter et le télécharger.",
          link: pdfUrl,
        });

        sendPushNotification({
          userId,
          title: "PDF de l'état des lieux prêt",
          body: "Le document PDF de l'état des lieux est maintenant disponible.",
          url: pdfUrl,
        });
      }
    }

    return NextResponse.json({ pdfUrl });
  } catch (error: unknown) {
    console.error('[Inspection Generate-PDF POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
