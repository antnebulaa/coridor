import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.error();
        }

        const body = await request.json();
        const {
            compositionType,
            membersIds, // Optional, defaults to [] or handled below
            coupleLegalStatus,
            targetLeaseType,
            targetMoveInDate,
            childCount
        } = body;

        // Validation basic
        if (!compositionType || !targetLeaseType) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Find existing scope to update or create new
        // We treat it as one active project per user for this feature
        const existingScope = await prisma.tenantCandidateScope.findFirst({
            where: {
                creatorUserId: currentUser.id
            }
        });

        if (existingScope) {
            const updatedScope = await prisma.tenantCandidateScope.update({
                where: {
                    id: existingScope.id
                },
                data: {
                    compositionType,
                    membersIds: membersIds || [],
                    coupleLegalStatus: compositionType === 'COUPLE' ? coupleLegalStatus : null,
                    targetLeaseType,
                    targetMoveInDate: targetMoveInDate ? new Date(targetMoveInDate) : null,
                    childCount: childCount ? parseInt(childCount, 10) : 0
                }
            });
            return NextResponse.json(updatedScope);
        } else {
            const newScope = await prisma.tenantCandidateScope.create({
                data: {
                    creatorUserId: currentUser.id,
                    compositionType,
                    membersIds: membersIds || [],
                    coupleLegalStatus: compositionType === 'COUPLE' ? coupleLegalStatus : null,
                    targetLeaseType,
                    targetMoveInDate: targetMoveInDate ? new Date(targetMoveInDate) : null,
                    childCount: childCount ? parseInt(childCount, 10) : 0
                }
            });
            return NextResponse.json(newScope);
        }

    } catch (error) {
        console.log(error);
        return NextResponse.error();
    }
}
