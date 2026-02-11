
import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from "next/navigation";
import prisma from "@/libs/prismadb";
import AdminListingDetailClient from "./AdminListingDetailClient";

interface IParams {
    listingId: string;
}

export default async function AdminListingDetailPage(
    props: { params: Promise<IParams> }
) {
    const params = await props.params;

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== 'ADMIN') {
        redirect('/');
    }

    const { listingId } = params;

    const listing = await prisma.listing.findUnique({
        where: {
            id: listingId
        },
        include: {
            rentalUnit: {
                include: {
                    property: {
                        include: {
                            owner: true,
                            images: true
                        }
                    },
                    images: true
                }
            }
        }
    });

    if (!listing) {
        return (
            <div className="flex h-screen items-center justify-center">
                Annonce introuvable
            </div>
        );
    }

    // Manual serialization to avoid "Date cannot be passed to client component"
    const safeListing = {
        ...listing,
        createdAt: listing.createdAt.toISOString(),
        updatedAt: listing.updatedAt.toISOString(),
        statusUpdatedAt: listing.statusUpdatedAt.toISOString(),
        availableFrom: listing.availableFrom?.toISOString() || null,
        reviewedAt: listing.reviewedAt?.toISOString() || null,
        rentalUnit: {
            ...listing.rentalUnit,
            images: listing.rentalUnit.images.map((img: any) => ({
                ...img,
                createdAt: img.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: img.updatedAt?.toISOString() || new Date().toISOString()
            })),
            property: {
                ...listing.rentalUnit.property,
                createdAt: listing.rentalUnit.property.createdAt.toISOString(),
                updatedAt: listing.rentalUnit.property.updatedAt.toISOString(),
                images: listing.rentalUnit.property.images.map((img: any) => ({
                    ...img,
                    createdAt: img.createdAt?.toISOString() || new Date().toISOString(),
                    updatedAt: img.updatedAt?.toISOString() || new Date().toISOString()
                })),
                owner: {
                    ...listing.rentalUnit.property.owner,
                    createdAt: listing.rentalUnit.property.owner.createdAt.toISOString(),
                    updatedAt: listing.rentalUnit.property.owner.updatedAt.toISOString(),
                    emailVerified: listing.rentalUnit.property.owner.emailVerified?.toISOString() || null,
                    birthDate: listing.rentalUnit.property.owner.birthDate?.toISOString() || null,
                }
            }
        }
    };

    return <AdminListingDetailClient listing={safeListing} />;
}
