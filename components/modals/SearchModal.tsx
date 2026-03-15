'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Briefcase, Star, MoreHorizontal, Search, Pencil, Trash, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import useSearchModal from '@/hooks/useSearchModal';
import useCommuteModal from '@/hooks/useCommuteModal';
import Heading from '../Heading';
import MapboxAddressSelect, { AddressSelectValue } from '../inputs/MapboxAddressSelect';

import SoftInput from '../inputs/SoftInput';
import { categories } from '../navbar/Categories';
import ListingCommuteStep from './ListingCommuteStep';
import { Button } from '../ui/Button'; // Import Button
import { Home, GraduationCap, Heart, Coffee, Utensils, ShoppingBag } from 'lucide-react'; // Additional Icons

enum STEPS {
    LOCATION = 0,
    BUDGET = 1,
    FILTERS = 2,
    COMMUTE = 3,
    SAVE_FAVORITE = 4
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
    const [roomCount, setRoomCount] = useState(0);
    const [roomCountMax, setRoomCountMax] = useState(0);
    const [bedroomCount, setBedroomCount] = useState(0);
    const [bedroomCountMax, setBedroomCountMax] = useState(0);
    const [bathroomCount, setBathroomCount] = useState(0);
    const [bathroomCountMax, setBathroomCountMax] = useState(0);

    // Advanced filters
    const [furnished, setFurnished] = useState<'furnished' | 'unfurnished' | null>(null);
    const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
    const [floorTypes, setFloorTypes] = useState<string[]>([]);
    const [dpeMin, setDpeMin] = useState('');
    const [dpeMax, setDpeMax] = useState('');
    const [amenities, setAmenities] = useState<string[]>([]);
    const [heatingTypes, setHeatingTypes] = useState<string[]>([]);

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsMobile(window.innerWidth < 768);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (searchModal.isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [searchModal.isOpen]);

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
        if (roomCount > 0) urlParams.set('roomCount', roomCount.toString());
        if (roomCountMax > 0 && roomCountMax !== roomCount) urlParams.set('roomCountMax', roomCountMax.toString());
        if (bedroomCount > 0) urlParams.set('bedroomCount', bedroomCount.toString());
        if (bedroomCountMax > 0 && bedroomCountMax !== bedroomCount) urlParams.set('bedroomCountMax', bedroomCountMax.toString());
        if (bathroomCount > 0) urlParams.set('bathroomCount', bathroomCount.toString());
        if (bathroomCountMax > 0 && bathroomCountMax !== bathroomCount) urlParams.set('bathroomCountMax', bathroomCountMax.toString());
        if (minPrice) urlParams.set('minPrice', minPrice);
        if (maxPrice) urlParams.set('maxPrice', maxPrice);
        if (minSurface) urlParams.set('minSurface', minSurface);
        if (maxSurface) urlParams.set('maxSurface', maxSurface);
        if (furnished) urlParams.set('furnished', furnished);
        if (propertyTypes.length > 0) urlParams.set('propertyTypes', propertyTypes.join(','));
        if (floorTypes.length > 0) urlParams.set('floorTypes', floorTypes.join(','));
        if (dpeMin) urlParams.set('dpeMin', dpeMin);
        if (dpeMax) urlParams.set('dpeMax', dpeMax);
        if (amenities.length > 0) urlParams.set('amenities', amenities.join(','));
        if (heatingTypes.length > 0) urlParams.set('heatingTypes', heatingTypes.join(','));

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
        if (roomCount > 0) detailsParts.push(roomCountMax > roomCount ? `${roomCount}-${roomCountMax} pièces` : `${roomCount} pièces`);
        if (bedroomCount > 0) detailsParts.push(bedroomCountMax > bedroomCount ? `${bedroomCount}-${bedroomCountMax} ch` : `${bedroomCount} ch`);
        if (bathroomCount > 0) detailsParts.push(bathroomCountMax > bathroomCount ? `${bathroomCount}-${bathroomCountMax} sdb` : `${bathroomCount} sdb`);
        if (furnished) detailsParts.push(furnished === 'furnished' ? 'Meublé' : 'Non meublé');
        if (dpeMin) detailsParts.push(dpeMax && dpeMax !== dpeMin ? `DPE ${dpeMin}-${dpeMax}` : `DPE ${dpeMin}`);
        if (amenities.length > 0) {
            const amenityLabels: Record<string, string> = { hasParking: 'Parking', hasGarage: 'Garage', hasBalcony: 'Balcon', hasTerrace: 'Terrasse', hasGarden: 'Jardin', hasPool: 'Piscine', hasCave: 'Cave', isKitchenEquipped: 'Cuisine équipée', hasElevator: 'Ascenseur', isAccessible: 'PMR', hasAirConditioning: 'Clim', hasFiber: 'Fibre', isBright: 'Lumineux', hasArmoredDoor: 'Porte blindée', petsAllowed: 'Pet friendly', isStudentFriendly: 'Étudiant' };
            detailsParts.push(amenities.map(a => amenityLabels[a] || a).join(', '));
        }
        if (propertyTypes.length > 0) detailsParts.push(propertyTypes.join(', '));
        if (floorTypes.length > 0) {
            const floorLabels: Record<string, string> = { rdc: 'RDC', lastFloor: 'Dernier étage', highFloor: 'Étage élevé' };
            detailsParts.push(floorTypes.map(f => floorLabels[f] || f).join(', '));
        }
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
        roomCountMax,
        bedroomCount,
        bedroomCountMax,
        bathroomCount,
        bathroomCountMax,
        minPrice,
        maxPrice,
        minSurface,
        maxSurface,
        furnished,
        propertyTypes,
        floorTypes,
        dpeMin,
        dpeMax,
        amenities,
        heatingTypes
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
                if (roomCount > 0) params.set('roomCount', roomCount.toString());
                if (roomCountMax > 0 && roomCountMax !== roomCount) params.set('roomCountMax', roomCountMax.toString());
                if (bedroomCount > 0) params.set('bedroomCount', bedroomCount.toString());
                if (bedroomCountMax > 0 && bedroomCountMax !== bedroomCount) params.set('bedroomCountMax', bedroomCountMax.toString());
                if (bathroomCount > 0) params.set('bathroomCount', bathroomCount.toString());
                if (bathroomCountMax > 0 && bathroomCountMax !== bathroomCount) params.set('bathroomCountMax', bathroomCountMax.toString());
                if (minPrice) params.set('minPrice', minPrice);
                if (maxPrice) params.set('maxPrice', maxPrice);
                if (minSurface) params.set('minSurface', minSurface);
                if (maxSurface) params.set('maxSurface', maxSurface);
                if (furnished) params.set('furnished', furnished);
                if (propertyTypes.length > 0) params.set('propertyTypes', propertyTypes.join(','));
                if (floorTypes.length > 0) params.set('floorTypes', floorTypes.join(','));
                if (dpeMin) params.set('dpeMin', dpeMin);
                if (dpeMax) params.set('dpeMax', dpeMax);
                if (amenities.length > 0) params.set('amenities', amenities.join(','));
                if (heatingTypes.length > 0) params.set('heatingTypes', heatingTypes.join(','));

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
    }, [locations, category, roomCount, roomCountMax, bedroomCount, bedroomCountMax, bathroomCount, bathroomCountMax, minPrice, maxPrice, minSurface, maxSurface, commutePoints, furnished, propertyTypes, floorTypes, dpeMin, dpeMax, amenities, heatingTypes]);

    const actionLabel = useMemo(() => {
        if (step === STEPS.SAVE_FAVORITE) {
            return "Enregistrer le lieu";
        }
        if (step === STEPS.FILTERS || step === STEPS.COMMUTE) {
            return `Afficher ${listingCount !== null ? listingCount : '...'} annonces`;
        }

        return 'Suivant';
    }, [step, listingCount]);

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
        setStep(STEPS.BUDGET);
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

    if (step <= STEPS.FILTERS) {
        bodyContent = (
            <div className="flex-1 min-h-0 flex flex-col gap-2 px-2.5 md:px-4 pb-2">
                    {/* 1. LOCATION SECTION */}
                    <div
                        className={`flex flex-col bg-neutral-100 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl overflow-hidden transition-shadow duration-300 ${step === STEPS.LOCATION ? 'shadow-md' : 'shrink-0'}`}
                    >
                        <div
                            onClick={() => setStep(STEPS.LOCATION)}
                            className={`shrink-0 flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.LOCATION ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                        >
                            <div className={`transition-all duration-300 ${step === STEPS.LOCATION ? "text-3xl font-medium text-neutral-900 dark:text-neutral-100" : "text-xl font-medium text-neutral-500"}`}>Localisation</div>
                            <AnimatePresence mode="wait">
                                {step !== STEPS.LOCATION && (
                                    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="text-sm font-semibold truncate max-w-[200px]">
                                        {locations.length > 0
                                            ? locations.map(l => l.city || l.label.split(',')[0].trim()).join(', ')
                                            : 'Toute la France'}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence initial={false}>
                            {step === STEPS.LOCATION && (
                            <motion.div
                                key="location-content"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ height: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 0.2, delay: 0.1 } }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 pt-1">
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
                                            {!isAddingFavorite && (
                                                <div
                                                    onClick={() => setStep(STEPS.COMMUTE)}
                                                    className="flex items-center gap-2 text-base font-semibold cursor-pointer bg-amber-400 rounded-2xl p-3 hover:underline"
                                                >
                                                    <div className="p-1.5 rounded-full">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    Recherche par temps de trajet
                                                </div>
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
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>

                    {/* 2. BUDGET SECTION */}
                    <div
                        className={`flex flex-col bg-neutral-100 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl overflow-hidden transition-shadow duration-300 ${step === STEPS.BUDGET ? 'shadow-md' : 'shrink-0'}`}
                    >
                        <div
                            onClick={() => {
                                setStep(STEPS.BUDGET);
                                setTimeout(() => minPriceRef.current?.focus(), 150);
                            }}
                            className={`shrink-0 flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.BUDGET ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                        >
                            <div className={`transition-all duration-300 ${step === STEPS.BUDGET ? "text-3xl font-medium text-neutral-900 dark:text-neutral-100" : "text-xl font-medium text-neutral-500"}`}>Budget</div>
                            <AnimatePresence mode="wait">
                                {step !== STEPS.BUDGET && (
                                    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="text-sm font-semibold truncate max-w-[200px]">
                                        {minPrice || maxPrice ? `${minPrice ? minPrice + '€' : '0€'} - ${maxPrice ? maxPrice + '€' : 'Max'}` : 'Définir un budget'}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence initial={false}>
                            {step === STEPS.BUDGET && (
                            <motion.div
                                key="budget-content"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ height: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 0.2, delay: 0.1 } }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 pt-1">
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
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>

                    {/* 3. FILTERS SECTION */}
                    <div
                        className={`flex flex-col bg-neutral-100 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl overflow-hidden transition-shadow duration-300 ${step === STEPS.FILTERS ? 'flex-1 min-h-0 shadow-md' : 'shrink-0'}`}
                    >
                        <div
                            onClick={() => setStep(STEPS.FILTERS)}
                            className={`shrink-0 flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.FILTERS ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                        >
                            <div className={`transition-all duration-300 ${step === STEPS.FILTERS ? "text-3xl font-medium text-neutral-900 dark:text-neutral-100" : "text-xl font-medium text-neutral-500"}`}>Filtres</div>
                            <AnimatePresence mode="wait">
                                {step !== STEPS.FILTERS && (
                                    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="text-sm font-semibold truncate max-w-[200px]">
                                        {(() => {
                                            const parts = [];
                                            if (category) parts.push(category);
                                            if (minSurface || maxSurface) parts.push('Surface');
                                            if (roomCount > 0) parts.push('Pièces');
                                            if (furnished) parts.push(furnished === 'furnished' ? 'Meublé' : 'Non meublé');
                                            if (dpeMin) parts.push(`DPE ${dpeMin}${dpeMax && dpeMax !== dpeMin ? `-${dpeMax}` : ''}`);
                                            if (amenities.length > 0) parts.push(`${amenities.length} caract.`);
                                            if (propertyTypes.length > 0) parts.push(propertyTypes.join(', '));
                                            return parts.length > 0 ? parts.join(', ') : 'Type, surface, pièces...';
                                        })()}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence initial={false}>
                            {step === STEPS.FILTERS && (
                            <motion.div
                                key="filters-content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="flex-1 min-h-0 overflow-y-auto"
                            >
                                <div className="px-4 pb-4 pt-1 flex flex-col gap-4">

                                        {/* Type de logement */}
                                        <div className="flex flex-col gap-2">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">Type de logement</div>
                                            <div className="flex gap-2">
                                                {categories.map((item) => {
                                                    const Icon = item.icon;
                                                    const isSelected = category.split(',').includes(item.label);
                                                    return (
                                                        <button
                                                            key={item.label}
                                                            type="button"
                                                            onClick={() => {
                                                                let current = category ? category.split(',') : [];
                                                                if (current.includes(item.label)) {
                                                                    current = current.filter(c => c !== item.label);
                                                                } else {
                                                                    current.push(item.label);
                                                                }
                                                                setCategory(current.join(','));
                                                            }}
                                                            className={`flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition active:scale-[0.98] text-sm font-medium
                                                                ${isSelected
                                                                    ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900'
                                                                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500'}
                                                            `}
                                                        >
                                                            <Icon className="w-5 h-5 shrink-0" />
                                                            <span>{item.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

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

                                        {/* Rooms & Bedrooms — Range Picker */}
                                        <div className="flex flex-col gap-6">
                                            {([
                                                { label: 'Pièces', min: roomCount, max: roomCountMax, setMin: setRoomCount, setMax: setRoomCountMax },
                                                { label: 'Chambres', min: bedroomCount, max: bedroomCountMax, setMin: setBedroomCount, setMax: setBedroomCountMax },
                                            ] as const).map((field, idx) => (
                                                <div key={field.label} className="flex flex-col gap-2">
                                                    {idx > 0 && <hr className="border-neutral-100 dark:border-neutral-800 -mt-3 mb-1" />}
                                                    <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">{field.label}</div>
                                                    <div className="flex gap-2">
                                                        {[1, 2, 3, 4, 5, 6].map((n) => {
                                                            const isMin = field.min === n;
                                                            const isMax = field.max === n;
                                                            const isInRange = field.min > 0 && field.max > 0 && n > field.min && n < field.max;
                                                            return (
                                                                <button
                                                                    key={n}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isMin && field.max === 0) {
                                                                            // Only min selected, deselect
                                                                            field.setMin(0);
                                                                        } else if (isMin && field.max > 0) {
                                                                            // Deselect min, max becomes the only value
                                                                            field.setMin(field.max);
                                                                            field.setMax(0);
                                                                        } else if (isMax) {
                                                                            // Deselect max
                                                                            field.setMax(0);
                                                                        } else if (field.min === 0) {
                                                                            // Nothing selected, set as min
                                                                            field.setMin(n);
                                                                        } else if (field.max === 0) {
                                                                            // One value selected, create range
                                                                            const lo = Math.min(field.min, n);
                                                                            const hi = Math.max(field.min, n);
                                                                            if (lo === hi) {
                                                                                field.setMin(0);
                                                                                field.setMax(0);
                                                                            } else {
                                                                                field.setMin(lo);
                                                                                field.setMax(hi);
                                                                            }
                                                                        } else {
                                                                            // Range exists, tap inside range or outside — reset to single
                                                                            field.setMin(n);
                                                                            field.setMax(0);
                                                                        }
                                                                    }}
                                                                    className={`
                                                                        w-11 h-11 rounded-xl text-lg font-semibold transition-all active:scale-95 border-2
                                                                        ${(isMin || isMax)
                                                                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                                                            : isInRange
                                                                                ? 'bg-neutral-200 text-neutral-900 border-neutral-300 dark:bg-neutral-700 dark:text-white dark:border-neutral-600'
                                                                                : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                                        }
                                                                    `}
                                                                >
                                                                    {n}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

                                        {/* Salles de bain */}
                                        <div className="flex flex-col gap-2">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">Salles de bain</div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (bathroomCount >= 2) {
                                                        setBathroomCount(0);
                                                        setBathroomCountMax(0);
                                                    } else {
                                                        setBathroomCount(2);
                                                        setBathroomCountMax(0);
                                                    }
                                                }}
                                                className={`w-fit px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border
                                                    ${bathroomCount >= 2
                                                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                                        : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                    }`}
                                            >
                                                2+ salles de bain
                                            </button>
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

                                        {/* Type de location */}
                                        <div className="flex flex-col gap-2">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">Type de location</div>
                                            <div className="flex gap-2">
                                                {([
                                                    { key: 'furnished' as const, label: 'Meublé' },
                                                    { key: 'unfurnished' as const, label: 'Non meublé' },
                                                ] as const).map((opt) => (
                                                    <button
                                                        key={opt.key}
                                                        type="button"
                                                        onClick={() => setFurnished(furnished === opt.key ? null : opt.key)}
                                                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border
                                                            ${furnished === opt.key
                                                                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                                                : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

                                        {/* Type de bail */}
                                        <div className="flex flex-col gap-2">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">Type de bail</div>
                                            <div className="flex gap-2">
                                                {[
                                                    { key: 'classique', label: 'Classique' },
                                                    { key: 'colocation', label: 'Colocation' },
                                                ].map((opt) => {
                                                    const isSelected = propertyTypes.includes(opt.key);
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            type="button"
                                                            onClick={() => setPropertyTypes(isSelected ? propertyTypes.filter(t => t !== opt.key) : [...propertyTypes, opt.key])}
                                                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border
                                                                ${isSelected
                                                                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                                                    : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

                                        {/* Type de bien */}
                                        <div className="flex flex-col gap-2">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">Type de bien</div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { key: 'studio', label: 'Studio' },
                                                    { key: 'duplex', label: 'Duplex' },
                                                    { key: 'triplex', label: 'Triplex' },
                                                    { key: 'loft', label: 'Loft' },
                                                ].map((opt) => {
                                                    const isSelected = propertyTypes.includes(opt.key);
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            type="button"
                                                            onClick={() => setPropertyTypes(isSelected ? propertyTypes.filter(t => t !== opt.key) : [...propertyTypes, opt.key])}
                                                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border
                                                                ${isSelected
                                                                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                                                    : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

                                        {/* Étage */}
                                        <div className="flex flex-col gap-2">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">Étage</div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { key: 'rdc', label: 'RDC' },
                                                    { key: 'lastFloor', label: 'Dernier étage' },
                                                    { key: 'highFloor', label: 'Étage élevé' },
                                                ].map((opt) => {
                                                    const isSelected = floorTypes.includes(opt.key);
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            type="button"
                                                            onClick={() => setFloorTypes(isSelected ? floorTypes.filter(t => t !== opt.key) : [...floorTypes, opt.key])}
                                                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border
                                                                ${isSelected
                                                                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                                                    : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

                                        {/* DPE */}
                                        <div className="flex flex-col gap-2">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">DPE</div>
                                            <div className="flex gap-1.5">
                                                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((letter) => {
                                                    const DPE_BG: Record<string, string> = {
                                                        A: '#30953a', B: '#50a747', C: '#c8df46', D: '#f3e51f',
                                                        E: '#f0b41c', F: '#eb8234', G: '#d7231e',
                                                    };
                                                    const DPE_TEXT: Record<string, string> = {
                                                        A: '#fff', B: '#fff', C: '#000', D: '#000',
                                                        E: '#000', F: '#fff', G: '#fff',
                                                    };
                                                    const grades = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
                                                    const idx = grades.indexOf(letter);
                                                    const minIdx = dpeMin ? grades.indexOf(dpeMin) : -1;
                                                    const maxIdx = dpeMax ? grades.indexOf(dpeMax) : -1;
                                                    const isEndpoint = letter === dpeMin || letter === dpeMax;
                                                    const isInRange = minIdx >= 0 && maxIdx >= 0 && idx > minIdx && idx < maxIdx;
                                                    const isSelected = isEndpoint || isInRange;

                                                    return (
                                                        <button
                                                            key={letter}
                                                            type="button"
                                                            onClick={() => {
                                                                if (letter === dpeMin && !dpeMax) {
                                                                    setDpeMin('');
                                                                } else if (letter === dpeMin && dpeMax) {
                                                                    setDpeMin(dpeMax); setDpeMax('');
                                                                } else if (letter === dpeMax) {
                                                                    setDpeMax('');
                                                                } else if (!dpeMin) {
                                                                    setDpeMin(letter);
                                                                } else if (!dpeMax) {
                                                                    const lo = Math.min(grades.indexOf(dpeMin), idx);
                                                                    const hi = Math.max(grades.indexOf(dpeMin), idx);
                                                                    if (lo === hi) { setDpeMin(''); setDpeMax(''); }
                                                                    else { setDpeMin(grades[lo]); setDpeMax(grades[hi]); }
                                                                } else {
                                                                    setDpeMin(letter); setDpeMax('');
                                                                }
                                                            }}
                                                            className="flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                            style={{
                                                                backgroundColor: isSelected ? DPE_BG[letter] : `${DPE_BG[letter]}20`,
                                                                color: isSelected ? DPE_TEXT[letter] : DPE_BG[letter],
                                                            }}
                                                        >
                                                            {letter}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

                                        {/* Caractéristiques par catégories */}
                                        <div className="flex flex-col gap-6">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">Caractéristiques</div>
                                            {[
                                                {
                                                    title: 'Extérieur & Annexes',
                                                    items: [
                                                        { key: 'hasBalcony', label: 'Balcon' },
                                                        { key: 'hasTerrace', label: 'Terrasse' },
                                                        { key: 'hasGarden', label: 'Jardin' },
                                                        { key: 'hasPool', label: 'Piscine' },
                                                        { key: 'hasParking', label: 'Parking' },
                                                        { key: 'hasGarage', label: 'Garage' },
                                                        { key: 'hasCave', label: 'Cave' },
                                                    ],
                                                },
                                                {
                                                    title: 'Confort & Intérieur',
                                                    items: [
                                                        { key: 'isKitchenEquipped', label: 'Cuisine équipée' },
                                                        { key: 'hasAirConditioning', label: 'Climatisation' },
                                                        { key: 'hasFiber', label: 'Fibre' },
                                                        { key: 'isBright', label: 'Lumineux' },
                                                    ],
                                                },
                                                {
                                                    title: 'Sécurité & Accessibilité',
                                                    items: [
                                                        { key: 'hasElevator', label: 'Ascenseur' },
                                                        { key: 'isAccessible', label: 'Accès PMR' },
                                                        { key: 'hasArmoredDoor', label: 'Porte blindée' },
                                                    ],
                                                },
                                                {
                                                    title: 'Accueil',
                                                    items: [
                                                        { key: 'petsAllowed', label: 'Pet friendly' },
                                                        { key: 'isStudentFriendly', label: 'Étudiant friendly' },
                                                    ],
                                                },
                                            ].map((group) => (
                                                <div key={group.title} className="flex flex-col gap-2">
                                                    <div className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">{group.title}</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {group.items.map((opt) => {
                                                            const isSelected = amenities.includes(opt.key);
                                                            return (
                                                                <button
                                                                    key={opt.key}
                                                                    type="button"
                                                                    onClick={() => setAmenities(isSelected ? amenities.filter(a => a !== opt.key) : [...amenities, opt.key])}
                                                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border
                                                                        ${isSelected
                                                                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                                                            : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                                        }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <hr className="border-neutral-100 dark:border-neutral-800" />

                                        {/* Chauffage */}
                                        <div className="flex flex-col gap-2">
                                            <div className="text-lg font-semibold text-neutral-800 dark:text-neutral-300">Chauffage</div>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { key: 'COL_GAS', label: 'Collectif gaz' },
                                                    { key: 'COL_URB', label: 'Collectif urbain' },
                                                ].map((opt) => {
                                                    const isSelected = heatingTypes.includes(opt.key);
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            type="button"
                                                            onClick={() => setHeatingTypes(isSelected ? heatingTypes.filter(h => h !== opt.key) : [...heatingTypes, opt.key])}
                                                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 border
                                                                ${isSelected
                                                                    ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                                                                    : 'bg-white text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
            </div>
        );
    }

    if (step === STEPS.COMMUTE) {
        bodyContent = (
            <div className="flex flex-col gap-6 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
                {/* Intro Card */}
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl flex gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <div className="shrink-0 pt-0.5">
                        <Briefcase size={18} />
                    </div>
                    <div>
                        <span className="block font-semibold text-black dark:text-white mb-1">Recherche par temps de trajet</span>
                        Trouvez les logements situés à moins de {commuteTime} min de votre lieu de travail ou d'études.
                    </div>
                </div>

                <ListingCommuteStep
                    commutePoints={commutePoints}
                    setCommutePoints={setCommutePoints}
                />

                {!isLoadingFavorites && (
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
                            setStep(STEPS.LOCATION);
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
                )}
            </div>
        )
    }

    if (step === STEPS.SAVE_FAVORITE) {
        bodyContent = (
            <div className="flex flex-col gap-6 p-6">
                <Heading
                    title={editingId ? "Modifier le lieu" : "Enregistrer ce lieu"}
                    subtitle="Donnez un nom à ce lieu pour le retrouver facilement (ex: Travail, École...)"
                />

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                            {favoriteIcon === 'briefcase' && <Briefcase size={24} />}
                            {favoriteIcon === 'home' && <Home size={24} />}
                            {favoriteIcon === 'school' && <GraduationCap size={24} />}
                            {favoriteIcon === 'favorite' && <Star size={24} />}
                            {favoriteIcon === 'partner' && <Heart size={24} />}
                        </div>
                        <div className="flex-1">
                            {isEditingTitle ? (
                                <input
                                    type="text"
                                    className="w-full text-xl font-bold border-b border-neutral-300 focus:outline-none focus:border-black bg-transparent"
                                    value={favoriteTitle}
                                    onChange={(e) => setFavoriteTitle(e.target.value)}
                                    onBlur={() => setIsEditingTitle(false)}
                                    autoFocus
                                />
                            ) : (
                                <div
                                    className="text-xl font-bold flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-1 rounded -ml-1"
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    {favoriteTitle}
                                    <Pencil size={14} className="text-neutral-400" />
                                </div>
                            )}
                            <div className="text-sm text-neutral-500 truncate">{tempLocation?.label}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-3 mt-2">
                        {[
                            { id: 'briefcase', icon: Briefcase, label: 'Travail' },
                            { id: 'school', icon: GraduationCap, label: 'École' },
                            { id: 'home', icon: Home, label: 'Maison' },
                            { id: 'partner', icon: Heart, label: 'Partenaire' },
                            { id: 'favorite', icon: Star, label: 'Favori' },
                        ].map((item) => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    setFavoriteIcon(item.id);
                                    if (favoriteTitle === 'Travail' || favoriteTitle === 'École' || favoriteTitle === 'Maison' || favoriteTitle === 'Favori' || favoriteTitle === 'Partenaire' || favoriteTitle === '') {
                                        setFavoriteTitle(item.label);
                                    }
                                }}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${favoriteIcon === item.id ? 'border-black bg-black text-white' : 'border-neutral-200 hover:border-neutral-600'}`}
                            >
                                <item.icon size={20} />
                                <div className="text-[10px] font-medium">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {searchModal.isOpen && (
                <motion.div
                    key="search-modal"
                    className="fixed inset-0 z-9999"
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-neutral-800/50"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1 }
                        }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        onClick={searchModal.onClose}
                    />
                    {/* Centering wrapper */}
                    <div className="absolute inset-0 flex items-start md:items-center justify-center pointer-events-none">
                        <motion.div
                            className="w-full h-full md:h-auto md:w-4/6 lg:w-3/6 xl:w-2/5 md:my-6 md:max-h-[calc(100dvh-48px)] md:rounded-[25px] md:shadow-[0_0_30px_rgba(0,0,0,0.15)] bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md flex flex-col pt-safe md:pt-0 overflow-hidden pointer-events-auto"
                            variants={{
                                hidden: { y: -30, opacity: 0, scale: 0.96 },
                                visible: { y: 0, opacity: 1, scale: 1 }
                            }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            style={{ transformOrigin: 'top center' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <div className="flex items-center justify-end p-5 shrink-0">
                                <button
                                    onClick={searchModal.onClose}
                                    className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Body */}
                            {step <= STEPS.FILTERS ? (
                                <>
                                    {bodyContent}
                                    {actionLabel && (
                                        <div className="shrink-0 px-4 pt-3 pb-safe">
                                            <Button
                                                onClick={onSubmit}
                                                className="w-full rounded-full h-[50px] text-[16px]"
                                            >
                                                {actionLabel}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                                    <div className="p-2.5">
                                        {bodyContent}
                                    </div>
                                    {actionLabel && (
                                        <div className="sticky bottom-0 left-0 right-0 z-10 px-4 pt-3 pb-safe bg-linear-to-t from-white/70 via-white/70 to-transparent dark:from-neutral-900/70 dark:via-neutral-900/70 dark:to-transparent backdrop-blur-xl">
                                            <Button
                                                onClick={onSubmit}
                                                className="w-full rounded-full h-[50px] text-[16px]"
                                            >
                                                {actionLabel}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default SearchModal;
