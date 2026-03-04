import EmptyState from "@/components/EmptyState";
import { redirect } from 'next/navigation';

import getCurrentUser from "@/app/actions/getCurrentUser";
import getWishlists from "@/app/actions/getWishlists";
import FavoritesClient from "./FavoritesClient";

const FavoritesPage = async () => {
    const [wishlists, currentUser] = await Promise.all([
        getWishlists(),
        getCurrentUser(),
    ]);
    if (!currentUser) { redirect('/'); }

    if (wishlists.length === 0) {
        return (
            <EmptyState
                title="Aucune wishlist trouvée"
                subtitle="Créez une wishlist en cliquant sur l'icône marque-page sur une annonce."
            />
        );
    }

    return (
        <FavoritesClient
            wishlists={wishlists}
            currentUser={currentUser}
        />
    );
}

export default FavoritesPage;
