import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ inspectionId: string; elementId: string }> };

// PATCH /api/inspection/[inspectionId]/elements/[elementId] — Update element condition/state
export async function PATCH(request: Request, props: Params) {
  try {
    const { inspectionId, elementId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the element belongs to this inspection
    const element = await prisma.inspectionElement.findFirst({
      where: {
        id: elementId,
        inspectionRoom: { inspectionId },
      },
      include: {
        inspectionRoom: {
          include: {
            inspection: {
              include: {
                application: {
                  include: {
                    listing: {
                      include: { rentalUnit: { include: { property: { select: { ownerId: true } } } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!element) {
      return NextResponse.json({ error: 'Element not found' }, { status: 404 });
    }

    const inspection = element.inspectionRoom.inspection;
    if (inspection.application.listing.rentalUnit.property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (inspection.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Cannot modify a non-draft inspection' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ['condition', 'nature', 'observations', 'degradationTypes', 'isAbsent', 'evolution'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.inspectionElement.update({
      where: { id: elementId },
      data: updateData,
      include: { photos: true },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[Inspection Element PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
