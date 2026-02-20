import EmptyState from "@/components/EmptyState";
import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { redirect } from 'next/navigation';
import getWishlistById from "@/app/actions/getWishlistById";
import WishlistClient from "./WishlistClient";

interface IParams {
    wishlistId?: string;
}

const WishlistPage = async (props: { params: Promise<IParams> }) => {
    const params = await props.params;
    const wishlist = await getWishlistById(params);
    const currentUser = await getCurrentUser();
    if (!currentUser) { redirect('/'); }

    if (!wishlist) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Wishlist not found"
                    subtitle="Something went wrong."
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <WishlistClient
                wishlist={wishlist}
                currentUser={currentUser}
            />
        </ClientOnly>
    );
}

export default WishlistPage;
