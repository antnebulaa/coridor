'use server';

import prisma from "@/libs/prismadb";
import { RegularizationService } from "@/services/RegularizationService";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { revalidatePath } from "next/cache";

/**
 * Get all signed leases for a property to populate the selection dropdown.
 */
export async function getEligibleLeases(propertyId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Fetch leases linked to this property (via Listing -> RentalUnit -> Property)
    // We need to trace back from Property to RentalApplications.
    // Path: Property -> RentalUnit -> Listing -> Application

    // Easier query: Find applications where listing.rentalUnit.propertyId = propertyId
    const leases = await prisma.rentalApplication.findMany({
        where: {
            leaseStatus: 'SIGNED',
            listing: {
                rentalUnit: {
                    propertyId: propertyId
                }
            }
        },
        include: {
            candidateScope: {
                include: {
                    creatorUser: true // To get name
                }
            },
            listing: {
                include: {
                    rentalUnit: {
                        include: {
                            property: true
                        }
                    }
                }
            }
        },
        orderBy: { appliedAt: 'desc' }
    });

    return leases.map(lease => ({
        id: lease.id,
        tenantName: lease.candidateScope.creatorUser.name || "Locataire inconnu",
        unitName: lease.listing.rentalUnit.name,
        propertyAddress: lease.listing.rentalUnit.property.address || "Adresse non renseignée",
        startDate: lease.appliedAt // Approximation if LeaseFinancials missing, strictly we should use Financials start
    }));
}

/**
 * Generate a preview of the statement (Calculations only, no persistence)
 */
export async function previewRegularization(applicationId: string, propertyId: string, year: number) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // Ensure ownership logic here if needed (omitted for brevity)

    const statement = await RegularizationService.generateStatement(applicationId, propertyId, year);
    return statement;
}

/**
 * Commit the regularization: Save history, Lock expenses.
 */
export async function commitRegularization(
    applicationId: string,
    propertyId: string,
    year: number,
    finalBalanceCents: number,
    totalRealChargesCents: number,
    totalProvisionsCents: number,
    expenseIds: string[]
) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // 1. Create History Record
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const reconciliation = await prisma.reconciliationHistory.create({
        data: {
            propertyId,
            leaseId: applicationId,
            periodStart: startOfYear,
            periodEnd: endOfYear,
            totalRealChargesCents,
            totalProvisionsCents,
            finalBalanceCents
        }
    });

    // 2. Link items (Pivot table)
    // We need to create ReconciliationItem for each expense
    // Prerequisite: Expenses must exist.
    if (expenseIds.length > 0) {
        await prisma.reconciliationItem.createMany({
            data: expenseIds.map(expId => ({
                reconciliationId: reconciliation.id,
                expenseId: expId
            }))
        });

        // 3. LOCK Expenses (Set isFinalized = true)
        await prisma.expense.updateMany({
            where: { id: { in: expenseIds } },
            data: { isFinalized: true }
        });
    }

    revalidatePath(`/properties`);
    return { success: true, reconciliationId: reconciliation.id };
}

/**
 * Send the Regularization Document to the Tenant via Chat.
 */
export async function sendRegularizationMessage(leaseId: string, documentUrl: string, year: number) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // 1. Get Lease & Tenant Info
    const lease = await prisma.rentalApplication.findUnique({
        where: { id: leaseId },
        include: {
            candidateScope: {
                include: { creatorUser: true }
            },
            listing: true
        }
    });

    if (!lease || !lease.candidateScope.creatorUser) {
        throw new Error("Bail ou locataire introuvable");
    }

    const tenantId = lease.candidateScope.creatorUser.id;
    const listingId = lease.listingId;

    // 2. Find Conversation (Owner <-> Tenant) linked to this listing
    // Since Conversation users are Many-to-Many, we need to query carefully.
    // Or we can rely on `listingId` if it's set on conversation?
    // Let's search by listingId AND members check.

    let conversation = await prisma.conversation.findFirst({
        where: {
            listingId: listingId,
            AND: [
                { users: { some: { id: currentUser.id } } },
                { users: { some: { id: tenantId } } }
            ]
        }
    });

    // If no conversation found, create one
    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: {
                listingId: listingId,
                users: {
                    connect: [
                        { id: currentUser.id },
                        { id: tenantId }
                    ]
                }
            }
        });
    }

    // 3. Send Message
    const messageBody = `Bonjour,\n\nVoici le décompte de régularisation des charges pour l'année ${year}.\n\nVous pouvez consulter le document ci-joint :`;

    // Check if we use 'image' field for attachments or just body link.
    // Assuming 'image' field is for images (img tag), using body for PDF link is safer unless we adapt UI.
    // Let's append link to body.

    // Actually, user requested "bouton pour y accéder". Markdown link `[Télécharger ...](url)` works if markdown supported.
    // Or just raw URL.

    const fullBody = `${messageBody}\n\n[Télécharger le Document](${documentUrl})`;

    await prisma.message.create({
        data: {
            body: fullBody,
            conversation: { connect: { id: conversation.id } },
            sender: { connect: { id: currentUser.id } },
            seen: { connect: { id: currentUser.id } } // Sender has seen it
        }
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
            lastMessageAt: new Date(),
            messagesIds: { push: conversation.id } // This field is sometimes redundant but used in schemas
        }
    });

    return { success: true };
}
