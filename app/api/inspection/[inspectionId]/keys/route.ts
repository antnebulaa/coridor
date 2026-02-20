import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ inspectionId: string }> };

// POST /api/inspection/[inspectionId]/keys — Upsert a key count
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
    const { type, quantity } = body;

    if (!type || quantity === undefined) {
      return NextResponse.json({ error: 'type and quantity are required' }, { status: 400 });
    }

    // Find existing key of this type or create new
    const existing = await prisma.inspectionKey.findFirst({
      where: { inspectionId, type },
    });

    let key;
    if (existing) {
      key = await prisma.inspectionKey.update({
        where: { id: existing.id },
        data: { quantity },
      });
    } else {
      key = await prisma.inspectionKey.create({
        data: { inspectionId, type, quantity },
      });
    }

    return NextResponse.json(key);
  } catch (error: unknown) {
    console.error('[Inspection Keys POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
