import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import getReservations from "@/app/actions/getReservations";

import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";

import ListingClient from "./ListingClient";

export const dynamic = 'force-dynamic';

interface IParams {
    listingId?: string;
}

const ListingPage = async ({ params }: { params: Promise<IParams> }) => {
    const { listingId } = await params;
    const listing = await getListingById({ listingId });
    const reservations = await getReservations({ listingId });
    const currentUser = await getCurrentUser();

    if (!listing) {
        return (
            <ClientOnly>
                <EmptyState />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <ListingClient
                listing={listing}
                reservations={reservations}
                currentUser={currentUser}
            />
        </ClientOnly>
    );
}

export default ListingPage;
