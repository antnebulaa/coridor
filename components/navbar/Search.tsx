'use client';

import { Search as SearchIcon, MapPin } from 'lucide-react';
import useSearchModal from '@/hooks/useSearchModal';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

const Search = () => {
    const searchModal = useSearchModal();
    const params = useSearchParams();
    const city = params?.get('city');
    const citiesParam = params?.get('cities');

    let label = "Rechercher une location";
    let hasLocation = false;

    if (citiesParam) {
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
                onClick={() => searchModal.onOpen({ step: 0 })}
                className="border border-border w-full md:min-w-fit py-2 rounded-full hover:shadow-md transition cursor-pointer bg-background shadow-md md:shadow-none"
            >
                <div className="flex flex-row items-center justify-between px-2 gap-3">
                    <div className="p-2 bg-primary rounded-full text-primary-foreground">
                        <SearchIcon size={18} strokeWidth={2.5} />
                    </div>
                    <div className="text-sm font-medium">
                        {label}
                    </div>
                    {/* Ghost element for centering balance */}
                    <div className="p-2 bg-transparent rounded-full text-transparent invisible">
                        <SearchIcon size={18} />
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
