import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { FormalNoticeDocument } from '@/components/documents/FormalNoticeDocument';
import type { FormalNoticeData } from '@/components/documents/FormalNoticeDocument';
import { DepositService } from '@/services/DepositService';
import { DocumentService } from '@/services/DocumentService';
import { findConversationByListingAndUsers } from '@/lib/findConversation';

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

// POST — Generate formal notice PDF
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
        application: {
          include: {
            listing: {
              select: {
                title: true,
                rentalUnit: {
                  include: {
                    property: {
                      select: { ownerId: true, city: true, address: true },
                    },
                  },
                },
              },
            },
            candidateScope: {
              select: {
                creatorUserId: true,
                creatorUser: { select: { name: true, firstName: true, lastName: true, address: true } },
              },
            },
          },
        },
        depositResolution: true,
      },
    });

    if (!deposit) {
      return NextResponse.json({ error: 'No deposit found' }, { status: 404 });
    }

    // Only tenant can generate formal notice
    const tenantId = deposit.application.candidateScope?.creatorUserId;
    if (currentUser.id !== tenantId) {
      return NextResponse.json({ error: 'Only the tenant can generate a formal notice' }, { status: 403 });
    }

    if (!deposit.isOverdue) {
      return NextResponse.json({ error: 'Deposit is not overdue' }, { status: 400 });
    }

    // Get landlord info
    const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
    const landlord = await prisma.user.findUnique({
      where: { id: landlordId },
      select: { name: true, firstName: true, lastName: true, address: true },
    });

    const tenant = deposit.application.candidateScope?.creatorUser;
    const listing = deposit.application.listing;
    const property = listing.rentalUnit.property;

    const now = new Date();
    const pdfData: FormalNoticeData = {
      tenantName: tenant?.firstName && tenant?.lastName
        ? `${tenant.firstName} ${tenant.lastName}`
        : tenant?.name || 'Locataire',
      tenantAddress: tenant?.address || '(adresse du locataire)',
      landlordName: landlord?.firstName && landlord?.lastName
        ? `${landlord.firstName} ${landlord.lastName}`
        : landlord?.name || 'Bailleur',
      landlordAddress: landlord?.address || '(adresse du bailleur)',
      propertyAddress: property.address || listing.title || '(adresse du bien)',
      leaseSignedDate: deposit.leaseSignedAt
        ? new Date(deposit.leaseSignedAt).toLocaleDateString('fr-FR')
        : '(date)',
      moveInDate: '(date d\'entrée)',
      moveOutDate: deposit.exitInspectionAt
        ? new Date(deposit.exitInspectionAt).toLocaleDateString('fr-FR')
        : '(date de sortie)',
      depositAmountCents: deposit.amountCents,
      retainedAmountCents: deposit.retainedAmountCents ?? deposit.depositResolution?.totalDeductionsCents ?? 0,
      refundAmountCents: deposit.refundedAmountCents ?? deposit.depositResolution?.refundAmountCents ?? deposit.amountCents,
      legalDeadline: deposit.legalDeadline
        ? new Date(deposit.legalDeadline).toLocaleDateString('fr-FR')
        : '(date)',
      legalDeadlineMonths: deposit.legalDeadlineMonths ?? 2,
      daysOverdue: Math.ceil((now.getTime() - (deposit.legalDeadline?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24)),
      monthlyRentCents: deposit.monthlyRentCents ?? 0,
      overdueMonths: deposit.overdueMonths,
      penaltyAmountCents: deposit.penaltyAmountCents,
      noticeDate: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    };

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(FormalNoticeDocument, { data: pdfData })
    );

    // Upload to Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), `mise-en-demeure-${applicationId}.pdf`);
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
      data: { formalNoticeUrl: pdfUrl },
    });

    await prisma.depositEvent.create({
      data: {
        depositId: deposit.id,
        type: 'FORMAL_NOTICE_GENERATED',
        description: 'Mise en demeure générée',
        actorType: 'tenant',
        actorId: currentUser.id,
      },
    });

    // Index formal notice as Coridor document in conversation
    try {
      const appForListing = await prisma.rentalApplication.findUnique({
        where: { id: applicationId },
        select: { listingId: true },
      });

      if (appForListing?.listingId && landlordId && tenantId) {
        const conversationId = await findConversationByListingAndUsers(
          appForListing.listingId,
          [landlordId, tenantId]
        );
        if (conversationId) {
          const msg = await prisma.message.create({
            data: {
              body: `CORIDOR_DOCUMENT|mise_en_demeure|Mise en demeure — Restitution dépôt de garantie|${pdfUrl}`,
              conversation: { connect: { id: conversationId } },
              sender: { connect: { id: tenantId } },
              seen: { connect: { id: tenantId } },
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
          });

          await DocumentService.createCoridorDocument({
            conversationId,
            messageId: msg.id,
            fileName: `mise-en-demeure-${applicationId}.pdf`,
            fileType: 'application/pdf',
            fileSize: pdfBuffer.length,
            fileUrl: pdfUrl,
            coridorType: 'mise_en_demeure',
            coridorRef: deposit.id,
            label: 'Mise en demeure — Restitution dépôt de garantie',
          });
        }
      }
    } catch (docErr) {
      console.error('[FormalNotice] Error indexing document:', docErr);
    }

    return NextResponse.json({ url: pdfUrl }, { status: 201 });
  } catch (error: unknown) {
    console.error('[FormalNotice POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — Mark formal notice as sent
export async function PATCH(request: Request, props: Params) {
  try {
    const { applicationId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deposit = await prisma.securityDeposit.findUnique({
      where: { applicationId },
      include: {
        application: {
          include: {
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    if (!deposit) {
      return NextResponse.json({ error: 'No deposit found' }, { status: 404 });
    }

    if (currentUser.id !== deposit.application.candidateScope?.creatorUserId) {
      return NextResponse.json({ error: 'Only the tenant can mark as sent' }, { status: 403 });
    }

    const body = await request.json();
    const sentDate = body.sentDate ? new Date(body.sentDate) : new Date();

    await DepositService.markFormalNoticeSent(deposit.id, sentDate);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[FormalNotice PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
