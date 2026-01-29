'use server';

import prisma from "@/libs/prismadb";
import { LeaseService } from "@/services/LeaseService";
import { revalidatePath } from "next/cache";

export async function markLeaseAsSigned(applicationId: string, signedUrl?: string) {
    try {
        // 1. Update Application Status
        await prisma.rentalApplication.update({
            where: { id: applicationId },
            data: {
                leaseStatus: "SIGNED",
                signedLeaseUrl: signedUrl || "https://example.com/mock-signed-lease.pdf", // Mock if not provided
                status: "ACCEPTED" // Also mark application as accepted if not already
            }
        });

        // 2. Initialize Financials
        await LeaseService.initializeFinancials(applicationId);

        revalidatePath(`/dashboard/applications/${applicationId}`);
        revalidatePath(`/properties`);
        return { success: true };
    } catch (error: any) {
        console.error("Error marking lease as signed:", error);
        return { error: error.message };
    }
}
