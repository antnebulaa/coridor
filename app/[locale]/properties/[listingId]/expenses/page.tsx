import { redirect } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import prisma from "@/libs/prismadb";
import ExpensesClient from "./ExpensesClient";

interface IParams {
    listingId: string;
}

const ExpensesPage = async ({ params }: { params: Promise<IParams> }) => {
    const { listingId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
    }

    // 1. Resolve Property ID from Listing ID
    // The URL param is matching /properties/[listingId]/expenses
    const listing = await prisma.listing.findUnique({
        where: {
            id: listingId
        },
        include: {
            rentalUnit: true
        }
    });

    if (!listing) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Introuvable"
                    subtitle="L'annonce demandée n'existe pas."
                />
            </ClientOnly>
        );
    }

    const propertyId = listing.rentalUnit.propertyId;

    // 2. Fetch Property with Expenses
    const property = await prisma.property.findUnique({
        where: {
            id: propertyId,
            ownerId: currentUser.id
        },
        include: {
            expenses: {
                orderBy: {
                    dateOccurred: 'desc'
                }
            },
            rentalUnits: true, // For linking units
            owner: true,
            images: true,
            rooms: {
                include: {
                    images: true
                }
            }
        }
    });

    if (!property) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Introuvable"
                    subtitle="Cette propriété n'existe pas ou ne vous appartient pas."
                />
            </ClientOnly>
        );
    }

    const safeProperty = {
        ...property,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt.toISOString(),
        expenses: property.expenses.map((expense) => ({
            ...expense,
            dateOccurred: expense.dateOccurred.toISOString()
        })),
    };

    // Load other properties for the switcher dropdown (all expenses, client filters by year)
    const allListings = await prisma.listing.findMany({
        where: {
            rentalUnit: { property: { ownerId: currentUser.id } },
        },
        select: {
            id: true,
            title: true,
            rentalUnit: {
                select: {
                    property: {
                        select: {
                            id: true,
                            addressLine1: true,
                            address: true,
                            city: true,
                            images: { select: { url: true }, orderBy: { order: 'asc' }, take: 1 },
                            expenses: {
                                select: { amountTotalCents: true, dateOccurred: true }
                            }
                        }
                    }
                }
            }
        }
    });

    const switcherProperties = allListings.map(l => ({
        listingId: l.id,
        title: l.title,
        address: l.rentalUnit.property.addressLine1 || l.rentalUnit.property.address || '',
        city: l.rentalUnit.property.city || '',
        imageUrl: l.rentalUnit.property.images[0]?.url || null,
        expenses: l.rentalUnit.property.expenses.map(e => ({
            amountTotalCents: e.amountTotalCents,
            year: e.dateOccurred.getFullYear(),
        })),
    }));

    return (
        <ClientOnly>
            <ExpensesClient
                property={safeProperty as any}
                currentUser={currentUser}
                title={listing.title}
                listingId={listing.id}
                switcherProperties={switcherProperties}
            />
        </ClientOnly>
    );
};

export default ExpensesPage;
