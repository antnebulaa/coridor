'use server';

import prisma from "@/libs/prismadb";
import { RegularizationService } from "@/services/RegularizationService";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/libs/notifications";
import { sendPushNotification } from "@/app/lib/sendPushNotification";
import { sendEmail } from "@/lib/email";

/**
 * Get all signed leases for a property to populate the selection dropdown.
 */
export async function getEligibleLeases(propertyId?: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Unauthorized");

    // If propertyId provided, filter by that property
    // Otherwise, fetch all signed leases for the current user's properties
    const leases = await prisma.rentalApplication.findMany({
        where: {
            leaseStatus: 'SIGNED',
            listing: {
                rentalUnit: {
                    property: propertyId
                        ? { id: propertyId }
                        : { ownerId: currentUser.id }
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

    // Calculate dynamic year range from earliest lease start to current year
    const currentYear = new Date().getFullYear();
    let earliestYear = currentYear;

    for (const lease of leases) {
        const leaseYear = lease.appliedAt.getFullYear();
        if (leaseYear < earliestYear) {
            earliestYear = leaseYear;
        }
    }

    const years: number[] = [];
    for (let y = earliestYear; y <= currentYear; y++) {
        years.push(y);
    }

    return {
        leases: leases.map(lease => ({
            id: lease.id,
            propertyId: lease.listing.rentalUnit.property.id,
            tenantName: lease.candidateScope.creatorUser.name || "Locataire inconnu",
            unitName: lease.listing.rentalUnit.name,
            propertyAddress: lease.listing.rentalUnit.property.address || "Adresse non renseignée",
            startDate: lease.appliedAt
        })),
        years,
    };
}

/**
 * Generate a preview of the statement (Calculations only, no persistence)
 */
export async function previewRegularization(applicationId: string, propertyId: string, year: number) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Non authentifié");

    // Verify ownership: the lease must belong to a property owned by the current user
    const application = await prisma.rentalApplication.findFirst({
        where: {
            id: applicationId,
            listing: { rentalUnit: { property: { id: propertyId, ownerId: currentUser.id } } },
        },
    });
    if (!application) throw new Error("Bail non trouvé ou accès non autorisé.");

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
    if (!currentUser) throw new Error("Non authentifié");

    // Verify ownership
    const application = await prisma.rentalApplication.findFirst({
        where: {
            id: applicationId,
            listing: { rentalUnit: { property: { id: propertyId, ownerId: currentUser.id } } },
        },
    });
    if (!application) throw new Error("Bail non trouvé ou accès non autorisé.");

    // 1. Check for existing regularization for same (propertyId, leaseId, year)
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const existing = await prisma.reconciliationHistory.findFirst({
        where: {
            propertyId,
            leaseId: applicationId,
            periodStart: { gte: startOfYear },
            periodEnd: { lte: endOfYear },
        },
    });
    if (existing) {
        throw new Error("Une régularisation existe déjà pour ce bail et cette année.");
    }

    // 2. Create History Record

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

    // 3. Link items (Pivot table)
    // We need to create ReconciliationItem for each expense
    // Prerequisite: Expenses must exist.
    if (expenseIds.length > 0) {
        await prisma.reconciliationItem.createMany({
            data: expenseIds.map(expId => ({
                reconciliationId: reconciliation.id,
                expenseId: expId
            }))
        });

        // 4. LOCK Expenses (Set isFinalized = true)
        await prisma.expense.updateMany({
            where: { id: { in: expenseIds } },
            data: { isFinalized: true }
        });
    }

    revalidatePath(`/properties`);
    return { success: true, reconciliationId: reconciliation.id };
}

/**
 * Send the Regularization Document to the Tenant via Chat + push + email + in-app notification.
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
            listing: {
                include: {
                    rentalUnit: {
                        include: {
                            property: {
                                select: { addressLine1: true, city: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!lease || !lease.candidateScope.creatorUser) {
        throw new Error("Bail ou locataire introuvable");
    }

    const tenant = lease.candidateScope.creatorUser;
    const tenantId = tenant.id;
    const tenantEmail = tenant.email;
    const listingId = lease.listingId;
    const landlordName = currentUser.name || 'Votre propriétaire';
    const property = lease.listing.rentalUnit.property;
    const propertyTitle = [property.addressLine1, property.city].filter(Boolean).join(', ') || 'Votre logement';

    // 2. Find Conversation (Owner <-> Tenant) linked to this listing
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

    // 3. Send Message in conversation
    const messageBody = `Bonjour,\n\nVoici le décompte de régularisation des charges pour l'année ${year}.\n\nVous pouvez consulter le document ci-joint :`;
    const fullBody = `${messageBody}\n\n[Télécharger le Document](${documentUrl})`;

    await prisma.message.create({
        data: {
            body: fullBody,
            conversation: { connect: { id: conversation.id } },
            sender: { connect: { id: currentUser.id } },
            seen: { connect: { id: currentUser.id } }
        }
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
            lastMessageAt: new Date(),
        }
    });

    // 4. In-app notification
    await createNotification({
        userId: tenantId,
        type: 'REGULARIZATION',
        title: `Régularisation des charges ${year}`,
        message: `${landlordName} vous a envoyé le décompte de régularisation des charges pour ${propertyTitle}.`,
        link: `/inbox/${conversation.id}`,
    }).catch(err => console.error("[Notification] Failed to create regularization notification:", err));

    // 5. Push notification (fire-and-forget)
    sendPushNotification({
        userId: tenantId,
        title: `Régularisation des charges ${year}`,
        body: `${landlordName} vous a envoyé le décompte de régularisation des charges.`,
        url: `/inbox/${conversation.id}`,
        type: 'message',
    }).catch(err => console.error("[Push] Failed to notify tenant for regularization:", err));

    // 6. Email notification (fire-and-forget)
    if (tenantEmail) {
        sendEmail(
            tenantEmail,
            `Régularisation des charges ${year} — ${propertyTitle}`,
            `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                    <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Régularisation des charges ${year}</h2>
                    <p style="color: #525252; font-size: 15px; line-height: 1.6;">
                        Bonjour${tenant.name ? ` ${tenant.name}` : ''},
                    </p>
                    <p style="color: #525252; font-size: 15px; line-height: 1.6;">
                        ${landlordName} vous a envoyé le décompte de régularisation des charges pour l'année ${year} concernant le logement <strong>${propertyTitle}</strong>.
                    </p>
                    <p style="color: #525252; font-size: 15px; line-height: 1.6;">
                        Vous pouvez consulter le document et échanger avec votre propriétaire directement sur Coridor.
                    </p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${process.env.NEXTAUTH_URL || 'https://coridor.fr'}/inbox/${conversation.id}" style="display: inline-block; background: #171717; color: #fff; font-weight: 600; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-size: 15px;">
                            Voir le décompte
                        </a>
                    </div>
                    <p style="color: #a3a3a3; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e5e5; padding-top: 16px;">
                        Coridor — Location immobilière entre particuliers
                    </p>
                </div>
            `
        ).catch(err => console.error("[Email] Failed to send regularization email:", err));
    }

    return { success: true, conversationId: conversation.id };
}

/**
 * Store the report PDF URL on the ReconciliationHistory record.
 */
export async function updateRegularizationReportUrl(reconciliationId: string, reportUrl: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error('Non authentifié');

    // Verify ownership
    const reconciliation = await prisma.reconciliationHistory.findFirst({
        where: { id: reconciliationId },
        include: { property: { select: { ownerId: true } } },
    });

    if (!reconciliation || reconciliation.property.ownerId !== currentUser.id) {
        throw new Error('Accès non autorisé');
    }

    await prisma.reconciliationHistory.update({
        where: { id: reconciliationId },
        data: { reportUrl },
    });
}

/**
 * Fetch regularization history for the current owner.
 */
export async function getRegularizationHistory() {
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    const records = await prisma.reconciliationHistory.findMany({
        where: { property: { ownerId: currentUser.id } },
        include: {
            property: { select: { id: true, addressLine1: true, city: true } },
            lease: {
                select: {
                    id: true,
                    candidateScope: {
                        select: {
                            creatorUser: {
                                select: { name: true }
                            }
                        }
                    }
                }
            },
            _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return records.map(r => ({
        id: r.id,
        propertyId: r.propertyId,
        propertyAddress: [r.property.addressLine1, r.property.city].filter(Boolean).join(', ') || 'Adresse non renseignée',
        tenantName: r.lease.candidateScope?.creatorUser?.name || 'Locataire inconnu',
        year: r.periodStart.getFullYear(),
        totalRealChargesCents: r.totalRealChargesCents,
        totalProvisionsCents: r.totalProvisionsCents,
        finalBalanceCents: r.finalBalanceCents,
        reportUrl: r.reportUrl,
        itemCount: r._count.items,
        createdAt: r.createdAt.toISOString(),
    }));
}

/**
 * Cancel a regularization: unlock expenses, remove items, delete history record.
 */
export async function cancelRegularization(reconciliationId: string) {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Non authentifié");

    // Fetch the reconciliation and verify ownership
    const reconciliation = await prisma.reconciliationHistory.findUnique({
        where: { id: reconciliationId },
        include: {
            property: true,
            items: true,
        },
    });

    if (!reconciliation || reconciliation.property.ownerId !== currentUser.id) {
        throw new Error("Régularisation non trouvée ou accès non autorisé.");
    }

    const expenseIds = reconciliation.items.map(item => item.expenseId);

    // 1. Unlock expenses (set isFinalized back to false)
    if (expenseIds.length > 0) {
        await prisma.expense.updateMany({
            where: { id: { in: expenseIds } },
            data: { isFinalized: false },
        });
    }

    // 2. Delete reconciliation items
    await prisma.reconciliationItem.deleteMany({
        where: { reconciliationId },
    });

    // 3. Delete the reconciliation history record
    await prisma.reconciliationHistory.delete({
        where: { id: reconciliationId },
    });

    revalidatePath('/properties');
    return { success: true };
}
