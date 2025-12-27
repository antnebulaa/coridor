import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import EditPropertyClient from "./EditPropertyClient";

interface IParams {
    listingId?: string;
}

const EditPropertyPage = async ({ params }: { params: Promise<IParams> }) => {
    const listing = await getListingById(await params);
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Unauthorized"
                    subtitle="Please login"
                />
            </ClientOnly>
        );
    }

    if (!listing) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Not found"
                    subtitle="Listing not found"
                />
            </ClientOnly>
        );
    }

    if (listing.user?.id !== currentUser.id) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Unauthorized"
                    subtitle="You do not own this property"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <EditPropertyClient
                listing={listing}
                currentUser={currentUser}
            />
        </ClientOnly>
    );
}

export default EditPropertyPage;
