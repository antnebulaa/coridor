import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function GET() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.json({ poll: null });
        }

        // If user has no city in their profile, signal the frontend
        if (!currentUser.city) {
            return NextResponse.json({ poll: null, needsAddress: true });
        }

        // Find the most recent ACTIVE poll not yet answered by this user
        const poll = await prisma.neighborhoodPoll.findFirst({
            where: {
                status: 'ACTIVE',
                responses: {
                    none: { userId: currentUser.id }
                }
            },
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
