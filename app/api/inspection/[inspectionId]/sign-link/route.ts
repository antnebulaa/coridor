import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import jwt from 'jsonwebtoken';

type Params = { params: Promise<{ inspectionId: string }> };

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret';

// GET /api/inspection/[inspectionId]/sign-link — Generate a JWT sign link for the tenant
export async function GET(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        application: {
          include: {
            listing: {
              include: { rentalUnit: { include: { property: { select: { ownerId: true } } } } },
            },
            candidateScope: { select: { creatorUserId: true } },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only the landlord can generate the sign link
    if (inspection.application.listing.rentalUnit.property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Only the landlord can generate the sign link' }, { status: 403 });
    }

    // The landlord must have signed first
    if (!inspection.landlordSignature) {
      return NextResponse.json({ error: 'Landlord must sign first' }, { status: 400 });
    }

    const tenantId = inspection.application.candidateScope?.creatorUserId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found for this inspection' }, { status: 400 });
    }

    // Generate JWT (24h expiration)
    const token = jwt.sign(
      { inspectionId, tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coridor.fr';
    const url = `${baseUrl}/inspection/${inspectionId}/sign/tenant?token=${token}`;

    return NextResponse.json({ url, token });
  } catch (error: unknown) {
    console.error('[Inspection Sign-Link GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
