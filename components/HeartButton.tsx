'use client';

import { SafeUser } from "@/types";
import SaveListingMenu from "./listings/SaveListingMenu";

interface HeartButtonProps {
    listingId: string;
    currentUser?: SafeUser | null;
    listingImage?: string | null;
    variant?: 'icon' | 'button';
    withBorder?: boolean;
    glass?: boolean;
}

const HeartButton: React.FC<HeartButtonProps> = ({
    listingId,
    currentUser,
    listingImage,
    variant,
    withBorder,
    glass
}) => {
    return (
        <SaveListingMenu
            listingId={listingId}
            currentUser={currentUser}
            listingImage={listingImage}
            variant={variant}
            withBorder={withBorder}
            glass={glass}
        />
    );
}

export default HeartButton;
