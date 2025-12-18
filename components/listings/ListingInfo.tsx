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

    return (
        <div className="col-span-4 flex flex-col gap-8">
            <div className="flex flex-col gap-2">

                <div className="flex flex-row items-center gap-4 font-normal text-muted-foreground">
                    <div>{guestCount} Capacité</div>
                    <div>{roomCount} chambres</div>
                    <div>{bathroomCount} salles de bain</div>
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
                    Détails du logement
                </div>
                <div className="grid grid-cols-2 gap-4 text-muted-foreground">
                    {listing.surface && (
                        <div className="flex items-center gap-2">
                            <Ruler size={20} />
                            <span>{listing.surface} {listing.surfaceUnit === 'imperial' ? 'sq ft' : 'm²'}</span>
                        </div>
                    )}
                    {listing.floor !== null && (
                        <div className="flex items-center gap-2">
                            <Building2 size={20} />
                            <span>Étage {listing.floor} {listing.totalFloors ? `/ ${listing.totalFloors}` : ''}</span>
                        </div>
                    )}
                    {listing.buildYear && (
                        <div className="flex items-center gap-2">
                            <Calendar size={20} />
                            <span>Année de construction : {listing.buildYear}</span>
                        </div>
                    )}
                    {listing.isFurnished !== undefined && (
                        <div className="flex items-center gap-2">
                            <Home size={20} />
                            <span>{listing.isFurnished ? 'Meublé' : 'Non meublé'}</span>
                        </div>
                    )}
                </div>
            </div>

            <hr />

            {/* Financial Details Section */}
            <div className="flex flex-col gap-6">
                <div className="text-xl font-semibold flex items-center gap-2">
                    <Euro size={24} />
                    Informations financières
                </div>
                {/* ... existing financial details ... */}
                <div className="flex flex-col gap-4 text-muted-foreground">
                    <div className="flex justify-between max-w-[400px]">
                        <span>Loyer hors charges :</span>
                        <span className="font-medium text-black">{listing.price} € / mois</span>
                    </div>
                    {listing.guestCount && (
                        <div className="flex justify-between max-w-[400px]">
                            <span>Nombre de chambres :</span>
                            <span className="font-medium text-black">{listing.guestCount} {listing.guestCount > 1 ? 'chambres' : 'chambre'}</span>
                        </div>
                    )}
                    {listing.charges && (
                        <div className="flex justify-between max-w-[400px]">
                            <span>Provisions sur charges :</span>
                            <span className="font-medium text-black">+ {(listing.charges as any).amount} € / mois</span>
                        </div>
                    )}
                    {/* Total Display */}
                    <div className="flex justify-between max-w-[400px] border-t pt-2 mt-1">
                        <span className="font-medium text-black">Loyer charges comprises :</span>
                        <span className="font-bold text-black">{listing.price + (listing.charges ? (listing.charges as any).amount : 0)} € / mois</span>
                    </div>

                    {listing.securityDeposit !== undefined && listing.securityDeposit !== null && (
                        <div className="flex justify-between max-w-[400px] mt-2 bg-neutral-50 p-2 rounded-lg">
                            <span>Dépôt de garantie :</span>
                            <span className="font-medium text-black">{listing.securityDeposit === 0 ? "Aucun" : `${listing.securityDeposit} €`}</span>
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
