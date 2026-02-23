import { NextResponse } from 'next/server';
import prisma from '@/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';
import { calculateVetuste, calculateTenantShare, findVetusteMatch, calculateOccupationYears } from '@/lib/vetuste';

type Params = { params: Promise<{ inspectionId: string }> };

// Helper: verify user is landlord of this EXIT inspection
async function verifyLandlordOfExitInspection(inspectionId: string, userId: string) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    include: {
      application: {
        include: {
          listing: {
            include: {
              rentalUnit: {
                include: { property: { include: { vetusteGrid: { include: { entries: true } } } } },
              },
            },
          },
        },
      },
    },
  });

  if (!inspection || inspection.type !== 'EXIT') return null;

  const isLandlord = inspection.application.listing.rentalUnit.property.ownerId === userId;
  if (!isLandlord) return null;

  return inspection;
}

// GET /api/inspection/[inspectionId]/deductions — List deductions
export async function GET(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both landlord and tenant can view deductions
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
          },
          candidateScope: { select: { creatorUserId: true } },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isLandlord = inspection.application.listing.rentalUnit.property.ownerId === currentUser.id;
    const isTenant = inspection.application.candidateScope?.creatorUserId === currentUser.id;
    if (!isLandlord && !isTenant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deductions = await prisma.depositDeduction.findMany({
      where: { inspectionId },
      include: {
        element: {
          select: { id: true, name: true, category: true, nature: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(deductions);
  } catch (error: unknown) {
    console.error('[Deductions GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/inspection/[inspectionId]/deductions — Add a deduction
export async function POST(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await verifyLandlordOfExitInspection(inspectionId, currentUser.id);
    if (!inspection) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    const body = await request.json();
    const { elementId, description, repairCostCents, photoUrl, entryPhotoUrl } = body;

    if (!description || repairCostCents == null) {
      return NextResponse.json({ error: 'description and repairCostCents are required' }, { status: 400 });
    }

    // Auto-calculate vétusté if element has nature information
    let vetustePct = 0;
    if (elementId) {
      const element = await prisma.inspectionElement.findUnique({
        where: { id: elementId },
        select: { nature: true },
      });

      if (element?.nature && element.nature.length > 0) {
        // Get custom grid or use default
        const customGrid = inspection.application.listing.rentalUnit.property.vetusteGrid;
        const gridItems = customGrid?.entries.map((e) => ({
          elementType: e.elementType,
          lifespan: e.lifespan,
          annualDepreciation: e.annualDepreciation,
          franchiseYears: e.franchiseYears,
        }));

        const match = findVetusteMatch(element.nature, gridItems || undefined);

        if (match && inspection.application.leaseStartDate) {
          const occupationYears = calculateOccupationYears(
            new Date(inspection.application.leaseStartDate)
          );
          vetustePct = calculateVetuste({
            annualRate: match.annualDepreciation,
            occupationYears,
            franchiseYears: match.franchiseYears,
          });
        }
      }
    }

    const tenantShareCents = calculateTenantShare({ repairCostCents, vetustePct });

    const deduction = await prisma.depositDeduction.create({
      data: {
        inspectionId,
        elementId: elementId || null,
        description,
        repairCostCents,
        vetustePct,
        tenantShareCents,
        photoUrl: photoUrl || null,
        entryPhotoUrl: entryPhotoUrl || null,
      },
    });

    return NextResponse.json(deduction, { status: 201 });
  } catch (error: unknown) {
    console.error('[Deductions POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/inspection/[inspectionId]/deductions — Update a deduction
export async function PATCH(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await verifyLandlordOfExitInspection(inspectionId, currentUser.id);
    if (!inspection) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    const body = await request.json();
    const { deductionId, description, repairCostCents, vetustePct: customVetuste } = body;

    if (!deductionId) {
      return NextResponse.json({ error: 'deductionId is required' }, { status: 400 });
    }

    const existing = await prisma.depositDeduction.findFirst({
      where: { id: deductionId, inspectionId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Deduction not found' }, { status: 404 });
    }

    const updatedVetuste = customVetuste ?? existing.vetustePct;
    const updatedCost = repairCostCents ?? existing.repairCostCents;
    const tenantShareCents = calculateTenantShare({
      repairCostCents: updatedCost,
      vetustePct: updatedVetuste,
    });

    const updated = await prisma.depositDeduction.update({
      where: { id: deductionId },
      data: {
        ...(description !== undefined && { description }),
        ...(repairCostCents !== undefined && { repairCostCents }),
        ...(customVetuste !== undefined && { vetustePct: customVetuste }),
        tenantShareCents,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[Deductions PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/inspection/[inspectionId]/deductions — Delete a deduction
export async function DELETE(request: Request, props: Params) {
  try {
    const { inspectionId } = await props.params;
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspection = await verifyLandlordOfExitInspection(inspectionId, currentUser.id);
    if (!inspection) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const deductionId = searchParams.get('deductionId');

    if (!deductionId) {
      return NextResponse.json({ error: 'deductionId is required' }, { status: 400 });
    }

    const existing = await prisma.depositDeduction.findFirst({
      where: { id: deductionId, inspectionId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Deduction not found' }, { status: 404 });
    }

    await prisma.depositDeduction.delete({ where: { id: deductionId } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[Deductions DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
