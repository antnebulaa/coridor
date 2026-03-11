'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileText, MapPin } from "lucide-react";

import { SafeUser } from "@/types";

import Heading from "@/components/Heading";
import RentTrackingSection from "@/components/rentals/RentTrackingSection";

interface RentalsClientProps {
    leases: any[];
    currentUser?: SafeUser | null;
    hasBankConnection: boolean;
}

const RentalsClient: React.FC<RentalsClientProps> = ({
    leases,
    currentUser,
    hasBankConnection,
}) => {
    const router = useRouter();
    const [expandedLeaseId, setExpandedLeaseId] = useState<string | null>(null);

    const toggleExpanded = (leaseId: string) => {
        setExpandedLeaseId((prev) => (prev === leaseId ? null : leaseId));
    };

    return (
        <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 md:pt-8">
            <Heading
                title="Mes locations"
                subtitle="Vos baux signés et le suivi des loyers"
            />
            <div className="mt-6 space-y-4">
                {leases.map((lease) => {
                    const listing = lease.listing;
                    const isExpanded = expandedLeaseId === lease.id;
                    const address = [
                        listing?.rentalUnit?.property?.addressLine1,
                        listing?.rentalUnit?.property?.zipCode,
                        listing?.rentalUnit?.property?.city,
                    ]
                        .filter(Boolean)
                        .join(', ');
                    const title = listing?.title || 'Bail';

                    return (
                        <div
                            key={lease.id}
                            className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                        >
                            {/* Lease Summary Row */}
                            <button
                                onClick={() => toggleExpanded(lease.id)}
                                className="w-full flex items-center justify-between p-5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition text-left"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0">
                                        <FileText size={20} className="text-neutral-600 dark:text-neutral-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                            {title}
                                        </p>
                                        {address && (
                                            <p className="text-sm text-neutral-500 flex items-center gap-1 mt-0.5 truncate">
                                                <MapPin size={12} className="shrink-0" />
                                                {address}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950/30 px-2.5 py-1 rounded-full">
                                        Bail signé
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp size={18} className="text-neutral-400" />
                                    ) : (
                                        <ChevronDown size={18} className="text-neutral-400" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Detail: Rent Tracking */}
                            {isExpanded && (
                                <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-800">
                                    <div className="pt-4">
                                        <RentTrackingSection
                                            applicationId={lease.id}
                                            hasBankConnection={hasBankConnection}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default RentalsClient;
