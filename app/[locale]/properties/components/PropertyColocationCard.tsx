'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { SafeProperty } from "@/types";
import { TrendingUp, Scale } from "lucide-react";
import { useState } from "react";
import RentRevisionModal from "./RentRevisionModal";
import RegularizationModal from "./RegularizationModal";
import { useTranslations } from 'next-intl';

interface PropertyColocationCardProps {
    property: SafeProperty;
}

const PropertyColocationCard: React.FC<PropertyColocationCardProps> = ({
    property
}) => {
    const router = useRouter();
    const [revisionModalAppId, setRevisionModalAppId] = useState<string | null>(null);
    const [isRegularizationModalOpen, setIsRegularizationModalOpen] = useState(false);
    const t = useTranslations('properties');

    // 1. Identify Room Units
    const roomUnits = (property.rentalUnits || []).filter((u: any) => u.type === 'PRIVATE_ROOM');
    const totalRooms = roomUnits.length;

    // 2. Identify Active Listings for Rooms
    // const activeListings = roomUnits.flatMap((u: any) => u.listings || []).filter((l: any) => l.status === 'PUBLISHED' || l.reservations?.length > 0); 

    // 3. Occupancy Logic
    const sortedRooms = [...roomUnits].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    const roomStates = sortedRooms.map((unit: any) => {
        const listing = unit.listings?.[0]; // Assuming 1 active listing per unit logic for now

        // Check Lease (Active Application)
        const signedApps = (listing?.activeApplications || []).filter((a: any) => a.leaseStatus === 'SIGNED');
        const pendingApps = (listing?.activeApplications || []).filter((a: any) => a.leaseStatus === 'PENDING_SIGNATURE');
        const activeLease = signedApps[0] || pendingApps[0];
        const hasActiveLease = signedApps.length > 0;
        const hasPendingSignature = pendingApps.length > 0;

        const isOccupied = hasActiveLease;

        // Rent Logic: Use Financials if lease, else listing price
        let rentAmount = listing?.price || 0;
        let chargesAmount = listing?.charges?.amount || 0;

        if (activeLease?.financials?.length) {
            const latestFinancial = activeLease.financials.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
            if (latestFinancial) {
                rentAmount = latestFinancial.baseRentCents / 100;
                chargesAmount = latestFinancial.serviceChargesCents / 100;
            }
        }

        const isRentPaid = true; // Mock

        return {
            id: unit.id,
            isOccupied,
            hasPendingSignature,
            isRentPaid,
            rentAmount,
            chargesAmount,
            activeLease,
            hasActiveLease
        };
    });

    const occupiedCount = roomStates.filter(s => s.isOccupied).length;

    // 4. Rent Logic
    const totalPotentialRent = roomStates.reduce((acc, s) => acc + s.rentAmount, 0);
    const totalCollectedRent = roomStates.reduce((acc, s) => acc + (s.isOccupied ? s.rentAmount : 0), 0);

    // Find a reviseable lease (just the first one for now or we need a UI to pick)
    // For V1 of Coloc Revision, simply button to properties edit? 
    // Or allow revision of the first effective lease?
    // Let's NOT add the button here to avoid ambiguity, OR add it if there is EXACTLY 1 active lease.
    const activeLeases = roomStates.filter(s => s.hasActiveLease).map(s => s.activeLease);
    const canRevise = activeLeases.length === 1; // Simplify: Only allow quick revision if 1 lease.
    const reviseableLease = canRevise ? activeLeases[0] : null;

    // Calculate current rent for modal
    const currentRentValue = reviseableLease?.financials?.[0]?.baseRentCents ? (reviseableLease.financials[0].baseRentCents / 100) : 0;
    const currentChargesValue = reviseableLease?.financials?.[0]?.serviceChargesCents ? (reviseableLease.financials[0].serviceChargesCents / 100) : 0;


    const mainUnit = property.rentalUnits?.find((u: any) => u.type === 'ENTIRE_PLACE');
    const mainListingId = mainUnit?.listings?.[0]?.id || roomUnits[0]?.listings?.[0]?.id;

    if (!mainListingId) return null;

    return (
        <>
            {reviseableLease && (
                <RentRevisionModal
                    isOpen={!!revisionModalAppId}
                    onClose={() => setRevisionModalAppId(null)}
                    applicationId={reviseableLease.id}
                    currentRent={currentRentValue}
                    currentCharges={currentChargesValue}
                    leaseStartDate={reviseableLease?.financials?.[0]?.startDate ? new Date(reviseableLease.financials[0].startDate) : new Date()}
                    financials={reviseableLease?.financials || []}
                />
            )}
            {property.id && (
                <RegularizationModal
                    isOpen={isRegularizationModalOpen}
                    onClose={() => setIsRegularizationModalOpen(false)}
                    propertyId={property.id}
                />
            )}

            <div
                onClick={() => router.push(`/properties/${mainListingId}/edit`)}
                className="bg-white rounded-[20px] p-3 transition cursor-pointer active:scale-98 flex flex-col gap-2"
            >
                {/* Header: Image & Title */}
                <div className="flex gap-4 items-start">
                    <div className="relative w-16 h-16 rounded-[16px] overflow-hidden bg-neutral-100 shrink-0">
                        {property.images?.[0]?.url ? (
                            <Image
                                fill
                                src={property.images[0].url}
                                alt="Property"
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-neutral-200" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="font-semibold text-neutral-900 text-base">
                            {property.category} {property.rooms?.length ? `T${property.rooms.length}` : ''}
                        </div>
                        <div className="text-neutral-600 font-medium text-sm">
                            {t('colocation.title')}
                        </div>
                        <div className="text-neutral-500 text-sm truncate max-w-[200px]">
                            {[
                                property.address || property.addressLine1 || property.city,
                                property.building && `Bât. ${property.building}`,
                                property.apartment && `Apt ${property.apartment}`
                            ].filter(Boolean).join(', ')}
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-100" />

                {/* Status Section */}
                <div className="flex flex-col gap-0">
                    <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                        {t('card.status.label')}
                    </div>
                    <div className="font-medium text-xl text-neutral-900">
                        {occupiedCount} / {totalRooms} <span className="text-neutral-500 text-base font-medium">{t('colocation.rooms', { count: totalRooms, context: 'rent' })}</span>
                    </div>
                    <div className="flex gap-1.5">
                        {roomStates.map((state) => (
                            <div
                                key={state.id}
                                className={`w-3.5 h-3.5 rounded-full ${state.isOccupied ? 'bg-green-500' : state.hasPendingSignature ? 'bg-blue-500' : 'bg-neutral-200'}`}
                            />
                        ))}
                    </div>
                </div>

                <hr className="border-neutral-100" />

                {/* Rent Section */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                            {t('card.rent.label')}
                        </div>
                        {canRevise && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setRevisionModalAppId(reviseableLease?.id || null);
                                }}
                                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer transition p-1 hover:bg-neutral-100 rounded"
                                role="button"
                            >
                                <TrendingUp size={14} />
                                {t('card.rent.review')}
                            </div>
                        )}
                        {canRevise && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRegularizationModalOpen(true);
                                }}
                                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer transition p-1 hover:bg-neutral-100 rounded"
                                role="button"
                            >
                                <Scale size={14} />
                                {t('card.rent.regularize')}
                            </div>
                        )}
                    </div>

                    <div className="font-medium text-neutral-900 text-xl">
                        {totalCollectedRent} <span className="text-neutral-500 font-medium">/ {totalPotentialRent}€</span> <span className="text-neutral-500 text-base font-medium"> </span>
                    </div>

                    {/* Dots + Text Summary (Row) */}
                    <div className="flex items-center gap-2">
                        {/* Rent DOTS */}
                        <div className="flex gap-1.5">
                            {roomStates.map((state) => (
                                <div
                                    key={state.id}
                                    className={`w-3.5 h-3.5 rounded-full ${!state.isOccupied ? 'bg-neutral-200' :
                                        (state.isRentPaid ? 'bg-green-500' : 'bg-orange-500')
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Text Summary */}
                        {occupiedCount === 0 ? (
                            <div className="text-xs font-medium text-neutral-400">
                                {t('colocation.empty')}
                            </div>
                        ) : (
                            (totalPotentialRent - totalCollectedRent) > 0 ? (
                                <div className="text-xs font-bold text-orange-500">
                                    {totalPotentialRent - totalCollectedRent}€ {t('card.rent.late')}
                                </div>
                            ) : (
                                <div className="text-xs font-bold text-green-600">
                                    {t('card.rent.paid')}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PropertyColocationCard;
