'use client';

import { useMemo } from "react";
import { Bookmark } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import { SafeUser } from "@/types";
import useWishlistModal from "@/hooks/useWishlistModal";
import useLoginModal from "@/hooks/useLoginModal";

interface HeartButtonProps {
    listingId: string;
    currentUser?: SafeUser | null;
}

const HeartButton: React.FC<HeartButtonProps> = ({
    listingId,
    currentUser
}) => {
    const loginModal = useLoginModal();
    const wishlistModal = useWishlistModal();
    const router = useRouter();

    const toggleFavorite = async (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        if (!currentUser) {
            return loginModal.onOpen();
        }

        if (hasFavorited) {
            const wishlistsContainingListing = currentUser.wishlists?.filter(wishlist =>
                wishlist.listings.some(l => l.id === listingId)
            ) || [];

            try {
                await Promise.all(wishlistsContainingListing.map(wishlist =>
                    axios.delete(`/api/wishlists/${wishlist.id}`, {
                        data: { listingId }
                    }).then(() => {
                        toast.success(`Deleted from ${wishlist.name}`);
                    })
                ));
                router.refresh();
            } catch (error) {
                toast.error('Something went wrong');
            }
        } else {
            wishlistModal.onOpen(listingId);
        }
    };

    const hasFavorited = useMemo(() => {
        const list = currentUser?.wishlists || [];
        return list.some(wishlist =>
            wishlist.listings.some(listing => listing.id === listingId)
        );
    }, [currentUser, listingId]);

    return (
        <div
            onClick={toggleFavorite}
            className="
                relative
                hover:opacity-80
                transition
                cursor-pointer
            "
        >
            <Bookmark
                size={28}
                className={`
                    ${hasFavorited ? 'fill-primary text-primary' : 'fill-black/50 text-white'}
                `}
                strokeWidth={hasFavorited ? 0 : 2}
            />
        </div>
    );
}

export default HeartButton;
