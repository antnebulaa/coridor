import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { DepositTimelineDocument } from '@/components/documents/DepositTimelineDocument';
import type { DepositTimelineData } from '@/components/documents/DepositTimelineDocument';

type Params = { params: Promise<{ applicationId: string }> };

const renderToBuffer = async (element: React.ReactElement): Promise<Buffer> => {
  const stream = await ReactPDF.renderToStream(element as any);
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

const STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: 'En attente du versement',
  PAID: 'Versé',
  HELD: 'Détenu',
  EXIT_INSPECTION: 'EDL de sortie',
  RETENTIONS_PROPOSED: 'Retenues proposées',
  PARTIALLY_RELEASED: 'Restitution partielle',
  FULLY_RELEASED: 'Restitué',
  DISPUTED: 'Contesté',
  RESOLVED: 'Clos',
};

// POST — Generate timeline export PDF
export async function POST(request: Request, props: Params) {
  try {
    const { applicationId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deposit = await prisma.securityDeposit.findUnique({
      where: { applicationId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        application: {
          include: {
            listing: {
              select: {
                title: true,
                rentalUnit: {
                  include: {
                    property: {
                      select: { ownerId: true, address: true, city: true },
                    },
                  },
                },
              },
            },
            candidateScope: {
              select: {
                creatorUserId: true,
                creatorUser: { select: { name: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!deposit) {
      return NextResponse.json({ error: 'No deposit found' }, { status: 404 });
    }

    // Auth: landlord or tenant
    const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
    const tenantId = deposit.application.candidateScope?.creatorUserId;
    if (currentUser.id !== landlordId && currentUser.id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const landlord = await prisma.user.findUnique({
      where: { id: landlordId },
      select: { name: true, firstName: true, lastName: true },
    });

    const tenant = deposit.application.candidateScope?.creatorUser;
    const listing = deposit.application.listing;
    const property = listing.rentalUnit.property;

    const pdfData: DepositTimelineData = {
      landlordName: landlord?.firstName && landlord?.lastName
        ? `${landlord.firstName} ${landlord.lastName}`
        : landlord?.name || 'Bailleur',
      tenantName: tenant?.firstName && tenant?.lastName
        ? `${tenant.firstName} ${tenant.lastName}`
        : tenant?.name || 'Locataire',
      propertyAddress: property.address || `${listing.title}${property.city ? `, ${property.city}` : ''}`,
      depositAmountCents: deposit.amountCents,
      status: STATUS_LABELS[deposit.status] || deposit.status,
      isOverdue: deposit.isOverdue,
      overdueMonths: deposit.overdueMonths,
      penaltyAmountCents: deposit.penaltyAmountCents,
      legalDeadline: deposit.legalDeadline
        ? new Date(deposit.legalDeadline).toLocaleDateString('fr-FR')
        : null,
      events: deposit.events.map((e) => ({
        date: new Date(e.createdAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        type: e.type,
        description: e.description,
        actorType: e.actorType,
      })),
      generatedAt: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(DepositTimelineDocument, { data: pdfData })
    );

    // Upload to Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), `timeline-depot-${applicationId}.pdf`);
    formData.append('upload_preset', 'airbnb-clone');
    formData.append('resource_type', 'auto');
    formData.append('folder', 'deposit-documents');

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: 'POST', body: formData }
    );

    if (!uploadRes.ok) {
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    const pdfUrl = uploadData.secure_url;

    // Store URL and create event
    await prisma.securityDeposit.update({
      where: { id: deposit.id },
      data: { timelineExportUrl: pdfUrl },
    });

    await prisma.depositEvent.create({
      data: {
        depositId: deposit.id,
        type: 'TIMELINE_EXPORTED',
        description: 'Timeline exportée en PDF',
        actorType: currentUser.id === landlordId ? 'landlord' : 'tenant',
        actorId: currentUser.id,
      },
    });

    return NextResponse.json({ url: pdfUrl }, { status: 201 });
  } catch (error: unknown) {
    console.error('[ExportTimeline POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
