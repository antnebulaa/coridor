'use client';

import useCountries from "@/hooks/useCountries";
import { SafeListing, SafeReservation, SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format } from 'date-fns';
import { LayoutGrid } from 'lucide-react';
import HeartButton from "../HeartButton";
import { Button } from "../ui/Button";
import ListingCardCarousel from "./ListingCardCarousel";

interface ListingCardProps {
    data: SafeListing;
    reservation?: SafeReservation;
    onAction?: (id: string) => void;
    disabled?: boolean;
    actionLabel?: string;
    actionId?: string;
    currentUser?: SafeUser | null;
    secondaryAction?: () => void;
    secondaryActionLabel?: string;
    tertiaryAction?: () => void;
    tertiaryActionLabel?: string;
    showHeart?: boolean;
    onSelect?: () => void;
    variant?: 'vertical' | 'horizontal';
}

const ListingCard: React.FC<ListingCardProps> = ({
    data,
    reservation,
    onAction,
    disabled,
    actionLabel,
    actionId = "",
    currentUser,
    secondaryAction,
    secondaryActionLabel,
    tertiaryAction,
    tertiaryActionLabel,
    showHeart = true,
    onSelect,
    variant = 'vertical'
}) => {
    const router = useRouter();
    const { getByValue } = useCountries();

    const location = getByValue(data.locationValue);

    const handleCancel = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();

            if (disabled) {
                return;
            }

            onAction?.(actionId);
        },
        [onAction, actionId, disabled]
    );

    const price = useMemo(() => {
        if (reservation) {
            return reservation.totalPrice;
        }

        return data.price;
    }, [reservation, data.price]);

    const reservationDate = useMemo(() => {
        if (!reservation) {
            return null;
        }

        const start = new Date(reservation.startDate);
        const end = new Date(reservation.endDate);

        return `${format(start, 'PP')} - ${format(end, 'PP')}`;
    }, [reservation]);

    const isNew = useMemo(() => {
        const created = new Date(data.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }, [data.createdAt]);

    const surfaceDisplay = useMemo(() => {
        if (!data.surface) return null;

        if (currentUser?.measurementSystem === 'imperial') {
            return `${Math.round(data.surface * 10.764)} sq ft`;
        }

        return `${data.surface} m²`;
    }, [data.surface, currentUser?.measurementSystem]);

    const handleClick = useCallback(() => {
        if (onSelect) {
            onSelect();
        } else {
            router.push(`/listings/${data.id}`);
        }
    }, [onSelect, router, data.id]);

    if (variant === 'horizontal') {
        return (
            <div
                onClick={handleClick}
                className="col-span-1 cursor-pointer group w-full"
            >
                <div className="flex flex-col md:flex-row gap-1.5 md:gap-4 w-full h-auto md:h-[200px] bg-white rounded-[20px] p-2 hover:bg-neutral-50 transition border border-transparent hover:border-neutral-200">
                    {/* Image Section - Stacked on Mobile, Side by Side on Desktop */}
                    <div className="
                        w-full h-[200px]
                        md:w-[260px] md:min-w-[260px] md:h-full
                        relative 
                        overflow-hidden 
                        rounded-[16px]
                        shrink-0
                    ">
                        <div className="h-full w-full relative">
                            <ListingCardCarousel images={data.images} />
                        </div>

                        {isNew && (
                            <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded-[8px] text-[10px] font-bold shadow-sm z-10 uppercase tracking-wide">
                                Nouveau
                            </div>
                        )}
                        {showHeart && (
                            <div className="absolute top-3 right-3">
                                <HeartButton
                                    listingId={data.id}
                                    currentUser={currentUser}
                                />
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col justify-between py-1 md:py-2 flex-1 pr-1 md:pr-2">
                        <div className="flex flex-col gap-0.5 md:gap-1">
                            {/* Title / Location */}
                            {/* Title / Location */}
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-1">
                                    <div className="font-semibold text-base md:text-lg text-neutral-900 line-clamp-1">
                                        {data.category}
                                    </div>
                                    <div className="hidden md:block font-medium text-neutral-500 text-sm md:text-base line-clamp-2">
                                        {data.city || location?.label}{data.district ? `, ${data.district}` : ''}
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end whitespace-nowrap pl-1">
                                    <div className="font-semibold text-lg md:text-[22px] text-neutral-900 leading-tight">
                                        {price}€<span className="md:hidden text-neutral-500 font-semibold"> CC</span>
                                    </div>
                                    <div className="hidden md:block text-neutral-500 text-xs font-normal">
                                        charges comprises
                                    </div>
                                </div>
                            </div>

                            {/* Mobile City Display - Full Width */}
                            <div className="md:hidden font-medium text-neutral-500 text-sm line-clamp-1 -mt-0.5">
                                {data.city || location?.label}{data.district ? `, ${data.district}` : ''}
                            </div>

                            {data.neighborhood && (
                                <div className="text-neutral-500 text-xs md:text-sm flex items-center gap-1 -mt-0.5 md:-mt-1">
                                    <LayoutGrid size={14} className="w-3 h-3 md:w-[14px] md:h-[14px]" />
                                    <span className="line-clamp-1">Quartier {data.neighborhood}</span>
                                </div>
                            )}

                            {/* Details Row */}
                            <div className="flex flex-row items-center gap-2 md:gap-3 text-xs md:text-sm text-neutral-600 mt-1 md:mt-2">
                                <div className="flex items-center gap-1 bg-neutral-100 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                                    <span className="font-medium text-black">{data.roomCount}</span> {data.roomCount > 1 ? 'pièces' : 'pièce'}
                                </div>
                                <div className="flex items-center gap-1 bg-neutral-100 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md hidden sm:flex">
                                    <span className="font-medium text-black">{data.roomCount - 1}</span> {(data.roomCount - 1) > 1 ? 'chambres' : 'chambre'}
                                </div>
                                {/* Mobile-only compact bedroom count if space is tight? Or just hide/show based on width. 
                                    Let's keep it simple for now, maybe hide 'chambres' text on very small screens if needed.
                                    For now, I'll keep it as is but with tighter padding above.
                                */}
                                <div className="flex items-center gap-1 bg-neutral-100 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md sm:hidden">
                                    <span className="font-medium text-black">{data.roomCount - 1}</span> ch.
                                </div>

                                {surfaceDisplay && (
                                    <div className="flex items-center gap-1 bg-neutral-100 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                                        <span className="font-medium text-black">{surfaceDisplay}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Actions or Status (Optional) */}
                        <div className="flex gap-2 mt-auto">
                            {onAction && actionLabel && (
                                <Button
                                    disabled={disabled}
                                    small
                                    label={actionLabel}
                                    onClick={handleCancel}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Vertical Card
    return (
        <div
            onClick={handleClick}
            className="col-span-1 cursor-pointer group"
        >
            <div className="flex flex-col gap-2 w-full">
                <div
                    className="
            aspect-4/3
            w-full
            relative
            overflow-hidden
            rounded-[20px]
          "
                >

                    <ListingCardCarousel images={data.images} />
                    {isNew && (
                        <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm z-10">
                            Nouvelle annonce
                        </div>
                    )}
                    {showHeart && (
                        <div className="absolute top-3 right-3">
                            <HeartButton
                                listingId={data.id}
                                currentUser={currentUser}
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1 mt-2">
                    <div className="font-semibold text-xl">
                        {price}€ <span className="text-neutral-500 font-normal text-base">par mois CC</span>
                    </div>

                    <div className="font-medium text-neutral-800">
                        {data.category} à {data.city || location?.label}{data.district ? ` ${data.district}` : ''}
                    </div>
                    {data.neighborhood && (
                        <div className="text-neutral-500 text-sm flex items-center gap-1">
                            <LayoutGrid size={14} />
                            <span>Quartier {data.neighborhood}</span>
                        </div>
                    )}

                    <div className="flex flex-row items-center gap-1 text-neutral-500 text-sm">
                        {data.roomCount} {data.roomCount > 1 ? 'pièces' : 'pièce'} • {data.roomCount - 1} {(data.roomCount - 1) > 1 ? 'chambres' : 'chambre'} • {surfaceDisplay}
                    </div>


                </div>

                {onAction && actionLabel && (
                    <Button
                        disabled={disabled}
                        small
                        label={actionLabel}
                        onClick={handleCancel}
                    />
                )}
                {secondaryAction && secondaryActionLabel && (
                    <Button
                        disabled={disabled}
                        small
                        label={secondaryActionLabel}
                        onClick={(e) => {
                            e.stopPropagation();
                            secondaryAction();
                        }}
                        variant="outline"
                    />
                )}
                {tertiaryAction && tertiaryActionLabel && (
                    <Button
                        disabled={disabled}
                        small
                        label={tertiaryActionLabel}
                        onClick={(e) => {
                            e.stopPropagation();
                            tertiaryAction();
                        }}
                        variant="outline"
                    />
                )}
            </div>
        </div>
    );
};

export default ListingCard;
