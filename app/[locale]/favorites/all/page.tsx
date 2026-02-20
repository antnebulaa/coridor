import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import getAllFavorites from "@/app/actions/getAllFavorites";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from 'next/navigation';
import WishlistClient from "../[wishlistId]/WishlistClient";

const AllFavoritesPage = async () => {
    const listings = await getAllFavorites();
    const currentUser = await getCurrentUser();
    if (!currentUser) { redirect('/'); }

    if (listings.length === 0) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Aucun favori"
                    subtitle="Vous n'avez enregistré aucune annonce."
                />
            </ClientOnly>
        )
    }

    return (
        <ClientOnly>
            <WishlistClient
                wishlist={{ name: "Tous les favoris", listings: listings }}
                currentUser={currentUser}
            />
        </ClientOnly>
    );
}

export default AllFavoritesPage;
