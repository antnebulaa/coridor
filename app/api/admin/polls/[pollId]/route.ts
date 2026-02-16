
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    pollId: string;
}

export async function PATCH(
    request: Request,
    props: { params: Promise<IParams> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pollId } = params;

    try {
        const existingPoll = await prisma.neighborhoodPoll.findUnique({
            where: { id: pollId }
        });

        if (!existingPoll) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        const body = await request.json();
        const { status, title, description, option1, option2, option3 } = body;

        const data: any = {};

        if (title !== undefined) {
            data.title = title;
        }
        if (description !== undefined) {
            data.description = description;
        }
        if (option1 !== undefined) {
            data.option1 = option1;
        }
        if (option2 !== undefined) {
            data.option2 = option2;
        }
        if (option3 !== undefined) {
            data.option3 = option3;
        }
        if (status !== undefined) {
            data.status = status;
            if (status === 'CLOSED') {
                data.closedAt = new Date();
            }
        }

        const poll = await prisma.neighborhoodPoll.update({
            where: { id: pollId },
            data
        });

        return NextResponse.json(poll);
    } catch (error) {
        console.error("PATCH POLL ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<IParams> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pollId } = params;

    try {
        const existingPoll = await prisma.neighborhoodPoll.findUnique({
            where: { id: pollId }
        });

        if (!existingPoll) {
            return NextResponse.json({ error: "Poll not found" }, { status: 404 });
        }

        const poll = await prisma.neighborhoodPoll.delete({
            where: { id: pollId }
        });

        return NextResponse.json(poll);
    } catch (error) {
        console.error("DELETE POLL ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
