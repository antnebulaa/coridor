'use client';

import { toast } from "react-hot-toast";
import axios from "axios";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import useRentModal from "@/hooks/useRentModal";
import { Plus } from 'lucide-react';

import { SafeProperty, SafeUser, SafeRentalUnit } from "@/types";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import { Button } from '@/components/ui/Button';
import DarkActionButton from "@/components/ui/DarkActionButton";
import PageHeader from "@/components/PageHeader";
import PropertyStandardCard from "./components/PropertyStandardCard";
import PropertyColocationCard from "./components/PropertyColocationCard";

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

    // Filter Logic
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'VACANT' | 'PUBLISHED' | 'OCCUPIED'>('ALL');

    // Helper: Compute Counts logic
    const computeCounts = useCallback(() => {
        let counts = { ALL: 0, VACANT: 0, PUBLISHED: 0, OCCUPIED: 0 };
        properties.forEach(property => {
            const units = property.rentalUnits || [];
            units.forEach((unit: any) => {
                let unitListings: any[] = unit.listings || [];
                // Handle Ghost Main Unit
                if (unit.type === 'ENTIRE_PLACE' && unitListings.length === 0) {
                    unitListings = [{ isPublished: false, reservations: [] }];
                }

                unitListings.forEach((l: any) => {
                    counts.ALL++;
                    const isOccupied = (l.reservations || []).some((r: any) => new Date(r.endDate) > new Date());

                    if (isOccupied) counts.OCCUPIED++;
                    else counts.VACANT++; // Not occupied = Vacant

                    if (l.isPublished) counts.PUBLISHED++;
                });
            });
        });
        return counts;
    }, [properties]);

    const counts = computeCounts();

    const filters = [
        { label: 'Tous', value: 'ALL', count: counts.ALL },
        { label: 'Vacants', value: 'VACANT', count: counts.VACANT },
        { label: 'Publiés', value: 'PUBLISHED', count: counts.PUBLISHED },
        { label: 'Loués', value: 'OCCUPIED', count: counts.OCCUPIED },
    ];

    // Helper: Filter listings for a property
    const getFilteredListingsForProperty = (property: SafeProperty) => {
        const allListings = (property.rentalUnits || []).flatMap(unit =>
            (unit.listings || []).map(listing => ({
                ...listing,
                rentalUnit: unit,
                images: (listing.images && listing.images.length > 0) ? listing.images : property.images
            }))
        );

        // Fallback for Entire Place without listing object (Edge case)
        const mainUnit = property.rentalUnits?.find((u: any) => u.type === 'ENTIRE_PLACE');
        if (mainUnit && (!mainUnit.listings || mainUnit.listings.length === 0)) {
            // It's a "Ghost" listing (vacant/unpublished)
            allListings.push({
                id: mainUnit.id,
                rentalUnit: mainUnit,
                isPublished: false,
                reservations: [],
                // ... partial mock
            } as any);
        }

        return allListings.filter((l: any) => {
            if (statusFilter === 'ALL') return true;

            const isOccupied = (l.reservations || []).some((r: any) => new Date(r.endDate) > new Date());

            if (statusFilter === 'VACANT') return !isOccupied;
            if (statusFilter === 'OCCUPIED') return isOccupied;
            if (statusFilter === 'PUBLISHED') return l.isPublished;

            return true;
        });
    }

    return (
        <Container>
            <PageHeader
                title="Mes Propriétés"
                subtitle="Gérez l'ensemble de vos biens et leurs annonces associées."
            />

            {/* Quick Filters */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                {filters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value as any)}
                        className={`
                            px-4 
                            py-2 
                            rounded-full 
                            text-sm 
                            font-medium 
                            whitespace-nowrap 
                            transition
                            border
                            ${statusFilter === filter.value
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'}
                        `}
                    >
                        {filter.label} <span className={`ml-1 ${statusFilter === filter.value ? 'text-neutral-300' : 'text-neutral-400'}`}>({filter.count})</span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-24 mt-4">
                {(!properties || properties.length === 0) ? (
                    <div className="col-span-full">
                        <EmptyState
                            title="Aucune propriété trouvée"
                            subtitle="Vous n'avez pas encore ajouté de propriété."
                        />
                    </div>
                ) : (
                    properties.map((property) => {
                        // Apply Filter Logic
                        const filteredPropertyItems = getFilteredListingsForProperty(property);
                        if (filteredPropertyItems.length === 0) return null;

                        const isColoc = isColocation(property);

                        if (isColoc) {
                            return (
                                <PropertyColocationCard
                                    key={property.id}
                                    property={property}
                                />
                            );
                        } else {
                            // Standard Mode: Find the main listing
                            // We need robustness here: what if RentalUnit['ENTIRE_PLACE'] exists but no listing?
                            // Or what if it's a single room property not in colocation mode (edge case)?
                            // Assuming Standard = Entire Place usually.
                            let mainListing = property.rentalUnits?.flatMap(u => u.listings || []).find(l => l.rentalUnit.type === 'ENTIRE_PLACE');

                            // Fallback if no listing created yet (Draft property)
                            if (!mainListing) {
                                // Mock a listing object or handle gracefully
                                // For now, we skip if no listing, but ideally we should show a "Draft Card".
                                // Let's try to find ANY listing or just property info
                                return null;
                            }

                            // Inject property images as fallback if needed (handled in card or here?)
                            // Card handles data.images. 
                            const enrichedListing = {
                                ...mainListing,
                                images: (mainListing.images && mainListing.images.length > 0) ? mainListing.images : property.images
                            };

                            return (
                                <PropertyStandardCard
                                    key={mainListing.id}
                                    data={enrichedListing}
                                    property={property}
                                    currentUser={currentUser}
                                />
                            );
                        }
                    })
                )}
            </div>

            {/* Floating Action Button (FAB) for Add Property */}
            <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-50">
                <DarkActionButton
                    onClick={() => rentModal.onOpen()}
                    icon={Plus}
                >
                    Ajouter un bien en location
                </DarkActionButton>
            </div>
        </Container>
    );
}

export default PropertiesClient;
