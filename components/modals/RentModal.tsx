'use client';

import { useMemo, useState, useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useRentModal from "@/hooks/useRentModal";
import Modal from "./Modal";
import Heading from "../Heading";
import { categories } from "../navbar/Categories";
import CategoryInput from "../inputs/CategoryInput";
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
import { Info, AlertTriangle, CheckCircle, Home, X, Check, ChevronDown, Images } from "lucide-react";
import { calculateRentControl } from "@/app/properties/[listingId]/edit/components/rentControlUtils";
import VisitsSection from "@/app/properties/[listingId]/edit/components/VisitsSection";
import { SafeListing } from "@/types";

import { LeaseType } from "@prisma/client";

enum STEPS {
    INTRO = 0,
    CATEGORY = 1,
    LOCATION = 2,
    INFO = 3,
    AMENITIES = 4,
    IMAGES = 5,
    PRICE = 6,
    AVAILABILITY = 7,
}

const RentModal = () => {
    const router = useRouter();
    const rentModal = useRentModal();
    const isRoom = !!rentModal.propertyContext || rentModal.editingListing?.rentalUnit?.type === 'PRIVATE_ROOM';

    const Map = useMemo(() => dynamic(() => import('../Map'), {
        ssr: false
    }), []);

    const [step, setStep] = useState(STEPS.INTRO);
    const [isLoading, setIsLoading] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [createdListing, setCreatedListing] = useState<any>(null);
    const [showRoomSelect, setShowRoomSelect] = useState(false);

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
            price: 1,
            title: '',
            description: '',
            leaseType: LeaseType.LONG_TERM,
            dpe: 'C',
            ges: 'A',
            charges: 0,
            amenities: [],
            rooms: []
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
                imageSrcs: listing.images?.map((img: any) => img.url) || [],
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
                })) || []
            });

            if (listing.rentalUnit?.type !== 'ENTIRE_PLACE') {
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
                price: 1, // Default price
                title: '',
                description: '',
                leaseType: LeaseType.LONG_TERM,
                dpe: property.dpe || 'C',
                ges: property.ges || 'A',
                charges: 0,
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
                price: 1,
                title: '',
                description: '',
                leaseType: LeaseType.LONG_TERM,
                dpe: 'C',
                ges: 'A',
                charges: 0,
                amenities: [],
                rooms: []
            });
            setStep(STEPS.INTRO);
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
    const surface = 50; // MOCK SURFACE since we removed the input? Or maybe we map room count?
    // Wait, the user removed Description/Title, but Surface?
    // If surface input is missing, rent control won't work well.
    // I need to assume a surface or check if it exists in the form.
    // In `initialState` (line 55), `surface` is NOT there.
    // The previous implementation must have had it, or used roomCount estimation?
    // Looking at `rentControlUtils.ts`: `if (!listing.surface) ... return error`.
    // So I MUST have a surface.
    // Since I cannot add a step back without permission, I will mock it based on roomCount * 20 or similar for now to unblock the feature?
    // OR BETTER: Check if I should have kept the surface input.
    // The user said "Remove Lease Type, Title, Description inputs". NOT Surface.
    // But `RentModal` doesn't seem to have a Surface input visible in my `view_file` output (Step 2445).
    // Let me check lines 267-327 (STEPS.INFO). It has Guest, Room, Bathroom. No surface.
    // I will add a hidden Surface estimation or just add the Surface Counter back if it was there?
    // Actually, I'll check `rentControlUtils` again. It requires `listing.surface`.
    // I will add a `surface` field to the form (default 40) and maybe an input in INFO step?
    // User didn't ask to remove Surface. I probably missed it.
    // I will add a simple Surface input (number) in INFO step.

    const [rentControlData, setRentControlData] = useState<any>(null);
    const price = watch('price');
    const surfaceValue = watch('surface');

    useEffect(() => {
        if (location && (surfaceValue || 50)) { // Fallback if surface missing
            // We need to construct a "mock" listing object for the utility
            const mockListing = {
                surface: surfaceValue || 50,
                roomCount: roomCount,
                buildYear: 2000, // Default
                isFurnished: true, // Default
            };
            // City extraction from location
            // location is { label: "Paris, France" ... }
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
        setStep((value) => value - 1);
    };

    const onNext = () => {
        setStep((value) => value + 1);
    }

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        if (step !== STEPS.PRICE) {
            return onNext();
        }

        setIsLoading(true);

        // Auto-generate Title and Description if missing
        // User requested removal of these inputs, so we generate them.
        const generatedTitle = `${data.category} à ${data.location?.label || 'Ville inconnue'}`;
        const generatedDescription = `Bien de type ${data.category} disponible à la location. Contactez le propriétaire pour plus d'informations.`;

        const finalData = {
            ...data,
            title: data.title || generatedTitle,
            description: data.description || generatedDescription,
            propertyId: rentModal.propertyContext?.id // Phase 3: Add Unit Context
        };

        if (rentModal.editingListing) {
            axios.put(`/api/listings/${rentModal.editingListing.id}`, finalData)
                .then(() => {
                    toast.success('Annonce mise à jour !');
                    router.refresh();
                    reset();
                    setStep(STEPS.CATEGORY);
                    rentModal.onClose();
                })
                .catch((error) => {
                    toast.error(error?.response?.data?.error || "Une erreur s'est produite.");
                })
                .finally(() => {
                    setIsLoading(false);
                })
        } else {
            axios.post('/api/listings', finalData)
                .then((response) => {
                    toast.success('Annonce créée !');
                    router.refresh();
                    reset();
                    setCreatedListing(response.data);
                    setStep(STEPS.CATEGORY);
                    rentModal.onClose();
                })
                .catch((error) => {
                    toast.error(error?.response?.data?.error || "Une erreur s'est produite.");
                })
                .finally(() => {
                    setIsLoading(false);
                })
        }
    }

    const actionLabel = useMemo(() => {
        if (step === STEPS.AVAILABILITY) {
            return 'Terminer';
        }
        if (step === STEPS.INTRO) {
            return 'Commencer';
        }
        if (step === STEPS.PRICE) {
            return rentModal.editingListing ? 'Enregistrer les modifications' : 'Créer';
        }

        return 'Suivant';
    }, [step, rentModal.editingListing]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.CATEGORY) {
            return undefined;
        }

        // Hide Back button if this is the start of the flow for Room Edit
        if (rentModal.editingListing && rentModal.editingListing?.rentalUnit?.type !== 'ENTIRE_PLACE' && step === STEPS.INFO) {
            return undefined;
        }

        if (step === STEPS.INTRO) {
            return undefined;
        }

        return 'Retour';
    }, [step, rentModal.editingListing]);

    let bodyContent = undefined;

    if (step === STEPS.INTRO) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Commencer sur Coridor, c'est facile"
                    subtitle=""
                />

                <div className="flex flex-col gap-6 py-4">
                    {/* Step 1 */}
                    <div className="flex items-center gap-4 border-b border-neutral-100 pb-6 last:border-0 last:pb-0">
                        <div className="font-bold text-lg min-w-[20px]">1</div>
                        <div className="flex flex-col flex-1">
                            <div className="font-medium text-lg">Parlez-nous de votre logement</div>
                            <div className="text-neutral-500 font-light">
                                Donnez-nous quelques informations de base, par exemple où il se trouve et sa configuration.
                            </div>
                        </div>
                        <div className="w-[80px] h-[80px] bg-neutral-100 rounded-xl flex items-center justify-center shrink-0">
                            <Home size={32} className="text-neutral-400" strokeWidth={1} />
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-center gap-4 border-b border-neutral-100 pb-6 last:border-0 last:pb-0">
                        <div className="font-bold text-lg min-w-[20px]">2</div>
                        <div className="flex flex-col flex-1">
                            <div className="font-medium text-lg">Faites en sorte de vous démarquer</div>
                            <div className="text-neutral-500 font-light">
                                Ajoutez au moins 5 photos, un titre et une description pour attirer les locataires.
                            </div>
                        </div>
                        <div className="w-[80px] h-[80px] bg-neutral-100 rounded-xl flex items-center justify-center shrink-0">
                            <Images size={32} className="text-neutral-400" strokeWidth={1} />
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-center gap-4">
                        <div className="font-bold text-lg min-w-[20px]">3</div>
                        <div className="flex flex-col flex-1">
                            <div className="font-medium text-lg">Terminez et publiez</div>
                            <div className="text-neutral-500 font-light">
                                Choisissez un loyer, vérifiez les détails, puis publiez votre annonce.
                            </div>
                        </div>
                        <div className="w-[80px] h-[80px] bg-neutral-100 rounded-xl flex items-center justify-center shrink-0">
                            <CheckCircle size={32} className="text-neutral-400" strokeWidth={1} />
                        </div>
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
                                image={item.image}
                            />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (step === STEPS.LOCATION) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Où est situé votre logement ?"
                    subtitle="Aidez les locataires à vous trouver !"
                />
                <div className="relative z-[2000]">
                    <MapboxAddressSelect
                        value={location}
                        onChange={(value) => setCustomValue('location', value)}
                        limitCountry="fr"
                        placeholder="Adresse postale"
                    />
                </div>
                <Map center={location?.latlng} />
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

    // ...

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
                        "Informations de base"
                    )}
                    subtitle={isRoom ? "Dites-nous en plus sur cette chambre" : "Quelles sont les caractéristiques ?"}
                />

                {/* Link to Physical Room (Phase 4) */}
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
                                    Sélectionnez une chambre créée lors de l'ajout du bien pour récupérer ses photos automatiquement.
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
                                                            toast.success('Photos de la chambre importées !');
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

                {/* Adjective - Only for New Property */}
                {!isRoom && (
                    <div className="flex flex-col gap-2">
                        <label className="font-medium">Comment décririez-vous votre bien ? (Optionnel)</label>
                        <div className="text-xs text-neutral-500 mb-1">
                            Cet adjectif apparaîtra après le type de bien (ex: "Maison calme").
                        </div>
                        <select
                            value={propertyAdjective || ""}
                            onChange={(e) => setCustomValue('propertyAdjective', e.target.value)}
                            className="w-full p-4 border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed bg-background border-input focus:border-foreground"
                        >
                            <option value="">Aucun</option>
                            <optgroup label="Lumière/Espace">
                                <option value="Lumineux">Lumineux</option>
                                <option value="Spacieux">Spacieux</option>
                                <option value="Traversant">Traversant</option>
                                <option value="Ensoleillé">Ensoleillé</option>
                            </optgroup>
                            {/* ... options ... */}
                            <optgroup label="Style/Architecture">
                                <option value="Haussmannien">Haussmannien</option>
                                <option value="Atypique">Atypique</option>
                                <option value="Loft">Loft</option>
                                <option value="Ancien">Ancien</option>
                                <option value="Moderne">Moderne</option>
                                <option value="Neuf">Neuf</option>
                                <option value="Rénové">Rénové</option>
                            </optgroup>
                            <optgroup label="Ambiance">
                                <option value="Calme">Calme</option>
                                <option value="Cosy">Cosy</option>
                                <option value="De charme">De charme</option>
                                <option value="Familial">Familial</option>
                                <option value="Étudiant">Étudiant</option>
                            </optgroup>
                            <optgroup label="Standing">
                                <option value="De standing">De standing</option>
                                <option value="De prestige">De prestige</option>
                            </optgroup>
                        </select>
                    </div>
                )}

                {/* Surface - Always, or at least for Room */}
                <SoftInput
                    id="surface"
                    label={isRoom ? "Surface de la chambre (m²)" : "Surface du logement (m²)"}
                    type="number"
                    inputMode="numeric"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />

                <hr />

                {/* Guest Count: Only relevant for Room (RentModal.propertyContext exists) */}
                {isRoom && (
                    <>
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

                {/* Property Counters (Only for New Property) */}
                {!isRoom && (
                    <>
                        {/* 1. Total Rooms (Pièces) */}
                        <Counter
                            title="Nombre de pièces"
                            subtitle="Salon + Salle à manger + Chambres"
                            value={roomCount}
                            onChange={(value) => setCustomValue('roomCount', value)}
                        />
                        <hr />

                        {/* 2. Bedrooms (Chambres) - Determines physical room creation */}
                        <Counter
                            title="Chambres"
                            subtitle="Nombre de pièces à dormir"
                            value={bedroomCount}
                            onChange={(value) => {
                                if (value < bedroomCount) {
                                    if (window.confirm("Êtes-vous sûr de vouloir supprimer une chambre ? Cela supprimera automatiquement l'album photo associé et les photos qu'il contient.")) {
                                        setCustomValue('bedroomCount', value);
                                    }
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
                            <div
                                onClick={() => setCustomValue('hasPrivateBathroom', false)}
                                className={`
                                    rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition
                                    ${watch('hasPrivateBathroom') === false ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}
                                `}
                            >
                                <X size={18} />
                            </div>

                            <div
                                onClick={() => setCustomValue('hasPrivateBathroom', true)}
                                className={`
                                    rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition
                                    ${watch('hasPrivateBathroom') === true ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}
                                `}
                            >
                                <Check size={18} />
                            </div>
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

                {/* DPE/GES - Only for New Property */}
                {!isRoom && (
                    <>
                        <hr />
                        <div className="flex flex-row gap-4 w-full">
                            <div className="flex flex-col gap-2 w-full">
                                <label className="font-medium">Classe énergie (DPE)</label>
                                <select
                                    value={dpe}
                                    onChange={(e) => setCustomValue('dpe', e.target.value)}
                                    className="w-full p-4 border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed bg-background border-input focus:border-foreground"
                                >
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((grade) => (
                                        <option key={grade} value={grade}>
                                            {grade}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 w-full">
                                <label className="font-medium">GES</label>
                                <select
                                    value={ges}
                                    onChange={(e) => setCustomValue('ges', e.target.value)}
                                    className="w-full p-4 border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed bg-background border-input focus:border-foreground"
                                >
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((grade) => (
                                        <option key={grade} value={grade}>
                                            {grade}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}
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

    const amenityList = [
        { key: 'isTraversant', label: 'Traversant' },
        { key: 'hasGarden', label: 'Jardin' },
        { key: 'isRefurbished', label: 'Rénové' },
        { key: 'petsAllowed', label: 'Animaux acceptés' },
        { key: 'isKitchenEquipped', label: 'Cuisine équipée' },
        { key: 'isSouthFacing', label: 'Orienté Sud' },
        { key: 'hasStorage', label: 'Rangements' },
        { key: 'hasFiber', label: 'Fibre optique' },
        { key: 'hasBikeRoom', label: 'Local vélo' },
        { key: 'hasLaundry', label: 'Lave-linge / Buanderie' },
        { key: 'isNearTransport', label: 'Proche transports' },
        { key: 'hasDigicode', label: 'Digicode' },
        { key: 'hasIntercom', label: 'Interphone' },
        { key: 'hasCaretaker', label: 'Gardien' },
        { key: 'hasArmoredDoor', label: 'Porte blindée' },
        { key: 'isQuietArea', label: 'Quartier calme' },
        { key: 'isNearGreenSpace', label: 'Espaces verts' },
        { key: 'isNearSchools', label: 'Proche écoles' },
        { key: 'isNearShops', label: 'Proche commerces' },
        { key: 'isNearHospital', label: 'Proche hôpital' },
    ];

    if (step === STEPS.AMENITIES) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Quels équipements proposez-vous ?"
                    subtitle="Sélectionnez tout ce qui s'applique"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
                    {amenityList.map((item) => (
                        <div key={item.key} className="flex flex-row items-center gap-4 p-4 border-2 border-border rounded-xl cursor-pointer hover:border-foreground transition" onClick={() => toggleAmenity(item.key)}>
                            <input
                                type="checkbox"
                                checked={amenities?.includes(item.key)}
                                onChange={() => { }}
                                className="cursor-pointer w-5 h-5"
                            />
                            <div className="font-medium">
                                {item.label}
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
                    title="Ajoutez des photos"
                    subtitle="Montrez à quoi ressemble votre logement !"
                />
                <MultiImageUpload
                    value={imageSrcs}
                    onChange={(value) => setCustomValue('imageSrcs', value)}
                />
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

    return (
        <Modal
            isOpen={rentModal.isOpen}
            onClose={rentModal.onClose}
            onSubmit={step === STEPS.AVAILABILITY ? rentModal.onClose : handleSubmit(onSubmit)}
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step === STEPS.CATEGORY || step === STEPS.AVAILABILITY ? undefined : onBack}
            title={title}
            body={bodyContent}
            currentStep={step === STEPS.INTRO ? undefined : step}
            totalSteps={STEPS.AVAILABILITY}
        />
    );
};

export default RentModal;
