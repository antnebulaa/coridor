import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { EvaluationCriterion, EvaluationDecision } from "@prisma/client";

const VALID_CRITERIA = Object.values(EvaluationCriterion) as string[];
const VALID_DECISIONS: string[] = Object.values(EvaluationDecision);

function computeCompositeScore(scores: Record<string, number>): number {
    const values = Object.values(scores);
    if (values.length === 0) return 0;
    const invertedSum = values.reduce((sum, s) => sum + (4 - s), 0);
    return Math.round((invertedSum / values.length) * 100) / 100;
}

export async function POST(request: Request) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { visitId, applicationId, decision, scores } = body as {
        visitId: string;
        applicationId: string;
        decision: string;
        scores: Record<string, number>;
    };

    if (!visitId || !decision || !scores) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve applicationId from visit if not provided (legacy visits without link)
    if (!applicationId) {
        const visit = await prisma.visit.findUnique({
            where: { id: visitId },
            select: { applicationId: true, listingId: true, candidateId: true }
        });
        if (visit?.applicationId) {
            applicationId = visit.applicationId;
        } else if (visit) {
            const app = await prisma.rentalApplication.findFirst({
                where: {
                    listingId: visit.listingId,
                    candidateScope: { creatorUserId: visit.candidateId }
                }
            });
            if (app) applicationId = app.id;
        }
        if (!applicationId) {
            return NextResponse.json({ error: "Could not resolve application for this visit" }, { status: 400 });
        }
    }

    if (!VALID_DECISIONS.includes(decision)) {
        return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    for (const [criterion, score] of Object.entries(scores)) {
        if (!VALID_CRITERIA.includes(criterion)) {
            return NextResponse.json({ error: `Invalid criterion: ${criterion}` }, { status: 400 });
        }
        if (score < 1 || score > 3) {
            return NextResponse.json({ error: `Score must be 1-3 for ${criterion}` }, { status: 400 });
        }
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

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) {
        return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const compositeScore = computeCompositeScore(scores);
    const decisionEnum = decision as EvaluationDecision;

    const evaluation = await prisma.$transaction(async (tx) => {
        const existing = await tx.candidateEvaluation.findUnique({
            where: { applicationId }
        });

        let eval_;
        if (existing) {
            await tx.evaluationScore.deleteMany({ where: { evaluationId: existing.id } });
            eval_ = await tx.candidateEvaluation.update({
                where: { id: existing.id },
                data: {
                    visitId,
                    decision: decisionEnum,
                    compositeScore,
                    evaluatedAt: new Date(),
                    scores: {
                        create: Object.entries(scores).map(([criterion, score]) => ({
                            criterion: criterion as EvaluationCriterion,
                            score
                        }))
                    }
                },
                include: { scores: true }
            });
        } else {
            eval_ = await tx.candidateEvaluation.create({
                data: {
                    visitId,
                    applicationId,
                    decision: decisionEnum,
                    compositeScore,
                    scores: {
                        create: Object.entries(scores).map(([criterion, score]) => ({
                            criterion: criterion as EvaluationCriterion,
                            score
                        }))
                    }
                },
                include: { scores: true }
            });
        }

        if (decisionEnum === "SHORTLISTED") {
            await tx.rentalApplication.update({
                where: { id: applicationId },
                data: { status: "SHORTLISTED" }
            });
        } else if (decisionEnum === "ELIMINATED") {
            await tx.rentalApplication.update({
                where: { id: applicationId },
                data: {
                    status: "REJECTED",
                    rejectedAt: new Date(),
                    rejectionReason: "Candidature non retenue apres visite"
                }
            });
        }

        return eval_;
    });

    return NextResponse.json(evaluation);
}
