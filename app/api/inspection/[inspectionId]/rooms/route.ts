import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { EQUIPMENTS_BY_ROOM, SURFACE_ELEMENTS } from '@/lib/inspection';
import type { InspectionRoomType } from '@prisma/client';

type Params = { params: Promise<{ inspectionId: string }> };

// POST /api/inspection/[inspectionId]/rooms — Add a room
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
        rooms: { select: { order: true } },
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
    const { roomType, name } = body;

    if (!roomType || !name) {
      return NextResponse.json({ error: 'roomType and name are required' }, { status: 400 });
    }

    const maxOrder = Math.max(0, ...inspection.rooms.map((r) => r.order));

    const room = await prisma.inspectionRoom.create({
      data: {
        inspectionId,
        roomType,
        name,
        order: maxOrder + 1,
        elements: {
          create: [
            ...SURFACE_ELEMENTS.map((surface) => ({
              category: surface.category,
              name: surface.name,
            })),
            ...EQUIPMENTS_BY_ROOM[roomType as InspectionRoomType].map((equipName) => ({
              category: 'EQUIPMENT' as const,
              name: equipName,
            })),
          ],
        },
      },
      include: {
        elements: { include: { photos: true } },
        photos: true,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error: unknown) {
    console.error('[Inspection Rooms POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
