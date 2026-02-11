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
                    title="Aucune wishlist trouvée"
                    subtitle="Créez une wishlist en cliquant sur l'icône marque-page sur une annonce."
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
