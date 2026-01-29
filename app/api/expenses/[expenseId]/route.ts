import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";

interface IParams {
    expenseId: string;
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const { expenseId } = await params;

    if (!expenseId || typeof expenseId !== 'string') {
        throw new Error('Invalid ID');
    }

    // Find the expense to get propertyId and verify ownership
    const expense = await prisma.expense.findUnique({
        where: {
            id: expenseId
        },
        include: {
            property: true
        }
    });

    if (!expense || expense.property.ownerId !== currentUser.id) {
        return NextResponse.error();
    }

    const deletedExpense = await prisma.expense.delete({
        where: {
            id: expenseId
        }
    });

    return NextResponse.json(deletedExpense);
}
