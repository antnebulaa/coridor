'use client';

import useCountries from "@/hooks/useCountries";
import { SafeListing, SafeReservation, SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format } from 'date-fns';
import Image from "next/image";
import HeartButton from "../HeartButton";
import { Button } from "../ui/Button";

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

    return (
        <div
            onClick={() => router.push(`/listings/${data.id}`)}
            className="col-span-1 cursor-pointer group"
        >
            <div className="flex flex-col gap-2 w-full">
                <div
                    className="
            aspect-square
            w-full
            relative
            overflow-hidden
            rounded-xl
          "
                >
                    <Image
                        fill
                        alt="Listing"
                        src={data.images?.[0]?.url || '/images/placeholder.svg'}
                        className="
              object-cover
              h-full
              w-full
              group-hover:scale-110
              transition
            "
                    />
                    {showHeart && (
                        <div className="absolute top-3 right-3">
                            <HeartButton
                                listingId={data.id}
                                currentUser={currentUser}
                            />
                        </div>
                    )}
                </div>
                <div className="font-medium text-lg">
                    {location?.region}, {location?.label}
                </div>
                <div className="font-light text-neutral-500">
                    {reservationDate || data.category}
                </div>
                <div className="flex flex-row items-center gap-1">
                    <div className="font-medium">
                        $ {price}
                    </div>
                    {!reservation && (
                        <div className="font-light">night</div>
                    )}
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
