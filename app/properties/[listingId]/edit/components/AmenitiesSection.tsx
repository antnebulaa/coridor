'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
    TbElevator,
    TbDisabled,
    TbDoorEnter,
    TbArrowsLeftRight,
    TbPaint,
    TbToolsKitchen2,
    TbSun,
    TbEyeOff,
    TbMountain,
    TbVolumeOff,
    TbBath,
    TbHanger,
    TbWifi,
    TbWashMachine,
    TbSnowflake,
    TbArrowBarToUp,
    TbTree,
    TbCompass,
    TbPool,
    TbBike,
    TbDialpad,
    TbDeviceLandlinePhone,
    TbUserShield,
    TbShieldLock,
    TbHomeHeart,
    TbUserStar,
    TbDog,
    TbSchool,
    TbBus,
    TbTrees,
    TbShoppingBag,
    TbFirstAidKit
} from "react-icons/tb";

import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import CategoryInput from "@/components/inputs/CategoryInput";

interface AmenitiesSectionProps {
    listing: SafeListing;
}

const AMENITIES_GROUPS = [
    {
        title: "Accessibilité",
        items: [
            { id: 'hasElevator', label: 'Ascenseur', icon: TbElevator },
            { id: 'isAccessible', label: 'Accès handicapé', icon: TbDisabled },
            { id: 'hasAutomaticDoors', label: 'Portes automatiques', icon: TbDoorEnter },
        ]
    },
    {
        title: "Intérieur & Confort",
        items: [
            { id: 'isTraversant', label: 'Appartement traversant', icon: TbArrowsLeftRight },
            { id: 'isRefurbished', label: 'Refait à neuf', icon: TbPaint },
            { id: 'isKitchenEquipped', label: 'Cuisine équipée', icon: TbToolsKitchen2 },
            { id: 'isBright', label: 'Lumineux', icon: TbSun },
            { id: 'hasNoOpposite', label: 'Sans vis-à-vis', icon: TbEyeOff },
            { id: 'hasView', label: 'Belle vue', icon: TbMountain },
            { id: 'isQuiet', label: 'Calme', icon: TbVolumeOff },
            { id: 'hasBathtub', label: 'Baignoire', icon: TbBath },
            { id: 'hasStorage', label: 'Nombreux rangements', icon: TbHanger },
            { id: 'hasFiber', label: 'Fibre optique / Haut débit', icon: TbWifi },
            { id: 'hasLaundry', label: 'Buanderie', icon: TbWashMachine },
            { id: 'hasAirConditioning', label: 'Climatisation', icon: TbSnowflake }, // Note: Need to check if added to schema, I think I missed this one in schema update!
        ]
    },
    {
        title: "Extérieur",
        items: [
            { id: 'isLastFloor', label: 'Dernier étage', icon: TbArrowBarToUp },
            { id: 'hasGarden', label: 'Jardin privatif', icon: TbTree },
            { id: 'isSouthFacing', label: 'Exposition sud', icon: TbCompass },
            { id: 'hasPool', label: 'Piscine', icon: TbPool },
            { id: 'hasBikeRoom', label: 'Local à vélos sécurisé', icon: TbBike },
        ]
    },
    {
        title: "Sécurité",
        items: [
            { id: 'hasDigicode', label: 'Digicode', icon: TbDialpad },
            { id: 'hasIntercom', label: 'Interphone', icon: TbDeviceLandlinePhone },
            { id: 'hasCaretaker', label: 'Gardien', icon: TbUserShield },
            { id: 'hasArmoredDoor', label: 'Porte blindée', icon: TbShieldLock },
            { id: 'isQuietArea', label: 'Quartier tranquille', icon: TbHomeHeart },
            { id: 'hasConcierge', label: 'Concierge', icon: TbUserStar },
        ]
    },
    {
        title: "Services & Autres",
        items: [
            { id: 'petsAllowed', label: 'Animal de compagnie FRIENDLY', icon: TbDog },
            { id: 'isStudentFriendly', label: 'Étudiant FRIENDLY', icon: TbSchool },
        ]
    },
    {
        title: "Proximité",
        items: [
            { id: 'isNearTransport', label: 'Accès facile aux transports', icon: TbBus },
            { id: 'isNearGreenSpace', label: 'Proximité d\'espaces verts', icon: TbTrees },
            { id: 'isNearSchools', label: 'Écoles, crèches à proximité', icon: TbSchool },
            { id: 'isNearShops', label: 'Commerces de proximité', icon: TbShoppingBag },
            { id: 'isNearHospital', label: 'Hôpital proche', icon: TbFirstAidKit },
        ]
    }
];

const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Initialize selected amenities from listing data
    const getInitialAmenities = () => {
        const initial: string[] = [];
        // Map all possible boolean fields
        const booleanFields = [
            'hasElevator', 'isAccessible', 'hasAutomaticDoors',
            'isTraversant', 'isRefurbished', 'isKitchenEquipped', 'isBright', 'hasNoOpposite', 'hasView', 'isQuiet', 'hasBathtub', 'hasStorage', 'hasFiber', 'hasLaundry',
            'isLastFloor', 'hasGarden', 'isSouthFacing', 'hasPool', 'hasBikeRoom',
            'hasDigicode', 'hasIntercom', 'hasCaretaker', 'hasArmoredDoor', 'isQuietArea', 'hasConcierge',
            'petsAllowed', 'isStudentFriendly',
            'isNearTransport', 'isNearGreenSpace', 'isNearSchools', 'isNearShops', 'isNearHospital'
        ];

        booleanFields.forEach(field => {
            if ((listing as any)[field]) {
                initial.push(field);
            }
        });
        return initial;
    };

    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(getInitialAmenities());

    const toggleAmenity = (id: string) => {
        setSelectedAmenities(prev => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const onSubmit = () => {
        setIsLoading(true);

        axios.put(`/api/listings/${listing.id}`, { amenities: selectedAmenities })
            .then(() => {
                toast.success('Listing updated!');
                router.refresh();
            })
            .catch(() => {
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-0">
            {AMENITIES_GROUPS.map((group) => (
                <div key={group.title} className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold">{group.title}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {group.items.map((item) => (
                            <CategoryInput
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                selected={selectedAmenities.includes(item.id)}
                                onClick={() => toggleAmenity(item.id)}
                            />
                        ))}
                    </div>
                    <hr />
                </div>
            ))}

            <div className="
                fixed 
                bottom-0 
                left-0 
                w-full 
                bg-white 
                border-t-[1px] 
                border-neutral-200 
                p-4 
                z-50 
                md:relative 
                md:bottom-auto 
                md:left-auto 
                md:w-auto 
                md:bg-transparent 
                md:border-none 
                md:p-0 
                md:mt-4 
                md:flex 
                md:justify-end
            ">
                <div className="w-full md:w-auto">
                    <Button
                        disabled={isLoading}
                        label="Enregistrer"
                        onClick={onSubmit}
                    />
                </div>
            </div>
        </div>
    );
}

export default AmenitiesSection;
