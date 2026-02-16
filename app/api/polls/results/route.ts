import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pollId = searchParams.get("pollId");
        const city = searchParams.get("city");
        const zipCode = searchParams.get("zipCode");

        if (!city && !zipCode) {
            return NextResponse.json(
                { error: "city or zipCode query param is required" },
                { status: 400 }
            );
        }

        // If pollId is provided, use it directly. Otherwise, find the most recent
        // ACTIVE poll that has responses in this zone.
        let targetPollId = pollId;

        if (!targetPollId) {
            // Build a zone filter for responses
            const zoneFilter: any = {};
            if (zipCode) zoneFilter.zipCode = zipCode;
            else if (city) zoneFilter.city = city;

            // Find the most recent active poll with responses in this zone
            const recentPoll = await prisma.neighborhoodPoll.findFirst({
                where: {
                    status: 'ACTIVE',
                    responses: {
                        some: zoneFilter
                    }
                },
                orderBy: { createdAt: 'desc' },
                select: { id: true }
            });

            if (!recentPoll) {
                return NextResponse.json({ poll: null, totalResponses: 0 });
            }

            targetPollId = recentPoll.id;
        }

        const poll = await prisma.neighborhoodPoll.findUnique({
            where: { id: targetPollId },
            select: {
                title: true,
                category: true,
                option1: true,
                option2: true,
                option3: true
            }
        });

        if (!poll) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        // Aggregation logic:
        // If zipCode is provided AND has >= 10 responses, use zipCode.
        // Otherwise fall back to city.
        const responseWhere: any = { pollId: targetPollId };
        let zone: "zipCode" | "city" = "city";

        if (zipCode) {
            const zipCodeCount = await prisma.pollResponse.count({
                where: { pollId: targetPollId, zipCode }
            });
            if (zipCodeCount >= 10) {
                responseWhere.zipCode = zipCode;
                zone = "zipCode";
            } else if (city) {
                responseWhere.city = city;
                zone = "city";
            }
        } else if (city) {
            responseWhere.city = city;
            zone = "city";
        }

        const responses = await prisma.pollResponse.findMany({
            where: responseWhere,
            select: { selectedOption: true }
        });

        const option1Count = responses.filter(r => r.selectedOption === 1).length;
        const option2Count = responses.filter(r => r.selectedOption === 2).length;
        const option3Count = responses.filter(r => r.selectedOption === 3).length;

        return NextResponse.json({
            poll,
            option1Count,
            option2Count,
            option3Count,
            totalResponses: responses.length,
            zone
        });
    } catch (error) {
        console.error("GET POLL RESULTS ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
