import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import prisma from '@/libs/prismadb';
import { CDCDossierDocument } from '@/components/documents/CDCDossierDocument';
import type { CDCDossierData, CDCDeductionItem, CDCTimelineEvent, CDCMessage } from '@/components/documents/CDCDossierDocument';

const renderToBuffer = async (element: React.ReactElement): Promise<Buffer> => {
  const stream = await ReactPDF.renderToStream(element as any);
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

export class CDCDossierService {
  /**
   * Generate a full CDC dossier PDF for a disputed deposit.
   * Returns the Cloudinary URL of the uploaded PDF.
   */
  static async generate(applicationId: string, tenantId: string): Promise<string> {
    // 1. Fetch all required data
    const data = await CDCDossierService.assembleData(applicationId);

    // 2. Render PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(CDCDossierDocument, { data })
    );

    // 3. Upload to Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }),
      `dossier-cdc-${applicationId}.pdf`
    );
    formData.append('upload_preset', 'airbnb-clone');
    formData.append('resource_type', 'auto');
    formData.append('folder', 'deposit-documents');

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      { method: 'POST', body: formData }
    );

    if (!uploadRes.ok) {
      throw new Error('Failed to upload CDC dossier PDF to Cloudinary');
    }

    const uploadData = await uploadRes.json();
    return uploadData.secure_url;
  }

  /**
   * Assemble all data needed for the CDC dossier document.
   */
  static async assembleData(applicationId: string): Promise<CDCDossierData> {
    // Fetch deposit with all related data
    const deposit = await prisma.securityDeposit.findUnique({
      where: { applicationId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        depositResolution: true,
        application: {
          include: {
            listing: {
              select: {
                id: true,
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
                creatorUser: {
                  select: { name: true, firstName: true, lastName: true, address: true },
                },
              },
            },
          },
        },
      },
    });

    if (!deposit) {
      throw new Error(`No deposit found for application ${applicationId}`);
    }

    // Landlord info
    const landlordId = deposit.application.listing.rentalUnit.property.ownerId;
    const landlord = await prisma.user.findUnique({
      where: { id: landlordId },
      select: { name: true, firstName: true, lastName: true, address: true },
    });

    const tenant = deposit.application.candidateScope?.creatorUser;
    const listing = deposit.application.listing;
    const property = listing.rentalUnit.property;

    // Fetch inspections (entry + exit)
    const inspections = await prisma.inspection.findMany({
      where: { applicationId },
      select: {
        type: true,
        completedAt: true,
        tenantSignedAt: true,
        tenantReserves: true,
        pdfUrl: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const entryInspection = inspections.find((i) => i.type === 'ENTRY');
    const exitInspection = inspections.find((i) => i.type === 'EXIT');

    // Fetch deductions
    const exitInspectionFull = exitInspection
      ? await prisma.inspection.findFirst({
          where: { applicationId, type: 'EXIT' },
          select: { id: true },
        })
      : null;

    let deductions: CDCDeductionItem[] = [];
    if (exitInspectionFull) {
      const rawDeductions = await prisma.depositDeduction.findMany({
        where: { inspectionId: exitInspectionFull.id },
        orderBy: { createdAt: 'asc' },
      });
      deductions = rawDeductions.map((d) => ({
        description: d.description,
        repairCostCents: d.repairCostCents,
        vetustePct: d.vetustePct,
        tenantShareCents: d.tenantShareCents,
      }));
    }

    // Fetch conversation messages between parties
    const messages = await CDCDossierService.fetchMessages(
      listing.id,
      landlordId,
      deposit.application.candidateScope?.creatorUserId
    );

    // Build timeline
    const timeline: CDCTimelineEvent[] = deposit.events.map((e) => ({
      date: new Date(e.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      type: e.type,
      description: e.description,
      actorType: e.actorType,
    }));

    // Format names
    const landlordName =
      landlord?.firstName && landlord?.lastName
        ? `${landlord.firstName} ${landlord.lastName}`
        : landlord?.name || 'Bailleur';
    const tenantName =
      tenant?.firstName && tenant?.lastName
        ? `${tenant.firstName} ${tenant.lastName}`
        : tenant?.name || 'Locataire';

    const formatDate = (d: Date | null | undefined) =>
      d ? new Date(d).toLocaleDateString('fr-FR') : null;

    return {
      tenantName,
      tenantAddress: tenant?.address || '(adresse du locataire)',
      landlordName,
      landlordAddress: landlord?.address || '(adresse du bailleur)',
      propertyAddress:
        property.address || `${listing.title}${property.city ? `, ${property.city}` : ''}`,

      leaseSignedDate: formatDate(deposit.leaseSignedAt),
      moveOutDate: formatDate(deposit.exitInspectionAt),

      depositAmountCents: deposit.amountCents,
      totalDeductionsCents: deposit.depositResolution?.totalDeductionsCents ?? 0,
      refundAmountCents: deposit.depositResolution?.refundAmountCents ?? deposit.amountCents,
      retainedAmountCents: deposit.retainedAmountCents ?? 0,

      disputeDate: formatDate(deposit.depositResolution?.tenantDisputedAt),
      disputeReason: deposit.depositResolution?.disputeReason ?? null,

      legalDeadline: formatDate(deposit.legalDeadline),
      legalDeadlineMonths: deposit.legalDeadlineMonths ?? null,
      isOverdue: deposit.isOverdue,
      overdueMonths: deposit.overdueMonths,
      penaltyAmountCents: deposit.penaltyAmountCents,
      monthlyRentCents: deposit.monthlyRentCents ?? null,

      formalNoticeSentAt: formatDate(deposit.formalNoticeSentAt),
      formalNoticeUrl: deposit.formalNoticeUrl ?? null,

      deductions,
      timeline,
      messages,

      entryInspectionDate: formatDate(entryInspection?.completedAt ?? entryInspection?.tenantSignedAt),
      exitInspectionDate: formatDate(exitInspection?.completedAt ?? exitInspection?.tenantSignedAt),
      entryInspectionPdfUrl: entryInspection?.pdfUrl ?? null,
      exitInspectionPdfUrl: exitInspection?.pdfUrl ?? null,
      tenantReserves: exitInspection?.tenantReserves ?? null,

      leasePdfUrl: deposit.application.signedLeaseUrl ?? null,

      generatedAt: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  }

  /**
   * Fetch conversation messages between landlord and tenant for the listing.
   * Filters out system messages and limits to relevant exchanges.
   */
  private static async fetchMessages(
    listingId: string,
    landlordId: string,
    tenantId: string | undefined
  ): Promise<CDCMessage[]> {
    if (!tenantId) return [];

    const conversation = await prisma.conversation.findFirst({
      where: {
        listingId,
        userIds: { hasEvery: [landlordId, tenantId] },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { name: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!conversation) return [];

    // Filter out system messages (pipe-delimited) and empty messages
    return conversation.messages
      .filter((m) => {
        if (!m.body) return false;
        // Skip system messages
        if (m.body.includes('|') && m.body.split('|').length >= 2) return false;
        return true;
      })
      .map((m) => ({
        date: new Date(m.createdAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        senderName:
          m.sender?.firstName && m.sender?.lastName
            ? `${m.sender.firstName} ${m.sender.lastName}`
            : m.sender?.name || 'Inconnu',
        body: m.body,
      }));
  }
}
