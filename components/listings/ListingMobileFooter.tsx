'use client';

import React from 'react';
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import { useTranslations } from 'next-intl';

interface ListingMobileFooterProps {
    listing: SafeListing;
    onApply: () => void;
    disabled?: boolean;
    isOwner?: boolean;
}

const ListingMobileFooter: React.FC<ListingMobileFooterProps> = ({
    listing,
    onApply,
    disabled,
    isOwner
}) => {
    const t = useTranslations('listing');
    const totalCC = listing.price + (listing.charges ? (listing.charges as any).amount : 0);
    const chargesAmount = listing.charges ? (listing.charges as any).amount : 0;
    const chargesType = (listing as any).chargesType;

    return (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 pb-8 z-60 md:hidden">
            <div className="flex flex-row items-center gap-4">
                <div className="flex flex-col shrink-0">
                    <div className="flex items-baseline gap-1">
                        <span className="font-bold text-lg tabular-nums text-neutral-900 dark:text-neutral-100">
                            {totalCC} €
                        </span>
                        <span className="text-sm text-neutral-400 dark:text-neutral-500">/mois</span>
                    </div>
                    {chargesAmount > 0 && (
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                            dont {chargesAmount} € de {chargesType === 'FORFAIT' ? 'charges (forfait)' : 'prov. charges'}
                        </p>
                    )}
                </div>
                <div className="flex-1">
                    {!isOwner && (
                        <Button
                            label={t('actions.apply')}
                            onClick={onApply}
                            disabled={disabled}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ListingMobileFooter;
