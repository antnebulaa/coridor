'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileText, MapPin } from "lucide-react";

import { SafeUser } from "@/types";

import Container from "@/components/Container";
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
        <Container>
            <Heading
                title="Mes locations"
                subtitle="Vos baux signes et le suivi des loyers"
            />
            <div className="mt-10 space-y-4">
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
                            className="bg-white rounded-2xl border border-neutral-200 overflow-hidden"
                        >
                            {/* Lease Summary Row */}
                            <button
                                onClick={() => toggleExpanded(lease.id)}
                                className="w-full flex items-center justify-between p-5 hover:bg-neutral-50/50 transition text-left"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="p-2.5 bg-neutral-100 rounded-xl shrink-0">
                                        <FileText size={20} className="text-neutral-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-neutral-900 truncate">
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
                                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                        Bail signe
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
                                <div className="px-5 pb-5 border-t border-neutral-100">
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
        </Container>
    );
}

export default RentalsClient;
