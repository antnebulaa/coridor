import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { sendEmail } from '@/lib/email';
import { getServerTranslation } from '@/lib/serverTranslations';

type Params = { params: Promise<{ inspectionId: string }> };

// POST /api/inspection/[inspectionId]/send-email — Resend PDF email to both parties
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
        landlord: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, email: true } },
        application: {
          include: {
            listing: {
              include: {
                rentalUnit: {
                  include: { property: { select: { ownerId: true } } },
                },
              },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ownerId = inspection.application.listing.rentalUnit.property.ownerId;
    const tenantId = inspection.application.candidateScope?.creatorUserId;

    if (currentUser.id !== ownerId && currentUser.id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!inspection.pdfUrl) {
      return NextResponse.json({ error: 'PDF not generated yet' }, { status: 400 });
    }

    const t = getServerTranslation('emails');

    const emailHtml = (name: string | null) => `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">${t('inspection.pdfEmail.heading')}</h2>
        <p style="color: #555; line-height: 1.6;">
          ${t('inspection.pdfEmail.greeting', { name: name || '' })}<br/><br/>
          ${t('inspection.pdfEmail.body')}
        </p>
        <a href="${inspection.pdfUrl}" style="display: inline-block; background: #1719FF; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          ${t('inspection.pdfEmail.cta')}
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          ${t('inspection.pdfEmail.legalNote')}
        </p>
      </div>`;

    let sent = 0;
    if (inspection.landlord?.email) {
      await sendEmail(inspection.landlord.email, t('inspection.pdfEmail.subject'), emailHtml(inspection.landlord.name));
      sent++;
    }
    if (inspection.tenant?.email) {
      await sendEmail(inspection.tenant.email, t('inspection.pdfEmail.subject'), emailHtml(inspection.tenant.name));
      sent++;
    }

    return NextResponse.json({ sent });
  } catch (error: unknown) {
    console.error('[Inspection Send-Email POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
