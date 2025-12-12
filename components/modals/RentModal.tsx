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

import { LeaseType } from "@prisma/client";

enum STEPS {
    CATEGORY = 0,
    LOCATION = 1,
    INFO = 2,
    AMENITIES = 3,
    IMAGES = 4,
    DESCRIPTION = 5,
    PRICE = 6,
}

const RentModal = () => {
    const router = useRouter();
    const rentModal = useRentModal();

    const Map = useMemo(() => dynamic(() => import('../Map'), {
        ssr: false
    }), []);

    const [step, setStep] = useState(STEPS.CATEGORY);
    const [isLoading, setIsLoading] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');

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
            location: null,
            guestCount: 1,
            roomCount: 1,
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
            reset({
                category: listing.category,
                location: listing.locationValue ? { value: listing.locationValue, label: listing.locationValue, flag: '', latlng: [0, 0], region: '' } : null, // Simplification, ideally we need full location object or fetch it
                guestCount: listing.guestCount || 1,
                roomCount: listing.roomCount || 1,
                bathroomCount: listing.bathroomCount || 1,
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
                rooms: listing.rooms?.map((room: any) => ({
                    name: room.name,
                    images: room.images?.map((img: any) => img.url) || []
                })) || []
            });
            setStep(STEPS.CATEGORY);
        } else {
            reset({
                category: '',
                location: null,
                guestCount: 1,
                roomCount: 1,
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
            setStep(STEPS.CATEGORY);
        }
    }, [rentModal.editingListing, reset]);

    const category = watch('category');
    const location = watch('location');
    const guestCount = watch('guestCount');
    const roomCount = watch('roomCount');
    const bathroomCount = watch('bathroomCount');
    const imageSrc = watch('imageSrc');

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

        if (rentModal.editingListing) {
            axios.put(`/api/listings/${rentModal.editingListing.id}`, data)
                .then(() => {
                    toast.success('Listing updated!');
                    router.refresh();
                    reset();
                    setStep(STEPS.CATEGORY);
                    rentModal.onClose();
                })
                .catch(() => {
                    toast.error('Something went wrong.');
                })
                .finally(() => {
                    setIsLoading(false);
                })
        } else {
            axios.post('/api/listings', data)
                .then(() => {
                    toast.success('Listing created!');
                    router.refresh();
                    reset();
                    setStep(STEPS.CATEGORY);
                    rentModal.onClose();
                })
                .catch(() => {
                    toast.error('Something went wrong.');
                })
                .finally(() => {
                    setIsLoading(false);
                })
        }
    }

    const actionLabel = useMemo(() => {
        if (step === STEPS.PRICE) {
            return 'Create';
        }

        return 'Next';
    }, [step]);

    const secondaryActionLabel = useMemo(() => {
        if (step === STEPS.CATEGORY) {
            return undefined;
        }

        return 'Back';
    }, [step]);

    let bodyContent = (
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

    if (step === STEPS.LOCATION) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Where is your place located?"
                    subtitle="Help guests find you!"
                />
                <MapboxAddressSelect
                    value={location}
                    onChange={(value) => setCustomValue('location', value)}
                    limitCountry="fr"
                />
                <Map center={location?.latlng} />
            </div>
        );
    }

    const leaseType = watch('leaseType');
    const dpe = watch('dpe');
    const ges = watch('ges');

    if (step === STEPS.INFO) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Share some basics about your place"
                    subtitle="What amenities do you have?"
                />
                <Counter
                    title="Guests"
                    subtitle="How many guests do you allow?"
                    value={guestCount}
                    onChange={(value) => setCustomValue('guestCount', value)}
                />
                <hr />
                <Counter
                    title="Rooms"
                    subtitle="How many rooms do you have?"
                    value={roomCount}
                    onChange={(value) => setCustomValue('roomCount', value)}
                />
                <hr />
                <Counter
                    title="Bathrooms"
                    subtitle="How many bathrooms do you have?"
                    value={bathroomCount}
                    onChange={(value) => setCustomValue('bathroomCount', value)}
                />
                <hr />
                <div className="flex flex-col gap-2">
                    <label className="font-medium">Lease Type</label>
                    <select
                        value={leaseType}
                        onChange={(e) => setCustomValue('leaseType', e.target.value)}
                        className="w-full p-4 border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed border-neutral-300 focus:border-black"
                    >
                        {Object.values(LeaseType).map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-row gap-4 w-full">
                    <div className="flex flex-col gap-2 w-full">
                        <label className="font-medium">Classe énergie (DPE)</label>
                        <select
                            value={dpe}
                            onChange={(e) => setCustomValue('dpe', e.target.value)}
                            className="w-full p-4 border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed border-neutral-300 focus:border-black"
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
                            className="w-full p-4 border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed border-neutral-300 focus:border-black"
                        >
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((grade) => (
                                <option key={grade} value={grade}>
                                    {grade}
                                </option>
                            ))}
                        </select>
                    </div>
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

    const amenityList = [
        { key: 'isTraversant', label: 'Traversant' },
        { key: 'hasGarden', label: 'Garden' },
        { key: 'isRefurbished', label: 'Refurbished' },
        { key: 'petsAllowed', label: 'Pets Allowed' },
        { key: 'isKitchenEquipped', label: 'Equipped Kitchen' },
        { key: 'isSouthFacing', label: 'South Facing' },
        { key: 'hasStorage', label: 'Storage' },
        { key: 'hasFiber', label: 'Fiber Internet' },
        { key: 'hasBikeRoom', label: 'Bike Room' },
        { key: 'hasLaundry', label: 'Laundry' },
        { key: 'isNearTransport', label: 'Near Transport' },
        { key: 'hasDigicode', label: 'Digicode' },
        { key: 'hasIntercom', label: 'Intercom' },
        { key: 'hasCaretaker', label: 'Caretaker' },
        { key: 'hasArmoredDoor', label: 'Armored Door' },
        { key: 'isQuietArea', label: 'Quiet Area' },
        { key: 'isNearGreenSpace', label: 'Near Green Space' },
        { key: 'isNearSchools', label: 'Near Schools' },
        { key: 'isNearShops', label: 'Near Shops' },
        { key: 'isNearHospital', label: 'Near Hospital' },
    ];

    if (step === STEPS.AMENITIES) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="What does your place offer?"
                    subtitle="Select all that apply"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
                    {amenityList.map((item) => (
                        <div key={item.key} className="flex flex-row items-center gap-4 p-4 border-2 rounded-xl cursor-pointer hover:border-black transition" onClick={() => toggleAmenity(item.key)}>
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
                    title="Add photos of your place"
                    subtitle="Show guests what your place looks like!"
                />
                <MultiImageUpload
                    value={imageSrcs}
                    onChange={(value) => setCustomValue('imageSrcs', value)}
                />
            </div>
        )
    }

    if (step === STEPS.DESCRIPTION) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="How would you describe your place?"
                    subtitle="Short and sweet works best!"
                />
                <SoftInput
                    id="title"
                    label="Title"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
                <hr />
                <SoftInput
                    id="description"
                    label="Description"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
                <hr />
                <SoftInput
                    id="charges"
                    label="Charges (monthly)"
                    type="number"
                    formatPrice
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
            </div>
        )
    }

    if (step === STEPS.PRICE) {
        bodyContent = (
            <div className="flex flex-col gap-8">
                <Heading
                    title="Now, set your price"
                    subtitle="How much do you charge per night?"
                />
                <SoftInput
                    id="price"
                    label="Price"
                    formatPrice
                    type="number"
                    disabled={isLoading}
                    register={register}
                    errors={errors}
                    required
                />
            </div>
        )
    }

    return (
        <Modal
            isOpen={rentModal.isOpen}
            onClose={rentModal.onClose}
            onSubmit={handleSubmit(onSubmit)}
            actionLabel={actionLabel}
            secondaryActionLabel={secondaryActionLabel}
            secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
            title={rentModal.editingListing ? "Edit your property" : "Louer mon bien"}
            body={bodyContent}
        />
    );
};

export default RentModal;
