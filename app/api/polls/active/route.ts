import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function GET() {
    try {
        const currentUser = await getCurrentUser();

        // Find the most recent ACTIVE poll
        const where: any = { status: 'ACTIVE' };

        // If user is logged in, exclude polls they already answered
        if (currentUser) {
            where.responses = { none: { userId: currentUser.id } };
        }

        const poll = await prisma.neighborhoodPoll.findFirst({
            where,
            include: {
                _count: {
                    select: { responses: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!poll) {
            return NextResponse.json({ poll: null });
        }

        return NextResponse.json({
            poll,
            totalResponses: poll._count.responses
        });
    } catch (error) {
        console.error("GET ACTIVE POLL ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
