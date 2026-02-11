
import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

export async function PATCH(
    request: Request,
    props: { params: Promise<{ userId: string }> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const body = await request.json();
    const { isBanned } = body;

    if (userId === currentUser.id) {
        return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });
    }

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { isBanned }
        });

        // Potentially invalidate sessions here if using DB sessions

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ userId: string }> }
) {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;

    if (userId === currentUser.id) {
        return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    try {
        // Prisma cascade delete should handle relations if configured, 
        // otherwise we might need to clean up manually or be careful.
        // Schema has onDelete: Cascade on most relations, so it should be fine.
        const user = await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}
