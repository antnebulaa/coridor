import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    listingId?: string;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    try {
        const currentUser = await getCurrentUser();
        const resolvedParams = await params;
        const { listingId } = resolvedParams;

        if (!currentUser) {
            console.error("Like API: No current user");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!listingId || typeof listingId !== 'string') {
            console.error("Like API: Invalid ID");
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        // Check if like exists
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_listingId: {
                    userId: currentUser.id,
                    listingId: listingId
                }
            }
        });

        if (existingLike) {
            // Unlike
            await prisma.like.delete({
                where: {
                    id: existingLike.id
                }
            });

            return NextResponse.json({
                status: 'unliked'
            });
        } else {
            // Like
            await prisma.like.create({
                data: {
                    userId: currentUser.id,
                    listingId: listingId
                }
            });

            return NextResponse.json({
                status: 'liked'
            });
        }
    } catch (error: any) {
        console.error("Like API Error:", error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}
