import { NextResponse } from "next/server";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";

export async function POST(
    request: Request
) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.error();
    }

    const body = await request.json();
    const {
        jobType,
        jobTitle,
        netSalary,
        guarantors,
        additionalIncomes
    } = body;

    // Upsert Tenant Profile
    // We use upsert because it might not exist yet.
    // However, for nested relations (guarantors, incomes), it's easier to handle them if we know the profile ID.
    // Let's first ensure the profile exists or update it.

    const profile = await prisma.tenantProfile.upsert({
        where: {
            userId: currentUser.id
        },
        update: {
            jobType,
            jobTitle,
            netSalary: parseInt(netSalary, 10),
        },
        create: {
            userId: currentUser.id,
            jobType,
            jobTitle,
            netSalary: parseInt(netSalary, 10),
        }
    });

    // Now handle nested relations using a transaction
    await prisma.$transaction(async (tx) => {
        // 1. Clear existing guarantors and incomes linked to profile
        // Note: Incomes can be linked to Profile OR Guarantor.
        // We need to delete incomes linked to THIS profile.
        await tx.income.deleteMany({
            where: {
                tenantProfileId: profile.id
            }
        });

        await tx.guarantor.deleteMany({
            where: {
                tenantProfileId: profile.id
            }
        });

        // 2. Create Additional Incomes for Profile
        if (additionalIncomes && additionalIncomes.length > 0) {
            await tx.income.createMany({
                data: additionalIncomes.map((inc: any) => ({
                    type: inc.type,
                    amount: parseInt(inc.amount, 10),
                    tenantProfileId: profile.id
                }))
            });
        }

        // 3. Create Guarantors
        if (guarantors && guarantors.length > 0) {
            for (const guarantor of guarantors) {
                const createdGuarantor = await tx.guarantor.create({
                    data: {
                        tenantProfileId: profile.id,
                        type: guarantor.type,
                        status: guarantor.status,
                        netIncome: parseInt(guarantor.netIncome, 10)
                    }
                });

                // Guarantor Incomes? Schema says Guarantor has additionalIncomes.
                // If the form supports it, we should add it.
                // For now, let's assume basic guarantor info.
            }
        }
    });

    return NextResponse.json(profile);
}
