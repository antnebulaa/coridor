'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Briefcase, Star, MoreHorizontal, Search, Pencil, Trash, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
    const ease = [0.25, 0.1, 0.25, 1] as const;

    if (step <= STEPS.FILTERS) {
        const sections = [
            { key: STEPS.LOCATION, label: 'Où ?', stepVal: STEPS.LOCATION },
            { key: STEPS.CATEGORY, label: 'Quoi ?', stepVal: STEPS.CATEGORY },
            { key: STEPS.BUDGET, label: 'Budget', stepVal: STEPS.BUDGET },
            { key: STEPS.FILTERS, label: 'Filtres', stepVal: STEPS.FILTERS },
        ];

        // Animation Variants
        const containerVariants = {
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: {
                    staggerChildren: 0.1,
                    delayChildren: 0.1
                }
            }
        };

        const itemVariants = {
            hidden: { opacity: 0, y: 20 },
            show: {
                opacity: 1,
                y: 0,
                transition: {
                    type: "spring" as const,
                    stiffness: 260,
                    damping: 20
                }
            }
        };

        bodyContent = (
            <div className="flex flex-col gap-2 p-0 md:p-4">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col gap-2"
                >
                    {/* 1. LOCATION SECTION */}
                    <motion.div
                        variants={itemVariants}
                        className={`flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-shadow duration-300 ${step === STEPS.LOCATION ? 'shadow-lg ring-1 ring-black ring-opacity-5' : ''}`}
                    >
                        <div
                            onClick={() => setStep(STEPS.LOCATION)}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.LOCATION ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                        >
                            <div className={`transition-all duration-300 ${step === STEPS.LOCATION ? "text-lg font-bold text-neutral-900 dark:text-neutral-100" : "text-xl font-medium text-neutral-500"}`}>Où ?</div>
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
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* 2. CATEGORY SECTION */}
                    <motion.div
                        variants={itemVariants}
                        className={`flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-shadow duration-300 ${step === STEPS.CATEGORY ? 'shadow-lg ring-1 ring-black ring-opacity-5' : ''}`}
                    >
                        <div
                            onClick={() => setStep(STEPS.CATEGORY)}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.CATEGORY ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                        >
                            <div className={`transition-all duration-300 ${step === STEPS.CATEGORY ? "text-lg font-bold text-neutral-900 dark:text-neutral-100" : "text-xl font-medium text-neutral-500"}`}>Quoi ?</div>
                            <AnimatePresence mode="wait">
                                {step !== STEPS.CATEGORY && (
                                    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="text-sm font-semibold truncate max-w-[200px]">
                                        {category ? category : 'Type de logement'}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence initial={false}>
                            {step === STEPS.CATEGORY && (
                                <motion.div
                                    key="category-content"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ height: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 0.2, delay: 0.1 } }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 pt-1">
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
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* 3. BUDGET SECTION */}
                    <motion.div
                        variants={itemVariants}
                        className={`flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-shadow duration-300 ${step === STEPS.BUDGET ? 'shadow-lg ring-1 ring-black ring-opacity-5' : ''}`}
                    >
                        <div
                            onClick={() => {
                                setStep(STEPS.BUDGET);
                                setTimeout(() => minPriceRef.current?.focus(), 150);
                            }}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.BUDGET ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                        >
                            <div className={`transition-all duration-300 ${step === STEPS.BUDGET ? "text-lg font-bold text-neutral-900 dark:text-neutral-100" : "text-xl font-medium text-neutral-500"}`}>Budget</div>
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
                    </motion.div>

                    {/* 4. FILTERS SECTION (Features) */}
                    <motion.div
                        variants={itemVariants}
                        className={`flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden transition-shadow duration-300 ${step === STEPS.FILTERS ? 'shadow-lg ring-1 ring-black ring-opacity-5' : ''}`}
                    >
                        <div
                            onClick={() => setStep(STEPS.FILTERS)}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${step === STEPS.FILTERS ? 'pb-0 hover:bg-transparent dark:hover:bg-transparent' : ''}`}
                        >
                            <div className={`transition-all duration-300 ${step === STEPS.FILTERS ? "text-lg font-bold text-neutral-900 dark:text-neutral-100" : "text-xl font-medium text-neutral-500"}`}>Filtres</div>
                            <AnimatePresence mode="wait">
                                {step !== STEPS.FILTERS && (
                                    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="text-sm font-semibold truncate max-w-[200px]">
                                        Surface, pièces...
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence initial={false}>
                            {step === STEPS.FILTERS && (
                                <motion.div
                                    key="filters-content"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ height: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 0.2, delay: 0.1 } }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 pt-1 flex flex-col gap-4">



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
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
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

    return (
        <Modal
            isOpen={searchModal.isOpen}
            onClose={searchModal.onClose}
            onSubmit={onSubmit}
            title="Rechercher"
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step === STEPS.LOCATION ? undefined : onBack}
            body={bodyContent}
        />
    );
};

export default SearchModal;
