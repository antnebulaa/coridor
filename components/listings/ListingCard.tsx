'use client';

import useCountries from "@/hooks/useCountries";
import { SafeListing, SafeReservation, SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format } from 'date-fns';
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

    return (
        <div
            onClick={() => router.push(`/listings/${data.id}`)}
            className="col-span-1 cursor-pointer group"
        >
            <div className="flex flex-col gap-2 w-full">
                <div
                    className="
            aspect-[4/3]
            w-full
            relative
            overflow-hidden
            rounded-xl
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

                    <div className="flex flex-row items-center gap-1 text-neutral-500 text-sm">
                        {data.roomCount} pièces • {data.roomCount - 1} chambres • {surfaceDisplay}
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
