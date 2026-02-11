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
    ConciergeBell,
    Check
} from 'lucide-react';
import { IconType } from 'react-icons';
import { SafeListing } from '@/types';
import { useTranslations } from 'next-intl';

interface ListingAmenitiesProps {
    listing: SafeListing;
}

const ListingAmenities: React.FC<ListingAmenitiesProps> = ({
    listing
}) => {
    const t = useTranslations('listing.amenities');

    const amenities = [
        { label: t('wifi'), icon: Wifi, value: listing.hasFiber },
        { label: t('garden'), icon: Flower2, value: listing.hasGarden },
        { label: t('refurbished'), icon: Hammer, value: listing.isRefurbished },
        { label: t('pets'), icon: PawPrint, value: listing.petsAllowed },
        { label: t('kitchen'), icon: Utensils, value: listing.isKitchenEquipped },
        { label: t('south'), icon: Sun, value: listing.isSouthFacing },
        { label: t('storage'), icon: Box, value: listing.hasStorage },
        { label: t('bikeRoom'), icon: Bike, value: listing.hasBikeRoom },
        { label: t('laundry'), icon: Shirt, value: listing.hasLaundry },
        { label: t('transport'), icon: Train, value: listing.isNearTransport },
        { label: t('digicode'), icon: Key, value: listing.hasDigicode },
        { label: t('intercom'), icon: Shield, value: listing.hasIntercom },
        { label: t('caretaker'), icon: User, value: listing.hasCaretaker },
        { label: t('armoredDoor'), icon: DoorOpen, value: listing.hasArmoredDoor },
        { label: t('quietArea'), icon: VolumeX, value: listing.isQuietArea },
        { label: t('greenSpace'), icon: Trees, value: listing.isNearGreenSpace },
        { label: t('schools'), icon: School, value: listing.isNearSchools },
        { label: t('shops'), icon: ShoppingBag, value: listing.isNearShops },
        { label: t('hospital'), icon: Stethoscope, value: listing.isNearHospital },
        { label: t('elevator'), icon: ArrowUpFromLine, value: listing.hasElevator },
        { label: t('accessible'), icon: Accessibility, value: listing.isAccessible },
        { label: t('automaticDoors'), icon: Zap, value: listing.hasAutomaticDoors },
        { label: t('lastFloor'), icon: ArrowUpFromLine, value: listing.isLastFloor },
        { label: t('bright'), icon: Sun, value: listing.isBright },
        { label: t('noOpposite'), icon: Eye, value: listing.hasNoOpposite },
        { label: t('view'), icon: Eye, value: listing.hasView },
        { label: t('quiet'), icon: VolumeX, value: listing.isQuiet },
        { label: t('pool'), icon: Waves, value: listing.hasPool },
        { label: t('bathtub'), icon: Bath, value: listing.hasBathtub },
        { label: t('airConditioning'), icon: ThermometerSnowflake, value: listing.hasAirConditioning },
        { label: t('student'), icon: GraduationCap, value: listing.isStudentFriendly },
        { label: t('concierge'), icon: ConciergeBell, value: listing.hasConcierge },
    ].filter((item) => item.value);

    if (amenities.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="text-xl font-semibold">
                {t('title')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {amenities.map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center gap-3 p-1"
                    >
                        <Check size={24} className="text-neutral-600" />
                        <div className="font-normal text-neutral-600 text-base">
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ListingAmenities;
