'use client';

import useCountries from "@/hooks/useCountries";
import { SafeListing, SafeReservation, SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { format } from 'date-fns';
import { LayoutGrid, Bus, Train, TramFront, Wifi, Bike } from 'lucide-react';
import { TbElevator } from 'react-icons/tb';
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

    const location = getByValue((data as any).locationValue);

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

        const chargesAmount = data.charges ? (data.charges as any).amount : 0;
        return data.price + chargesAmount;
    }, [reservation, data.price, data.charges]);

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
                className="col-span-1 cursor-pointer group w-full listing-card-container"
            >
                <div className="flex flex-col md:flex-row gap-1.5 md:gap-4 w-full h-auto md:h-[200px] bg-card rounded-xl p-0 md:p-2 hover:bg-secondary transition">
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
                            <div className="absolute top-3 left-3 bg-card px-2 py-1 rounded-[8px] text-[10px] font-bold shadow-sm z-10 uppercase tracking-wide text-card-foreground">
                                Nouveau
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col justify-between py-1 md:py-2 flex-1 pr-1 md:pr-2">
                        <div className="flex flex-col gap-0 md:gap-1">
                            {/* Price / Heart / Title / Location */}
                            <div className="flex flex-col gap-1">
                                <div className="flex flex-row justify-between items-start w-full">
                                    <div className="flex flex-col items-start whitespace-nowrap">
                                        <div className="font-semibold text-[26px] md:text-[22px] text-foreground leading-tight">
                                            {price}€<span className="text-muted-foreground font-semibold"> CC</span>
                                        </div>
                                    </div>
                                    {showHeart && (
                                        <div className="-mr-1">
                                            <HeartButton
                                                listingId={data.id}
                                                currentUser={currentUser}
                                                listingImage={data.images?.[0]?.url}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-base text-foreground line-clamp-1">
                                        {data.rentalUnit?.type === 'PRIVATE_ROOM'
                                            ? 'Colocation'
                                            : data.category}
                                        {data.rentalUnit?.type !== 'PRIVATE_ROOM' && data.propertyAdjective && <span className="lowercase"> {data.propertyAdjective}</span>}
                                    </div>
                                    <div className="hidden md:block font-medium text-muted-foreground text-sm line-clamp-2">
                                        {data.city || (location?.label?.split(',')[0])}{data.district ? ` ${data.district}` : ''}
                                        {data.neighborhood && (
                                            <span className="font-normal text-xs md:text-sm text-neutral-500">
                                                , {data.neighborhood.toLowerCase().startsWith('quartier') ? data.neighborhood : `Quartier ${data.neighborhood}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile City Display - Visible only on mobile */}
                            <div className="md:hidden font-medium text-neutral-500 text-sm line-clamp-1 -mt-1">
                                {data.city || (location?.label?.split(',')[0])}{data.district ? ` ${data.district}` : ''}
                                {data.neighborhood && (
                                    <span className="font-normal text-xs text-neutral-500">
                                        , {data.neighborhood.toLowerCase().startsWith('quartier') ? data.neighborhood : `Quartier ${data.neighborhood}`}
                                    </span>
                                )}
                            </div>

                            {data.transitData?.mainConnection ? (
                                <div className="text-neutral-700 dark:text-neutral-300 text-sm flex items-center gap-2 -mt-0.5 md:-mt-1 py-[5px]">
                                    <div className="flex items-center gap-1">
                                        {/* Dynamic Transport Icon */}
                                        {(() => {
                                            const type = (data.transitData.mainConnection.type || "").toLowerCase();
                                            if (type.includes('bus')) return <Bus size={20} className="text-neutral-700 dark:text-neutral-300" />;
                                            if (type.includes('train') || type.includes('rail')) return <Train size={20} className="text-neutral-700 dark:text-neutral-300" />;
                                            if (type.includes('tram')) return (
                                                <div className="w-5 h-5 rounded-full border border-neutral-700 dark:border-neutral-300 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">T</span>
                                                </div>
                                            );
                                            // Default to Metro
                                            return (
                                                <div className="w-5 h-5 rounded-full border border-neutral-700 dark:border-neutral-300 flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">M</span>
                                                </div>
                                            );
                                        })()}

                                        {/* Line Badge */}
                                        <div
                                            className="h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center"
                                            style={{
                                                backgroundColor: data.transitData.mainConnection.color || '#000',
                                                color: data.transitData.mainConnection.textColor || '#FFF'
                                            }}
                                        >
                                            <span className="text-xs font-bold leading-none pt-px">
                                                {data.transitData.mainConnection.line}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="line-clamp-1">à {data.transitData.mainConnection.walkTime} min</span>
                                </div>
                            ) : data.neighborhood && (
                                <div className="h-4 md:h-[14px]" />
                            )}

                            {/* Details Row */}
                            <div className="flex flex-row items-center gap-2 md:gap-3 text-base text-muted-foreground mt-1 md:mt-2">
                                {data.rentalUnit?.type === 'PRIVATE_ROOM' ? (
                                    <div className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                                        <span className="font-medium text-foreground">1 chambre</span>
                                    </div>
                                ) : data.roomCount === 1 ? (
                                    <div className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                                        <span className="font-medium text-foreground">Studio</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                                            <span className="font-medium text-foreground">{data.roomCount || 0}</span> {(data.roomCount || 0) > 1 ? 'pièces' : 'pièce'}
                                        </div>
                                        <div className="items-center gap-1 bg-secondary px-1.5 py-0.5 md:px-2 md:py-1 rounded-md hidden sm:flex">
                                            <span className="font-medium text-foreground">{Math.max(0, (data.roomCount || 0) - 1)}</span> {Math.max(0, (data.roomCount || 0) - 1) > 1 ? 'chambres' : 'chambre'}
                                        </div>
                                        <div className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 md:px-2 md:py-1 rounded-md sm:hidden">
                                            <span className="font-medium text-foreground">{Math.max(0, (data.roomCount || 0) - 1)}</span> ch.
                                        </div>
                                    </>
                                )}

                                {surfaceDisplay && (
                                    <div className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                                        <span className="font-medium text-foreground">{surfaceDisplay}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-1 bg-[#FFFE3C] px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                                    <span className="font-medium text-[#282828]">{data.isFurnished ? 'Meublé' : 'Vide'}</span>
                                </div>
                                {data.hasElevator && (
                                    <div className="flex items-center justify-center bg-blue-600 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-white" title="Ascenseur">
                                        <TbElevator size={18} />
                                        <span className="invisible w-0 overflow-hidden font-medium">A</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {(data.hasFiber || data.hasBikeRoom) && (
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-neutral-600 dark:text-neutral-400">
                                {data.hasFiber && (
                                    <div className="flex items-center gap-1.5">
                                        <Wifi size={14} />
                                        <span className="text-sm font-medium">Fibre</span>
                                    </div>
                                )}
                                {data.hasBikeRoom && (
                                    <div className="flex items-center gap-1.5">
                                        <Bike size={14} />
                                        <span className="text-sm font-medium">Local vélo</span>
                                    </div>
                                )}
                            </div>
                        )}
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
            </div>

        );
    }

    // Default Vertical Card
    return (
        <div
            onClick={handleClick}
            className="col-span-1 cursor-pointer group listing-card-container"
        >
            <div className="flex flex-col gap-2 w-full">
                <div
                    className="
            aspect-4/3
            w-full
            relative
            overflow-hidden
            rounded-xl
          "
                >

                    <ListingCardCarousel images={data.images} />
                    {isNew && (
                        <div className="absolute top-3 left-3 bg-card px-3 py-1 rounded-full text-xs font-semibold shadow-sm z-10 text-card-foreground">
                            Nouvelle annonce
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1 mt-2">
                    <div className="flex flex-row justify-between items-start">
                        <div className="font-semibold text-[26px]">
                            {price}€ <span className="text-muted-foreground font-normal text-base">par mois CC</span>
                        </div>
                        {showHeart && (
                            <div className="-mr-2">
                                <HeartButton
                                    listingId={data.id}
                                    currentUser={currentUser}
                                    listingImage={data.images?.[0]?.url}
                                />
                            </div>
                        )}
                    </div>

                    <div className="font-medium text-foreground">
                        {data.rentalUnit?.type === 'PRIVATE_ROOM'
                            ? 'Colocation'
                            : data.category}
                        {data.rentalUnit?.type !== 'PRIVATE_ROOM' && data.propertyAdjective && <span className="lowercase"> {data.propertyAdjective}</span>}
                        {' '}à {data.city || (location?.label?.split(',')[0])}{data.district ? ` ${data.district}` : ''}
                        {data.neighborhood && (
                            <span className="font-normal text-base text-muted-foreground ml-1">
                                {data.neighborhood.toLowerCase().startsWith('quartier') ? data.neighborhood : `Quartier ${data.neighborhood}`}
                            </span>
                        )}
                    </div>
                    {data.transitData?.mainConnection ? (
                        <div className="text-neutral-700 dark:text-neutral-300 text-base flex items-center gap-2 py-[5px]">
                            <div className="flex items-center gap-1">
                                {/* Dynamic Transport Icon */}
                                {(() => {
                                    const type = (data.transitData.mainConnection.type || "").toLowerCase();
                                    if (type.includes('bus')) return <Bus size={20} className="text-neutral-700 dark:text-neutral-300" />;
                                    if (type.includes('train') || type.includes('rail')) return <Train size={20} className="text-neutral-700 dark:text-neutral-300" />;
                                    if (type.includes('tram')) return (
                                        <div className="w-5 h-5 rounded-full border border-neutral-700 dark:border-neutral-300 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">T</span>
                                        </div>
                                    );
                                    // Default to Metro
                                    return (
                                        <div className="w-5 h-5 rounded-full border border-neutral-700 dark:border-neutral-300 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">M</span>
                                        </div>
                                    );
                                })()}
                                {/* Line Badge */}
                                <div
                                    className="h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center"
                                    style={{
                                        backgroundColor: data.transitData.mainConnection.color || '#000',
                                        color: data.transitData.mainConnection.textColor || '#FFF'
                                    }}
                                >
                                    <span className="text-xs font-bold leading-none pt-px">
                                        {data.transitData.mainConnection.line}
                                    </span>
                                </div>
                            </div>
                            <span>à {data.transitData.mainConnection.walkTime} min</span>
                        </div>
                    ) : (
                        <div className="h-5" />
                    )}

                    < div className="flex flex-row items-center gap-1 text-muted-foreground text-[18px]">
                        {data.rentalUnit?.type === 'PRIVATE_ROOM'
                            ? `Colocation • ${surfaceDisplay}`
                            : data.roomCount === 1
                                ? `Studio • ${surfaceDisplay}`
                                : `${data.roomCount || 0} ${(data.roomCount || 0) > 1 ? 'pièces' : 'pièce'} • ${Math.max(0, (data.roomCount || 0) - 1)} ${Math.max(0, (data.roomCount || 0) - 1) > 1 ? 'chambres' : 'chambre'} • ${surfaceDisplay}`
                        }
                        <div className="flex items-center gap-1 bg-[#FFFE3C] px-1.5 py-0.5 md:px-2 md:py-1 rounded-md ml-2">
                            <span className="font-medium text-[#282828] text-xs md:text-sm">{data.isFurnished ? 'Meublé' : 'Vide'}</span>
                        </div>
                        {data.hasElevator && (
                            <div className="flex items-center justify-center bg-blue-600 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-white ml-2" title="Ascenseur">
                                <TbElevator size={18} />
                                <span className="invisible w-0 overflow-hidden font-medium">A</span>
                            </div>
                        )}
                    </div>
                </div>
                {(data.hasFiber || data.hasBikeRoom) && (
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-neutral-600 dark:text-neutral-400">
                        {data.hasFiber && (
                            <div className="flex items-center gap-1.5">
                                <Wifi size={14} />
                                <span className="text-sm font-medium">Fibre</span>
                            </div>
                        )}
                        {data.hasBikeRoom && (
                            <div className="flex items-center gap-1.5">
                                <Bike size={14} />
                                <span className="text-sm font-medium">Local vélo</span>
                            </div>
                        )}
                    </div>
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


    );
};

export default ListingCard;
