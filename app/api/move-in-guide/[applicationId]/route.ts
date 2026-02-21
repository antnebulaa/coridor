import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { MOVE_IN_STEP_IDS, DEFAULT_MOVE_IN_STEPS, type MoveInStep } from "@/lib/moveInGuide";

export async function GET(
    request: Request,
    props: { params: Promise<{ applicationId: string }> }
) {
    try {
        const params = await props.params;
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const application = await prisma.rentalApplication.findUnique({
            where: { id: params.applicationId },
            include: {
                candidateScope: { select: { creatorUserId: true } },
                moveInGuide: true,
            }
        });

        if (!application) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Only the tenant can access the guide
        const isTenant = application.candidateScope?.creatorUserId === currentUser.id;
        if (!isTenant) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Lazy init: auto-create guide for pre-existing signed leases
        if (!application.moveInGuide && application.leaseStatus === 'SIGNED') {
            const guide = await prisma.moveInGuide.create({
                data: {
                    rentalApplicationId: application.id,
                    steps: DEFAULT_MOVE_IN_STEPS as unknown as any,
                }
            });
            return NextResponse.json(guide);
        }

        if (!application.moveInGuide) {
            return NextResponse.json({ error: "No guide found" }, { status: 404 });
        }

        return NextResponse.json(application.moveInGuide);
    } catch (error: any) {
        console.error("[MoveInGuide GET] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    props: { params: Promise<{ applicationId: string }> }
) {
    try {
        const params = await props.params;
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const application = await prisma.rentalApplication.findUnique({
            where: { id: params.applicationId },
            include: {
                candidateScope: { select: { creatorUserId: true } },
                moveInGuide: true,
            }
        });

        if (!application) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const isTenant = application.candidateScope?.creatorUserId === currentUser.id;
        if (!isTenant) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!application.moveInGuide) {
            return NextResponse.json({ error: "No guide found" }, { status: 404 });
        }

        const body = await request.json();

        // Case 1: Mark stories as shown
        if (body.storiesShown === true) {
            const updated = await prisma.moveInGuide.update({
                where: { id: application.moveInGuide.id },
                data: { storiesShownAt: new Date() },
            });
            return NextResponse.json(updated);
        }

        // Case 2: Toggle a step
        if (body.stepId && typeof body.completed === 'boolean') {
            const validStep = MOVE_IN_STEP_IDS.includes(body.stepId);
            if (!validStep) {
                return NextResponse.json({ error: "Invalid stepId" }, { status: 400 });
            }

            const currentSteps = application.moveInGuide.steps as unknown as MoveInStep[];
            const updatedSteps = currentSteps.map(step => {
                if (step.id === body.stepId) {
                    return {
                        ...step,
                        completed: body.completed,
                        completedAt: body.completed ? new Date().toISOString() : undefined,
                    };
                }
                return step;
            });

            const updated = await prisma.moveInGuide.update({
                where: { id: application.moveInGuide.id },
                data: { steps: updatedSteps as unknown as any },
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    } catch (error: any) {
        console.error("[MoveInGuide PATCH] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
