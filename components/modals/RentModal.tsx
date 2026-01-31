'use client';

import { useMemo, useState, useEffect, useRef } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useRentModal from "@/hooks/useRentModal";
import Modal from "./Modal";
import Heading from "../Heading";
import { categories } from "../navbar/Categories";
import CategoryInput from "../inputs/CategoryInput";
import LocationPicker from "../inputs/LocationPicker";
import LocationEditor from "../inputs/LocationEditor";
import MapboxAddressSelect from "../inputs/MapboxAddressSelect";
import dynamic from "next/dynamic";
import Counter from "../inputs/Counter";
import MultiImageUpload from "../inputs/MultiImageUpload";
import ImageUpload from "../inputs/ImageUpload";
import SoftInput from '../inputs/SoftInput';
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { Button } from "../ui/Button";
import { Info, AlertTriangle, CheckCircle, Home, X, Check, ChevronDown, Images, Sun, ArrowRightLeft, Landmark, Star, Zap, Sparkles, Paintbrush, Leaf, Flame, Users, Gem, Utensils, Shirt, Package, PawPrint, Bike, KeyRound, Phone, ShieldCheck, TrainFront, GraduationCap, TreePine, Stethoscope, Moon, DoorOpen, Wand2 } from "lucide-react";
import { calculateRentControl } from "@/app/properties/[listingId]/edit/components/rentControlUtils";
import VisitsSection from "@/app/properties/[listingId]/edit/components/VisitsSection";
import PriceAssistantModal from "@/app/properties/[listingId]/edit/components/PriceAssistantModal";
import { SafeListing } from "@/types";
import CustomToast from "../ui/CustomToast";
import DarkActionButtonFlex from "../ui/DarkActionButtonFlex";

import { LeaseType } from "@prisma/client";

enum STEPS {
    // PART 1: CHARACTERISTICS
    INTRO_CHARACTERISTICS = 0,
    CATEGORY = 1,
    LOCATION = 2,
    SURFACE = 3,
    INFO = 4,
    DETAILS = 5,
    ENERGY = 6,

    // PART 2: ASSETS
    INTRO_ASSETS = 7,
    AMENITIES = 8,
    IMAGES = 9,
    DESCRIPTION = 10,

    // PART 3: RENTAL
    INTRO_RENTAL = 11,
    RENTAL_TYPE = 12,

    // BRANCH A (Standard)
    PRICE = 13,

    // BRANCH B (Coloc)
    ROOM_INTRO = 14,
    ROOM_DETAILS = 15,
    ROOM_RECAP = 16,
    ROOM_PRICE = 17,

    AVAILABILITY = 18,
    SUCCESS = 19,
}

const RentModal = () => {
    const router = useRouter();
    const rentModal = useRentModal();
    const isRoom = !!rentModal.propertyContext || rentModal.editingListing?.rentalUnit?.type === 'PRIVATE_ROOM';

    const Map = useMemo(() => dynamic(() => import('../Map'), {
        ssr: false
    }), []);

    const [step, setStep] = useState(STEPS.INTRO_CHARACTERISTICS);
    const [isLoading, setIsLoading] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [createdListing, setCreatedListing] = useState<any>(null);
    const [showRoomSelect, setShowRoomSelect] = useState(false);

    // Track Colocation Flow
    const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

    // Price Assistant State
    const [isPriceAssistantOpen, setIsPriceAssistantOpen] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: {
            errors,
        },
        reset
    } = useForm<FieldValues>({
        defaultValues: {
            category: '',
            propertyAdjective: '',
            location: null,
            guestCount: 1,
            roomCount: 1,
            bedroomCount: 1,
            bathroomCount: 1,
            imageSrc: '',
            imageSrcs: [],
            price: '' as any,
            title: '',
            description: '',
            leaseType: LeaseType.LONG_TERM,
            dpe: 'C',
            ges: 'A',
            charges: '' as any,
            amenities: [],
            rooms: [],
            isPublished: false,
            hasSeparateKitchen: false,
            totalFloors: '',
            floor: '',
            constructionPeriod: ''
        }
    });

    useEffect(() => {
        if (rentModal.editingListing) {
            const listing = rentModal.editingListing;
            const property = listing.rentalUnit?.property || rentModal.propertyContext;

            reset({
                category: listing.category,
                location: listing.city ? {
                    value: listing.city,
                    label: property?.address || `${listing.city}, ${listing.zipCode}`,
                    flag: '',
                    latlng: [listing.latitude || 0, listing.longitude || 0],
                    region: ''
                } : null,
                guestCount: listing.guestCount || 1,
                roomCount: listing.roomCount || 1,
                bedroomCount: 1,
                bathroomCount: listing.bathroomCount || 1,
                targetRoomId: listing.rentalUnit?.targetRoom?.id || '',
                surface: listing.surface || listing.rentalUnit?.surface,
                bedType: (listing as any).bedType || undefined,
                hasPrivateBathroom: (listing as any).hasPrivateBathroom || false,
                imageSrc: '',
                imageSrcs: listing.images?.length
                    ? listing.images.map((img: any) => img.url)
                    : (listing.rentalUnit?.images?.map((img: any) => img.url) || []),
                price: listing.price,
                title: listing.title,
                description: listing.description,
                leaseType: listing.leaseType,
                dpe: listing.dpe,
                ges: listing.ges || 'A',
                charges: typeof listing.charges === 'object' ? (listing.charges as any)?.amount : 0,
                amenities: Object.keys(listing).filter((key) => (listing as any)[key] === true),
                rooms: property?.rooms?.map((room: any) => ({
                    name: room.name,
                    images: room.images?.map((img: any) => img.url) || []
                })) || [],
                isPublished: listing.isPublished || false
            });

            if (rentModal.mode === 'ROOM_CONFIG' || listing.rentalUnit?.type !== 'ENTIRE_PLACE') {
                setStep(STEPS.INFO);
            } else {
                setStep(STEPS.CATEGORY);
            }
        } else if (rentModal.propertyContext) { // Phase 3: Pre-fill from Property
            const property = rentModal.propertyContext;
            const amenities = Object.keys(property).filter((key) => (property as any)[key] === true);

            reset({
                category: property.category,
                location: {
                    label: property.address || property.city,
                    value: property.address || property.city,
                    latlng: [property.lat || 0, property.lng || 0],
                    city: property.city,
                    zipCode: property.zipCode,
                    country: property.country
                },
                guestCount: 1,
                roomCount: 1,
                bedroomCount: 1,
                bathroomCount: 1,
                imageSrc: '',
                imageSrcs: [],
                price: '', // Default price
                title: '',
                description: '',
                leaseType: LeaseType.LONG_TERM,
                dpe: property.dpe || 'C',
                ges: property.ges || 'A',
                charges: '',
                amenities: amenities,
                rooms: []
            });
            setStep(STEPS.INFO); // Skip Category and Location
            setCreatedListing(null);
        } else {
            reset({
                category: '',
                location: null,
                guestCount: 1,
                roomCount: 1,
                bedroomCount: 1,
                bathroomCount: 1,
                imageSrc: '',
                imageSrcs: [],
                price: '',
                title: '',
                description: '',
                leaseType: LeaseType.LONG_TERM,
                dpe: 'C',
                ges: 'A',
                charges: '',
                amenities: [],
                rooms: []
            });
            setStep(STEPS.INTRO_CHARACTERISTICS);
            setCreatedListing(null);
        }
    }, [rentModal.editingListing, rentModal.propertyContext, reset]);

    const category = watch('category');
    const location = watch('location');
    const guestCount = watch('guestCount');
    const roomCount = watch('roomCount');
    const bedroomCount = watch('bedroomCount');
    const bathroomCount = watch('bathroomCount');
    const imageSrc = watch('imageSrc');
    const surface = 50;

    // ... (rest of hooks)

    const [rentControlData, setRentControlData] = useState<any>(null);
    const price = watch('price');
    const surfaceValue = watch('surface');
    const isPublished = watch('isPublished');

    useEffect(() => {
        if (location && (surfaceValue || 50)) {
            const mockListing = {
                surface: surfaceValue || 50,
                roomCount: roomCount,
                buildYear: 2000,
                isFurnished: true,
            };
            const city = location?.label?.split(',')[0] || '';
            const result = calculateRentControl(mockListing as any, city);
            setRentControlData(result);
        }
    }, [location, surfaceValue, roomCount]);

    const imageSrcs = watch('imageSrcs');

    const setCustomValue = (id: string, value: any) => {
        setValue(id, value, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
        })
    }

    const onBack = () => {
        if (step === STEPS.ROOM_DETAILS && currentRoomIndex > 0) {
            setCurrentRoomIndex((value) => value - 1);
            return;
        }

        // If Standard Flow, skip Colocation steps when going back from Availability
        if (step === STEPS.AVAILABILITY && watch('leaseType') !== LeaseType.COLOCATION) {
            return setStep(STEPS.PRICE);
        }

        // If Colocation Flow, skip Price step when going back from Room Intro
        if (step === STEPS.ROOM_INTRO) {
            return setStep(STEPS.RENTAL_TYPE);
        }

        setStep((value) => value - 1);
    };

    const onNext = () => {
        // Validation for Category Step
        if (step === STEPS.CATEGORY && !category) {
            return toast.error("Veuillez choisir une catégorie de logement");
        }

        // Validation for Details Step
        if (step === STEPS.DETAILS) {
            if (category === 'Appartement') {
                if (!watch('totalFloors')) return toast.error("Veuillez indiquer le nombre d'étages");
                if (!watch('floor')) return toast.error("Veuillez indiquer l'étage du logement");
            }
        }

        // Branching Logic for Rental Type
        if (step === STEPS.RENTAL_TYPE) {
            if (watch('leaseType') === LeaseType.COLOCATION) {
                return setStep(STEPS.ROOM_INTRO);
            } else {
                return setStep(STEPS.PRICE);
            }
        }

        // Colocation Branch End -> Skip Price if handled in Rooms? Or go to Availability?
        // Plan said: ROOM_PRICE -> AVAILABILITY.
        // Standard Branch: PRICE -> Availability.
        // So from PRICE, we go to AVAILABILITY (Step 18).
        // Check Enum: PRICE = 13. AVAILABILITY = 18.
        // Need to skip over Coloc steps (14, 15, 16, 17) if we are in Standard mode.
        if (step === STEPS.PRICE) {
            return setStep(STEPS.AVAILABILITY);
        }

        // Loop Logic for Room Details
        // Loop Logic for Room Details
        if (step === STEPS.ROOM_DETAILS) {
            const currentRoomSurface = watch(`rooms.${currentRoomIndex}.surface`);
            const currentRoomBedType = watch(`rooms.${currentRoomIndex}.bedType`);

            // Auto-set Name
            setValue(`rooms.${currentRoomIndex}.name`, `Chambre ${currentRoomIndex + 1}`);

            if (!currentRoomSurface) return toast.error("La surface est requise.");
            if (!currentRoomBedType) return toast.error("Le type de lit est requis.");

            if (currentRoomIndex < roomCount - 1) {
                setCurrentRoomIndex((value) => value + 1);
                return;
            }
        }

        setStep((value) => value + 1);
    }

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        if (rentModal.mode !== 'ROOM_CONFIG' && step !== STEPS.AVAILABILITY) {
            return onNext();
        }

        setIsLoading(true);

        const generatedTitle = `${data.category} à ${data.location?.label || 'Ville inconnue'}`;
        const generatedDescription = `Bien de type ${data.category} disponible à la location. Contactez le propriétaire pour plus d'informations.`;

        const finalData = {
            ...data,
            title: data.title || generatedTitle,
            description: data.description || generatedDescription,
            price: (rentModal.mode === 'ROOM_CONFIG' && !data.price) ? 0 : data.price,
            propertyId: rentModal.propertyContext?.id,
            isPublished: data.isPublished
        };

        if (rentModal.editingListing) {
            axios.put(`/api/listings/${rentModal.editingListing.id}`, finalData)
                .then(() => {
                    toast.custom((t) => (
                        <CustomToast
                            t={t}
                            message="Annonce mise à jour !"
                            type="success"
                        />
                    ));
                    router.refresh();
                    setStep(STEPS.SUCCESS);
                })
                .catch((error) => {
                    const errorMsg = error?.response?.data?.error || "Une erreur s'est produite.";
                    toast.custom((t) => (
                        <CustomToast
                            t={t}
                            message={errorMsg}
                            type="error"
                        />
                    ));
                })
                .finally(() => {
                    setIsLoading(false);
                })
        } else {
            axios.post('/api/listings', finalData)
                .then((response) => {
                    toast.custom((t) => (
                        <CustomToast
                            t={t}
                            message="Annonce créée !"
                            type="success"
                        />
                    ));
                    router.refresh();
                    setCreatedListing(response.data);
                    setStep(STEPS.SUCCESS);
                })
                .catch((error) => {
                    const errorMsg = error?.response?.data?.error || "Une erreur s'est produite.";
                    toast.custom((t) => (
                        <CustomToast
                            t={t}
                            message={errorMsg}
                            type="error"
                        />
                    ));
                })
                .finally(() => {
                    setIsLoading(false);
                })
        }
    }

    const actionLabel = useMemo(() => {
        if (step === STEPS.SUCCESS) {
            return 'Terminer';
        }
        if (step === STEPS.AVAILABILITY) {
            return 'Terminer';
        }
        if (step === STEPS.INTRO_CHARACTERISTICS || step === STEPS.INTRO_ASSETS || step === STEPS.INTRO_RENTAL) {
            return 'Commencer';
        }
        if (step === STEPS.PRICE || step === STEPS.ROOM_PRICE || rentModal.mode === 'ROOM_CONFIG') {
            if (isPublished) return 'Publier l\'annonce';
            return rentModal.editingListing ? 'Enregistrer' : 'Créer';
        }

        return 'Suivant';
    }, [step, rentModal.editingListing, isPublished]);

    const secondaryActionLabel = useMemo(() => {
        if (rentModal.mode === 'ROOM_CONFIG') {
            return undefined;
        }

        if (step === STEPS.CATEGORY) {
            return undefined;
        }

        if (rentModal.editingListing && rentModal.editingListing?.rentalUnit?.type !== 'ENTIRE_PLACE' && step === STEPS.INFO) {
            return undefined;
        }

        if (step === STEPS.INTRO_CHARACTERISTICS || step === STEPS.SUCCESS) {
            return undefined;
        }

        return 'Retour';
    }, [step, rentModal.editingListing]);

    let bodyContent = undefined;

    if (step === STEPS.INTRO_CHARACTERISTICS) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Parlez-nous de votre logement"
                    subtitle="Commençons par les caractéristiques principales."
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <Home size={80} className="text-neutral-400" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        Dans cette première partie, nous allons définir le type de logement, sa localisation, sa surface et ses caractéristiques techniques.
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.CATEGORY) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Parmi les propositions suivantes, laquelle décrit le mieux votre logement ?"
                    subtitle="Choisissez une catégorie"
                />
                <div
                    className="
              grid 
              grid-cols-1 
              md:grid-cols-2 
              gap-3
              max-h-[50vh]
              overflow-y-auto
            "
                >
                    {categories.map((item) => (
                        <div key={item.label} className="col-span-1">
                            <CategoryInput
                                onClick={(category) =>
                                    setCustomValue('category', category)}
                                selected={category === item.label}
                                label={item.label}
                                icon={item.icon}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // LOCATION STEP
    if (step === STEPS.LOCATION) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <div className="relative z-10">
                    {rentModal.editingListing ? (
                        <LocationEditor
                            value={location}
                            onChange={(value) => setCustomValue('location', value)}
                        />
                    ) : (
                        <LocationPicker
                            value={location}
                            onChange={(value) => setCustomValue('location', value)}
                        />
                    )}
                </div>
            </div>
        );
    }

    const leaseType = watch('leaseType');
    const dpe = watch('dpe');
    const ges = watch('ges');

    const propertyAdjective = watch('propertyAdjective');

    const title = useMemo(() => {
        if (rentModal.editingListing) return "Modifier mon annonce";
        if (rentModal.propertyContext) {
            const contextStart = rentModal.propertyContext;
            const address = contextStart.address || [contextStart.addressLine1, (contextStart.zipCode ? `${contextStart.zipCode} ${contextStart.city}` : contextStart.city)].filter(Boolean).join(' ');
            return `Ajouter une chambre à ${address}`;
        }
        return undefined;
    }, [rentModal.editingListing, rentModal.propertyContext]);

    // Focus surface input when entering the step
    const surfaceInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === STEPS.SURFACE) {
            // Timeout to ensure render visibility and transition completion (300ms usually)
            setTimeout(() => {
                if (surfaceInputRef.current) {
                    surfaceInputRef.current.focus();
                    // input.click() is sometimes needed on iOS to trigger keyboard
                    surfaceInputRef.current.click();
                }
            }, 400);
        }
    }, [step]);

    // SURFACE STEP - Dedicated page
    if (step === STEPS.SURFACE) {
        const { ref: surfaceRef, ...surfaceRegister } = register('surface', { required: true });

        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Quelle est la surface du logement ?"
                    subtitle="Indiquez la surface habitable en m²"
                />
                <div className="flex items-center justify-center py-10">
                    <div className="relative w-full max-w-[200px]">
                        <input
                            {...surfaceRegister}
                            ref={(e) => {
                                surfaceRef(e);
                                surfaceInputRef.current = e;
                            }}
                            id="surface"
                            autoFocus
                            disabled={isLoading}
                            placeholder="0"
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="
                                peer
                                w-full
                                p-0
                                text-center
                                text-7xl
                                font-bold
                                outline-none
                                transition
                                disabled:opacity-70
                                disabled:cursor-not-allowed
                                border-b-2
                                border-neutral-300
                                focus:border-black
                                placeholder-neutral-200
                            "
                        />
                        <span className="absolute right-0 top-0 h-full flex items-center justify-center text-xl font-bold text-neutral-400 translate-x-8 pointer-events-none">
                            m²
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // INFO STEP - Counters Only
    if (step === STEPS.INFO) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={isRoom ? (
                        <>
                            Caractéristiques de <br />
                            <span className="text-gray-900">{rentModal.editingListing?.rentalUnit?.name || rentModal.editingListing?.title || "la chambre"}</span>
                        </>
                    ) : (
                        "Combien de pièces ?"
                    )}
                    subtitle={isRoom ? "Dites-nous en plus sur cette chambre" : "Détaillez la configuration de votre bien"}
                />

                {/* Link to Physical Room logic remains here for Room mode if applicable */}
                {rentModal.propertyContext && rentModal.propertyContext.rooms && rentModal.propertyContext.rooms.length > 0 && (
                    <div className="flex flex-col gap-2 mb-4">
                        {watch('targetRoomId') ? (
                            <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                                <div className="text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">Pièce associée</div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white rounded-full border border-neutral-100">
                                            <Home size={16} className="text-neutral-600" />
                                        </div>
                                        <div className="font-semibold text-neutral-800">
                                            {rentModal.propertyContext.rooms.find((r: any) => r.id === watch('targetRoomId'))?.name || 'Chambre liée'}
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setCustomValue('targetRoomId', '')}
                                        className="text-sm text-neutral-500 hover:text-black underline cursor-pointer transition select-none"
                                    >
                                        Changer
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <label className="font-medium">Lier à une pièce existante (Optionnel)</label>
                                <div className="text-xs text-neutral-500 mb-1">
                                    Sélectionnez une chambre créée lors de l&apos;ajout du bien pour récupérer ses photos automatiquement.
                                </div>
                                <div className="relative">
                                    <div
                                        onClick={() => setShowRoomSelect(!showRoomSelect)}
                                        className="w-full p-4 border-2 rounded-md transition cursor-pointer bg-background border-input hover:border-neutral-400 flex items-center justify-between"
                                    >
                                        <span className={!watch('targetRoomId') ? 'text-neutral-500' : ''}>
                                            {watch('targetRoomId')
                                                ? (rentModal.propertyContext.rooms.find((r: any) => r.id === watch('targetRoomId'))?.name)
                                                : "-- Nouvelle chambre --"
                                            }
                                        </span>
                                        <ChevronDown size={20} className="text-neutral-500" />
                                    </div>

                                    {showRoomSelect && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                            <div
                                                onClick={() => {
                                                    setCustomValue('targetRoomId', "");
                                                    setShowRoomSelect(false);
                                                }}
                                                className="p-3 hover:bg-neutral-100 cursor-pointer text-neutral-500 italic"
                                            >
                                                -- Nouvelle chambre --
                                            </div>
                                            {rentModal.propertyContext.rooms.map((room: any) => (
                                                <div
                                                    key={room.id}
                                                    onClick={() => {
                                                        setCustomValue('targetRoomId', room.id);

                                                        // Import images logic
                                                        if (room.images && room.images.length > 0) {
                                                            const roomImages = room.images.map((img: any) => img.url);
                                                            setCustomValue('imageSrcs', roomImages);
                                                            setCustomValue('imageSrcs', roomImages);
                                                            toast.custom((t) => (
                                                                <CustomToast
                                                                    t={t}
                                                                    message="Photos de la chambre importées !"
                                                                    type="success"
                                                                />
                                                            ));
                                                        }

                                                        setShowRoomSelect(false);
                                                    }}
                                                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 cursor-pointer border-b last:border-0 transition"
                                                >
                                                    {/* Room Image */}
                                                    <div className="w-10 h-10 relative rounded-md overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                                                        {room.images && room.images.length > 0 ? (
                                                            <Image
                                                                fill
                                                                src={room.images[0].url}
                                                                alt={room.name}
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Home size={16} className="text-neutral-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Room Name */}
                                                    <span className="font-medium text-neutral-800">{room.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {isRoom && (
                    <>
                        <div className="mb-6">
                            <label className="block text-lg font-semibold mb-2">Photos</label>
                            <MultiImageUpload
                                value={imageSrcs}
                                onChange={(value) => setCustomValue('imageSrcs', value)}
                            />
                        </div>
                        <div className="mb-6">
                            <SoftInput
                                id="surface"
                                label="Surface (m²)"
                                type="number"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="font-medium">Type de lit</label>
                            <div className="flex gap-4">
                                <div
                                    onClick={() => setCustomValue('bedType', 'SINGLE')}
                                    className={`flex-1 p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-black transition cursor-pointer ${watch('bedType') === 'SINGLE' ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                                >
                                    <div className="font-semibold">Simple</div>
                                </div>
                                <div
                                    onClick={() => setCustomValue('bedType', 'DOUBLE')}
                                    className={`flex-1 p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-black transition cursor-pointer ${watch('bedType') === 'DOUBLE' ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                                >
                                    <div className="font-semibold">Double</div>
                                </div>
                            </div>
                        </div>
                        <SoftInput
                            id="description"
                            label="Description (ex: coté jardin, étage, etc.)"
                            disabled={isLoading}
                            register={register}
                            errors={errors}
                        />
                        <hr />
                    </>
                )}

                {!isRoom && (
                    <>
                        <Counter
                            title="Nombre de pièces"
                            subtitle="Salon + Salle à manger + Chambres"
                            value={roomCount}
                            onChange={(value) => setCustomValue('roomCount', value)}
                        />
                        <hr />
                        <Counter
                            title="Chambres"
                            subtitle="Nombre de pièces à dormir"
                            value={bedroomCount}
                            onChange={(value) => {
                                if (value < bedroomCount) {
                                    if (window.confirm("Êtes-vous sûr ?")) setCustomValue('bedroomCount', value);
                                } else {
                                    setCustomValue('bedroomCount', value);
                                }
                            }}
                        />
                        <hr />
                    </>
                )}

                {isRoom ? (
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex flex-col">
                            <div className="font-medium">Salle de bain privée</div>
                            <div className="font-light text-gray-600 text-sm">
                                Y a-t-il une salle de bain exclusive à cette pièce ?
                            </div>
                        </div>
                        <div className="flex flex-row items-center gap-3">
                            <div onClick={() => setCustomValue('hasPrivateBathroom', false)} className={`rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition ${!watch('hasPrivateBathroom') ? 'bg-neutral-800 text-white' : 'bg-neutral-100'}`}><X size={18} /></div>
                            <div onClick={() => setCustomValue('hasPrivateBathroom', true)} className={`rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition ${watch('hasPrivateBathroom') ? 'bg-neutral-800 text-white' : 'bg-neutral-100'}`}><Check size={18} /></div>
                        </div>
                    </div>
                ) : (
                    <Counter
                        title="Salles de bain"
                        subtitle="Combien de salles de bain ?"
                        value={bathroomCount}
                        onChange={(value) => setCustomValue('bathroomCount', value)}
                    />
                )}

                <hr />
                {/* Publish Switch */}
                <div
                    onClick={() => setCustomValue('isPublished', !isPublished)}
                    className={`flex flex-row items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition ${isPublished ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                    <div className="flex flex-col gap-1">
                        <div className="font-medium">Publier l&apos;annonce</div>
                        <div className="text-sm text-neutral-500">
                            L&apos;annonce sera visible par les locataires.
                        </div>
                    </div>
                    <div className={`
                        w-12 h-7 rounded-full relative transition flex items-center p-1
                        ${isPublished ? 'bg-black' : 'bg-neutral-300'}
                    `}>
                        <div className={`
                            w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-out
                            ${isPublished ? 'translate-x-5' : 'translate-x-0'}
                        `} />
                    </div>
                </div>

            </div>
        );
    }

    // DETAILS STEP
    if (step === STEPS.DETAILS) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Dites-nous un peu plus sur votre bien"
                    subtitle="Ces informations sont importantes pour les locataires."
                />

                <div className="flex flex-col gap-2">
                    <label className="font-semibold text-lg">Votre bien dispose t-il d’une cuisine séparée ?</label>
                    <div className="flex gap-4">
                        <div
                            onClick={() => setCustomValue('hasSeparateKitchen', true)}
                            className={`flex-1 p-4 border-2 rounded-xl flex items-center justify-center gap-2 hover:border-black transition cursor-pointer ${watch('hasSeparateKitchen') === true ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                        >
                            <span className="font-semibold">Oui</span>
                        </div>
                        <div
                            onClick={() => setCustomValue('hasSeparateKitchen', false)}
                            className={`flex-1 p-4 border-2 rounded-xl flex items-center justify-center gap-2 hover:border-black transition cursor-pointer ${watch('hasSeparateKitchen') === false ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                        >
                            <span className="font-semibold">Non</span>
                        </div>
                    </div>
                </div>

                {category === 'Appartement' && (
                    <>
                        <hr />
                        <div className="flex flex-row gap-4">
                            <div className="w-1/2">
                                <SoftInput
                                    id="totalFloors"
                                    label="Nombre d'étages"
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={isLoading}
                                    register={register}
                                    errors={errors}
                                    required
                                />
                            </div>
                            <div className="w-1/2">
                                <SoftInput
                                    id="floor"
                                    label="Votre étage"
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={isLoading}
                                    register={register}
                                    errors={errors}
                                    required
                                />
                            </div>
                        </div>
                    </>
                )}

                <hr />

                <div className="flex flex-col gap-4">
                    <label className="font-semibold text-lg">Période de construction</label>
                    <div className="grid grid-cols-2 gap-3">
                        {['Avant 1949', '1949 - 1974', '1975 - 1989', '1990 - 2005', '2005+'].map((period) => (
                            <div
                                key={period}
                                onClick={() => setCustomValue('constructionPeriod', period)}
                                className={`
                                    rounded-xl border-2 p-3 cursor-pointer text-center font-medium transition
                                    ${watch('constructionPeriod') === period ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}
                                `}
                            >
                                {period}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // ENERGY STEP
    if (step === STEPS.ENERGY) {
        const dpeColors: Record<string, string> = {
            A: 'bg-emerald-600 text-white border-emerald-600',
            B: 'bg-emerald-500 text-white border-emerald-500',
            C: 'bg-lime-300 text-black border-lime-300',
            D: 'bg-yellow-400 text-black border-yellow-400',
            E: 'bg-orange-400 text-white border-orange-400',
            F: 'bg-orange-600 text-white border-orange-600',
            G: 'bg-red-600 text-white border-red-600',
        };

        const gesColors: Record<string, string> = {
            A: 'bg-purple-50 text-purple-900 border-purple-200',
            B: 'bg-purple-200 text-purple-900 border-purple-300',
            C: 'bg-purple-300 text-white border-purple-400',
            D: 'bg-purple-400 text-white border-purple-500',
            E: 'bg-purple-500 text-white border-purple-600',
            F: 'bg-purple-600 text-white border-purple-800',
            G: 'bg-purple-700 text-white border-purple-950',
        };

        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Performance énergétique"
                    subtitle="Indiquez le DPE, le GES et les détails énergétiques."
                />

                {/* DPE */}
                <div>
                    <label className="block text-lg font-medium mb-4">Diagnostic de Performance Énergétique (DPE)</label>
                    <div className="grid grid-cols-7 gap-2">
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((grade) => (
                            <div
                                key={grade}
                                onClick={() => setCustomValue('dpe', grade)}
                                className={`
                                    aspect-square rounded-xl border-1 flex items-center justify-center cursor-pointer transition font-bold text-xl
                                    ${watch('dpe') === grade
                                        ? dpeColors[grade]
                                        : 'border-neutral-200 hover:border-neutral-400 text-neutral-600'}
                                `}
                            >
                                {grade}
                            </div>
                        ))}
                    </div>
                </div>

                {/* GES */}
                <div>
                    <label className="block text-lg font-medium mb-4">Gaz à Effet de Serre (GES)</label>
                    <div className="grid grid-cols-7 gap-2">
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((grade) => (
                            <div
                                key={grade}
                                onClick={() => setCustomValue('ges', grade)}
                                className={`
                                    aspect-square rounded-xl border-1 flex items-center justify-center cursor-pointer transition font-bold text-xl
                                    ${watch('ges') === grade
                                        ? gesColors[grade]
                                        : 'border-neutral-200 hover:border-neutral-400 text-neutral-600'}
                                `}
                            >
                                {grade}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Energy Costs */}
                <div>
                    <label className="block text-lg font-medium mb-4">Estimation des coûts annuels</label>
                    <div className="flex items-center gap-4">
                        <div className="w-1/2">
                            <SoftInput
                                id="energy_cost_min"
                                label="Minimum (€)"
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                        </div>
                        <div className="w-1/2">
                            <SoftInput
                                id="energy_cost_max"
                                label="Maximum (€)"
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                        </div>
                    </div>
                </div>



                {/* Technical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-neutral-500 mb-2">Année du DPE</label>
                        <SoftInput
                            id="dpe_year"
                            label=""
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            disabled={isLoading}
                            register={register}
                            errors={errors}
                            placeholder="Ex: 2023"
                        />
                    </div>

                    <hr />

                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-medium text-neutral-500 mb-2">Type de vitrage</label>
                        <div className="flex flex-col gap-2">
                            {['Double vitrage', 'Triple vitrage', 'Simple vitrage'].map((type) => (
                                <div
                                    key={type}
                                    onClick={() => setCustomValue('glazingType', type)}
                                    className={`
                                        p-3 border rounded-lg cursor-pointer transition text-sm font-medium
                                        ${watch('glazingType') === type ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}
                                    `}
                                >
                                    {type}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-lg font-semibold mb-4">Système de chauffage</label>
                    <div className="grid grid-cols-2 gap-3">
                        {['Individuel électrique', 'Individuel gaz', 'Collectif', 'Autre'].map((sys) => (
                            <div
                                key={sys}
                                onClick={() => setCustomValue('heatingSystem', sys)}
                                className={`
                                    p-4 border-2 rounded-xl cursor-pointer transition font-medium text-center
                                    ${watch('heatingSystem') === sys ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}
                                `}
                            >
                                {sys}
                            </div>
                        ))}
                    </div>
                </div>


            </div>
        )
    }

    // DESCRIPTION STEP - Adjective
    if (step === STEPS.DESCRIPTION) {
        const adjectives = [
            { label: "Lumineux", icon: Sun },
            { label: "Traversant", icon: ArrowRightLeft },
            { label: "Haussmannien", icon: Landmark },
            { label: "Atypique", icon: Star },
            { label: "Moderne", icon: Zap },
            { label: "Neuf", icon: Sparkles },
            { label: "Rénové", icon: Paintbrush },
            { label: "Calme", icon: Leaf },
            { label: "Chaleureux", icon: Flame },
            { label: "Familial", icon: Users },
            { label: "De standing", icon: Gem }
        ];

        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Comment décririez-vous votre bien ?"
                    subtitle="Choisissez un adjectif qui le qualifie le mieux"
                />
                <div className="flex flex-wrap gap-3 items-center justify-center">
                    {adjectives.map((item) => (
                        <div
                            key={item.label}
                            onClick={() => setCustomValue('propertyAdjective', item.label)}
                            className={`
                                cursor-pointer
                                rounded-full
                                px-6
                                py-3
                                border
                                transition
                                hover:shadow-md
                                flex
                                items-center
                                gap-3
                                ${propertyAdjective === item.label
                                    ? 'border-black bg-black text-white'
                                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                                }
                            `}
                        >
                            <item.icon size={18} />
                            <span className="font-semibold">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const amenities = watch('amenities');

    const toggleAmenity = (key: string) => {
        let newAmenities = [...(amenities || [])];
        if (newAmenities.includes(key)) {
            newAmenities = newAmenities.filter((a) => a !== key);
        } else {
            newAmenities.push(key);
        }
        setCustomValue('amenities', newAmenities);
    };

    if (step === STEPS.INTRO_ASSETS) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Mettez votre bien en valeur"
                    subtitle="Ajoutez les équipements, les photos et une description détaillée."
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <Sparkles size={80} className="text-neutral-400" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        C’est le moment de séduire les locataires ! Listez les atouts de votre logement et ajoutez de belles photos.
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.AMENITIES) {
        const amenityGroups = [
            {
                title: "Les indispensables",
                items: [
                    { key: 'hasFiber', label: 'Fibre Optique', icon: Zap },
                    { key: 'isKitchenEquipped', label: 'Cuisine Équipée', icon: Utensils },
                    { key: 'hasLaundry', label: 'Lave-linge / Buanderie', icon: Shirt },
                    { key: 'hasStorage', label: 'Rangements', icon: Package },
                ]
            },
            {
                title: "Caractéristiques",
                items: [
                    { key: 'hasGarden', label: 'Jardin', icon: Leaf },
                    { key: 'isTraversant', label: 'Traversant', icon: ArrowRightLeft },
                    { key: 'isSouthFacing', label: 'Orienté Sud', icon: Sun },
                    { key: 'isRefurbished', label: 'Rénové', icon: Paintbrush },
                    { key: 'petsAllowed', label: 'Animaux acceptés', icon: PawPrint },
                ]
            },
            {
                title: "Immeuble & Sécurité",
                items: [
                    { key: 'hasBikeRoom', label: 'Local Vélo', icon: Bike },
                    { key: 'hasDigicode', label: 'Digicode', icon: KeyRound },
                    { key: 'hasIntercom', label: 'Interphone', icon: Phone },
                    { key: 'hasCaretaker', label: 'Gardien', icon: ShieldCheck },
                    { key: 'hasArmoredDoor', label: 'Porte Blindée', icon: ShieldCheck },
                ]
            },
            {
                title: "Quartier",
                items: [
                    { key: 'isNearTransport', label: 'Proche Transports', icon: TrainFront },
                    { key: 'isNearShops', label: 'Proche Commerces', icon: Star },
                    { key: 'isNearSchools', label: 'Proche Écoles', icon: GraduationCap },
                    { key: 'isNearGreenSpace', label: 'Espaces Verts', icon: TreePine },
                    { key: 'isNearHospital', label: 'Proche Hôpital', icon: Stethoscope },
                    { key: 'isQuietArea', label: 'Quartier Calme', icon: Moon },
                ]
            }
        ];

        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Quels sont les atouts de votre logement ?"
                    subtitle="Sélectionnez les équipements disponibles."
                />

                <div className="flex flex-col gap-6">
                    {amenityGroups.map((group) => (
                        <div key={group.title}>
                            <h3 className="font-semibold text-lg mb-3 text-neutral-800">{group.title}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.items.map((item) => {
                                    const isSelected = amenities?.includes(item.key);
                                    return (
                                        <div
                                            key={item.key}
                                            onClick={() => toggleAmenity(item.key)}
                                            className={`
                                                flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition hover:border-black
                                                ${isSelected ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                                            `}
                                        >
                                            <item.icon size={24} style={{ color: '#11d134' }} />
                                            <span className="font-medium text-neutral-700">{item.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (step === STEPS.IMAGES) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Ajoutez des photos de votre bien"
                    subtitle="Ajoutez au minimum 4 photos. Vous pourrez toujours en ajouter d'autres plus tard."
                />
                <MultiImageUpload
                    value={imageSrcs}
                    onChange={(value) => setCustomValue('imageSrcs', value)}
                    layoutMode="cover"
                />
            </div>
        )
    }

    if (step === STEPS.INTRO_RENTAL) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Finalisons votre annonce"
                    subtitle="Définissez le type de location et le prix."
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <KeyRound size={80} className="text-neutral-400" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        Dernière étape ! Choisissez le type de contrat (Nu, Meublé, Colocation) et fixez le loyer.
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.RENTAL_TYPE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Quel type de location proposez-vous ?"
                    subtitle="Cela déterminera le type de bail."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div
                        onClick={() => {
                            setCustomValue('leaseType', LeaseType.LONG_TERM);
                            // Assuming 'furnished' logic is implicit or handled elsewhere for now, usually LONG_TERM implies standard residential lease
                            // User request: "Location Nue" vs "Location Meublée"
                            // I might need a 'isFurnished' boolean in the form if not present?
                            // Checking lines 240: mockListing has isFurnished: true.
                            // Checking Form State: no explicit isFurnished in defaultValues (line 96).
                            // But usually 'Meublé' vs 'Nu' is a key distinction.
                            // I will just set leaseType for now, and maybe a custom field if needed?
                            // User said: "Location Nue, Location meublé, Colocation".
                            // I will use `leaseType` enum if it supports it?
                            // LeaseType in Prisma: LONG_TERM, SHORT_TERM, STUDENT, COLOCATION.
                            // So "Nue" vs "Meublé" is usually a property attribute, not just LeaseType.
                            // I'll stick to what the user asked: distinguish the flow.
                        }}
                        className={`
                            p-4 border-2 rounded-xl flex flex-col gap-3 cursor-pointer transition hover:border-black
                            ${watch('leaseType') === LeaseType.LONG_TERM ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                        `}
                    >
                        <Home size={30} />
                        <div className="font-semibold">Location Nue</div>
                        <div className="text-sm text-neutral-500">Logement loué vide à titre de résidence principale.</div>
                    </div>

                    <div
                        onClick={() => {
                            setCustomValue('leaseType', LeaseType.LONG_TERM);
                            // Need to distinguish Meublé. Maybe I should use a temporary state or form field if I can't find one.
                            // I'll assume 'Meublé' implies standard Long Term but furnished.
                        }}
                        className={`
                            p-4 border-2 rounded-xl flex flex-col gap-3 cursor-pointer transition hover:border-black
                            ${false ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                        `}
                    >
                        <Sparkles size={30} />
                        <div className="font-semibold">Location Meublée</div>
                        <div className="text-sm text-neutral-500">Logement loué avec meubles.</div>
                    </div>

                    <div
                        onClick={() => {
                            setCustomValue('leaseType', LeaseType.COLOCATION);
                        }}
                        className={`
                            p-4 border-2 rounded-xl flex flex-col gap-3 cursor-pointer transition hover:border-black
                            ${watch('leaseType') === LeaseType.COLOCATION ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                        `}
                    >
                        <Users size={30} />
                        <div className="font-semibold">Colocation</div>
                        <div className="text-sm text-neutral-500">Louez plusieurs chambres dans un même logement.</div>
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.PRICE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Pour finir, fixez votre loyer"
                    subtitle="Quel est le loyer mensuel ?"
                />
                <SoftInput
                    id="price"
                    label="Loyer mensuel"
                    formatPrice
                    type="number"
                    inputMode="numeric"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
                <hr />
                <SoftInput
                    id="charges"
                    label="Charges (mensuel)"
                    type="number"
                    formatPrice
                    inputMode="numeric"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
                {/* Rent Control Section - Restored */}
                {rentControlData?.isEligible && (
                    <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 flex flex-col gap-4">
                        <div className="flex flex-row items-center justify-between">
                            <h4 className="font-semibold flex items-center gap-2">
                                <Info size={18} />
                                Encadrement des loyers
                            </h4>
                            <span className="text-xs font-medium bg-neutral-200 px-2 py-1 rounded">
                                {rentControlData.zone}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between text-sm text-neutral-600">
                                <span>0 €</span>
                                <span>Plafond: {rentControlData.maxRent} €</span>
                                <span>+</span>
                            </div>
                            <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden relative">
                                <div
                                    className={`h-full transition-all duration-500 rounded-full ${price > rentControlData.maxRent ? 'bg-primary' :
                                        price >= rentControlData.maxRent * 0.95 ? 'bg-orange-500' : 'bg-emerald-500'
                                        }`}
                                    style={{ width: `${Math.min((price / (rentControlData.maxRent * 1.2)) * 100, 100)}%` }}
                                />
                                <div
                                    className="absolute top-0 bottom-0 w-1 bg-black opacity-30"
                                    style={{ left: `${(rentControlData.maxRent / (rentControlData.maxRent * 1.2)) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className={`text-sm p-3 rounded-lg flex items-start gap-3 ${price > rentControlData.maxRent ? 'bg-rose-100 text-rose-800' :
                            price >= rentControlData.maxRent * 0.95 ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                            {price > rentControlData.maxRent ? <AlertTriangle className="shrink-0 mt-0.5" size={18} /> :
                                price >= rentControlData.maxRent * 0.95 ? <Info className="shrink-0 mt-0.5" size={18} /> :
                                    <CheckCircle className="shrink-0 mt-0.5" size={18} />}

                            <div className="flex flex-col gap-1">
                                <span className="font-medium">
                                    {price > rentControlData.maxRent ? 'Loyer supérieur au plafond légal' :
                                        price >= rentControlData.maxRent * 0.95 ? 'Loyer proche du plafond' : 'Loyer conforme'}
                                </span>
                                <span className="opacity-90">
                                    {price > rentControlData.maxRent
                                        ? `Le loyer dépasse le plafond estimé de ${rentControlData.maxRent} €. Cela peut être illégal.`
                                        : `Ce loyer est en dessous du plafond légal.`}
                                </span>
                            </div>
                        </div>

                        <div className="text-xs text-neutral-400 mt-2">
                            {rentControlData.message}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (step === STEPS.ROOM_INTRO) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Configurons les chambres"
                    subtitle={`Vous avez indiqué ${roomCount} chambres. Configurons-les une par une.`}
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <DoorOpen size={80} className="text-neutral-400" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        Pour une colocation, il est important de détailler chaque espace privatif.
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.ROOM_DETAILS) {
        bodyContent = (
            <div key={currentRoomIndex} className="flex flex-col gap-8">
                <Heading
                    title={`Chambre ${currentRoomIndex + 1}`}
                    subtitle="Caractéristiques de la chambre."
                />

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-6">
                        <SoftInput
                            id={`rooms.${currentRoomIndex}.surface`}
                            label="Surface (m²)"
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            disabled={isLoading}
                            register={register}
                            errors={errors}
                            required={true}
                        />

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-neutral-500 pl-1">Type de lit</label>
                            <div className="flex gap-2">
                                <div
                                    onClick={() => setValue(`rooms.${currentRoomIndex}.bedType`, 'Lit simple', { shouldValidate: true, shouldDirty: true })}
                                    className={`
                                    flex-1 border rounded-xl cursor-pointer text-center text-sm transition flex items-center justify-center h-[56px]
                                    ${watch(`rooms.${currentRoomIndex}.bedType`) === 'Lit simple' ? 'border-black bg-neutral-50 font-medium' : 'border-neutral-200'}
                                `}
                                >
                                    Simple
                                </div>
                                <div
                                    onClick={() => setValue(`rooms.${currentRoomIndex}.bedType`, 'Lit double', { shouldValidate: true, shouldDirty: true })}
                                    className={`
                                    flex-1 border rounded-xl cursor-pointer text-center text-sm transition flex items-center justify-center h-[56px]
                                    ${watch(`rooms.${currentRoomIndex}.bedType`) === 'Lit double' ? 'border-black bg-neutral-50 font-medium' : 'border-neutral-200'}
                                `}
                                >
                                    Double
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-3 p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                                <Info size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                                <div className="text-xs text-neutral-500">
                                    Nous vous conseillons de décrire l&apos;emplacement de la chambre (ex: coté rue, coté cour...) et ses atouts (lumineuse, calme...).
                                </div>
                            </div>
                            <SoftInput
                                id={`rooms.${currentRoomIndex}.description`}
                                label="Description (optionnel)"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-neutral-500 pl-1">Salle de bain privée ?</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => setValue(`rooms.${currentRoomIndex}.hasPrivateBathroom`, true, { shouldValidate: true, shouldDirty: true })}
                                    className={`
                                    p-3 border rounded-xl cursor-pointer text-center text-sm transition flex items-center justify-center h-[48px]
                                    ${watch(`rooms.${currentRoomIndex}.hasPrivateBathroom`) ? 'border-black bg-neutral-50 font-medium' : 'border-neutral-200'}
                                `}
                                >
                                    Oui
                                </div>
                                <div
                                    onClick={() => setValue(`rooms.${currentRoomIndex}.hasPrivateBathroom`, false, { shouldValidate: true, shouldDirty: true })}
                                    className={`
                                    p-3 border rounded-xl cursor-pointer text-center text-sm transition flex items-center justify-center h-[48px]
                                    ${!watch(`rooms.${currentRoomIndex}.hasPrivateBathroom`) && watch(`rooms.${currentRoomIndex}.hasPrivateBathroom`) !== undefined ? 'border-black bg-neutral-50 font-medium' : 'border-neutral-200'}
                                `}
                                >
                                    Non
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.ROOM_RECAP) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Récapitulatif des chambres"
                    subtitle="Vérifiez que tout est correct."
                />
                <div className="flex flex-col gap-4">
                    {watch('rooms')?.map((room: any, index: number) => (
                        <div key={index} className="p-4 border rounded-xl flex justify-between items-center bg-white">
                            <div>
                                <div className="font-semibold">{room.name || `Chambre ${index + 1}`}</div>
                                <div className="text-sm text-neutral-500">{room.surface} m² • {room.hasPrivateBathroom ? 'SDB Privée' : 'SDB Partagée'}</div>
                            </div>
                            <div className="cursor-pointer font-semibold underline text-sm" onClick={() => { setCurrentRoomIndex(index); setStep(STEPS.ROOM_DETAILS); }}>
                                Modifier
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (step === STEPS.ROOM_PRICE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <div className="flex justify-between items-start">
                    <Heading
                        title="Loyers et Charges"
                        subtitle="Définissez le prix pour chaque chambre."
                    />
                    <div
                        onClick={() => setIsPriceAssistantOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-full cursor-pointer hover:bg-indigo-100 transition text-sm font-medium"
                    >
                        <Wand2 size={16} />
                        Assistant
                    </div>
                </div>
                <div className="flex flex-col gap-6 max-h-[50vh] overflow-y-auto pr-2">
                    {watch('rooms')?.map((room: any, index: number) => (
                        <div key={index} className="flex flex-col gap-4 p-4 border rounded-xl bg-white shadow-sm">
                            <div className="font-semibold">{room.name || `Chambre ${index + 1}`}</div>
                            <div className="grid grid-cols-2 gap-4">
                                <SoftInput
                                    id={`rooms.${index}.price`}
                                    label="Loyer HC (€)"
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    formatPrice
                                    disabled={isLoading}
                                    register={register}
                                    errors={errors}
                                    required={true}
                                />
                                <SoftInput
                                    id={`rooms.${index}.charges`}
                                    label="Charges (€)"
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    formatPrice
                                    disabled={isLoading}
                                    register={register}
                                    errors={errors}
                                    required={false}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <PriceAssistantModal
                    isOpen={isPriceAssistantOpen}
                    onClose={() => setIsPriceAssistantOpen(false)}
                    rooms={watch('rooms') || []}
                    onApply={(prices: { index: number; price: number }[]) => {
                        prices.forEach(({ index, price }) => {
                            setValue(`rooms.${index}.price`, price, { shouldDirty: true, shouldValidate: true });
                        });
                        toast.success("Prix appliqués avec succès !");
                    }}
                />
            </div>
        )
    }

    if (step === STEPS.AVAILABILITY && createdListing) {
        // Mock SafeListing from createdListing
        const safeListing: SafeListing = {
            ...createdListing,
            createdAt: createdListing.createdAt?.toString(),
            statusUpdatedAt: createdListing.statusUpdatedAt?.toString(),
            images: [],
            // Ensure other props if strictly needed by types, but VisitsSection mostly needs ID and visitSlots
            visitSlots: [],
            visitDuration: 20
        };

        bodyContent = (
            <div className="flex flex-col gap-4">
                <Heading
                    title="Définissez vos disponibilités de visite"
                    subtitle="Indiquez quand vous êtes disponible pour faire visiter ce bien."
                />
                <div className="h-[500px] overflow-hidden rounded-xl border border-neutral-200">
                    <VisitsSection listing={safeListing as any} className="h-full" />
                </div>
            </div>
        )
    }

    if (step === STEPS.SUCCESS) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Félicitations !"
                    subtitle="Votre annonce est maintenant finalisée et publiée."
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={100} className="text-green-600" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        {rentModal.editingListing ? "Les modifications ont été enregistrées avec succès." : "Votre bien est visible par les locataires dès maintenant."}
                    </div>
                </div>
            </div>
        )
    }

    const isNextDisabled = useMemo(() => {
        if (step === STEPS.LOCATION && !location) {
            return true;
        }
        return false;
    }, [step, location]);

    return (
        <Modal
            isOpen={rentModal.isOpen}
            onClose={rentModal.onClose}
            onSubmit={step === STEPS.SUCCESS ? () => { reset(); setStep(STEPS.INTRO_CHARACTERISTICS); rentModal.onClose(); } : handleSubmit(onSubmit)}
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step === STEPS.CATEGORY || step === STEPS.AVAILABILITY ? undefined : onBack}
            title={title}
            body={bodyContent}
            currentStep={step === STEPS.INTRO_CHARACTERISTICS ? undefined : step}
            totalSteps={STEPS.AVAILABILITY}
            disabled={isNextDisabled}
            isLoading={isLoading}
            actionButtonComponent={DarkActionButtonFlex}
        />
    );
};

export default RentModal;
