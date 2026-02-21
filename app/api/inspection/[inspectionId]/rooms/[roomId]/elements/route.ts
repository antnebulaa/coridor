import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ inspectionId: string; roomId: string }> };

// POST /api/inspection/[inspectionId]/rooms/[roomId]/elements — Add an element
export async function POST(request: Request, props: Params) {
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
    const { category, name, nature } = body;

    if (!category || !name) {
      return NextResponse.json({ error: 'category and name are required' }, { status: 400 });
    }

    const element = await prisma.inspectionElement.create({
      data: {
        inspectionRoomId: roomId,
        category,
        name,
        nature: nature || [],
      },
      include: { photos: true },
    });

    return NextResponse.json(element, { status: 201 });
  } catch (error: unknown) {
    console.error('[Inspection Element POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
