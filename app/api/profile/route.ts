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
        partnerJobType,
        partnerJobTitle,
        partnerNetSalary,
        guarantors,
        additionalIncomes,
        aplAmount,
        aplDirectPayment,
        bio,
        landlordName
    } = body;

    // Upsert Tenant Profile
    const profile = await prisma.tenantProfile.upsert({
        where: {
            userId: currentUser.id
        },
        update: {
            jobType,
            jobTitle,
            netSalary: parseInt(netSalary, 10),
            partnerJobType,
            partnerJobTitle,
            partnerNetSalary: parseInt(partnerNetSalary, 10) || 0,
            aplAmount: parseInt(aplAmount, 10) || 0,
            aplDirectPayment,
            bio,
            landlordName
        },
        create: {
            userId: currentUser.id,
            jobType,
            jobTitle,
            netSalary: parseInt(netSalary, 10),
            partnerJobType,
            partnerJobTitle,
            partnerNetSalary: parseInt(partnerNetSalary, 10) || 0,
            aplAmount: parseInt(aplAmount, 10) || 0,
            aplDirectPayment,
            bio,
            landlordName
        }
    });

    // Now handle nested relations using a transaction
    await prisma.$transaction(async (tx: any) => {
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

                if (guarantor.additionalIncomes && guarantor.additionalIncomes.length > 0) {
                    await tx.income.createMany({
                        data: guarantor.additionalIncomes.map((inc: any) => ({
                            type: inc.type,
                            amount: parseInt(inc.amount, 10),
                            guarantorId: createdGuarantor.id
                        }))
                    });
                }
            }
        }
    });

    return NextResponse.json(profile);
}
