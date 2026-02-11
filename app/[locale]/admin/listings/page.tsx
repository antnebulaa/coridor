import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import prisma from "@/libs/prismadb";
import ListingModerationTable from "./ListingModerationTable";

export default async function AdminListingsPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        redirect('/');
    }

    // Fetch all listings that need review (PENDING_REVIEW), plus some recently published
    const listings = await prisma.listing.findMany({
        where: {
            OR: [
                { status: 'PENDING_REVIEW' },
                { status: 'PUBLISHED' }, // Include published to revoke if needed
                { status: 'REJECTED' }
            ]
        },
        orderBy: {
            updatedAt: 'desc'
        },
        include: {
            rentalUnit: {
                include: {
                    property: {
                        include: {
                            owner: true
                        }
                    }
                }
            }
        }
    });

    // Serialize dates for client component
    const safeListings = listings.map((listing) => ({
        ...listing,
        createdAt: listing.createdAt.toISOString(),
        updatedAt: listing.updatedAt.toISOString(),
        statusUpdatedAt: listing.statusUpdatedAt.toISOString(),
        availableFrom: listing.availableFrom?.toISOString() || null,
        reviewedAt: (listing as any).reviewedAt?.toISOString() || null,
        rentalUnit: {
            ...listing.rentalUnit,
            property: {
                ...listing.rentalUnit.property,
                createdAt: listing.rentalUnit.property.createdAt.toISOString(),
                updatedAt: listing.rentalUnit.property.updatedAt.toISOString(),
                owner: {
                    ...listing.rentalUnit.property.owner,
                    createdAt: listing.rentalUnit.property.owner.createdAt.toISOString(),
                    updatedAt: listing.rentalUnit.property.owner.updatedAt.toISOString(),
                    emailVerified: listing.rentalUnit.property.owner.emailVerified?.toISOString() || null,
                }
            }
        }
    }));

    return (
        <div className="w-full">
            <ListingModerationTable listings={safeListings} />
        </div>
    );
}
