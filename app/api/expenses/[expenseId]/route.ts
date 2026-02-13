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

export async function PATCH(
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

    const expense = await prisma.expense.findUnique({
        where: { id: expenseId },
        include: { property: true }
    });

    if (!expense || expense.property.ownerId !== currentUser.id) {
        return NextResponse.error();
    }

    if (expense.isFinalized) {
        return NextResponse.json(
            { error: 'Cette dépense est verrouillée (régularisée)' },
            { status: 403 }
        );
    }

    const body = await request.json();

    const updatedExpense = await prisma.expense.update({
        where: { id: expenseId },
        data: {
            ...(body.category !== undefined && { category: body.category }),
            ...(body.label !== undefined && { label: body.label }),
            ...(body.amountTotalCents !== undefined && { amountTotalCents: body.amountTotalCents }),
            ...(body.dateOccurred !== undefined && { dateOccurred: new Date(body.dateOccurred) }),
            ...(body.frequency !== undefined && { frequency: body.frequency }),
            ...(body.isRecoverable !== undefined && { isRecoverable: body.isRecoverable }),
            ...(body.recoverableRatio !== undefined && { recoverableRatio: body.recoverableRatio }),
            ...(body.amountRecoverableCents !== undefined && { amountRecoverableCents: body.amountRecoverableCents }),
            ...(body.amountDeductibleCents !== undefined && { amountDeductibleCents: body.amountDeductibleCents }),
            ...(body.proofUrl !== undefined && { proofUrl: body.proofUrl }),
            ...(body.rentalUnitId !== undefined && { rentalUnitId: body.rentalUnitId || null }),
        }
    });

    return NextResponse.json(updatedExpense);
}
