import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { DEFAULT_VETUSTE_GRID } from '@/lib/vetuste';

type Params = { params: Promise<{ propertyId: string }> };

// GET /api/properties/[propertyId]/vetuste — Get grid (or default)
export async function GET(request: Request, props: Params) {
  try {
    const { propertyId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const grid = await prisma.vetusteGrid.findUnique({
      where: { propertyId },
      include: { entries: { orderBy: { elementType: 'asc' } } },
    });

    if (grid) {
      return NextResponse.json({ grid, isDefault: false });
    }

    // Return default grid
    return NextResponse.json({
      grid: {
        id: null,
        propertyId,
        entries: DEFAULT_VETUSTE_GRID.map((item, i) => ({
          id: `default_${i}`,
          ...item,
          installationDate: null,
        })),
      },
      isDefault: true,
    });
  } catch (error: unknown) {
    console.error('[Vetuste GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/properties/[propertyId]/vetuste — Save entire grid
export async function PUT(request: Request, props: Params) {
  try {
    const { propertyId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { entries } = body as {
      entries: {
        elementType: string;
        lifespan: number;
        annualDepreciation: number;
        franchiseYears: number;
        installationDate?: string | null;
      }[];
    };

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'entries array is required' }, { status: 400 });
    }

    // Upsert the grid: delete existing entries, create new ones
    const existingGrid = await prisma.vetusteGrid.findUnique({
      where: { propertyId },
    });

    if (existingGrid) {
      // Delete all existing entries and recreate
      await prisma.vetusteGridEntry.deleteMany({
        where: { vetusteGridId: existingGrid.id },
      });

      await prisma.vetusteGridEntry.createMany({
        data: entries.map(e => ({
          vetusteGridId: existingGrid.id,
          elementType: e.elementType,
          lifespan: e.lifespan,
          annualDepreciation: e.annualDepreciation,
          franchiseYears: e.franchiseYears ?? 0,
          installationDate: e.installationDate ? new Date(e.installationDate) : null,
        })),
      });

      const updated = await prisma.vetusteGrid.findUnique({
        where: { id: existingGrid.id },
        include: { entries: { orderBy: { elementType: 'asc' } } },
      });

      return NextResponse.json({ grid: updated, isDefault: false });
    }

    // Create new grid
    const grid = await prisma.vetusteGrid.create({
      data: {
        propertyId,
        entries: {
          create: entries.map(e => ({
            elementType: e.elementType,
            lifespan: e.lifespan,
            annualDepreciation: e.annualDepreciation,
            franchiseYears: e.franchiseYears ?? 0,
            installationDate: e.installationDate ? new Date(e.installationDate) : null,
          })),
        },
      },
      include: { entries: { orderBy: { elementType: 'asc' } } },
    });

    return NextResponse.json({ grid, isDefault: false }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Vetuste PUT] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/properties/[propertyId]/vetuste — Reset to default
export async function DELETE(request: Request, props: Params) {
  try {
    const { propertyId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });

    if (!property || property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const existingGrid = await prisma.vetusteGrid.findUnique({
      where: { propertyId },
    });

    if (existingGrid) {
      await prisma.vetusteGrid.delete({
        where: { id: existingGrid.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[Vetuste DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
