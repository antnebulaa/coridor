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
        return (
            <ClientOnly>
                <EmptyState
                    title="Non autorisé"
                    subtitle="Veuillez vous connecter pour accéder à cette page."
                />
            </ClientOnly>
        );
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
        // Ensure other fields match SafeProperty if needed, usually simple spread is enough for non-date fields
    };

    return (
        <ClientOnly>
            <ExpensesClient
                property={safeProperty as any}
                currentUser={currentUser}
                title={listing.title}
                listingId={listing.id}
            />
        </ClientOnly>
    );
};

export default ExpensesPage;
