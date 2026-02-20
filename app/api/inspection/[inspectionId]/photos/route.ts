import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ inspectionId: string }> };

// POST /api/inspection/[inspectionId]/photos — Add a photo (URL from Cloudinary)
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
    const { type, url, thumbnailUrl, sha256, inspectionRoomId, inspectionElementId, latitude, longitude, deviceInfo } = body;

    if (!type || !url) {
      return NextResponse.json({ error: 'type and url are required' }, { status: 400 });
    }

    const photo = await prisma.inspectionPhoto.create({
      data: {
        inspectionId,
        type,
        url,
        thumbnailUrl: thumbnailUrl || null,
        sha256: sha256 || null,
        inspectionRoomId: inspectionRoomId || null,
        inspectionElementId: inspectionElementId || null,
        latitude: latitude || null,
        longitude: longitude || null,
        deviceInfo: deviceInfo || null,
        capturedAt: new Date(),
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error: unknown) {
    console.error('[Inspection Photo POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
