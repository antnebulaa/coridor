'use client';

import React from 'react';
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";

interface ListingMobileFooterProps {
    listing: SafeListing;
    onApply: () => void;
    disabled?: boolean;
}

const ListingMobileFooter: React.FC<ListingMobileFooterProps> = ({
    listing,
    onApply,
    disabled
}) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-neutral-200 px-4 py-3 pb-8 z-[60] md:hidden">
            <div className="flex flex-row items-center gap-4">
                <div className="flex flex-col shrink-0">
                    <div className="flex flex-row items-center gap-1">
                        <div className="font-semibold text-lg">
                            {listing.price + (listing.charges ? (listing.charges as any).amount : 0)} €
                        </div>
                        <div className="font-light text-neutral-500 text-sm">
                            / mois
                        </div>
                    </div>
                </div>
                <div className="flex-1">
                    <Button
                        label="Candidater"
                        onClick={onApply}
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
};

export default ListingMobileFooter;
