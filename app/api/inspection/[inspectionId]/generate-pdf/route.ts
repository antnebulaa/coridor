import React from 'react';
import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import ReactPDF from '@react-pdf/renderer';
import InspectionDocument from '@/components/documents/InspectionDocument';
import type { InspectionPdfData } from '@/components/documents/InspectionDocument';
import { createNotification } from '@/libs/notifications';
import { sendPushNotification } from '@/app/lib/sendPushNotification';
import { sendEmail } from '@/lib/email';

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
      date: new Date(inspection.scheduledAt || inspection.createdAt).toLocaleDateString('fr-FR', {
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
            thumbnailUrl: p.thumbnailUrl ?? undefined,
            type: p.type,
          })),
        })),
        photos: room.photos.map((p) => ({
          url: p.url,
          thumbnailUrl: p.thumbnailUrl ?? undefined,
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
    formData.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), `edl-${inspectionId}.pdf`);
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
      const landlordUser = await prisma.user.findUnique({ where: { id: landlordId }, select: { name: true, email: true } });
      const tenantUser = candidateId ? await prisma.user.findUnique({ where: { id: candidateId }, select: { name: true, email: true } }) : null;

      for (const userId of [landlordId, candidateId]) {
        if (!userId) continue;
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

      // Auto-send PDF by email to both parties
      const emailHtml = (name: string | null) => `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">État des lieux signé</h2>
          <p style="color: #555; line-height: 1.6;">
            Bonjour${name ? ` ${name}` : ''},<br/><br/>
            L'état des lieux a été signé par les deux parties. Le PDF est disponible en cliquant sur le bouton ci-dessous.
          </p>
          <a href="${pdfUrl}" style="display: inline-block; background: #1719FF; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 16px 0;">
            Consulter le PDF
          </a>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">
            Rappel : le locataire dispose de 10 jours après la remise des clés pour signaler tout défaut non visible (art. 3-2 loi du 6 juillet 1989).
          </p>
        </div>`;

      if (landlordUser?.email) {
        sendEmail(landlordUser.email, "État des lieux — PDF signé disponible", emailHtml(landlordUser.name));
      }
      if (tenantUser?.email) {
        sendEmail(tenantUser.email, "État des lieux — PDF signé disponible", emailHtml(tenantUser.name));
      }
    }

    return NextResponse.json({ pdfUrl });
  } catch (error: unknown) {
    console.error('[Inspection Generate-PDF POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
