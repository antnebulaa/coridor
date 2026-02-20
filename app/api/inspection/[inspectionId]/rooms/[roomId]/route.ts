import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ inspectionId: string; roomId: string }> };

// PATCH /api/inspection/[inspectionId]/rooms/[roomId] — Update a room
export async function PATCH(request: Request, props: Params) {
  try {
    const { inspectionId, roomId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await prisma.inspectionRoom.findFirst({
      where: { id: roomId, inspectionId },
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
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.inspection.application.listing.rentalUnit.property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (room.inspection.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Cannot modify a non-draft inspection' }, { status: 403 });
    }

    const body = await request.json();
    const allowedFields = ['name', 'isCompleted', 'observations', 'order'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.inspectionRoom.update({
      where: { id: roomId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[Inspection Room PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
