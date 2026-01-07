'use client';

import { SafeUser } from "@/types";
import SaveListingMenu from "./listings/SaveListingMenu";

interface HeartButtonProps {
    listingId: string;
    currentUser?: SafeUser | null;
    listingImage?: string | null;
    variant?: 'icon' | 'button';
}

const HeartButton: React.FC<HeartButtonProps> = ({
    listingId,
    currentUser,
    listingImage,
    variant
}) => {
    return (
        <SaveListingMenu
            listingId={listingId}
            currentUser={currentUser}
            listingImage={listingImage}
            variant={variant}
        />
    );
}

export default HeartButton;
