import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    pollId: string;
}

export async function POST(
    request: Request,
    props: { params: Promise<IParams> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pollId } = params;

    try {
        const body = await request.json();
        const { selectedOption, latitude, longitude, neighborhood, city, zipCode } = body;

        // Validate selectedOption is 1, 2, or 3
        if (!Number.isInteger(selectedOption) || selectedOption < 1 || selectedOption > 3) {
            return NextResponse.json(
                { error: "selectedOption must be 1, 2, or 3" },
                { status: 400 }
            );
        }

        // Verify poll exists and is ACTIVE
        const poll = await prisma.neighborhoodPoll.findUnique({
            where: { id: pollId }
        });

        if (!poll) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        if (poll.status !== 'ACTIVE') {
            return NextResponse.json({ error: "Poll is not active" }, { status: 400 });
        }

        // Use location from request body (listing context), fallback to user profile
        const responseCity = city ?? currentUser.city ?? null;
        const responseZipCode = zipCode ?? currentUser.zipCode ?? null;

        // Upsert the response
        await prisma.pollResponse.upsert({
            where: {
                pollId_userId: {
                    pollId,
                    userId: currentUser.id
                }
            },
            update: {
                selectedOption,
                latitude: latitude ?? null,
                longitude: longitude ?? null,
                neighborhood: neighborhood ?? null,
                city: responseCity,
                zipCode: responseZipCode
            },
            create: {
                pollId,
                userId: currentUser.id,
                selectedOption,
                latitude: latitude ?? null,
                longitude: longitude ?? null,
                neighborhood: neighborhood ?? null,
                city: responseCity,
                zipCode: responseZipCode
            }
        });

        // Compute results for the zone
        const responseWhere: any = { pollId };
        let zone: "zipCode" | "city" | "global" = "global";

        if (responseZipCode) {
            const zipCodeCount = await prisma.pollResponse.count({
                where: { pollId, zipCode: responseZipCode }
            });
            if (zipCodeCount >= 10) {
                responseWhere.zipCode = responseZipCode;
                zone = "zipCode";
            } else if (responseCity) {
                responseWhere.city = responseCity;
                zone = "city";
            }
        } else if (responseCity) {
            responseWhere.city = responseCity;
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
            option1Count,
            option2Count,
            option3Count,
            totalResponses: responses.length,
            zone,
            userVote: selectedOption
        });
    } catch (error) {
        console.error("POLL RESPOND ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
