'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SafeListing, SafeProperty, SafeRentalUnit, SafeUser } from "@/types";
import useCountries from "@/hooks/useCountries";
import { useState, useMemo } from "react";
import { TrendingUp, Scale } from "lucide-react";
import RentRevisionModal from "./RentRevisionModal";
import RegularizationModal from "./RegularizationModal";
import { useTranslations } from 'next-intl';

interface PropertyStandardCardProps {
    data: SafeListing;
    property: SafeProperty;
    currentUser?: SafeUser | null;
}

const PropertyStandardCard: React.FC<PropertyStandardCardProps> = ({
    data,
    property,
    currentUser
}) => {
    const router = useRouter();
    const { getByValue } = useCountries();
    const location = getByValue(data.locationValue || '');
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
    const [isRegularizationModalOpen, setIsRegularizationModalOpen] = useState(false);
    const t = useTranslations('properties.card');

    // Status Logic
    const signedApplications = (data.activeApplications || []).filter((a: any) => a.leaseStatus === 'SIGNED');
    const pendingSignatureApplications = (data.activeApplications || []).filter((a: any) => a.leaseStatus === 'PENDING_SIGNATURE');
    const hasActiveLease = signedApplications.length > 0;
    const hasPendingSignature = pendingSignatureApplications.length > 0;
    const isOccupied = hasActiveLease;

    const nextFreeDate = isOccupied
        ? null // Leases don't typically have a strict "end date" visually needed here for short-term flow.
        : null;

    // Rent Status Logic (Mocked for now as requested)
    const isRentPaid = true;

    // Financial Logic (Rent Revision)
    const activeLease = data.activeApplications?.[0]; // Assuming only one active lease for now or taking the first
    const latestFinancial = useMemo(() => {
        if (!activeLease?.financials?.length) return null;
        // Sort by start date desc to get the latest
        return activeLease.financials.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    }, [activeLease]);

    // Use revised rent if available, else fallback to listing price
    const displayRent = latestFinancial ? (latestFinancial.baseRentCents / 100) : data.price;

    const currentRentValue = latestFinancial ? (latestFinancial.baseRentCents / 100) : (data.price);
    const currentChargesValue = latestFinancial ? (latestFinancial.serviceChargesCents / 100) : (data.charges?.amount || 0);

    return (
        <>

            <RentRevisionModal
                isOpen={isRevisionModalOpen}
                onClose={() => setIsRevisionModalOpen(false)}
                applicationId={activeLease?.id || ""}
                currentRent={currentRentValue}
                currentCharges={currentChargesValue}
                leaseStartDate={latestFinancial?.startDate ? new Date(latestFinancial.startDate) : new Date()}
                financials={activeLease?.financials || []}
            />
            {activeLease && (
                <RegularizationModal
                    isOpen={isRegularizationModalOpen}
                    onClose={() => setIsRegularizationModalOpen(false)}
                    propertyId={property.id}
                />
            )}

            <div
                onClick={() => router.push(`/properties/${data.id}/edit`)}
                className="bg-white rounded-[20px] p-3 hover:shadow-md transition cursor-pointer active:scale-98 flex flex-col gap-2"
            >
                {/* Header: Image & Title */}
                <div className="flex gap-3 items-start">
                    <div className="relative w-16 h-16 rounded-[16px] overflow-hidden bg-neutral-100 shrink-0">
                        {data.images?.[0]?.url ? (
                            <Image
                                fill
                                src={data.images[0].url}
                                alt="Listing"
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-neutral-200" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="font-medium text-neutral-900 text-base">
                            {t('category', { category: data.category, type: (data.roomCount || 1) > 1 ? 'other' : 'studio', count: data.roomCount || 1 })}
                        </div>
                        <div className="text-neutral-600 font-medium text-sm">
                            {data.isFurnished ? t('furnished') : t('unfurnished')}
                        </div>
                        <div className="text-neutral-500 text-sm truncate max-w-[200px]">
                            {[
                                (property.addressLine1 && property.city) ? `${property.addressLine1}, ${property.zipCode || ''} ${property.city}` : (property.address || data.addressLine1 || data.city),
                                property.building && `Bât. ${property.building}`,
                                property.apartment && `Apt ${property.apartment}`
                            ].filter(Boolean).join(' • ')}
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-100" />

                {/* Status Section */}
                <div className="flex flex-col gap-0">
                    <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                        {t('status.label')}
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 font-medium text-lg text-neutral-800">
                            <div className={`w-3.5 h-3.5 rounded-full ${isOccupied ? 'bg-green-600' : hasPendingSignature ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                            {isOccupied ? t('status.occupied') : hasPendingSignature ? 'Bail en signature' : t('status.vacant')}
                        </div>
                        {isOccupied && nextFreeDate && (
                            <div className="text-neutral-500 text-sm flex items-center gap-0">
                                <span>→</span>
                                {format(new Date(nextFreeDate), 'MMM yyyy', { locale: fr })}
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-neutral-100" />

                {/* Rent Section */}
                <div className="flex flex-col gap-0">
                    <div className="flex justify-between items-center">
                        <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                            {t('rent.label')}
                        </div>
                        {isOccupied && activeLease && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRevisionModalOpen(true);
                                }}
                                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer transition p-1 hover:bg-neutral-100 rounded"
                                role="button"
                            >
                                <TrendingUp size={14} />
                                {t('rent.review')}
                            </div>
                        )}
                        {isOccupied && activeLease && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRegularizationModalOpen(true);
                                }}
                                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer transition p-1 hover:bg-neutral-100 rounded"
                                role="button"
                            >
                                <Scale size={14} />
                                {t('rent.regularize')}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="font-medium text-neutral-800 text-xl">
                            {displayRent}€ <span className="text-neutral-400 text-base font-medium"> </span>
                        </div>
                        {isOccupied ? (
                            <div className={`font-medium text-sm ${isRentPaid ? 'text-green-600' : 'text-orange-500'}`}>
                                {isRentPaid ? t('rent.paid') : t('rent.late')}
                            </div>
                        ) : (
                            <div className="font-medium text-sm text-neutral-400">
                                {t('rent.noTenant')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default PropertyStandardCard;
