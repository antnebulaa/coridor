'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Star, MoreHorizontal, Search, Pencil, Trash } from 'lucide-react';
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
import ListingCommuteStep from './ListingCommuteStep';

enum STEPS {
    LOCATION = 0,
    CATEGORY = 1,
    FILTERS = 2,
    COMMUTE = 3
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

    // UI State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Saved Locations State
    const [savedLocations, setSavedLocations] = useState<any[]>([]);

    useEffect(() => {
        if (searchModal.isOpen) {
            axios.get('/api/user/commute')
                .then((response) => {
                    setSavedLocations(response.data);
                })
                .catch((error) => {
                    // console.error("Failed to fetch saved locations", error);
                });
        }
    }, [searchModal.isOpen]);

    // Commute State
    interface CommutePoint {
        lat: number;
        lng: number;
        mode: string;
        time: number;
        label: string;
    }
    const [commutePoints, setCommutePoints] = useState<CommutePoint[]>([]);

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

            // Rehydrate Commute Params if "commute" JSON exists
            const commuteParam = params.get('commute');
            if (commuteParam) {
                try {
                    const parsed = JSON.parse(commuteParam);
                    if (Array.isArray(parsed)) {
                        setCommutePoints(parsed);
                    }
                } catch (e) {
                    console.error("Failed to parse commute params", e);
                }
            } else {
                // Backward compatibility or legacy single params
                const lat = params.get('commuteLatitude');
                const lng = params.get('commuteLongitude');
                const mode = params.get('commuteTransportMode');
                const time = params.get('commuteMaxTime');
                if (lat && lng && mode && time) {
                    setCommutePoints([{
                        lat: parseFloat(lat),
                        lng: parseFloat(lng),
                        mode: mode,
                        time: parseInt(time),
                        label: 'Destination'
                    }]);
                }
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
        setStep((value) => {
            if (value === STEPS.COMMUTE) return STEPS.LOCATION;
            return value - 1;
        });
    }, []);

    const onNext = useCallback(() => {
        setStep((value) => value + 1);
    }, []);

    const onSubmit = useCallback(async () => {
        if (step !== STEPS.FILTERS && step !== STEPS.COMMUTE) {
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

        // Commute Params
        if (step === STEPS.COMMUTE && commutePoints.length > 0) {
            urlParams.set('commute', JSON.stringify(commutePoints));
        }


        const url = `/?${urlParams.toString()}`;

        // Save detailed search info for "Resume Search" feature
        const locationLabel = locations.length > 0
            ? locations.map(l => l.city || l.label.split(',')[0].trim()).join(', ')
            : (step === STEPS.COMMUTE ? 'Zone de trajet' : 'France');

        const detailsParts = [];
        if (category) detailsParts.push(category);
        if (roomCount > 1) detailsParts.push(`${roomCount} pièces`);
        if (bathroomCount > 1) detailsParts.push(`${bathroomCount} sdb`);
        if (minSurface) detailsParts.push(`${minSurface}m² min`);
        if (maxPrice) detailsParts.push(`Max ${maxPrice}€`);
        if (step === STEPS.COMMUTE && commutePoints.length > 0) {
            detailsParts.push(`${commutePoints.length} trajet${commutePoints.length > 1 ? 's' : ''}`);
        }

        const resumeData = {
            locationLabel,
            queryString: urlParams.toString(),
            details: detailsParts.join(' • ')
        };

        try {
            localStorage.setItem('coridor_last_search', JSON.stringify(resumeData));
        } catch (error) {
            console.error('Failed to save search history', error);
        }

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
        commutePoints,
        roomCount,
        bathroomCount,
        minPrice,
        maxPrice,
        minSurface,
        maxSurface
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

                // Count API currently might NOT support complex commute JSON, but let's pass it anyway if we update API
                if (commutePoints.length > 0) {
                    params.set('commute', JSON.stringify(commutePoints));
                }

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
    }, [locations, category, roomCount, bathroomCount, minPrice, maxPrice, minSurface, maxSurface, commutePoints]);

    const actionLabel = useMemo(() => {
        if (step === STEPS.FILTERS || step === STEPS.COMMUTE) {
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

    const handleFavoriteSelect = (loc: any) => {
        setLocations([]);
        setCommutePoints([{
            lat: loc.latitude,
            lng: loc.longitude,
            mode: loc.transportMode?.toLowerCase() || 'driving',
            time: 30,
            label: loc.name || loc.address
        }]);
        setStep(STEPS.COMMUTE);
    };

    let bodyContent = (
        <div className="flex flex-col gap-6">


            <MapboxAddressSelect
                value={undefined} // Always empty to allow new selection
                onChange={handleLocationSelect}
                placeholder="Rechercher un lieu"
                searchTypes="place,district,locality,neighborhood" // Prioritize cities and districts
                limitCountry="fr"
                autoFocus
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
                    {savedLocations.map((loc) => (
                        <div
                            key={loc.id}
                            className="relative flex items-center justify-between px-4 h-[60px] border border-border rounded-xl hover:shadow-sm cursor-pointer transition group active:scale-95"
                            onClick={() => handleFavoriteSelect(loc)}
                        >
                            <div className="flex items-center gap-3">
                                <Star size={24} className="text-foreground" strokeWidth={1.5} />
                                <div className="flex flex-col text-left">
                                    <span className="font-medium">{loc.name || "Favori"}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{loc.address}</span>
                                </div>
                            </div>

                            {/* Menu Trigger */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === loc.id ? null : loc.id);
                                    }}
                                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition"
                                >
                                    <MoreHorizontal size={20} className="text-muted-foreground" />
                                </button>

                                {/* Dropdown Menu */}
                                {activeMenuId === loc.id && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(null);
                                            }}
                                        />
                                        <div
                                            className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-900 border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="flex flex-col">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFavoriteSelect(loc);
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition text-sm text-left"
                                                >
                                                    <Search size={16} />
                                                    Rechercher autour
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push('/account/preferences');
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition text-sm text-left"
                                                >
                                                    <Pencil size={16} />
                                                    Modifier le favori
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        axios.delete(`/api/user/commute?id=${loc.id}`)
                                                            .then(() => {
                                                                setSavedLocations(prev => prev.filter(l => l.id !== loc.id));
                                                                // toast.success("Favori supprimé");
                                                            })
                                                            .catch(() => {
                                                                // toast.error("Erreur");
                                                            });
                                                    }}
                                                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 transition text-sm text-left border-t border-border"
                                                >
                                                    <Trash size={16} />
                                                    Supprimer ce lieu
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <div
                        onClick={() => setStep(STEPS.COMMUTE)}
                        className="flex items-center justify-between p-4 border border-border rounded-xl hover:shadow-sm cursor-pointer transition active:scale-95"
                    >
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

                    <div
                        onClick={() => {
                            searchModal.onClose();
                            router.push('/account/preferences');
                        }}
                        className="flex items-center justify-between p-4 border border-border rounded-xl hover:shadow-sm cursor-pointer transition active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <Briefcase size={24} className="text-foreground" strokeWidth={1.5} />
                            <span className="font-medium">Ajouter un lieu de travail</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-muted-foreground">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );




    if (step === STEPS.COMMUTE) {
        bodyContent = (
            <ListingCommuteStep
                commutePoints={commutePoints}
                setCommutePoints={setCommutePoints}
                savedLocations={savedLocations}
            />
        );
    }

    if (step === STEPS.CATEGORY) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Quel type de logement cherchez-vous ?"
                    subtitle="Choisissez une catégorie"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
                    {categories.map((item) => {
                        const isSelected = category.split(',').includes(item.label);
                        return (
                            <div key={item.label} className="col-span-1">
                                <CategoryInput
                                    onClick={(label) => {
                                        let current = category ? category.split(',') : [];
                                        if (current.includes(label)) {
                                            current = current.filter(c => c !== label);
                                        } else {
                                            current = [...current, label];
                                        }
                                        setCategory(current.join(','));
                                    }}
                                    selected={isSelected}
                                    label={item.label}
                                    icon={item.icon}
                                />
                            </div>
                        )
                    })}
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
            title={step === STEPS.COMMUTE ? "Temps de trajet (BETA)" : "Filtres"}
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step === STEPS.LOCATION ? undefined : onBack}
            body={bodyContent}
            hideHeader={true}
        />
    );
};

export default SearchModal;
