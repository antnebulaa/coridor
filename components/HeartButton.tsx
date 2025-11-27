'use client';

import { useMemo } from "react";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
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
            <AiOutlineHeart
                size={28}
                className="
                    fill-white
                    absolute
                    -top-[2px]
                    -right-[2px]
                "
            />
            <AiFillHeart
                size={24}
                className={hasFavorited ? 'fill-rose-500' : 'fill-neutral-500/70'}
            />
        </div>
    );
}

export default HeartButton;
