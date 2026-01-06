'use client';

import { SafeUser } from "@/types";
import SaveListingMenu from "./listings/SaveListingMenu";

interface HeartButtonProps {
    listingId: string;
    currentUser?: SafeUser | null;
    listingImage?: string | null;
}

const HeartButton: React.FC<HeartButtonProps> = ({
    listingId,
    currentUser,
    listingImage
}) => {
    return (
        <SaveListingMenu
            listingId={listingId}
            currentUser={currentUser}
            listingImage={listingImage}
        />
    );
}

export default HeartButton;
