'use client';

import { LucideIcon, Ruler, Building2, Calendar, Home, Euro } from 'lucide-react';
import useCountries from '@/hooks/useCountries';
import NeighborhoodScore from './NeighborhoodScore';
import { SafeListing, SafeUser } from '@/types';
import ListingAmenities from './ListingAmenities';
import ListingLocation from './ListingLocation';
import ListingTransit from './ListingTransit';
import Avatar from '../Avatar';
import ListingEnergy from './ListingEnergy';
import ListingCommute from './ListingCommute';
import { useTranslations } from 'next-intl';

interface ListingInfoProps {
    user: SafeUser;
    currentUser?: SafeUser | null;
    category: {
        icon: LucideIcon;
        label: string;
        description: string;
    } | undefined;
    description: string;
    roomCount: number;
    guestCount: number;
    bathroomCount: number;
    locationValue: string;
    listing: SafeListing;
}

const ListingInfo: React.FC<ListingInfoProps> = ({
    user,
    currentUser,
    category,
    description,
    roomCount,
    guestCount,
    bathroomCount,
    locationValue,
    listing
}) => {
    const { getByValue } = useCountries();
    const coordinates = getByValue(locationValue)?.latlng;
    const t = useTranslations('listing');

    return (
        <div className="col-span-4 flex flex-col gap-8">
            <div className="flex flex-col gap-2">

                <div className="flex flex-row items-center gap-4 font-normal text-muted-foreground">
                    <div>{t('details.guests', { count: guestCount })}</div>
                    <div>{t('details.rooms', { count: roomCount })}</div>
                    <div>{t('details.bathrooms', { count: bathroomCount })}</div>
                </div>
            </div>
            <hr />
            {category && (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-row items-center gap-4">
                        <category.icon size={40} className="text-muted-foreground" />
                        <div className="flex flex-col">
                            <div className="text-lg font-medium">
                                {category.label}
                            </div>
                            <div className="text-muted-foreground font-normal">
                                {category.description}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <hr />

            {/* Property Details Section */}
            <div className="flex flex-col gap-6">
                <div className="text-xl font-semibold flex items-center gap-2">
                    <Home size={24} />
                    {t('details.title')}
                </div>
                <div className="grid grid-cols-2 gap-4 text-muted-foreground">
                    {listing.surface && (
                        <div className="flex items-center gap-2">
                            <Ruler size={20} />
                            <span>{t('details.surface', { area: listing.surface })}</span>
                        </div>
                    )}
                    {listing.floor !== null && (
                        <div className="flex items-center gap-2">
                            <Building2 size={20} />
                            <span>{t('details.floor', { floor: listing.floor })} {listing.totalFloors ? t('details.totalFloors', { total: listing.totalFloors }) : ''}</span>
                        </div>
                    )}
                    {listing.buildYear && (
                        <div className="flex items-center gap-2">
                            <Calendar size={20} />
                            <span>{t('details.buildYear', { year: listing.buildYear })}</span>
                        </div>
                    )}
                    {listing.isFurnished !== undefined && (
                        <div className="flex items-center gap-2">
                            <Home size={20} />
                            <span>{listing.isFurnished ? t('details.furnished') : t('details.unfurnished')}</span>
                        </div>
                    )}
                </div>
            </div>

            <hr />

            {/* Financial Details Section */}
            <div className="flex flex-col gap-6">
                <div className="text-xl font-semibold flex items-center gap-2">
                    <Euro size={24} />
                    {t('sections.financials')}
                </div>
                {/* ... existing financial details ... */}
                <div className="flex flex-col gap-4 text-muted-foreground">
                    <div className="flex justify-between max-w-[400px]">
                        <span>{t('sections.rentExcl')}</span>
                        <span className="font-medium text-black">{listing.price} € {t('sections.month')}</span>
                    </div>
                    {listing.guestCount && (
                        <div className="flex justify-between max-w-[400px]">
                            <span>{t('listing.rooms')}:</span>
                            <span className="font-medium text-black">{t('details.rooms', { count: listing.guestCount })}</span>
                        </div>
                    )}
                    {listing.charges && (
                        <div className="flex justify-between max-w-[400px]">
                            <span>{t('sections.charges')}</span>
                            <span className="font-medium text-black">+ {(listing.charges as any).amount} € {t('sections.month')}</span>
                        </div>
                    )}
                    {/* Total Display */}
                    <div className="flex justify-between max-w-[400px] border-t pt-2 mt-1">
                        <span className="font-medium text-black">{t('sections.rentIncl')}</span>
                        <span className="font-bold text-black">{listing.price + (listing.charges ? (listing.charges as any).amount : 0)} € {t('sections.month')}</span>
                    </div>

                    {listing.securityDeposit !== undefined && listing.securityDeposit !== null && (
                        <div className="flex justify-between max-w-[400px] mt-2 bg-neutral-50 p-2 rounded-lg">
                            <span>{t('sections.deposit')}</span>
                            <span className="font-medium text-black">{listing.securityDeposit === 0 ? t('sections.none') : `${listing.securityDeposit} €`}</span>
                        </div>
                    )}
                </div>

            </div>

            <hr />

            <ListingEnergy
                dpe={listing.dpe}
                ges={listing.ges}
                heatingSystem={listing.heatingSystem}
                glazingType={listing.glazingType}
                listing={listing}
            />

            <hr />
            <div className="text-lg font-normal text-muted-foreground">
                {description}
            </div>
            <hr />

            <ListingAmenities listing={listing} />

            <hr />

            <ListingLocation listing={listing} />

            <hr />

            <ListingCommute listing={listing} currentUser={currentUser} />

            <hr />

            {/* Transit Section - Uses same coordinates as Map */}
            {
                (() => {
                    const countryCoords = getByValue(locationValue)?.latlng;
                    const lat = listing.latitude ?? countryCoords?.[0];
                    const lng = listing.longitude ?? countryCoords?.[1];

                    if (lat && lng) {
                        return (
                            <>
                                <ListingTransit
                                    latitude={lat}
                                    longitude={lng}
                                    listingId={listing.id}
                                />
                                <hr />
                            </>
                        );
                    }
                    return null;
                })()
            }

            {/* <NeighborhoodScore latitude={listing.latitude!} longitude={listing.longitude!} /> */}
        </div >
    );
};

export default ListingInfo;
