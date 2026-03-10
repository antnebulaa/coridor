'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Home } from 'lucide-react';
import { PropertyStatusItem } from '@/app/actions/getOperationalStats';

interface PropertyStatusListProps {
    properties: PropertyStatusItem[];
}

const STATUS_CONFIG = {
    OCCUPIED: { label: 'Occupé', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
    VACANT: { label: 'Vacant', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
    PENDING_LEASE: { label: 'Bail en cours', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
} as const;

const RENT_STATUS_CONFIG = {
    PAID: { label: 'Payé', className: 'text-emerald-600 dark:text-emerald-400' },
    PENDING: { label: 'En attente', className: 'text-amber-600 dark:text-amber-400' },
    OVERDUE: { label: 'En retard', className: 'text-red-600 dark:text-red-400 font-medium' },
    NO_LEASE: { label: '', className: '' },
} as const;

const PropertyStatusList: React.FC<PropertyStatusListProps> = ({ properties }) => {
    if (properties.length === 0) return null;

    return (
        <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                Mes biens
            </h2>
            <div className={`grid grid-cols-1 gap-2 ${properties.length > 4 ? 'md:grid-cols-2' : ''}`}>
                {properties.map(property => {
                    const statusConfig = STATUS_CONFIG[property.status];
                    const rentConfig = RENT_STATUS_CONFIG[property.rentStatus];

                    return (
                        <Link
                            key={property.id}
                            href={property.listingId ? `/properties/${property.listingId}/edit` : '/properties'}
                            className="flex items-center gap-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 hover:shadow-md transition group"
                        >
                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0">
                                {property.imageUrl ? (
                                    <Image
                                        src={property.imageUrl}
                                        alt={property.title}
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600">
                                        <Home size={20} />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                    {property.title}
                                </p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-0">
                                    {property.address}
                                </p>
                                <div className="flex items-center gap-3 mt-0">
                                    {/* Occupation status */}
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                                        <span className={`text-xs ${statusConfig.text}`}>
                                            {statusConfig.label}
                                            {property.tenantName && ` · ${property.tenantName}`}
                                        </span>
                                    </div>

                                    {/* Rent status */}
                                    {property.rentStatus !== 'NO_LEASE' && (
                                        <>
                                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                                            <span className={`text-xs ${rentConfig.className}`}>
                                                {property.rentAmountCents
                                                    ? `${Math.round(property.rentAmountCents / 100).toLocaleString('fr-FR')} € · ${rentConfig.label}`
                                                    : rentConfig.label
                                                }
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Next action */}
                            {property.nextAction && (
                                <span className="hidden sm:block text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                                    {property.nextAction}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </section>
    );
};

export default PropertyStatusList;
