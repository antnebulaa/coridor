
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { PollCategory } from "@prisma/client";

export async function GET(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const category = searchParams.get("category");

        const where: any = {};

        if (status) {
            where.status = status;
        }
        if (category) {
            where.category = category;
        }

        const polls = await prisma.neighborhoodPoll.findMany({
            where,
            include: {
                _count: {
                    select: { responses: true }
                },
                createdBy: {
                    select: { name: true, email: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(polls);
    } catch (error) {
        console.error("GET POLLS ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title, description, category, option1, option2, option3 } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const validCategories = Object.values(PollCategory);
        if (!category || !validCategories.includes(category)) {
            return NextResponse.json(
                { error: `Category must be one of: ${validCategories.join(", ")}` },
                { status: 400 }
            );
        }

        if (!option1 || !option2 || !option3) {
            return NextResponse.json({ error: "All three options are required" }, { status: 400 });
        }

        const poll = await prisma.neighborhoodPoll.create({
            data: {
                title,
                description: description || null,
                category,
                option1,
                option2,
                option3,
                createdById: currentUser.id
            }
        });

        return NextResponse.json(poll);
    } catch (error) {
        console.error("CREATE POLL ERROR", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
