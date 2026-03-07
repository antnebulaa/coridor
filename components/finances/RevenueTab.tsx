'use client';

import { Link } from '@/i18n/navigation';
import { RevenueByProperty } from '@/app/actions/getFinancialOverview';
import { Check, Clock, AlertTriangle, Minus } from 'lucide-react';

interface RevenueTabProps {
    data: RevenueByProperty[];
}

function formatCents(cents: number): string {
    return Math.round(cents / 100).toLocaleString('fr-FR');
}

const StatusBadge: React.FC<{ status: RevenueByProperty['status'] }> = ({ status }) => {
    switch (status) {
        case 'PAID':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    <Check size={12} /> Payé
                </span>
            );
        case 'PENDING':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                    <Clock size={12} /> En attente
                </span>
            );
        case 'OVERDUE':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={12} /> En retard
                </span>
            );
        case 'VACANT':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-500 px-2 py-0.5 rounded-full">
                    <Minus size={12} /> Vacant
                </span>
            );
    }
};

const RevenueTab: React.FC<RevenueTabProps> = ({ data }) => {
    const totalExpected = data.reduce((s, d) => s + d.expectedRent, 0);
    const totalReceived = data.reduce((s, d) => s + d.receivedRent, 0);

    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500">
                Aucun bien enregistré
            </div>
        );
    }

    return (
        <div>
            {/* Desktop table */}
            <div className="hidden md:block">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                            <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-3 pr-4">Bien</th>
                            <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-3 pr-4">Locataire</th>
                            <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-3 pr-4">Attendu</th>
                            <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-3 pr-4">Reçu</th>
                            <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-3">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr
                                key={`${item.propertyId}-${item.tenantName || 'vacant'}`}
                                className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                            >
                                <td className="py-3 pr-4">
                                    <Link
                                        href={item.listingId ? `/properties/${item.listingId}/edit` : '/properties'}
                                        className="text-sm font-medium text-neutral-900 dark:text-white hover:underline"
                                    >
                                        {item.propertyTitle}
                                    </Link>
                                </td>
                                <td className="py-3 pr-4 text-sm text-neutral-600 dark:text-neutral-400">
                                    {item.tenantName || '—'}
                                </td>
                                <td className="py-3 pr-4 text-sm text-right tabular-nums text-neutral-900 dark:text-white">
                                    {item.status !== 'VACANT' ? `${formatCents(item.expectedRent)} €` : '—'}
                                </td>
                                <td className="py-3 pr-4 text-sm text-right tabular-nums text-neutral-900 dark:text-white">
                                    {item.status !== 'VACANT' ? `${formatCents(item.receivedRent)} €` : '—'}
                                </td>
                                <td className="py-3 text-right">
                                    <StatusBadge status={item.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-neutral-200 dark:border-neutral-700">
                            <td className="py-3 pr-4 text-sm font-semibold text-neutral-900 dark:text-white" colSpan={2}>Total</td>
                            <td className="py-3 pr-4 text-sm text-right tabular-nums font-semibold text-neutral-900 dark:text-white">
                                {formatCents(totalExpected)} €
                            </td>
                            <td className="py-3 pr-4 text-sm text-right tabular-nums font-semibold text-neutral-900 dark:text-white">
                                {formatCents(totalReceived)} €
                            </td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {data.map((item) => (
                    <Link
                        key={`${item.propertyId}-${item.tenantName || 'vacant'}-m`}
                        href={item.listingId ? `/properties/${item.listingId}/edit` : '/properties'}
                        className="block bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                {item.propertyTitle}
                            </span>
                            <StatusBadge status={item.status} />
                        </div>
                        {item.tenantName && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{item.tenantName}</p>
                        )}
                        {item.status !== 'VACANT' && (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 tabular-nums">
                                {formatCents(item.expectedRent)} € attendus · {formatCents(item.receivedRent)} € reçu
                            </p>
                        )}
                    </Link>
                ))}

                {/* Mobile total */}
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4 text-center">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Total : </span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCents(totalReceived)} € reçu sur {formatCents(totalExpected)} € attendus
                    </span>
                </div>
            </div>
        </div>
    );
};

export default RevenueTab;
