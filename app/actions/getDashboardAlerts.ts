import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

export default async function getDashboardAlerts() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return { hasPendingConfig: false };
        }

        // Check if there is at least one listing belonging to the user that has NO visit slots
        const listingWithoutSlots = await prisma.listing.findFirst({
            where: {
                userId: currentUser.id,
                visitSlots: {
                    none: {}
                }
            },
            select: { id: true }
        });

        return {
            hasPendingConfig: !!listingWithoutSlots
        };
    } catch (error: any) {
        return { hasPendingConfig: false };
    }
}
