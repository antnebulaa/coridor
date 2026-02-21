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
import AnimatedNumberInput from "../inputs/AnimatedNumberInput";
import SoftInput from '../inputs/SoftInput';
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { Button } from "../ui/Button";
import { Info, AlertTriangle, AlertCircle, CheckCircle, Home, X, Check, ChevronDown, Images, Sun, ArrowRightLeft, Landmark, Star, Zap, Sparkles, Paintbrush, Leaf, Flame, Users, Gem, Utensils, Shirt, Package, PawPrint, Bike, KeyRound, Phone, ShieldCheck, TrainFront, GraduationCap, TreePine, Stethoscope, Moon, DoorOpen, Wand2, Armchair } from "lucide-react";
import { calculateRentControl as calcRent } from "@/utils/rentUtils";
import { useTranslations } from 'next-intl';
import VisitsSection from "@/app/[locale]/properties/[listingId]/edit/components/VisitsSection";
import PriceAssistantModal from "@/app/[locale]/properties/[listingId]/edit/components/PriceAssistantModal";
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
    const t = useTranslations('rentModal');

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
            isFurnished: false,
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
            const result = calcRent(mockListing as any, city);
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
            return toast.error(t('errors.categoryRequired'));
        }

        // Validation for Details Step
        if (step === STEPS.DETAILS) {
            if (category === 'Appartement') {
                if (!watch('totalFloors')) return toast.error(t('errors.floorsRequired'));
                if (!watch('floor')) return toast.error(t('errors.floorRequired'));
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
            setValue(`rooms.${currentRoomIndex}.name`, t('rooms.details.title', { number: currentRoomIndex + 1 }));

            if (!currentRoomSurface) return toast.error(t('errors.surfaceRequired'));
            if (!currentRoomBedType) return toast.error(t('errors.bedTypeRequired'));

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

        const generatedTitle = t('description.generatedTitle', { category: data.category, city: data.location?.label?.split(',')[0] || data.location?.label || '' });
        const generatedDescription = t('description.generatedDesc', { category: data.category });

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
                    toast.custom((tToast) => (
                        <CustomToast
                            t={tToast}
                            message={t('toasts.updated')}
                            type="success"
                        />
                    ));
                    router.refresh();
                    setStep(STEPS.SUCCESS);
                })
                .catch((error) => {
                    const errorMsg = error?.response?.data?.error || t('toasts.error');
                    toast.custom((tToast) => (
                        <CustomToast
                            t={tToast}
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
                    toast.custom((tToast) => (
                        <CustomToast
                            t={tToast}
                            message={t('toasts.created')}
                            type="success"
                        />
                    ));
                    router.refresh();
                    setCreatedListing(response.data);
                    setStep(STEPS.SUCCESS);
                })
                .catch((error) => {
                    const errorMsg = error?.response?.data?.error || t('toasts.error');
                    toast.custom((tToast) => (
                        <CustomToast
                            t={tToast}
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
            return t('actions.finish');
        }
        if (step === STEPS.AVAILABILITY) {
            return t('actions.finish');
        }
        if (step === STEPS.INTRO_CHARACTERISTICS || step === STEPS.INTRO_ASSETS || step === STEPS.INTRO_RENTAL) {
            return t('actions.start');
        }
        if (step === STEPS.PRICE || step === STEPS.ROOM_PRICE || rentModal.mode === 'ROOM_CONFIG') {
            if (isPublished) return t('actions.publish');
            return rentModal.editingListing ? t('actions.save') : t('actions.create');
        }

        return t('actions.next');
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

        return t('actions.back');
    }, [step, rentModal.editingListing]);

    let bodyContent = undefined;

    if (step === STEPS.INTRO_CHARACTERISTICS) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('steps.intro.title')}
                    subtitle={t('steps.intro.subtitle')}
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <Home size={80} className="text-neutral-400" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        {t('steps.intro.description')}
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.CATEGORY) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('steps.category.title')}
                    subtitle={t('steps.category.subtitle')}
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
                    title={t('steps.surface.title')}
                    subtitle={t('steps.surface.subtitle')}
                />
                <div className="flex items-center justify-center py-10">
                    <AnimatedNumberInput
                        {...surfaceRegister}
                        ref={(e: any) => {
                            surfaceRef(e);
                            surfaceInputRef.current = e;
                        }}
                        id="surface"
                        autoFocus
                        disabled={isLoading}
                        value={watch('surface')}
                        placeholder="0"
                        suffix="m²"
                        className="
                            w-full
                            max-w-[400px]
                            text-8xl md:text-9xl
                            font-bold
                            transition
                            pb-4
                        "
                    />
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
                            {t('steps.info.titleRoom', { name: rentModal.editingListing?.rentalUnit?.name || rentModal.editingListing?.title || "la chambre" })}
                        </>
                    ) : (
                        t('steps.info.title')
                    )}
                    subtitle={isRoom ? t('steps.info.subtitleRoom') : t('steps.info.subtitle')}
                />

                {/* Link to Physical Room logic remains here for Room mode if applicable */}
                {rentModal.propertyContext && rentModal.propertyContext.rooms && rentModal.propertyContext.rooms.length > 0 && (
                    <div className="flex flex-col gap-2 mb-4">
                        {watch('targetRoomId') ? (
                            <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                                <div className="text-xs font-medium text-neutral-500 mb-1 uppercase tracking-wider">{t('steps.info.roomLinked')}</div>
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
                                        {t('steps.info.linkRoomChange')}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <label className="font-medium">{t('steps.info.linkRoom')}</label>
                                <div className="text-xs text-neutral-500 mb-1">
                                    {t('steps.info.linkRoomHint')}
                                </div>
                                <div className="relative">
                                    <div
                                        onClick={() => setShowRoomSelect(!showRoomSelect)}
                                        className="w-full p-4 border-2 rounded-md transition cursor-pointer bg-background border-input hover:border-neutral-400 flex items-center justify-between"
                                    >
                                        <span className={!watch('targetRoomId') ? 'text-neutral-500' : ''}>
                                            {watch('targetRoomId')
                                                ? (rentModal.propertyContext.rooms.find((r: any) => r.id === watch('targetRoomId'))?.name)
                                                : t('steps.info.linkRoomNew')
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
                                                {t('steps.info.linkRoomNew')}
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
                                                            toast.custom((tToast) => (
                                                                <CustomToast
                                                                    t={tToast}
                                                                    message={t('steps.info.photosImported')}
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
                            title={t('labels.roomCount')}
                            subtitle={t('steps.info.subtitle')}
                            value={roomCount}
                            onChange={(value) => setCustomValue('roomCount', value)}
                        />
                        <hr />
                        <Counter
                            title={t('labels.bedroomCount')}
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
                    title={t('steps.details.title')}
                    subtitle={t('steps.details.subtitle')}
                />

                <div className="flex flex-col gap-2">
                    <label className="font-semibold text-lg">{t('steps.details.kitchen')}</label>
                    <div className="flex gap-4">
                        <div
                            onClick={() => setCustomValue('hasSeparateKitchen', true)}
                            className={`flex-1 p-4 border-2 rounded-xl flex items-center justify-center gap-2 hover:border-black transition cursor-pointer ${watch('hasSeparateKitchen') === true ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                        >
                            <span className="font-semibold">{t('steps.details.kitchenYes')}</span>
                        </div>
                        <div
                            onClick={() => setCustomValue('hasSeparateKitchen', false)}
                            className={`flex-1 p-4 border-2 rounded-xl flex items-center justify-center gap-2 hover:border-black transition cursor-pointer ${watch('hasSeparateKitchen') === false ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                        >
                            <span className="font-semibold">{t('steps.details.kitchenNo')}</span>
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
                                    label={t('steps.details.totalFloors')}
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
                                    label={t('steps.details.floor')}
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
                    <label className="font-semibold text-lg">{t('steps.details.constructionPeriod')}</label>
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
                    title={t('steps.energy.title')}
                    subtitle={t('steps.energy.subtitle')}
                />

                {/* DPE */}
                <div>
                    <label className="block text-lg font-medium mb-4">{t('steps.energy.dpe')}</label>
                    <div className="grid grid-cols-7 gap-2">
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((grade) => (
                            <div
                                key={grade}
                                onClick={() => setCustomValue('dpe', grade)}
                                className={`
                                    aspect-square rounded-xl border flex items-center justify-center cursor-pointer transition font-bold text-xl
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
                    <label className="block text-lg font-medium mb-4">{t('steps.energy.ges')}</label>
                    <div className="grid grid-cols-7 gap-2">
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((grade) => (
                            <div
                                key={grade}
                                onClick={() => setCustomValue('ges', grade)}
                                className={`
                                    aspect-square rounded-xl border flex items-center justify-center cursor-pointer transition font-bold text-xl
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
                    <label className="block text-lg font-medium mb-4">{t('steps.energy.costs')}</label>
                    <div className="flex items-center gap-4">
                        <div className="w-1/2">
                            <SoftInput
                                id="energy_cost_min"
                                label={t('steps.energy.min')}
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
                                label={t('steps.energy.max')}
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
                        <label className="block text-sm font-medium text-neutral-500 mb-2">{t('steps.energy.dpeYear')}</label>
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
                        <label className="block text-sm font-medium text-neutral-500 mb-2">{t('steps.energy.glazing')}</label>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: t('steps.energy.glazingTypes.double'), value: 'Double vitrage' },
                                { label: t('steps.energy.glazingTypes.triple'), value: 'Triple vitrage' },
                                { label: t('steps.energy.glazingTypes.single'), value: 'Simple vitrage' }
                            ].map((item) => (
                                <div
                                    key={item.value}
                                    onClick={() => setCustomValue('glazingType', item.value)}
                                    className={`
                                        p-3 border rounded-lg cursor-pointer transition text-sm font-medium
                                        ${watch('glazingType') === item.value ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}
                                    `}
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-lg font-semibold mb-4">{t('steps.energy.heating')}</label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: t('steps.energy.heatingTypes.electric_ind'), value: 'Individuel électrique' },
                            { label: t('steps.energy.heatingTypes.gas_ind'), value: 'Individuel gaz' },
                            { label: t('steps.energy.heatingTypes.collective'), value: 'Collectif' },
                            { label: t('steps.energy.heatingTypes.other'), value: 'Autre' }
                        ].map((item) => (
                            <div
                                key={item.value}
                                onClick={() => setCustomValue('heatingSystem', item.value)}
                                className={`
                                    p-4 border-2 rounded-xl cursor-pointer transition font-medium text-center
                                    ${watch('heatingSystem') === item.value ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}
                                `}
                            >
                                {item.label}
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
            { label: t('steps.description.adjectives.bright'), icon: Sun },
            { label: t('steps.description.adjectives.crossing'), icon: ArrowRightLeft },
            { label: t('steps.description.adjectives.haussmann'), icon: Landmark },
            { label: t('steps.description.adjectives.atypical'), icon: Star },
            { label: t('steps.description.adjectives.modern'), icon: Zap },
            { label: t('steps.description.adjectives.new'), icon: Sparkles },
            { label: t('steps.description.adjectives.renovated'), icon: Paintbrush },
            { label: t('steps.description.adjectives.quiet'), icon: Leaf },
            { label: t('steps.description.adjectives.warm'), icon: Flame },
            { label: t('steps.description.adjectives.family'), icon: Users },
            { label: t('steps.description.adjectives.luxury'), icon: Gem }
        ];

        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('steps.description.title')}
                    subtitle={t('steps.description.subtitle')}
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
                    title={t('steps.introAssets.title')}
                    subtitle={t('steps.introAssets.subtitle')}
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <Sparkles size={80} className="text-neutral-400" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        {t('steps.introAssets.description')}
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.AMENITIES) {
        const amenityGroups = [
            {
                title: t('steps.amenities.groups.essentials'),
                items: [
                    { key: 'hasFiber', label: t('steps.amenities.items.fiber'), icon: Zap },
                    { key: 'isKitchenEquipped', label: t('steps.amenities.items.kitchen'), icon: Utensils },
                    { key: 'hasLaundry', label: t('steps.amenities.items.laundry'), icon: Shirt },
                    { key: 'hasStorage', label: t('steps.amenities.items.storage'), icon: Package },
                ]
            },
            {
                title: t('steps.amenities.groups.features'),
                items: [
                    { key: 'hasGarden', label: t('steps.amenities.items.garden'), icon: Leaf },
                    { key: 'isTraversant', label: t('steps.amenities.items.cross'), icon: ArrowRightLeft },
                    { key: 'isSouthFacing', label: t('steps.amenities.items.south'), icon: Sun },
                    { key: 'isRefurbished', label: t('steps.amenities.items.refurbished'), icon: Paintbrush },
                    { key: 'petsAllowed', label: t('steps.amenities.items.pets'), icon: PawPrint },
                ]
            },
            {
                title: t('steps.amenities.groups.building'),
                items: [
                    { key: 'hasBikeRoom', label: t('steps.amenities.items.bike'), icon: Bike },
                    { key: 'hasDigicode', label: t('steps.amenities.items.digicode'), icon: KeyRound },
                    { key: 'hasIntercom', label: t('steps.amenities.items.intercom'), icon: Phone },
                    { key: 'hasCaretaker', label: t('steps.amenities.items.caretaker'), icon: ShieldCheck },
                    { key: 'hasArmoredDoor', label: t('steps.amenities.items.armored'), icon: ShieldCheck },
                ]
            },
            {
                title: t('steps.amenities.groups.location'),
                items: [
                    { key: 'isNearTransport', label: t('steps.amenities.items.transport'), icon: TrainFront },
                    { key: 'isNearShops', label: t('steps.amenities.items.shops'), icon: Star },
                    { key: 'isNearSchools', label: t('steps.amenities.items.schools'), icon: GraduationCap },
                    { key: 'isNearGreenSpace', label: t('steps.amenities.items.park'), icon: TreePine },
                    { key: 'isNearHospital', label: t('steps.amenities.items.hospital'), icon: Stethoscope },
                    { key: 'isQuietArea', label: t('steps.amenities.items.quiet'), icon: Moon },
                ]
            }
        ];

        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('steps.amenities.title')}
                    subtitle={t('steps.amenities.subtitle')}
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
                    title={t('steps.images.title')}
                    subtitle={t('steps.images.subtitle')}
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
                    title={t('steps.introRental.title')}
                    subtitle={t('steps.introRental.subtitle')}
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <KeyRound size={80} className="text-neutral-400" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        {t('steps.introRental.description')}
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.RENTAL_TYPE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('steps.rentalType.title')}
                    subtitle={t('steps.rentalType.subtitle')}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div
                        onClick={() => {
                            setCustomValue('leaseType', LeaseType.LONG_TERM);
                            setCustomValue('isFurnished', false);
                        }}
                        className={`
                            p-4 border-2 rounded-xl flex flex-col gap-4 cursor-pointer transition hover:border-black active:scale-[0.98]
                            ${watch('leaseType') === LeaseType.LONG_TERM && !watch('isFurnished') ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <DoorOpen size={20} className="text-neutral-500" />
                            <div className="font-semibold text-xl">{t('steps.rentalType.options.bare.title')}</div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="text-sm text-neutral-500 leading-snug">{t('steps.rentalType.options.bare.desc')}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg">
                                    {t('steps.rentalType.options.bare.pros')}
                                </span>
                                <span className="px-3 py-1 bg-neutral-900 text-white text-xs font-medium rounded-lg">
                                    {t('steps.rentalType.options.bare.cons')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setCustomValue('leaseType', LeaseType.LONG_TERM);
                            setCustomValue('isFurnished', true);
                        }}
                        className={`
                            p-4 border-2 rounded-xl flex flex-col gap-4 cursor-pointer transition hover:border-black active:scale-[0.98]
                            ${watch('leaseType') === LeaseType.LONG_TERM && watch('isFurnished') ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <Armchair size={20} className="text-neutral-500" />
                            <div className="font-semibold text-xl">{t('steps.rentalType.options.furnished.title')}</div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="text-sm text-neutral-500 leading-snug">{t('steps.rentalType.options.furnished.desc')}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg">
                                    {t('steps.rentalType.options.furnished.pros')}
                                </span>
                                <span className="px-3 py-1 bg-neutral-900 text-white text-xs font-medium rounded-lg">
                                    {t('steps.rentalType.options.furnished.cons')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div
                        onClick={() => {
                            setCustomValue('leaseType', LeaseType.COLOCATION);
                            setCustomValue('isFurnished', true);
                        }}
                        className={`
                            p-4 border-2 rounded-xl flex flex-col gap-4 cursor-pointer transition hover:border-black active:scale-[0.98]
                            ${watch('leaseType') === LeaseType.COLOCATION ? 'border-black bg-neutral-50' : 'border-neutral-200'}
                        `}
                    >
                        <div className="flex items-center gap-2">
                            <Users size={20} className="text-neutral-500" />
                            <div className="font-semibold text-xl">{t('steps.rentalType.options.colocation.title')}</div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="text-sm text-neutral-500 leading-snug">{t('steps.rentalType.options.colocation.desc')}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg">
                                    {t('steps.rentalType.options.colocation.pros')}
                                </span>
                                <span className="px-3 py-1 bg-neutral-900 text-white text-xs font-medium rounded-lg">
                                    {t('steps.rentalType.options.colocation.cons')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.PRICE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('steps.price.title')}
                    subtitle={t('steps.price.subtitle')}
                />
                <SoftInput
                    id="price"
                    label={t('steps.price.label')}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    formatPrice
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
                <SoftInput
                    id="charges"
                    label={t('steps.price.chargesLabel')}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    formatPrice
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                />
                {rentControlData && (
                    <div className="p-4 bg-neutral-100 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <div className="font-semibold text-neutral-800">
                                {t('rentControl.title')}
                            </div>
                            <div className="text-xs font-medium px-2 py-1 bg-white rounded-md border border-neutral-200 text-neutral-600">
                                {t('rentControl.zone', { zone: rentControlData.zone })}
                            </div>
                        </div>

                        <div className="flex justify-between items-end mt-1">
                            <div className="text-sm text-neutral-500">
                                {t('rentControl.max', { amount: rentControlData.maxRent })}
                            </div>
                        </div>

                        {/* Analysis based on current input */}
                        {price && (
                            <div className={`mt-3 pt-3 border-t border-neutral-200 flex items-start gap-2 text-sm ${parseFloat(price) > rentControlData.maxRent ? 'text-rose-600' :
                                parseFloat(price) > rentControlData.maxRent * 0.9 ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                {parseFloat(price) > rentControlData.maxRent ? (
                                    <>
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <div>
                                            <div className="font-semibold">{t('rentControl.illegal')}</div>
                                            <div className="text-xs mt-0.5 opacity-80">
                                                {t('rentControl.illegalDesc', { amount: rentControlData.maxRent })}
                                            </div>
                                        </div>
                                    </>
                                ) : parseFloat(price) > rentControlData.maxRent * 0.9 ? (
                                    <>
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <div>
                                            <div className="font-semibold">{t('rentControl.close')}</div>
                                            <div className="text-xs mt-0.5 opacity-80">
                                                {t('rentControl.compliantDesc')}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={16} className="mt-0.5 shrink-0" />
                                        <div>
                                            <div className="font-semibold">{t('rentControl.compliant')}</div>
                                            <div className="text-xs mt-0.5 opacity-80">
                                                {t('rentControl.compliantDesc')}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    if (step === STEPS.ROOM_INTRO) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('rooms.intro.title')}
                    subtitle={t('rooms.intro.subtitle', { count: roomCount })}
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <DoorOpen size={80} className="text-neutral-400" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        {t('rooms.intro.description')}
                    </div>
                </div>
            </div>
        )
    }

    if (step === STEPS.ROOM_DETAILS) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title={t('rooms.details.title', { number: currentRoomIndex + 1 })}
                    subtitle={t('rooms.details.subtitle')}
                />

                <SoftInput
                    id={`rooms.${currentRoomIndex}.name`}
                    label={t('steps.info.titleRoom', { name: `Chambre ${currentRoomIndex + 1}` })}
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />

                <div className="flex gap-4">
                    <div className="w-1/2">
                        <SoftInput
                            id={`rooms.${currentRoomIndex}.surface`}
                            label={t('rooms.details.surface')}
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            disabled={isLoading}
                            register={register}
                            errors={errors}
                            required
                        />
                    </div>
                    <div className="w-1/2 flex flex-col gap-2">
                        <label className="text-sm font-medium text-neutral-500">{t('rooms.details.bedType')}</label>
                        <div className="flex gap-2">
                            <div
                                onClick={() => setValue(`rooms.${currentRoomIndex}.bedType`, 'single')}
                                className={`flex-1 p-3 border rounded-lg cursor-pointer text-center text-sm font-medium transition ${watch(`rooms.${currentRoomIndex}.bedType`) === 'single' ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                            >
                                {t('rooms.details.single')}
                            </div>
                            <div
                                onClick={() => setValue(`rooms.${currentRoomIndex}.bedType`, 'double')}
                                className={`flex-1 p-3 border rounded-lg cursor-pointer text-center text-sm font-medium transition ${watch(`rooms.${currentRoomIndex}.bedType`) === 'double' ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                            >
                                {t('rooms.details.double')}
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">{t('rooms.details.description')}</label>
                    <textarea
                        disabled={isLoading}
                        {...register(`rooms.${currentRoomIndex}.description`)}
                        placeholder={t('rooms.details.hint')}
                        className="
                            peer
                            w-full
                            p-4
                            pt-6
                            font-light
                            bg-white
                            border-2
                            rounded-md
                            outline-none
                            transition
                            disabled:opacity-70
                            disabled:cursor-not-allowed
                            pl-4
                            border-neutral-200
                            focus:border-black
                            min-h-[100px]
                        "
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="font-semibold">{t('rooms.details.privateBath')}</label>
                    <div className="flex gap-4">
                        <div
                            onClick={() => setValue(`rooms.${currentRoomIndex}.hasPrivateBathroom`, true)}
                            className={`flex-1 p-4 border-2 rounded-xl flex items-center justify-center gap-2 hover:border-black transition cursor-pointer ${watch(`rooms.${currentRoomIndex}.hasPrivateBathroom`) === true ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                        >
                            <span className="font-semibold">{t('rooms.details.yes')}</span>
                        </div>
                        <div
                            onClick={() => setValue(`rooms.${currentRoomIndex}.hasPrivateBathroom`, false)}
                            className={`flex-1 p-4 border-2 rounded-xl flex items-center justify-center gap-2 hover:border-black transition cursor-pointer ${watch(`rooms.${currentRoomIndex}.hasPrivateBathroom`) === false ? 'border-black bg-neutral-50' : 'border-neutral-200'}`}
                        >
                            <span className="font-semibold">{t('rooms.details.no')}</span>
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
                    title={t('rooms.recap.title')}
                    subtitle={t('rooms.recap.subtitle')}
                />
                <div className="flex flex-col gap-4">
                    {watch('rooms')?.map((room: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-xl hover:bg-neutral-50 transition group">
                            <div className="flex flex-col">
                                <span className="font-semibold">{room.name || t('steps.info.titleRoom', { name: `Chambre ${index + 1}` })}</span>
                                <span className="text-sm text-neutral-500">
                                    {room.surface}m² • {room.bedType === 'double' ? t('rooms.details.double') : t('rooms.details.single')} • {room.hasPrivateBathroom ? t('rooms.recap.privateBath') : t('rooms.recap.sharedBath')}
                                </span>
                            </div>
                            <div
                                onClick={() => setCurrentRoomIndex(index)}
                                className="text-sm font-semibold underline cursor-pointer opacity-0 group-hover:opacity-100 transition"
                            >
                                {t('rooms.recap.edit')}
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
                        title={t('steps.roomPrice.title')}
                        subtitle={t('steps.roomPrice.subtitle')}
                    />
                    <div
                        onClick={() => setIsPriceAssistantOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-full cursor-pointer hover:bg-indigo-100 transition text-sm font-medium"
                    >
                        <Wand2 size={16} />
                        {t('steps.roomPrice.assistant')}
                    </div>
                </div>
                <div className="flex flex-col gap-6 max-h-[50vh] overflow-y-auto pr-2">
                    {watch('rooms')?.map((room: any, index: number) => (
                        <div key={index} className="flex flex-col gap-4 p-4 border rounded-xl bg-white shadow-sm">
                            <div className="font-semibold">{room.name || t('steps.info.titleRoom', { name: `Chambre ${index + 1}` })}</div>
                            <div className="grid grid-cols-2 gap-4">
                                <SoftInput
                                    id={`rooms.${index}.price`}
                                    label={t('steps.roomPrice.rent')}
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
                                    label={t('steps.roomPrice.charges')}
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
                        toast.success(t('steps.roomPrice.success'));
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
                    title={t('steps.availability.title')}
                    subtitle={t('steps.availability.subtitle')}
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
                    title={t('steps.success.title')}
                    subtitle={t('steps.success.subtitle')}
                />
                <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-[200px] h-[200px] bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={100} className="text-green-600" strokeWidth={1} />
                    </div>
                    <div className="text-center text-neutral-500 max-w-md">
                        {rentModal.editingListing ? t('steps.success.updated') : t('steps.success.published')}
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
