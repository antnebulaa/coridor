import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getWishlists from "@/app/actions/getWishlists";
import FavoritesClient from "./FavoritesClient";

const FavoritesPage = async () => {
    const wishlists = await getWishlists();
    const currentUser = await getCurrentUser();

    if (wishlists.length === 0) {
        return (
            <ClientOnly>
                <EmptyState
                    title="No wishlists found"
                    subtitle="Create a wishlist by clicking the heart icon on any listing."
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <FavoritesClient
                wishlists={wishlists}
                currentUser={currentUser}
            />
        </ClientOnly>
    );
}

export default FavoritesPage;
