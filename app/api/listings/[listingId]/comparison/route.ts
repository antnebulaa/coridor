import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    listingId: string;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await params;
    if (!listingId || typeof listingId !== "string") {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
            rentalUnit: {
                include: { property: true }
            }
        }
    });

    if (!listing) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.rentalUnit.property.ownerId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const evaluations = await prisma.candidateEvaluation.findMany({
        where: {
            application: { listingId }
        },
        include: {
            scores: true,
            application: {
                include: {
                    candidateScope: {
                        include: {
                            creatorUser: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    image: true
                                }
                            }
                        }
                    }
                }
            },
            visit: {
                select: {
                    id: true,
                    date: true,
                    startTime: true,
                    endTime: true,
                    status: true
                }
            }
        },
        orderBy: { compositeScore: "desc" }
    });

    const tenantProfileIds = evaluations.map(
        (e) => e.application.candidateScope.creatorUser.id
    );

    const tenantProfiles = await prisma.tenantProfile.findMany({
        where: { userId: { in: tenantProfileIds } },
        include: { guarantors: true }
    });

    const profileMap = new Map(
        tenantProfiles.map((tp) => [tp.userId, tp])
    );

    const candidates = evaluations.map((evaluation) => {
        const user = evaluation.application.candidateScope.creatorUser;
        const profile = profileMap.get(user.id) || null;
        return {
            evaluation: {
                id: evaluation.id,
                decision: evaluation.decision,
                compositeScore: evaluation.compositeScore,
                evaluatedAt: evaluation.evaluatedAt,
                scores: evaluation.scores
            },
            application: {
                id: evaluation.application.id,
                status: evaluation.application.status,
                appliedAt: evaluation.application.appliedAt
            },
            candidate: {
                firstName: user.firstName,
                lastNameInitial: user.lastName ? user.lastName.charAt(0) + "." : null,
                image: user.image
            },
            tenantProfile: profile
                ? {
                      netSalary: profile.netSalary,
                      jobType: profile.jobType,
                      jobTitle: profile.jobTitle,
                      guarantors: profile.guarantors.map((g) => ({
                          type: g.type,
                          status: g.status,
                          netIncome: g.netIncome
                      }))
                  }
                : null,
            visit: evaluation.visit,
            listingPrice: listing.price
        };
    });

    return NextResponse.json({ candidates, listingId, listingTitle: listing.title });
}
