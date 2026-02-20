import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ inspectionId: string }> };

// POST /api/inspection/[inspectionId]/meters — Upsert a meter reading
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
        application: {
          include: {
            listing: {
              include: { rentalUnit: { include: { property: { select: { ownerId: true } } } } },
            },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (inspection.application.listing.rentalUnit.property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (inspection.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Cannot modify a non-draft inspection' }, { status: 403 });
    }

    const body = await request.json();
    const { type, meterNumber, indexValue, photoUrl, photoThumbnailUrl, noGas } = body;

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    // Upsert: create or update the meter for this type
    const meter = await prisma.inspectionMeter.upsert({
      where: { inspectionId_type: { inspectionId, type } },
      create: {
        inspectionId,
        type,
        meterNumber: meterNumber || null,
        indexValue: indexValue || null,
        photoUrl: photoUrl || null,
        photoThumbnailUrl: photoThumbnailUrl || null,
        noGas: noGas || false,
      },
      update: {
        ...(meterNumber !== undefined && { meterNumber }),
        ...(indexValue !== undefined && { indexValue }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(photoThumbnailUrl !== undefined && { photoThumbnailUrl }),
        ...(noGas !== undefined && { noGas }),
      },
    });

    return NextResponse.json(meter);
  } catch (error: unknown) {
    console.error('[Inspection Meter POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
