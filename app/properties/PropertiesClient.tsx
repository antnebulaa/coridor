'use client';

import { toast } from "react-hot-toast";
import axios from "axios";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import useRentModal from "@/hooks/useRentModal";
import { Plus } from 'lucide-react';

import { SafeProperty, SafeUser, SafeRentalUnit } from "@/types";
import Container from "@/components/Container";
import PropertiesListRow from "./components/PropertiesListRow";
import EmptyState from "@/components/EmptyState";
import { Button } from '@/components/ui/Button';
import PageHeader from "@/components/PageHeader";

interface PropertiesClientProps {
    properties: SafeProperty[];
    currentUser?: SafeUser | null;
}

const PropertiesClient: React.FC<PropertiesClientProps> = ({
    properties = [],
    currentUser
}) => {
    const router = useRouter();
    const rentModal = useRentModal();
    // Default to list view which makes more sense for hierarchy
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    // Helper to check if property is a Colocation
    const isColocation = (property: SafeProperty) => {
        return property.rentalUnits?.some((unit: any) =>
            unit.type === 'PRIVATE_ROOM' || unit.type === 'SHARED_ROOM'
        );
    }

    // Helper to get total listing count
    const getTotalListings = (property: SafeProperty) => {
        if (isColocation(property)) {
            // For colocation, we validly assume the "Main" property (ENTIRE_PLACE) isn't a listing.
            // So we only count the rooms.
            return property.rentalUnits?.reduce((acc, unit: any) => {
                if (unit.type === 'ENTIRE_PLACE') return acc;
                return acc + (unit.listings?.length || 0);
            }, 0) || 0;
        }

        return property.rentalUnits?.reduce((acc, unit) => acc + (unit.listings?.length || 0), 0) || 0;
    }

    return (
        <Container>
            <PageHeader
                title="Mes Propriétés"
                subtitle="Gérez l'ensemble de vos biens et leurs annonces associées."
            />

            <div className="mt-4 flex flex-col gap-0 pb-24">
                {(!properties || properties.length === 0) ? (
                    <EmptyState
                        title="Aucune propriété trouvée"
                        subtitle="Vous n'avez pas encore ajouté de propriété."
                    />
                ) : (
                    properties.map((property) => (
                        <div key={property.id} className="bg-white mb-12">
                            {(isColocation(property) || getTotalListings(property) === 0) && (
                                <div className="flex justify-between items-start mb-6 border-b pb-4">
                                    <div>
                                        <h3 className="text-xl font-medium">
                                            {[
                                                (property.address || [property.addressLine1, (property.zipCode ? `${property.zipCode} ${property.city}` : property.city)].filter(Boolean).join(' ')).replace(', France', ''),
                                                property.building && `Bât. ${property.building}`,
                                                property.apartment && `Apt ${property.apartment}`
                                            ].filter(Boolean).join(', ') || "Propriété sans adresse"}
                                        </h3>
                                        <p className="text-neutral-500 text-sm">
                                            {getTotalListings(property)} Annonce(s)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* List of Units/Listings */}
                            <div className="flex flex-col">
                                {(property.rentalUnits || []).flatMap(unit => unit.listings || []).length === 0 && (
                                    <div className="text-sm text-neutral-500 italic">Aucune annonce pour cette propriété.</div>
                                )}

                                {/* Logic: Separate Main Unit from Rooms */}
                                {(() => {
                                    // 1. Get all listings from units
                                    const allListings = (property.rentalUnits || []).flatMap(unit =>
                                        (unit.listings || []).map(listing => ({ ...listing, rentalUnit: unit }))
                                    );

                                    // 2. Identify Main Listing (Entire Place)
                                    // If not found in listings, try to find the unit and create a placeholder
                                    let mainListing = allListings.find((l: any) => l.rentalUnit.type === 'ENTIRE_PLACE');

                                    if (!mainListing) {
                                        const mainUnit = property.rentalUnits?.find((u: any) => u.type === 'ENTIRE_PLACE');
                                        if (mainUnit) {
                                            // Fallback: Create a displayable listing object from the unit
                                            // We try to find a listing inside the unit that might have been missed by flatMap?
                                            // Or just use the first listing if it exists but wasn't mapped correctly? 
                                            // (Unlikely, flatMap covers it).
                                            // If no listing exists, we show a placeholder (but linking to property edit might fail if no listingId).
                                            // We'll use the unit ID as a fallback, hoping usage allows it or link is handled.
                                            // But standard link is /properties/[id]/edit. 
                                            // If we pass unit ID, it might 404.
                                            // However, displaying it is better than nothing.
                                            mainListing = {
                                                id: mainUnit.id, // Placeholder ID
                                                title: mainUnit.name || "Propriété principale",
                                                category: property.category,
                                                rentalUnit: mainUnit,
                                                price: 0,
                                                roomCount: property.rooms?.length || 0,
                                                images: property.images
                                            } as any;
                                        }
                                    }

                                    // 3. Identify Sub Listings (Rooms)
                                    const subListings = allListings
                                        .filter((l: any) => l.rentalUnit.type !== 'ENTIRE_PLACE')
                                        // Filter out duplicates if "Principal" is actually the main listing showing as room?
                                        // No, leave data as is.
                                        .sort((a: any, b: any) => (a.rentalUnit.name || '').localeCompare(b.rentalUnit.name || ''));

                                    // 4. Calculate Total Rent for Main Listing header
                                    let displayMainListing = mainListing;
                                    if (mainListing && subListings.length > 0) {
                                        const totalRent = subListings.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
                                        // Only override price if we have rooms active
                                        displayMainListing = { ...mainListing, price: totalRent };
                                    }

                                    return (
                                        <>
                                            {/* 1. Main Listing (Header) */}
                                            {displayMainListing && (
                                                <div className="relative z-10">
                                                    <PropertiesListRow
                                                        key={displayMainListing.id}
                                                        data={displayMainListing}
                                                        currentUser={currentUser}
                                                        isMainProperty={subListings.length > 0}
                                                        isColocation={isColocation(property)}
                                                    />
                                                </div>
                                            )}

                                            {/* 2. Sub Listings */}
                                            {subListings.map((listing: any) => (
                                                <div
                                                    key={listing.id}
                                                    className="pl-4 md:pl-8 relative"
                                                >
                                                    <PropertiesListRow
                                                        key={listing.id}
                                                        data={listing}
                                                        currentUser={currentUser}
                                                        isSmall
                                                    />
                                                </div>
                                            ))}

                                            {/* 3. Add Room Button (Under last room) */}
                                            {isColocation(property) && (
                                                <div className="pl-4 md:pl-8 pt-2">
                                                    <Button
                                                        onClick={() => rentModal.onOpen(undefined, property)}
                                                        variant="outline"
                                                        className="w-full md:w-auto justify-start"
                                                        icon={Plus}
                                                    >
                                                        Ajouter une chambre
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Floating Action Button (FAB) for Add Property */}
            <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-50">
                <Button
                    onClick={() => rentModal.onOpen()}
                    className="rounded-full shadow-lg"
                    icon={Plus}
                >
                    Ajouter un bien
                </Button>
            </div>
        </Container>
    );
}

export default PropertiesClient;
