'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Briefcase, Star, MoreHorizontal, Search, Pencil, Trash, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Modal from './Modal';
import useSearchModal from '@/hooks/useSearchModal';
import useCommuteModal from '@/hooks/useCommuteModal';
import Heading from '../Heading';
import MapboxAddressSelect, { AddressSelectValue } from '../inputs/MapboxAddressSelect';
import CategoryInput from '../inputs/CategoryInput';
import Counter from '../inputs/Counter';

import SoftInput from '../inputs/SoftInput';
import { categories } from '../navbar/Categories';
import ListingCommuteStep from './ListingCommuteStep';
import { Button } from '../ui/Button'; // Import Button
import { Home, GraduationCap, Heart, Coffee, Utensils, ShoppingBag } from 'lucide-react'; // Additional Icons

enum STEPS {
    LOCATION = 0,
    CATEGORY = 1,
    BUDGET = 2,
    FILTERS = 3,
    COMMUTE = 4,
    SAVE_FAVORITE = 5
}

const SearchModal = () => {
    const router = useRouter();
    const minPriceRef = useRef<HTMLInputElement>(null);
    const budgetContentRef = useRef<HTMLDivElement>(null);
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
    const [bedroomCount, setBedroomCount] = useState(0); // Added bedroomCount
    const [bathroomCount, setBathroomCount] = useState(1);

    // UI State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [openFilterSection, setOpenFilterSection] = useState<'budget' | 'surface' | 'rooms' | null>('budget');

    const toggleFilterSection = (section: 'budget' | 'surface' | 'rooms') => {
        if (openFilterSection === section) {
            setOpenFilterSection(null);
        } else {
            setOpenFilterSection(section);
        }
    };

    // Saved Locations State
    const [savedLocations, setSavedLocations] = useState<any[]>([]);
    const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if (activeMenuId) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeMenuId]);

    useEffect(() => {
        if (searchModal.isOpen) {
            setIsLoadingFavorites(true);
            axios.get('/api/user/commute')
                .then((response) => {
                    setSavedLocations(response.data);
                })
                .catch((error) => {
                    // console.error("Failed to fetch saved locations", error);
                })
                .finally(() => {
                    setIsLoadingFavorites(false);
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
    const [commuteAddress, setCommuteAddress] = useState<any>(undefined);
    const [commuteTime, setCommuteTime] = useState('30');
    const [commuteMode, setCommuteMode] = useState('public_transport');

    // Quick Add Favorite State
    const [isAddingFavorite, setIsAddingFavorite] = useState(false);
    const [tempLocation, setTempLocation] = useState<AddressSelectValue | null>(null);
    const [favoriteTitle, setFavoriteTitle] = useState('Travail');
    const [favoriteIcon, setFavoriteIcon] = useState('briefcase');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    // Responsive check for placeholder
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


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
            if (value === STEPS.SAVE_FAVORITE) return STEPS.LOCATION;
            if (value === STEPS.COMMUTE) return STEPS.LOCATION;
            return value - 1;
        });
    }, []);

    const onNext = useCallback(() => {
        setStep((value) => value + 1);
    }, []);

    const onSubmit = useCallback(async () => {
        if (step === STEPS.SAVE_FAVORITE) {
            if (!tempLocation) return;
            try {
                if (editingId) {
                    await axios.put('/api/user/commute', {
                        id: editingId,
                        name: favoriteTitle,
                        address: tempLocation.label,
                        latitude: tempLocation.latlng[0] || 0,
                        longitude: tempLocation.latlng[1] || 0,
                        transportMode: 'driving',
                        icon: favoriteIcon
                    });

                    setSavedLocations(prev => prev.map(l => l.id === editingId ? { ...l, name: favoriteTitle, address: tempLocation.label, latitude: tempLocation.latlng[0] || 0, longitude: tempLocation.latlng[1] || 0, icon: favoriteIcon } : l));
                    setEditingId(null);
                } else {
                    const response = await axios.post('/api/user/commute', {
                        name: favoriteTitle,
                        address: tempLocation.label,
                        latitude: tempLocation.latlng[0] || 0,
                        longitude: tempLocation.latlng[1] || 0,
                        transportMode: 'driving',
                        icon: favoriteIcon
                    });
                    setSavedLocations([...savedLocations, response.data]);
                }

                setIsAddingFavorite(false);
                setTempLocation(null);
                setStep(STEPS.LOCATION);
            } catch (error) {
                console.error("Failed to save favorite", error);
            }
            return;
        }

        if (step !== STEPS.FILTERS && step !== STEPS.COMMUTE) {
            return onNext();
        }

        const currentQuery = {};

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
        if (bedroomCount > 0) urlParams.set('bedroomCount', bedroomCount.toString()); // Added bedroomCount param
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
        if (bedroomCount > 0) detailsParts.push(`${bedroomCount} ch`);
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
        bedroomCount,
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
                if (bedroomCount > 0) params.set('bedroomCount', bedroomCount.toString());
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
    }, [locations, category, roomCount, bedroomCount, bathroomCount, minPrice, maxPrice, minSurface, maxSurface, commutePoints]);

    const actionLabel = useMemo(() => {
        if (step === STEPS.SAVE_FAVORITE) {
            return "Enregistrer le lieu";
        }
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
        if (isAddingFavorite) {
            setTempLocation(value);
            setStep(STEPS.SAVE_FAVORITE);
            return;
        }

        const isDuplicate = locations.some(l => l.value === value.value);

        if (isDuplicate) {
            return;
        }
        setLocations([...locations, value]);
        setStep(STEPS.CATEGORY);
    };

    const handleLocationRemove = (valueToRemove: string) => {
        setLocations(locations.filter(l => l.value !== valueToRemove));
    };

    const handleFavoriteSelect = (loc: any) => {
        setIsAddingFavorite(false);
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

    const handleFavoriteEdit = (loc: any) => {
        setEditingId(loc.id);
        setFavoriteTitle(loc.name);
        setFavoriteIcon(loc.icon || 'briefcase');
        // Reconstruct tempLocation for editing
        setTempLocation({
            label: loc.address,
            value: loc.address,
            latlng: [loc.latitude, loc.longitude],
            country: 'FR',
            city: '',
            region: ''
        });
        setStep(STEPS.SAVE_FAVORITE);
        setActiveMenuId(null);
    };

    const handleFavoriteDelete = (loc: any) => {
        // Optimistic Update
        setSavedLocations(prev => prev.filter(l => l.id !== loc.id));
        setActiveMenuId(null);

        axios.delete('/api/user/commute', { data: { id: loc.id } })
            .catch(() => {
                // Revert on failure (optional, but good practice). 
                // For now, let's assume success or silent fail to not complicate UX with error toasts
                console.error("Failed to delete favorite");
            });
    };

    const hasWorkplace = savedLocations.some(l => l.icon === 'briefcase' || l.name === 'Travail');

    let bodyContent: React.ReactElement | undefined = undefined;

    // Unified Accordion View for Search Steps
    // Unified Accordion View for Search Steps
    if (step <= STEPS.FILTERS) {
        bodyContent = (
            <div className="flex flex-col gap-3 p-4 md:p-6">
                {/* 1. LOCATION SECTION */}
                <div className={`flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300 ${step === STEPS.LOCATION ? 'shadow-lg ring-1 ring-black ring-opacity-5' : ''}`}>
                    <div
                        onClick={() => setStep(STEPS.LOCATION)}
                        className={`flex items-center justify-between px-[20px] py-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.LOCATION ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                    >
                        <div className={step === STEPS.LOCATION ? "text-2xl font-bold" : "text-sm font-medium text-neutral-500"}>Où ?</div>
                        {step !== STEPS.LOCATION && (
                            <div className="text-sm font-semibold truncate max-w-[200px]">
                                {locations.length > 0
                                    ? locations.map(l => l.city || l.label.split(',')[0].trim()).join(', ')
                                    : 'Toute la France'}
                            </div>
                        )}
                    </div>

                    <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${step === STEPS.LOCATION ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="px-[20px] pb-6 pt-2">
                                <div className="mt-4">
                                    <div className="mb-2 relative">
                                        <MapboxAddressSelect
                                            key={isAddingFavorite ? 'fav' : 'search'}
                                            value={undefined}
                                            onChange={handleLocationSelect}
                                            placeholder={isAddingFavorite
                                                ? (hasWorkplace ? "Saisir l'adresse du lieu favori" : "Saisir l'adresse de votre travail")
                                                : (locations.length > 0 ? "Saisir un autre lieu" : "Saisir un lieu")
                                            }
                                            icon={Search}
                                            searchTypes={isAddingFavorite ? "address,poi" : "district,locality,neighborhood,place,address,poi"}
                                            limitCountry="fr"
                                            autoFocus={true}
                                            clearOnSelect
                                            renderAsList={true}
                                            customInputClass="!text-xl !font-medium !pl-7 !py-2 !pr-0 rounded-none placeholder:text-neutral-400"
                                        />
                                    </div>

                                    {isAddingFavorite && (
                                        <div
                                            onClick={() => setIsAddingFavorite(false)}
                                            className="text-sm font-semibold underline cursor-pointer hover:text-neutral-500 self-end mb-2"
                                        >
                                            Annuler
                                        </div>
                                    )}

                                    {/* Selected Locations Chips */}
                                    {!isAddingFavorite && locations.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 mb-4">
                                            {locations.map((loc) => (
                                                <div key={loc.value} className="flex items-center gap-1 pl-3 pr-2 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm font-medium">
                                                    <span>{loc.city || loc.label.split(',')[0]}</span>
                                                    <button onClick={() => handleLocationRemove(loc.value)} className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Alternative Searches / Favorites */}
                                    <div className="mt-4 flex flex-col gap-3">
                                        {!isAddingFavorite && !isLoadingFavorites && (
                                            <>
                                                <div
                                                    onClick={() => setStep(STEPS.COMMUTE)}
                                                    className="flex items-center gap-2 text-sm font-semibold cursor-pointer hover:underline"
                                                >
                                                    <div className="p-1.5 bg-neutral-100 rounded-full">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    Recherche par temps de trajet
                                                </div>

                                                <div
                                                    onClick={() => {
                                                        setIsAddingFavorite(true);
                                                        if (hasWorkplace) {
                                                            setFavoriteTitle('Favori');
                                                            setFavoriteIcon('favorite');
                                                        } else {
                                                            setFavoriteTitle('Travail');
                                                            setFavoriteIcon('briefcase');
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 text-sm font-semibold cursor-pointer hover:underline"
                                                >
                                                    <div className="p-1.5 bg-neutral-100 rounded-full">
                                                        {hasWorkplace ? (
                                                            <Star size={16} strokeWidth={2} />
                                                        ) : (
                                                            <Briefcase size={16} strokeWidth={2} />
                                                        )}
                                                    </div>
                                                    {hasWorkplace ? "Ajouter un lieu favori" : "Ajouter un lieu de travail"}
                                                </div>
                                            </>
                                        )}

                                        {/* Existing Favorites List */}
                                        {!isAddingFavorite && !isLoadingFavorites && savedLocations.length > 0 && (
                                            <div className="flex flex-col gap-2 mt-2">
                                                {savedLocations.map((loc) => {
                                                    const iconList = [
                                                        { id: 'briefcase', icon: Briefcase },
                                                        { id: 'home', icon: Home },
                                                        { id: 'school', icon: GraduationCap },
                                                        { id: 'favorite', icon: Star },
                                                        { id: 'partner', icon: Heart }
                                                    ];
                                                    const matchedIcon = iconList.find(i => i.id === loc.icon);
                                                    const Icon = matchedIcon ? matchedIcon.icon : Star;

                                                    return (
                                                        <div key={loc.id} className="flex items-center justify-between group cursor-pointer" onClick={() => handleFavoriteSelect(loc)}>
                                                            <div className="flex items-center gap-2 text-sm text-neutral-600 hover:text-black">
                                                                <Icon size={16} />
                                                                <span>{loc.name}</span>
                                                            </div>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleFavoriteEdit(loc); }}
                                                                    className="p-1 hover:bg-neutral-100 rounded"
                                                                >
                                                                    <Pencil size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleFavoriteDelete(loc); }}
                                                                    className="p-1 hover:bg-red-50 text-red-500 rounded"
                                                                >
                                                                    <Trash size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CATEGORY SECTION */}
                <div className={`flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300 ${step === STEPS.CATEGORY ? 'shadow-lg ring-1 ring-black ring-opacity-5' : ''}`}>
                    <div
                        onClick={() => setStep(STEPS.CATEGORY)}
                        className={`flex items-center justify-between px-[20px] py-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.CATEGORY ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                    >
                        <div className={step === STEPS.CATEGORY ? "text-2xl font-bold" : "text-sm font-medium text-neutral-500"}>Quoi ?</div>
                        {step !== STEPS.CATEGORY && (
                            <div className="text-sm font-semibold truncate max-w-[200px]">
                                {category ? category : 'Type de logement'}
                            </div>
                        )}
                    </div>

                    <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${step === STEPS.CATEGORY ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="px-[20px] pb-6 pt-2">
                                <div className="flex flex-row flex-wrap gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {categories.map((item) => {
                                        const isSelected = category.split(',').includes(item.label);
                                        return (
                                            <div key={item.label}>
                                                <CategoryInput
                                                    onClick={(label) => {
                                                        let current = category ? category.split(',') : [];
                                                        if (current.includes(label)) {
                                                            current = current.filter(c => c !== label);
                                                        } else {
                                                            current = current.length > 0 ? [...current, label] : [label];
                                                            setStep(STEPS.BUDGET);
                                                        }
                                                        setCategory(current.join(','));
                                                    }}
                                                    selected={isSelected}
                                                    label={item.label}
                                                    icon={item.icon}
                                                    variant="search"
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. BUDGET SECTION */}
                <div className={`flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300 ${step === STEPS.BUDGET ? 'shadow-lg ring-1 ring-black ring-opacity-5' : ''}`}>
                    <div
                        onClick={() => {
                            setStep(STEPS.BUDGET);
                            if (budgetContentRef.current) {
                                // Disable transition strictly to allow immediate focus
                                budgetContentRef.current.style.transition = 'none';
                                budgetContentRef.current.style.gridTemplateRows = '1fr';
                                budgetContentRef.current.style.opacity = '1';

                                // Focus immediately while visible
                                minPriceRef.current?.focus();

                                // Restore transition for future animations (closing)
                                setTimeout(() => {
                                    if (budgetContentRef.current) {
                                        budgetContentRef.current.style.transition = '';
                                        // Specific properties will be handled by React classNames after render
                                        budgetContentRef.current.style.gridTemplateRows = '';
                                        budgetContentRef.current.style.opacity = '';
                                    }
                                }, 100);
                            }
                        }}
                        className={`flex items-center justify-between px-[20px] py-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.BUDGET ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                    >
                        <div className={step === STEPS.BUDGET ? "text-2xl font-bold" : "text-sm font-medium text-neutral-500"}>Budget</div>
                        {step !== STEPS.BUDGET && (
                            <div className="text-sm font-semibold truncate max-w-[200px]">
                                {minPrice || maxPrice ? `${minPrice ? minPrice + '€' : '0€'} - ${maxPrice ? maxPrice + '€' : 'Max'}` : 'Définir un budget'}
                            </div>
                        )}
                    </div>

                    <div ref={budgetContentRef} className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${step === STEPS.BUDGET ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="px-[20px] pb-6 pt-2">
                                <div className="flex flex-col gap-3">
                                    <div className="font-semibold text-sm">Budget (par mois)</div>
                                    <div className="flex flex-row gap-4 items-center">
                                        <SoftInput
                                            id="minPrice"
                                            label="Min"
                                            formatPrice
                                            type="number"
                                            inputMode="numeric"
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            autoFocus={step === STEPS.BUDGET}
                                            inputRef={minPriceRef}
                                        />
                                        <div className="text-neutral-400">-</div>
                                        <SoftInput
                                            id="maxPrice"
                                            label="Max"
                                            formatPrice
                                            type="number"
                                            inputMode="numeric"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                        />
                                    </div>
                                    <Link
                                        href="/account/tenant-profile"
                                        onClick={() => searchModal.onClose()}
                                        className="mt-2 text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg flex gap-3 items-start group hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
                                    >
                                        <div className="shrink-0 pt-0.5 text-base">💡</div>
                                        <span>
                                            <span className="font-semibold block text-neutral-800 dark:text-neutral-200 group-hover:underline">Booster votre recherche ?</span>
                                            En complétant votre dossier locataire, accédez à des suggestions plus précises.
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. FILTERS SECTION (Features) */}
                <div className={`flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-all duration-300 ${step === STEPS.FILTERS ? 'shadow-lg ring-1 ring-black ring-opacity-5' : ''}`}>
                    <div
                        onClick={() => setStep(STEPS.FILTERS)}
                        className={`flex items-center justify-between px-[20px] py-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.FILTERS ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                    >
                        <div className={step === STEPS.FILTERS ? "text-2xl font-bold" : "text-sm font-medium text-neutral-500"}>Filtres</div>
                        {step !== STEPS.FILTERS && (
                            <div className="text-sm font-semibold truncate max-w-[200px]">
                                Surface, pièces...
                            </div>
                        )}
                    </div>

                    <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${step === STEPS.FILTERS ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                            <div className="px-[20px] pb-6 pt-2 flex flex-col gap-6">



                                {/* Surface */}
                                <div className="flex flex-col gap-3">
                                    <div className="font-semibold text-sm">Surface (m²)</div>
                                    <div className="flex flex-row gap-4 items-center">
                                        <SoftInput
                                            id="minSurface"
                                            label="Min"
                                            type="number"
                                            inputMode="numeric"
                                            value={minSurface}
                                            onChange={(e) => setMinSurface(e.target.value)}
                                        />
                                        <div className="text-neutral-400">-</div>
                                        <SoftInput
                                            id="maxSurface"
                                            label="Max"
                                            type="number"
                                            inputMode="numeric"
                                            value={maxSurface}
                                            onChange={(e) => setMaxSurface(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <hr className="border-neutral-100" />

                                {/* Rooms & Bedrooms */}
                                <div className="flex flex-col gap-4">
                                    <Counter
                                        title="Pièces"
                                        subtitle="Minimum"
                                        value={roomCount}
                                        onChange={(value) => {
                                            setRoomCount(value);
                                            if (value <= bedroomCount) {
                                                setBedroomCount(Math.max(0, value - 1));
                                            }
                                        }}
                                    />
                                    <Counter
                                        title="Chambres"
                                        subtitle="Minimum"
                                        value={bedroomCount}
                                        min={0}
                                        onChange={(value) => {
                                            setBedroomCount(value);
                                            if (roomCount <= value) {
                                                setRoomCount(value + 1);
                                            }
                                        }}
                                    />
                                    <Counter
                                        title="Salles de bain"
                                        subtitle="Minimum"
                                        value={bathroomCount}
                                        onChange={(value) => setBathroomCount(value)}
                                    />
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === STEPS.COMMUTE) {
        bodyContent = (
            <div className="flex flex-col gap-8 p-4 md:p-6">
                <Heading
                    title="Temps de trajet maximum"
                    subtitle="Définissez votre temps de trajet idéal"
                />

                <MapboxAddressSelect
                    value={commuteAddress}
                    onChange={(val) => setCommuteAddress(val)}
                    placeholder="Adresse de destination (Travail, École...)"
                    autoFocus
                />

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <div className="font-semibold">Temps max (minutes)</div>
                            <div className="text-neutral-500 text-sm">Combien de temps maximum ?</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    const newVal = (parseInt(commuteTime) || 30) - 5;
                                    setCommuteTime(newVal < 5 ? '5' : newVal.toString());
                                }}
                                className="w-10 h-10 rounded-full border border-neutral-400 flex items-center justify-center hover:opacity-80 transition"
                            >
                                -
                            </button>
                            <div className="font-light text-xl text-neutral-600">
                                {commuteTime || 30}
                            </div>
                            <button
                                onClick={() => {
                                    const newVal = (parseInt(commuteTime) || 30) + 5;
                                    setCommuteTime(newVal.toString());
                                }}
                                className="w-10 h-10 rounded-full border border-neutral-400 flex items-center justify-center hover:opacity-80 transition"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="font-semibold mb-2 mt-4">Mode de transport</div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'driving', label: 'Voiture', icon: '🚗' },
                            { id: 'cycling', label: 'Vélo', icon: '🚲' },
                            { id: 'walking', label: 'Marche', icon: '🚶' },
                            { id: 'public_transport', label: 'Transports', icon: '🚌' }
                        ].map((mode) => (
                            <div
                                key={mode.id}
                                onClick={() => setCommuteMode(mode.id)}
                                className={`
                                    flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition
                                    ${commuteMode === mode.id ? 'border-black bg-neutral-50' : 'border-transparent bg-neutral-100 hover:border-neutral-200'}
                                `}
                            >
                                <span className="text-xl">{mode.icon}</span>
                                <span className="font-medium text-sm">{mode.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div >
        );
    }

    if (step === STEPS.SAVE_FAVORITE) {
        const iconList = [
            { id: 'briefcase', icon: Briefcase, label: 'Travail' },
            { id: 'home', icon: Home, label: 'Bureaux' }, // 'Maison' -> Home
            { id: 'school', icon: GraduationCap, label: 'École' },
            { id: 'favorite', icon: Star, label: 'Favori' },
            { id: 'partner', icon: Heart, label: 'Partenaire' }
        ];

        bodyContent = (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-1">
                    <div className="text-xl font-semibold">{tempLocation?.label.split(',')[0]}</div>
                    <div className="text-xl font-semibold">
                        {tempLocation?.label.split(',').slice(1).join(',').trim()}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2 w-full">
                            <input
                                className="text-4xl font-bold text-primary bg-transparent border-b border-primary focus:outline-none w-full"
                                value={favoriteTitle}
                                onChange={(e) => setFavoriteTitle(e.target.value)}
                                onBlur={() => setIsEditingTitle(false)}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsEditingTitle(true)}>
                            <span className="text-4xl font-bold text-primary">{favoriteTitle}</span>
                            <Pencil size={18} className="text-muted-foreground group-hover:text-primary transition" />
                        </div>
                    )}
                </div>

                <div className="flex flex-row gap-4 items-center justify-start flex-wrap">
                    {iconList.map((item) => {
                        const Icon = item.icon;
                        const isSelected = favoriteIcon === item.id;
                        return (
                            <div
                                key={item.id}
                                onClick={() => {
                                    setFavoriteIcon(item.id);
                                    if (!isEditingTitle) {
                                        // Only update title if user hasn't typed a custom one? 
                                        // Actually typically clicking an icon presets the name, unless user already customized it.
                                        // For simplicity let's update it for now as "presets".
                                        setFavoriteTitle(item.label);
                                    }
                                }}
                                className={`
                                    flex items-center justify-center p-4 rounded-full cursor-pointer transition
                                    ${isSelected ? 'bg-primary text-white shadow-md scale-110' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200'}
                                `}
                            >
                                <Icon size={24} />
                            </div>
                        )
                    })}
                </div>

                {/* Visual decoration "Plus d'icones" from screenshot? 
                     User image showed "Plus d'icones avec Royale". I'll skip that marketing fluff for now unless requested.
                 */}
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
            currentStep={step + 1}
            totalSteps={Object.keys(STEPS).length / 2}
            hideHeader={true}
            skipTranslateAnimation={true}
            noBodyPadding={true}
        />
    );
};

export default SearchModal;
