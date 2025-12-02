'use client';

import {
    Wifi,
    Wind,
    Sun,
    Trees,
    School,
    ShoppingBag,
    Stethoscope,
    Train,
    Shield,
    Key,
    User,
    DoorOpen,
    VolumeX,
    Box,
    Bike,
    Shirt,
    Utensils,
    PawPrint,
    Hammer,
    Flower2,
    ArrowLeftRight,
    ArrowUpFromLine,
    Accessibility,
    Zap,
    Eye,
    Waves,
    Bath,
    ThermometerSnowflake,
    GraduationCap,
    ConciergeBell
} from 'lucide-react';
import { IconType } from 'react-icons';
import { SafeListing } from '@/types';

interface ListingAmenitiesProps {
    listing: SafeListing;
}

const ListingAmenities: React.FC<ListingAmenitiesProps> = ({
    listing
}) => {
    const amenities = [
        { label: 'Traversant', icon: ArrowLeftRight, value: listing.isTraversant },
        { label: 'Jardin', icon: Flower2, value: listing.hasGarden },
        { label: 'Refait à neuf', icon: Hammer, value: listing.isRefurbished },
        { label: 'Animaux acceptés', icon: PawPrint, value: listing.petsAllowed },
        { label: 'Cuisine équipée', icon: Utensils, value: listing.isKitchenEquipped },
        { label: 'Exposition Sud', icon: Sun, value: listing.isSouthFacing },
        { label: 'Rangements', icon: Box, value: listing.hasStorage },
        { label: 'Fibre optique', icon: Wifi, value: listing.hasFiber },
        { label: 'Local vélo', icon: Bike, value: listing.hasBikeRoom },
        { label: 'Laverie / Lave-linge', icon: Shirt, value: listing.hasLaundry },
        { label: 'Proche transports', icon: Train, value: listing.isNearTransport },
        { label: 'Digicode', icon: Key, value: listing.hasDigicode },
        { label: 'Interphone', icon: Shield, value: listing.hasIntercom },
        { label: 'Gardien', icon: User, value: listing.hasCaretaker },
        { label: 'Porte blindée', icon: DoorOpen, value: listing.hasArmoredDoor },
        { label: 'Quartier calme', icon: VolumeX, value: listing.isQuietArea },
        { label: 'Espaces verts', icon: Trees, value: listing.isNearGreenSpace },
        { label: 'Écoles à proximité', icon: School, value: listing.isNearSchools },
        { label: 'Commerces à proximité', icon: ShoppingBag, value: listing.isNearShops },
        { label: 'Hôpital à proximité', icon: Stethoscope, value: listing.isNearHospital },
        { label: 'Ascenseur', icon: ArrowUpFromLine, value: listing.hasElevator },
        { label: 'Accessible PMR', icon: Accessibility, value: listing.isAccessible },
        { label: 'Portes automatiques', icon: Zap, value: listing.hasAutomaticDoors },
        { label: 'Dernier étage', icon: ArrowUpFromLine, value: listing.isLastFloor },
        { label: 'Lumineux', icon: Sun, value: listing.isBright },
        { label: 'Sans vis-à-vis', icon: Eye, value: listing.hasNoOpposite },
        { label: 'Vue dégagée', icon: Eye, value: listing.hasView },
        { label: 'Calme', icon: VolumeX, value: listing.isQuiet },
        { label: 'Piscine', icon: Waves, value: listing.hasPool },
        { label: 'Baignoire', icon: Bath, value: listing.hasBathtub },
        { label: 'Climatisation', icon: ThermometerSnowflake, value: listing.hasAirConditioning },
        { label: 'Idéal étudiant', icon: GraduationCap, value: listing.isStudentFriendly },
        { label: 'Conciergerie', icon: ConciergeBell, value: listing.hasConcierge },
    ].filter((item) => item.value);

    if (amenities.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="text-xl font-semibold">
                Les atouts de ce logement
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {amenities.map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center gap-3 p-3 border-[1px] border-neutral-200 rounded-xl hover:shadow-sm transition"
                    >
                        <item.icon size={24} className="text-neutral-600" />
                        <div className="font-light text-neutral-600">
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ListingAmenities;
