import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
  listingId?: string;
}

// --------------- GET — Public (simple preferences) ---------------

export async function GET(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  try {
    const { listingId } = await params;

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const requirements = await prisma.listingRequirements.findUnique({
      where: { listingId },
      select: {
        payerBadgePreferred: true,
        guarantorPreferred: true,
        petsWelcome: true,
        studentsWelcome: true,
      },
    });

    if (!requirements) {
      return NextResponse.json(null);
    }

    return NextResponse.json(requirements);
  } catch (error) {
    console.error("[REQUIREMENTS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// --------------- PUT — Auth (listing owner only) ---------------

export async function PUT(
  request: Request,
  { params }: { params: Promise<IParams> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await params;
    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { rentalUnit: { include: { property: true } } },
    });

    if (!listing || listing.rentalUnit.property.ownerId !== currentUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const requirements = await prisma.listingRequirements.upsert({
      where: { listingId },
      create: {
        listingId,
        payerBadgePreferred: body.payerBadgePreferred ?? false,
        guarantorPreferred: body.guarantorPreferred ?? false,
        petsWelcome: body.petsWelcome ?? true,
        studentsWelcome: body.studentsWelcome ?? true,
      },
      update: {
        payerBadgePreferred: body.payerBadgePreferred ?? false,
        guarantorPreferred: body.guarantorPreferred ?? false,
        petsWelcome: body.petsWelcome ?? true,
        studentsWelcome: body.studentsWelcome ?? true,
      },
    });

    return NextResponse.json({ success: true, requirements });
  } catch (error) {
    console.error("[REQUIREMENTS_PUT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
