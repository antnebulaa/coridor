import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/libs/prismadb";
import { FiscalService } from "@/services/FiscalService";
import { enforceRecoverability } from "@/lib/expenses/categoryRules";

interface IParams {
    propertyId: string;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId } = await params;
    const body = await request.json();

    const {
        category,
        label,
        amountTotalCents,
        dateOccurred,
        frequency,
        isRecoverable,
        recoverableRatio,
        proofUrl,
        isFinalized,
        amountRecoverableCents,
        amountDeductibleCents,
        rentalUnitId
    } = body;

    console.log("POST Expense Body:", body);

    if (!propertyId || !category || !label || amountTotalCents === undefined || amountTotalCents === null || !dateOccurred || !frequency) {
        console.log("Missing fields:", { propertyId, category, label, amountTotalCents, dateOccurred, frequency });
        return NextResponse.json({ error: "Validation Error: Missing required fields (propertyId, category, label, amountTotalCents, dateOccurred, frequency)" }, { status: 400 });
    }

    // Verify ownership
    const property = await prisma.property.findUnique({
        where: {
            id: propertyId,
        }
    });

    if (!property || property.ownerId !== currentUser.id) {
        console.log("Property not found or not owner");
        return NextResponse.json({ error: "Forbidden: Not owner" }, { status: 403 });
    }

    // Enforce server-side recoverability rules
    const enforcedRecoverable = enforceRecoverability(category, isRecoverable);

    try {
        const expense = await prisma.expense.create({
            data: {
                propertyId,
                rentalUnitId,
                category,
                label,
                amountTotalCents,
                dateOccurred: new Date(dateOccurred),
                frequency,
                isRecoverable: enforcedRecoverable,
                recoverableRatio,
                proofUrl,
                isFinalized,
                amountRecoverableCents,
                amountDeductibleCents: amountDeductibleCents ?? FiscalService.calculateDeductible({
                    category,
                    amountTotalCents: Math.round(parseFloat(String(amountTotalCents))),
                    amountRecoverableCents,
                    recoverableRatio,
                    isRecoverable: enforcedRecoverable,
                })
            }
        });
        // Check if this year was already regularized for this property
        const expenseYear = new Date(dateOccurred).getFullYear();
        const existingRegularization = await prisma.reconciliationHistory.findFirst({
            where: { propertyId, year: expenseYear },
            select: { id: true },
        });

        return NextResponse.json({
            ...expense,
            ...(existingRegularization && { warning: 'YEAR_ALREADY_REGULARIZED' }),
        });
    } catch (error) {
        console.error("Prisma Create Error:", error);
        return NextResponse.json(null, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<IParams> }
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId } = await params;

    // Verify ownership (optional for GET if public, but likely private here)
    const property = await prisma.property.findUnique({
        where: {
            id: propertyId,
        }
    });

    // Strict check: Only owner can see expenses
    if (!property || property.ownerId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden: Not owner" }, { status: 403 });
    }

    const expenses = await prisma.expense.findMany({
        where: {
            propertyId: propertyId
        },
        orderBy: {
            dateOccurred: 'desc'
        }
    });

    return NextResponse.json(expenses);
}
