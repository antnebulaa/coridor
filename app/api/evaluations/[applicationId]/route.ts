import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    applicationId: string;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await params;
    if (!applicationId || typeof applicationId !== "string") {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const application = await prisma.rentalApplication.findUnique({
        where: { id: applicationId },
        include: {
            listing: {
                include: {
                    rentalUnit: {
                        include: { property: true }
                    }
                }
            }
        }
    });

    if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const ownerId = application.listing.rentalUnit.property.ownerId;
    if (ownerId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const evaluation = await prisma.candidateEvaluation.findUnique({
        where: { applicationId },
        include: { scores: true }
    });

    if (!evaluation) {
        return NextResponse.json(null);
    }

    return NextResponse.json(evaluation);
}
