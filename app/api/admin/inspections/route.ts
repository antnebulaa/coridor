import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

// GET /api/admin/inspections — List all inspections
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspections = await prisma.inspection.findMany({
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        applicationId: true,
        propertyId: true,
        landlord: { select: { name: true } },
        tenant: { select: { name: true } },
        _count: { select: { rooms: true, photos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(inspections);
  } catch (error: unknown) {
    console.error('[Admin Inspections GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/inspections — Purge all inspections (cascade deletes children)
export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.inspection.deleteMany({});

    return NextResponse.json({
      ok: true,
      deleted: result.count,
      message: `${result.count} inspection(s) supprimée(s)`,
    });
  } catch (error: unknown) {
    console.error('[Admin Inspections DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
