import prisma from "@/libs/prismadb";
import getCurrentUser from "./getCurrentUser";

/**
 * Checks if the landlord has urgent/action items that warrant
 * a red dot badge on the Dashboard icon in the mobile bottom bar.
 *
 * Detects: overdue rent, draft/pending EDL, overdue legal reminders,
 * overdue deposit deadlines.
 */
export default async function getDashboardAlerts() {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return { hasPendingConfig: false };
        }

        // Only check for landlords
        if (currentUser.userMode !== 'LANDLORD') {
            return { hasPendingConfig: false };
        }

        const ownerId = currentUser.id;

        // Run parallel lightweight count queries
        const [overdueRentCount, pendingEdlCount, overdueRemindersCount, overdueDepositCount] = await Promise.all([
            // Overdue rent payments (LATE, OVERDUE, CRITICAL)
            prisma.rentPaymentTracking.count({
                where: {
                    rentalApplication: {
                        listing: {
                            rentalUnit: {
                                property: { ownerId }
                            }
                        }
                    },
                    status: { in: ['LATE', 'OVERDUE', 'CRITICAL'] }
                }
            }),
            // Draft or pending signature EDL (inspections the landlord needs to act on)
            prisma.inspection.count({
                where: {
                    landlordId: ownerId,
                    status: { in: ['DRAFT', 'PENDING_SIGNATURE'] }
                }
            }),
            // Overdue legal reminders
            prisma.legalReminder.count({
                where: {
                    property: { ownerId },
                    status: 'PENDING',
                    dueDate: { lt: new Date() }
                }
            }),
            // Overdue deposit deadlines
            prisma.securityDeposit.count({
                where: {
                    application: {
                        listing: {
                            rentalUnit: {
                                property: { ownerId }
                            }
                        }
                    },
                    status: { in: ['HELD', 'EXIT_INSPECTION'] },
                    legalDeadline: { lt: new Date() }
                }
            }),
        ]);

        const hasUrgentItems = (overdueRentCount + pendingEdlCount + overdueRemindersCount + overdueDepositCount) > 0;

        return {
            hasPendingConfig: hasUrgentItems
        };
    } catch (error: any) {
        console.error('[getDashboardAlerts] Error:', error);
        return { hasPendingConfig: false };
    }
}
