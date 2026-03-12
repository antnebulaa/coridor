'use client';

import { useState } from "react";
import { FileText, MapPin, ChevronDown, ChevronUp, ArrowRight, BarChart3 } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { SafeUser } from "@/types";

import Heading from "@/components/Heading";

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
    const [expandedLeaseId, setExpandedLeaseId] = useState<string | null>(null);

    const toggleExpanded = (leaseId: string) => {
        setExpandedLeaseId((prev) => (prev === leaseId ? null : leaseId));
    };

    return (
        <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 md:pt-8">
            <Heading
                title="Mes locations"
                subtitle="Vos baux signés"
            />

            {/* Link to rent tracking */}
            <Link
                href="/finances/suivi-loyers"
                className="mt-4 flex items-center justify-between bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl px-5 py-4 hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-all active:scale-[0.98] group"
            >
                <div className="flex items-center gap-3">
                    <BarChart3 size={20} className="text-purple-600 dark:text-purple-400" />
                    <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">Suivi des loyers</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Suivez vos paiements et relances</p>
                    </div>
                </div>
                <ArrowRight size={18} className="text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" />
            </Link>

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

                            {/* Expanded Detail: Lease info */}
                            {isExpanded && (
                                <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-800">
                                    <div className="pt-4 space-y-3">
                                        {lease.candidateScope && (
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                <p>Locataire : {lease.candidateScope.firstName} {lease.candidateScope.lastName}</p>
                                            </div>
                                        )}
                                        {listing?.rentAmount && (
                                            <div className="text-sm text-neutral-600 dark:text-neutral-400">
                                                <p>Loyer : {(listing.rentAmount / 100).toLocaleString('fr-FR')} €/mois</p>
                                            </div>
                                        )}
                                        <Link
                                            href={`/leases/${lease.id}`}
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                                        >
                                            <FileText size={14} />
                                            Voir le bail
                                            <ArrowRight size={14} />
                                        </Link>
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
