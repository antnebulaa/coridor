'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import Modal from './Modal';
import useSearchModal from '@/hooks/useSearchModal';
import useCommuteModal from '@/hooks/useCommuteModal';
import Heading from '../Heading';
import MapboxAddressSelect, { AddressSelectValue } from '../inputs/MapboxAddressSelect';
import CategoryInput from '../inputs/CategoryInput';
import Counter from '../inputs/Counter';
import SoftInput from '../inputs/SoftInput'; // Assuming we can reuse Input or create a simple one
import { categories } from '../navbar/Categories';

enum STEPS {
    LOCATION = 0,
    CATEGORY = 1,
    FILTERS = 2,
}

const SearchModal = () => {
    const router = useRouter();
    const params = useSearchParams();
    const searchModal = useSearchModal();
    const commuteModal = useCommuteModal();

    const [step, setStep] = useState(STEPS.LOCATION);

    const [locations, setLocations] = useState<AddressSelectValue[]>([]);
    const [category, setCategory] = useState('');
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [minSurface, setMinSurface] = useState<string>('9');
    const [maxSurface, setMaxSurface] = useState<string>('');
    const [roomCount, setRoomCount] = useState(1);
    const [bathroomCount, setBathroomCount] = useState(1);

    useEffect(() => {
        if (params) {
            const citiesParam = params.get('cities');
            const cityParam = params.get('city');

            if (citiesParam) {
                const cities = citiesParam.split(',');
                const initialLocations = cities.map(city => ({
                    label: city,
                    value: city, // Using city name as value since we don't have place_id
                    latlng: [], // Dummy
                    region: '',
                    city: city,
                    country: ''
                }));
                setLocations(initialLocations);
            } else if (cityParam) {
                setLocations([{
                    label: cityParam,
                    value: cityParam,
                    latlng: [],
                    region: '',
                    city: cityParam,
                    country: ''
                }]);
            }
        }
    }, [params]);

    useEffect(() => {
        if (searchModal.isOpen) {
            if (searchModal.step !== undefined) {
                setStep(searchModal.step);
            }

            if (searchModal.section) {
                // Wait for modal to render then scroll
                setTimeout(() => {
                    const element = document.getElementById(searchModal.section!);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 400);
            }
        }
    }, [searchModal.isOpen, searchModal.step, searchModal.section]);

    const onBack = useCallback(() => {
        setStep((value) => value - 1);
    }, []);

    const onNext = useCallback(() => {
        setStep((value) => value + 1);
    }, []);

    const onSubmit = useCallback(async () => {
        if (step !== STEPS.FILTERS) {
            return onNext();
        }

        let currentQuery = {};

        if (params) {
            // currentQuery = qs.parse(params.toString());
        }

        // Construct URL manually to avoid qs dependency for now
        const urlParams = new URLSearchParams();

        if (locations.length > 0) {
            const cities = locations.map(l => {
                if (l.city) return l.city;
                // Fallback: extract first part of label if city is missing
                return l.label.split(',')[0].trim();
            }).filter(Boolean).join(',');

            if (cities) urlParams.set('cities', cities);

            // Keep the first locationValue for backward compatibility or map center if needed
            // But primarily we search by city names now
        }

        if (category) urlParams.set('category', category);
        if (roomCount > 1) urlParams.set('roomCount', roomCount.toString());
        if (bathroomCount > 1) urlParams.set('bathroomCount', bathroomCount.toString());
        if (minPrice) urlParams.set('minPrice', minPrice);
        if (maxPrice) urlParams.set('maxPrice', maxPrice);
        if (minSurface) urlParams.set('minSurface', minSurface);
        if (maxSurface) urlParams.set('maxSurface', maxSurface);

        const url = `/?${urlParams.toString()}`;

        setStep(STEPS.LOCATION);
        searchModal.onClose();
        router.push(url);
    }, [
        step,
        searchModal,
        locations,
        router,
        category,
        onNext,
        params,
    ]);

    const [listingCount, setListingCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const params = new URLSearchParams();

                if (locations.length > 0) {
                    const cities = locations.map(l => {
                        if (l.city) return l.city;
                        return l.label.split(',')[0].trim();
                    }).filter(Boolean).join(',');
                    if (cities) params.set('cities', cities);
                }

                if (category) params.set('category', category);
                if (roomCount > 1) params.set('roomCount', roomCount.toString());
                if (bathroomCount > 1) params.set('bathroomCount', bathroomCount.toString());
                if (minPrice) params.set('minPrice', minPrice);
                if (maxPrice) params.set('maxPrice', maxPrice);
                if (minSurface) params.set('minSurface', minSurface);
                if (maxSurface) params.set('maxSurface', maxSurface);

                const response = await axios.get(`/api/listings/count?${params.toString()}`);
                setListingCount(response.data.count);
            } catch (error) {
                console.error("Error fetching count:", error);
            }
        };

        // Debounce or just fetch on change
        const timer = setTimeout(() => {
            fetchCount();
        }, 300);

        return () => clearTimeout(timer);
    }, [locations, category, roomCount, bathroomCount, minPrice, maxPrice, minSurface, maxSurface]);

    const actionLabel = useMemo(() => {
        if (step === STEPS.FILTERS) {
            return `Afficher ${listingCount !== null ? listingCount : '...'} annonces`;
        }

        return 'Suivant';
    }, [step, listingCount]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.LOCATION) {
            return undefined;
        }

        return 'Retour';
    }, [step]);

    const handleLocationSelect = (value: AddressSelectValue) => {
        // Check if already selected (by city name or label fallback)
        const newCity = value.city || value.label.split(',')[0].trim();

        const isDuplicate = locations.some(l => {
            const existingCity = l.city || l.label.split(',')[0].trim();
            return existingCity.toLowerCase() === newCity.toLowerCase();
        });

        if (isDuplicate) {
            return;
        }
        setLocations([...locations, value]);
    };

    const handleLocationRemove = (valueToRemove: string) => {
        setLocations(locations.filter(l => l.value !== valueToRemove));
    };

    let bodyContent = (
        <div className="flex flex-col gap-6">


            <MapboxAddressSelect
                value={undefined} // Always empty to allow new selection
                onChange={handleLocationSelect}
                placeholder="Rechercher un lieu"
                searchTypes="place,district,locality,neighborhood" // Prioritize cities and districts
                limitCountry="fr"
            />

            {/* Selected Locations List */}
            {locations.length > 0 && (
                <div className="flex flex-col gap-3">
                    {locations.map((loc) => (
                        <div key={loc.value} className="flex flex-col p-4 bg-secondary rounded-xl relative text-foreground">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                <span className="font-semibold text-lg">{loc.city || loc.label}</span>
                            </div>



                            <button
                                onClick={() => handleLocationRemove(loc.value)}
                                className="absolute top-4 right-4 p-1 hover:bg-background/50 rounded-full transition"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Alternative Searches */}
            <div className="mt-4">
                <div className="text-sm font-medium text-muted-foreground mb-3">Recherches alternatives</div>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-4 border border-border rounded-xl hover:shadow-sm cursor-pointer transition">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            <span className="font-medium">Recherche par périmètre</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border rounded-xl hover:shadow-sm cursor-pointer transition">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                            </svg>
                            <span className="font-medium">Recherche par temps de trajet</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border rounded-xl hover:shadow-sm cursor-pointer transition">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                            <span className="font-medium">Recherche par dessin sur la carte</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );

    if (step === STEPS.CATEGORY) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Quel type de logement cherchez-vous ?"
                    subtitle="Choisissez une catégorie"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
                    {categories.map((item) => (
                        <div key={item.label} className="col-span-1">
                            <CategoryInput
                                onClick={(category) => setCategory(category)}
                                selected={category === item.label}
                                label={item.label}
                                icon={item.icon}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (step === STEPS.FILTERS) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Affinez votre recherche"
                    subtitle="Trouvez le logement idéal"
                />

                {/* Budget Section */}
                <div id="budget" className="flex flex-col gap-4">
                    <div className="font-semibold text-lg">Budget (par mois)</div>
                    <div className="flex flex-row gap-4 items-center">
                        <SoftInput
                            id="minPrice"
                            label="Prix min"
                            formatPrice
                            type="number"
                            inputMode="numeric"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                        />
                        <SoftInput
                            id="maxPrice"
                            label="Prix max"
                            formatPrice
                            type="number"
                            inputMode="numeric"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                        />
                    </div>
                </div>
                <hr />

                {/* Surface Section */}
                <div id="surface" className="flex flex-col gap-4">
                    <div className="font-semibold text-lg">Surface (m²)</div>
                    <div className="flex flex-row gap-4 items-center">
                        <SoftInput
                            id="minSurface"
                            label="Surface min (m²)"
                            type="number"
                            inputMode="numeric"
                            value={minSurface}
                            onChange={(e) => setMinSurface(e.target.value)}
                        />
                        <SoftInput
                            id="maxSurface"
                            label="Surface max (m²)"
                            type="number"
                            inputMode="numeric"
                            value={maxSurface}
                            onChange={(e) => setMaxSurface(e.target.value)}
                        />
                    </div>
                </div>
                <hr />

                {/* Rooms Section */}
                <div id="rooms" className="flex flex-col gap-4">
                    <div className="font-semibold text-lg">Pièces et lits</div>
                    <Counter
                        title="Pièces"
                        subtitle="Nombre de pièces minimum"
                        value={roomCount}
                        onChange={(value) => setRoomCount(value)}
                    />
                    <hr />
                    <Counter
                        title="Salles de bain"
                        subtitle="Nombre de salles de bain minimum"
                        value={bathroomCount}
                        onChange={(value) => setBathroomCount(value)}
                    />
                </div>
            </div>
        );
    }

    return (
        <Modal
            isOpen={searchModal.isOpen}
            onClose={searchModal.onClose}
            onSubmit={onSubmit}
            title="Filtres"
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step === STEPS.LOCATION ? undefined : onBack}
            body={bodyContent}
        />
    );
};

export default SearchModal;
