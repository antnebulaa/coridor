import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

type Params = { params: Promise<{ inspectionId: string }> };

// Helper: verify user is landlord or tenant of this inspection
async function getInspectionWithAuth(inspectionId: string, userId: string) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
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
      meters: true,
      keys: { orderBy: { type: 'asc' } },
      rooms: {
        include: {
          elements: { include: { photos: true } },
          photos: true,
        },
        orderBy: { order: 'asc' },
      },
      photos: true,
      furniture: true,
      amendments: true,
    },
  });

  if (!inspection) return null;

  const isLandlord = inspection.application.listing.rentalUnit.property.ownerId === userId;
  const isTenant = inspection.application.candidateScope?.creatorUserId === userId;

  if (!isLandlord && !isTenant) return null;

  return { inspection, isLandlord, isTenant };
}

// GET /api/inspection/[inspectionId] — Full inspection with all relations
export async function GET(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getInspectionWithAuth(inspectionId, currentUser.id);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result.inspection);
  } catch (error: unknown) {
    console.error('[Inspection GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/inspection/[inspectionId] — Update general fields
export async function PATCH(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getInspectionWithAuth(inspectionId, currentUser.id);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { inspection, isLandlord } = result;

    // Only landlord can modify a DRAFT
    if (inspection.status === 'DRAFT' && !isLandlord) {
      return NextResponse.json({ error: 'Only the landlord can modify a draft inspection' }, { status: 403 });
    }

    // No modification after SIGNED (except amendments)
    if (inspection.status === 'SIGNED' || inspection.status === 'LOCKED') {
      return NextResponse.json({ error: 'Cannot modify a signed inspection' }, { status: 403 });
    }

    const body = await request.json();

    // Auto-save touch — just update the timestamp
    if (body.touch) {
      await prisma.inspection.update({
        where: { id: inspectionId },
        data: { updatedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    const allowedFields = [
      'tenantPresent',
      'representativeName',
      'representativeMandate',
      'generalObservations',
      'tenantReserves',
      'status',
      'scheduledAt',
      'startedAt',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.inspection.update({
      where: { id: inspectionId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[Inspection PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/inspection/[inspectionId] — Delete an inspection (landlord only, DRAFT/CANCELLED)
export async function DELETE(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getInspectionWithAuth(inspectionId, currentUser.id);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { inspection, isLandlord } = result;

    if (!isLandlord) {
      return NextResponse.json({ error: 'Only the landlord can delete an inspection' }, { status: 403 });
    }

    // Only allow deleting DRAFT or CANCELLED inspections
    if (!['DRAFT', 'CANCELLED'].includes(inspection.status)) {
      return NextResponse.json({ error: 'Cannot delete a signed or pending inspection' }, { status: 403 });
    }

    // Cascade delete handles all child records (rooms, elements, photos, meters, keys, furniture, amendments)
    await prisma.inspection.delete({
      where: { id: inspectionId },
    });

    return NextResponse.json({ ok: true, deleted: inspectionId });
  } catch (error: unknown) {
    console.error('[Inspection DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
