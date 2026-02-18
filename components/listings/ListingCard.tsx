'use client';

import useCountries from "@/hooks/useCountries";
import { SafeListing, SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { format } from 'date-fns';
import { LayoutGrid, Bus, Train, TramFront, Wifi, Bike, BusFront } from 'lucide-react';
import { TbElevator } from 'react-icons/tb';
import HeartButton from "../HeartButton";
import { Button } from "../ui/Button";
import LikeButton from "../LikeButton";
import ListingCardCarousel from "./ListingCardCarousel";
import { useTranslations } from 'next-intl';



interface ListingCardProps {
    data: SafeListing;
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
    hasLiked?: boolean;
}

const FeatureTag = ({
    children,
    variant = 'default',
    title
}: {
    children: React.ReactNode;
    variant?: 'default' | 'yellow' | 'blue';
    title?: string;
}) => {
    const baseStyles = "flex items-center justify-center gap-1  py-2 rounded-[12px] px-3 md:px-3.5 h-8 leading-none text-sm border border-neutral-100";
    const variants = {
        default: "bg-secondary text-foreground",
        yellow: "bg-[#FFFE3C] text-[#282828]",
        blue: "bg-blue-600 text-white"
    };

    return (
        <div className={`${baseStyles} ${variants[variant]}`} title={title}>
            {children}
        </div>
    );
};

const ListingCard: React.FC<ListingCardProps> = ({
    data,
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
    variant = 'vertical',
    hasLiked
}) => {
    const router = useRouter();
    const { getByValue } = useCountries();
    const t = useTranslations('listing');

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
        const chargesAmount = data.charges ? (data.charges as any).amount : 0;
        return data.price + chargesAmount;
    }, [data.price, data.charges]);

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

    const floorDisplay = useMemo(() => {
        if (data.floor === 0) return t('groundFloor');
        if (data.floor) {
            const floorText = data.totalFloors
                ? t('floorTotal', { floor: data.floor, total: data.totalFloors })
                : t('floor', { floor: data.floor });
            const elevatorText = data.hasElevator ? t('elevator') : t('noElevator');

            return (
                <span className="flex items-center gap-1.5">
                    {floorText}
                    <span className="text-[8px] text-neutral-400">●</span>
                    {elevatorText}
                    {data.isAccessible && (
                        <>
                            <span className="text-[8px] text-neutral-400">●</span>
                            {t('accessible')}
                        </>
                    )}
                </span>
            );
        }
        return null;
    }, [data.floor, data.totalFloors, data.hasElevator, data.isAccessible]);

    const dragStart = useRef({ x: 0, y: 0 });
    const isDrag = useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        dragStart.current = { x: e.clientX, y: e.clientY };
        isDrag.current = false;
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const dist = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
        if (dist > 5) {
            isDrag.current = true;
        }
    };

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (isDrag.current) {
            e.stopPropagation();
            return;
        }

        if (onSelect) {
            onSelect();
        } else {
            router.push(`/listings/${data.id}`);
        }
    }, [onSelect, router, data.id]);



    if (variant === 'horizontal') {
        return (
            <div
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onClick={handleClick}
                className="col-span-1 cursor-pointer group w-full listing-card-container"
            >
                <div className="flex flex-col md:flex-row gap-1.5 md:gap-4 lg:gap-3 w-full h-auto md:h-[180px] bg-card rounded-xl md:p-2 hover:bg-secondary transition">
                    {/* Image Section - Stacked on Mobile, Side by Side on Tablet, Stacked on Desktop */}
                    <div className="
                        w-full h-[200px]
                        md:w-[240px] md:min-w-[240px] md:h-full
                        relative 
                        overflow-hidden 
                        rounded-[16px]
                        shrink-0
                    ">
                        <div className="h-full w-full relative">
                            <ListingCardCarousel images={data.images} />
                        </div>

                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
                            {isNew && (
                                <div className="bg-card px-2 py-2 rounded-[12px] text-[10px] font-medium shadow-sm uppercase tracking-wide text-card-foreground">
                                    {t('new')}
                                </div>
                            )}
                            {data.rentalUnit?.type === 'PRIVATE_ROOM' && (
                                <div className="bg-[#fbea00] px-2 py-2 rounded-[12px] text-[10px] font-medium drop-shadow-sm uppercase tracking-wide text-black">
                                    {t('shared')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col justify-between py-1 md:py-2 flex-1 pr-1 md:pr-2">
                        <div className="flex flex-col gap-0 md:gap-0">
                            {/* Price / Heart / Title / Location */}
                            <div className="flex flex-col gap-0">
                                <div className="flex flex-row justify-between items-start w-full">
                                    <div className="flex flex-col items-start whitespace-nowrap">
                                        <div className="font-medium text-[26px] md:text-[22px] text-[#1b1b1b] leading-tight">
                                            {price}€<span className="text-neutral-400 font-normal text-sm ml-1">{t('monthChargesIncluded')}</span>
                                        </div>
                                    </div>
                                    {showHeart && (
                                        <div className="ml-auto shrink-0 -mr-1 md:-mr-2 flex items-center gap-2">
                                            <LikeButton
                                                listingId={data.id}
                                                currentUser={currentUser}
                                                hasLiked={hasLiked}
                                            />
                                            <HeartButton
                                                listingId={data.id}
                                                currentUser={currentUser}
                                                listingImage={data.images?.[0]?.url}
                                                variant="button"
                                                withBorder
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 mt-1 md:-mt-1">
                                    <div className="font-medium text-base  text-neutral-600  line-clamp-1">
                                        {data.rentalUnit?.type === 'PRIVATE_ROOM'
                                            ? t('privateRoom')
                                            : data.category}
                                        {data.rentalUnit?.type !== 'PRIVATE_ROOM' && data.propertyAdjective && <span className="lowercase"> {data.propertyAdjective}</span>}
                                    </div>
                                    <div className="hidden md:block font-normal text-neutral-500 text-sm line-clamp-2">
                                        {data.city || (location?.label?.split(',')[0])}{data.district ? ` ${data.district}` : ''}
                                        {data.neighborhood && (
                                            <span className="font-normal text-xs md:text-sm text-neutral-500">
                                                , {data.neighborhood.toLowerCase().startsWith('quartier') ? data.neighborhood : `${t('neighborhood')} ${data.neighborhood}`}
                                            </span>
                                        )}
                                    </div>
                                    {floorDisplay && (
                                        <div className="hidden md:block font-normal text-muted-foreground text-sm">
                                            {floorDisplay}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile City Display - Visible only on mobile */}
                            <div className="md:hidden font-normal text-neutral-500 text-sm line-clamp-1 mt-0">
                                {data.city || (location?.label?.split(',')[0])}{data.district ? ` ${data.district}` : ''}
                                {data.neighborhood && (
                                    <span className="font-normal text-sm text-neutral-500">
                                        , {data.neighborhood.toLowerCase().startsWith('quartier') ? data.neighborhood : `${t('neighborhood')} ${data.neighborhood}`}
                                    </span>
                                )}
                            </div>
                            {floorDisplay && (
                                <div className="md:hidden font-normal text-neutral-700 text-sm mt-0.5">
                                    {floorDisplay}
                                </div>
                            )}

                            <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3 text-base text-muted-foreground mt-[7px] md:mt-2 mb-[5px] md:mb-0.5">
                                {data.rentalUnit?.type === 'PRIVATE_ROOM' ? (
                                    <FeatureTag>
                                        <span className="font-medium">1 ch</span>
                                    </FeatureTag>
                                ) : data.roomCount === 1 ? (
                                    <FeatureTag>
                                        <span className="font-medium">{t('studio')}</span>
                                    </FeatureTag>
                                ) : data.roomCount && data.roomCount > 1 ? (
                                    <>
                                        <FeatureTag>
                                            <span className="font-medium">{data.roomCount} {data.roomCount === 1 ? 'pièce' : 'pièces'}</span>
                                        </FeatureTag>
                                        <FeatureTag>
                                            <span className="font-medium">{Math.max(0, data.roomCount - 1)} {Math.max(0, data.roomCount - 1) <= 1 ? 'ch' : 'ch'}</span>
                                        </FeatureTag>
                                    </>
                                ) : null}

                                {surfaceDisplay && (
                                    <FeatureTag>
                                        <span className="font-medium">{surfaceDisplay}</span>
                                    </FeatureTag>
                                )}

                                <FeatureTag>
                                    <span className="font-medium">{data.isFurnished || data.rentalUnit?.type === 'PRIVATE_ROOM' ? t('furnished') : t('unfurnished')}</span>
                                </FeatureTag>

                                {data.transitData?.mainConnection && (
                                    <div className="flex items-center justify-center gap-1.5 rounded-[12px] px-2 h-8 leading-none text-sm bg-white border border-neutral-200 text-neutral-700">
                                        <div className="flex items-center gap-1">
                                            {(() => {
                                                const type = (data.transitData.mainConnection.type || "").toLowerCase();
                                                if (type.includes('bus')) return <BusFront size={16} className="text-neutral-700" />;
                                                if (type.includes('train') || type.includes('rail')) return <Train size={16} className="text-neutral-700" />;
                                                if (type.includes('tram')) return (
                                                    <div className="w-4 h-4 rounded-full border border-neutral-700 flex items-center justify-center">
                                                        <span className="text-[8px] font-bold text-neutral-700">T</span>
                                                    </div>
                                                );
                                                return (
                                                    <div className="w-4 h-4 rounded-full border border-neutral-700 flex items-center justify-center">
                                                        <span className="text-[8px] font-bold text-neutral-700 items-center">M</span>
                                                    </div>
                                                );
                                            })()}

                                            <div
                                                className="h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center"
                                                style={{
                                                    backgroundColor: data.transitData.mainConnection.color || '#000',
                                                    color: data.transitData.mainConnection.textColor || '#FFF'
                                                }}
                                            >
                                                <span className="text-[10px] font-bold leading-none pt-px">
                                                    {data.transitData.mainConnection.line}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="font-medium">{data.transitData.mainConnection.walkTime} min</span>
                                    </div>
                                )}
                            </div>
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
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
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
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 items-start">
                        {isNew && (
                            <div className="bg-card px-3 py-1 rounded-full text-xs font-semibold shadow-sm text-card-foreground">
                                {t('newListing')}
                            </div>
                        )}
                        {data.rentalUnit?.type === 'PRIVATE_ROOM' && (
                            <div className="bg-[#002FA7] px-3 py-1 rounded-full text-xs font-semibold shadow-sm text-white uppercase tracking-wide">
                                {t('shared')}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-0 mt-2">
                    <div className="flex flex-row justify-between items-start w-full">
                        <div className="font-medium text-[26px] text-[#2B2DFF] leading-none">
                            {price}€<span className="text-muted-foreground font-normal text-sm ml-1">{t('monthChargesIncluded')}</span>
                        </div>
                        {showHeart && (
                            <div className="ml-auto shrink-0 -mr-1 flex items-center gap-2">
                                <LikeButton
                                    listingId={data.id}
                                    currentUser={currentUser}
                                    hasLiked={hasLiked}
                                />
                                <HeartButton
                                    listingId={data.id}
                                    currentUser={currentUser}
                                    listingImage={data.images?.[0]?.url}
                                    variant="button"
                                    withBorder
                                />
                            </div>
                        )}
                    </div>

                    <div className="font-normal text-foreground mt-1">
                        {data.rentalUnit?.type === 'PRIVATE_ROOM'
                            ? t('privateRoom')
                            : data.category}
                        {data.rentalUnit?.type !== 'PRIVATE_ROOM' && data.propertyAdjective && <span className="lowercase"> {data.propertyAdjective}</span>}
                        {` ${t('at')} `}{data.city || (location?.label?.split(',')[0])}{data.district ? ` ${data.district}` : ''}
                        {data.neighborhood && (
                            <span className="font-normal text-sm md:text-base text-muted-foreground ml-1">
                                {data.neighborhood.toLowerCase().startsWith('quartier') ? data.neighborhood : `${t('neighborhood')} ${data.neighborhood}`}
                            </span>
                        )}
                    </div>
                    {floorDisplay && (
                        <div className="font-normal text-muted-foreground text-sm md:text-base">
                            {floorDisplay}
                        </div>
                    )}
                    <div className="flex flex-row items-center gap-1 text-muted-foreground text-[18px] mb-1">
                        {data.rentalUnit?.type === 'PRIVATE_ROOM'
                            ? `${t('shared')} • ${surfaceDisplay}`
                            : data.roomCount === 1
                                ? `${t('studio')} • ${surfaceDisplay}`
                                : data.roomCount && data.roomCount > 1
                                    ? `${data.roomCount} ${data.roomCount === 1 ? 'pièce' : 'pièces'} • ${Math.max(0, data.roomCount - 1)} ch • ${surfaceDisplay}`
                                    : surfaceDisplay || ''
                        }
                        <div className="ml-2">
                            <FeatureTag>
                                <span className="font-medium text-xs md:text-sm">{data.isFurnished || data.rentalUnit?.type === 'PRIVATE_ROOM' ? t('furnished') : t('unfurnished')}</span>
                            </FeatureTag>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 py-[5px] text-neutral-700 dark:text-neutral-300 text-base">
                        {data.transitData?.mainConnection && (
                            <>
                                <div className="flex items-center gap-1">
                                    {/* Dynamic Transport Icon */}
                                    {(() => {
                                        const type = (data.transitData.mainConnection.type || "").toLowerCase();
                                        if (type.includes('bus')) return <BusFront size={20} className="text-neutral-700 dark:text-neutral-300" />;
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
                                <span>{data.transitData.mainConnection.walkTime} min</span>
                            </>
                        )}

                        {data.transitData?.mainConnection && (data.hasFiber || data.hasBikeRoom) && (
                            <span className="text-[10px] text-muted-foreground">•</span>
                        )}

                        {data.hasFiber && (
                            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                                <Wifi size={14} />
                                <span className="text-sm font-normal">{t('fiber')}</span>
                            </div>
                        )}

                        {data.hasFiber && data.hasBikeRoom && (
                            <span className="text-[10px] text-muted-foreground">•</span>
                        )}

                        {data.hasBikeRoom && (
                            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                                <Bike size={14} />
                                <span className="text-sm font-normal">{t('bikeRoom')}</span>
                            </div>
                        )}

                        {!data.transitData?.mainConnection && !data.hasFiber && !data.hasBikeRoom && (
                            <div className="h-5" />
                        )}
                    </div>
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


    );
};

export default ListingCard;
