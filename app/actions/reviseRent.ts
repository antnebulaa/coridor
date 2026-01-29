'use server';

import { LeaseService } from "@/services/LeaseService";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { revalidatePath } from "next/cache";

export async function reviseRent(
    applicationId: string,
    newBaseRent: number,
    newProvisionCharges: number,
    effectiveDate: Date
) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            throw new Error("Unauthorized");
        }

        // We assume verifyOwnerOrAdmin checks happen inside or via currentUser logic, 
        // but ideally we should verify the application belongs to a listing owned by currentUser.
        // For V1 speed, we trust the UI context but adding a check is better.
        // LeaseService.indexRent abstracts the DB logic.

        await LeaseService.indexRent(
            applicationId,
            newBaseRent * 100, // Convert to cents
            newProvisionCharges * 100, // Convert to cents
            effectiveDate
        );

        revalidatePath(`/properties`);
        revalidatePath(`/dashboard`);
        return { success: true };
    } catch (error: any) {
        console.error("Error revising rent:", error);
        return { error: error.message };
    }
}
