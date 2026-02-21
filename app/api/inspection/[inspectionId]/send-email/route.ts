import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { sendEmail } from '@/lib/email';

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

    const emailHtml = (name: string | null) => `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">État des lieux signé</h2>
        <p style="color: #555; line-height: 1.6;">
          Bonjour${name ? ` ${name}` : ''},<br/><br/>
          Voici le PDF de votre état des lieux signé.
        </p>
        <a href="${inspection.pdfUrl}" style="display: inline-block; background: #1719FF; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 16px 0;">
          Consulter le PDF
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          Rappel : le locataire dispose de 10 jours après la remise des clés pour signaler tout défaut non visible (art. 3-2 loi du 6 juillet 1989).
        </p>
      </div>`;

    let sent = 0;
    if (inspection.landlord?.email) {
      await sendEmail(inspection.landlord.email, "État des lieux — PDF signé", emailHtml(inspection.landlord.name));
      sent++;
    }
    if (inspection.tenant?.email) {
      await sendEmail(inspection.tenant.email, "État des lieux — PDF signé", emailHtml(inspection.tenant.name));
      sent++;
    }

    return NextResponse.json({ sent });
  } catch (error: unknown) {
    console.error('[Inspection Send-Email POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
