import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import ReceiptsClient from "./ReceiptsClient";
import prisma from "@/libs/prismadb";

const ReceiptsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Non autorise"
                    subtitle="Veuillez vous connecter"
                />
            </ClientOnly>
        );
    }

    // Fetch all signed leases where the current user is a tenant
    const applications = await prisma.rentalApplication.findMany({
        where: {
            leaseStatus: 'SIGNED',
            candidateScope: {
                OR: [
                    { creatorUserId: currentUser.id },
                    { membersIds: { has: currentUser.id } }
                ]
            }
        },
        include: {
            listing: {
                include: {
                    rentalUnit: {
                        include: { property: true }
                    }
                }
            },
            rentReceipts: {
                orderBy: { periodStart: 'desc' }
            }
        }
    });

    // Serialize dates for client component
    const serializedApplications = applications.map((app) => ({
        id: app.id,
        listing: {
            id: app.listing.id,
            title: app.listing.title,
            rentalUnit: {
                id: app.listing.rentalUnit.id,
                name: app.listing.rentalUnit.name,
                property: {
                    id: app.listing.rentalUnit.property.id,
                    address: app.listing.rentalUnit.property.address,
                    city: app.listing.rentalUnit.property.city,
                    zipCode: app.listing.rentalUnit.property.zipCode,
                }
            }
        },
        rentReceipts: app.rentReceipts.map((receipt) => ({
            id: receipt.id,
            periodStart: receipt.periodStart.toISOString(),
            periodEnd: receipt.periodEnd.toISOString(),
            rentAmountCents: receipt.rentAmountCents,
            chargesAmountCents: receipt.chargesAmountCents,
            totalAmountCents: receipt.totalAmountCents,
            isPartialPayment: receipt.isPartialPayment,
            pdfUrl: receipt.pdfUrl,
            sentAt: receipt.sentAt?.toISOString() || null,
            createdAt: receipt.createdAt.toISOString(),
        }))
    }));

    return (
        <ClientOnly>
            <ReceiptsClient applications={serializedApplications} />
        </ClientOnly>
    );
}

export default ReceiptsPage;
