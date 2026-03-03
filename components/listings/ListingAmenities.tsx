'use client';

import {
    Wifi,
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
    Hammer,
    Flower2,
    ArrowUpFromLine,
    Accessibility,
    Zap,
    Eye,
    Waves,
    Bath,
    ThermometerSnowflake,
    ConciergeBell,
    Fence,
    Car,
    Warehouse,
    Archive,
} from 'lucide-react';
import { SafeListing } from '@/types';
import { useTranslations } from 'next-intl';

interface ListingAmenitiesProps {
    listing: SafeListing;
}

const ListingAmenities: React.FC<ListingAmenitiesProps> = ({
    listing
}) => {
    const t = useTranslations('listing.amenities');

    const categories = [
        {
            label: 'Intérieur',
            items: [
                { label: t('wifi'), icon: Wifi, value: listing.hasFiber },
                { label: t('kitchen'), icon: Utensils, value: listing.isKitchenEquipped },
                { label: t('bathtub'), icon: Bath, value: listing.hasBathtub },
                { label: t('airConditioning'), icon: ThermometerSnowflake, value: listing.hasAirConditioning },
                { label: t('refurbished'), icon: Hammer, value: listing.isRefurbished },
                { label: t('laundry'), icon: Shirt, value: listing.hasLaundry },
                { label: 'Volets', icon: DoorOpen, value: (listing as any).hasShutters },
            ],
        },
        {
            label: 'Extérieur',
            items: [
                { label: 'Balcon', icon: Fence, value: listing.hasBalcony },
                { label: 'Terrasse', icon: Fence, value: (listing as any).hasTerrace },
                { label: 'Loggia', icon: DoorOpen, value: (listing as any).hasLoggia },
                { label: t('garden'), icon: Flower2, value: listing.hasGarden },
                { label: 'Cour privative', icon: Flower2, value: (listing as any).hasCourtyard },
                { label: t('pool'), icon: Waves, value: listing.hasPool },
            ],
        },
        {
            label: 'Confort',
            items: [
                { label: t('bright'), icon: Sun, value: listing.isBright },
                { label: t('south'), icon: Sun, value: listing.isSouthFacing },
                { label: t('noOpposite'), icon: Eye, value: listing.hasNoOpposite },
                { label: t('view'), icon: Eye, value: listing.hasView },
                { label: t('quiet'), icon: VolumeX, value: listing.isQuiet },
                { label: t('quietArea'), icon: VolumeX, value: listing.isQuietArea },
                { label: t('lastFloor'), icon: ArrowUpFromLine, value: listing.isLastFloor },
            ],
        },
        {
            label: 'Sécurité',
            items: [
                { label: t('digicode'), icon: Key, value: listing.hasDigicode },
                { label: t('intercom'), icon: Shield, value: listing.hasIntercom },
                { label: t('armoredDoor'), icon: DoorOpen, value: listing.hasArmoredDoor },
                { label: t('caretaker'), icon: User, value: listing.hasCaretaker },
                { label: t('concierge'), icon: ConciergeBell, value: listing.hasConcierge },
            ],
        },
        {
            label: 'Proximité',
            items: [
                { label: t('transport'), icon: Train, value: listing.isNearTransport },
                { label: t('greenSpace'), icon: Trees, value: listing.isNearGreenSpace },
                { label: t('schools'), icon: School, value: listing.isNearSchools },
                { label: t('shops'), icon: ShoppingBag, value: listing.isNearShops },
                { label: t('hospital'), icon: Stethoscope, value: listing.isNearHospital },
            ],
        },
        {
            label: 'Accessibilité',
            items: [
                { label: t('elevator'), icon: ArrowUpFromLine, value: listing.hasElevator },
                { label: t('accessible'), icon: Accessibility, value: listing.isAccessible },
                { label: t('automaticDoors'), icon: Zap, value: listing.hasAutomaticDoors },
            ],
        },
        {
            label: 'Annexes',
            items: [
                { label: t('storage'), icon: Box, value: listing.hasStorage },
                { label: t('bikeRoom'), icon: Bike, value: listing.hasBikeRoom },
                { label: 'Cave', icon: Archive, value: (listing as any).hasCave },
                { label: 'Parking', icon: Car, value: (listing as any).hasParking },
                { label: 'Garage', icon: Warehouse, value: (listing as any).hasGarage },
            ],
        },
    ];

    // Filter to only categories that have at least one active item
    const activeCategories = categories
        .map((cat) => ({
            ...cat,
            items: cat.items.filter((item) => item.value),
        }))
        .filter((cat) => cat.items.length > 0);

    if (activeCategories.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {t('title')}
            </div>
            <div className="flex flex-col">
                {activeCategories.map((cat, index) => (
                    <div key={cat.label}>
                        {index > 0 && (
                            <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-4" />
                        )}
                        <p className="text-xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-medium mb-2.5">
                            {cat.label}
                        </p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            {cat.items.map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-center gap-3"
                                >
                                    <item.icon size={18} className="text-neutral-500 dark:text-neutral-400 shrink-0" />
                                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ListingAmenities;
