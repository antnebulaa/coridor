'use client';

import { Search as SearchIcon, MapPin, Plus } from 'lucide-react';
import useSearchModal from '@/hooks/useSearchModal';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import Link from 'next/link';

const Search = () => {
    const searchModal = useSearchModal();
    const params = useSearchParams();
    const city = params?.get('city');
    const citiesParam = params?.get('cities');
    const commuteParam = params?.get('commute');

    let label = "On cherche où ?";
    let hasLocation = false;

    if (commuteParam) {
        try {
            const points = JSON.parse(commuteParam);
            if (Array.isArray(points) && points.length > 0) {
                hasLocation = true;
                if (points.length === 1) {
                    // Truncate label to keep it short (e.g. "Paris" instead of "Paris, France")
                    const shortLabel = points[0].label.split(',')[0];
                    label = `${points[0].time} min • ${shortLabel}`;
                } else {
                    label = `Recherche croisée (${points.length} lieux)`;
                }
            }
        } catch (e) {
            console.error("Error parsing commute param", e);
        }
    } else if (citiesParam) {
        const cities = citiesParam.split(',');
        if (cities.length > 0) {
            hasLocation = true;
            if (cities.length === 1) {
                label = cities[0];
            } else {
                label = `${cities[0]} (+${cities.length - 1})`;
            }
        }
    } else if (city) {
        hasLocation = true;
        label = city;
    }

    const minPrice = params?.get('minPrice');
    const maxPrice = params?.get('maxPrice');
    const minSurface = params?.get('minSurface');
    const maxSurface = params?.get('maxSurface');
    const roomCount = params?.get('roomCount');

    const budgetLabel = useMemo(() => {
        if (minPrice && maxPrice) {
            return `${minPrice}-${maxPrice}€`;
        } else if (minPrice) {
            return `> ${minPrice}€`;
        } else if (maxPrice) {
            return `< ${maxPrice}€`;
        }
        return "Budget";
    }, [minPrice, maxPrice]);

    const surfaceLabel = useMemo(() => {
        if (minSurface && maxSurface) {
            return `${minSurface}-${maxSurface}m²`;
        } else if (minSurface) {
            return `> ${minSurface}m²`;
        } else if (maxSurface) {
            return `< ${maxSurface}m²`;
        }
        return "Surface";
    }, [minSurface, maxSurface]);

    const roomsLabel = useMemo(() => {
        if (roomCount && +roomCount > 1) {
            return `${roomCount}+ pcs`;
        }
        return "Pièces";
    }, [roomCount]);

    return (
        <div className="flex flex-row items-center gap-2 overflow-x-auto md:overflow-visible w-full md:w-auto pb-2 scrollbar-hide">
            {/* Location Search */}
            <div
                onClick={() => searchModal.onOpen({ step: commuteParam ? 3 : 0 })}
                className="border border-border w-full md:min-w-fit py-2 rounded-full hover:shadow-md transition cursor-pointer bg-background shadow-md md:shadow-none"
            >
                <div className="flex flex-row items-center justify-between px-2 gap-3">
                    <div className="p-2 bg-primary rounded-full text-primary-foreground">
                        <SearchIcon size={18} strokeWidth={2.5} />
                    </div>
                    <div className="text-sm font-medium truncate flex-1 text-left pl-2">
                        {label}
                    </div>

                    {/* Vertical Divider & Add Favorite Button */}
                    <div className="flex items-center gap-3 pr-2">
                        <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700"></div>
                        <Link
                            href="/account/preferences"
                            onClick={(e) => e.stopPropagation()}
                            className="
                                p-1.5 
                                bg-secondary 
                                hover:bg-neutral-200
                                dark:hover:bg-neutral-700 
                                rounded-full 
                                transition 
                                flex items-center justify-center
                            "
                            title="Ajouter un favori"
                        >
                            <Plus size={16} className="text-foreground" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            {/* Advanced Filters - Hidden on Mobile */}
            <div
                onClick={() => searchModal.onOpen({ step: 2, section: 'budget' })}
                className={`hidden md:block border border-border py-3 px-4 rounded-full hover:shadow-md transition cursor-pointer text-sm font-medium whitespace-nowrap ${budgetLabel !== 'Budget' ? 'bg-secondary border-foreground' : ''}`}
            >
                {budgetLabel}
            </div>
            <div
                onClick={() => searchModal.onOpen({ step: 2, section: 'surface' })}
                className={`hidden md:block border border-border py-3 px-4 rounded-full hover:shadow-md transition cursor-pointer text-sm font-medium whitespace-nowrap ${surfaceLabel !== 'Surface' ? 'bg-secondary border-foreground' : ''}`}
            >
                {surfaceLabel}
            </div>
            <div
                onClick={() => searchModal.onOpen({ step: 2, section: 'rooms' })}
                className={`hidden md:block border border-border py-3 px-4 rounded-full hover:shadow-md transition cursor-pointer text-sm font-medium whitespace-nowrap ${roomsLabel !== 'Pièces' ? 'bg-secondary border-foreground' : ''}`}
            >
                {roomsLabel}
            </div>
            <div
                onClick={() => searchModal.onOpen({ step: 2 })}
                className="hidden md:block border border-border py-3 px-4 rounded-full hover:shadow-md transition cursor-pointer text-sm font-medium whitespace-nowrap"
            >
                Filtres
            </div>
        </div>
    );
};

export default Search;
