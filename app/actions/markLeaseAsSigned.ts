'use server';

import prisma from "@/libs/prismadb";
import { LeaseService } from "@/services/LeaseService";
import { revalidatePath } from "next/cache";

export async function markLeaseAsSigned(applicationId: string, signedUrl?: string) {
    try {
        // 1. Fetch application to compute lease dates
        const application = await prisma.rentalApplication.findUnique({
            where: { id: applicationId },
            include: {
                listing: true,
                candidateScope: true,
                financials: { where: { endDate: null }, take: 1 }
            }
        });

        if (!application) throw new Error("Application not found");

        // Compute lease dates
        const financial = application.financials?.[0];
        const leaseStartDate = financial?.startDate
            || application.candidateScope?.targetMoveInDate
            || new Date();

        const leaseType = application.listing?.leaseType;
        let durationMonths = application.leaseDurationMonths;
        if (!durationMonths) {
            if (leaseType === 'LONG_TERM') durationMonths = 36;
            else if (leaseType === 'STUDENT') durationMonths = 9;
            else if (leaseType === 'SHORT_TERM') durationMonths = 10;
            else durationMonths = 12;
        }

        const leaseEndDate = new Date(leaseStartDate);
        leaseEndDate.setMonth(leaseEndDate.getMonth() + durationMonths);

        // 2. Update Application Status + dates
        await prisma.rentalApplication.update({
            where: { id: applicationId },
            data: {
                leaseStatus: "SIGNED",
                signedLeaseUrl: signedUrl || "https://example.com/mock-signed-lease.pdf",
                status: "ACCEPTED",
                leaseStartDate,
                leaseEndDate,
                leaseDurationMonths: durationMonths,
            }
        });

        // 3. Initialize Financials
        await LeaseService.initializeFinancials(applicationId);

        revalidatePath(`/dashboard/applications/${applicationId}`);
        revalidatePath(`/properties`);
        return { success: true };
    } catch (error: any) {
        console.error("Error marking lease as signed:", error);
        return { error: error.message };
    }
}
