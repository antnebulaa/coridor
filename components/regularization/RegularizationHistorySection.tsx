'use client';

import { useState, useEffect } from 'react';
import { getRegularizationHistory } from '@/app/actions/regularization';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface RegularizationRecord {
    id: string;
    propertyId: string;
    propertyAddress: string;
    tenantName: string;
    year: number;
    totalRealChargesCents: number;
    totalProvisionsCents: number;
    finalBalanceCents: number;
    reportUrl: string | null;
    itemCount: number;
    createdAt: string;
}

interface RegularizationHistorySectionProps {
    collapsed?: boolean;
}

const RegularizationHistorySection: React.FC<RegularizationHistorySectionProps> = ({
    collapsed = true,
}) => {
    const [records, setRecords] = useState<RegularizationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(!collapsed);

    useEffect(() => {
        getRegularizationHistory()
            .then(data => setRecords(data))
            .catch(() => setRecords([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="h-5 w-48 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (records.length === 0) {
        return null;
    }

    return (
        <div>
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-between mb-3"
            >
                <p className="text-sm text-neutral-400 uppercase tracking-wider font-semibold">
                    Historique des régularisations
                </p>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
            </button>

            {expanded && (
                <div className="space-y-2.5">
                    {records.map(record => {
                        const balance = record.finalBalanceCents / 100;
                        const isDebit = balance > 0;

                        return (
                            <div
                                key={record.id}
                                className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                            {record.tenantName}
                                        </p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                            {record.propertyAddress}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-sm text-neutral-400 dark:text-neutral-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Année {record.year}
                                            </span>
                                            <span>
                                                {record.itemCount} charge{record.itemCount > 1 ? 's' : ''}
                                            </span>
                                            <span>
                                                {format(new Date(record.createdAt), 'dd MMM yyyy', { locale: fr })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span
                                            className={`text-sm font-semibold ${
                                                isDebit
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-green-600 dark:text-green-400'
                                            }`}
                                        >
                                            {isDebit ? '+' : ''}{balance.toFixed(2)} €
                                        </span>
                                        <span className="text-sm text-neutral-400">
                                            {isDebit ? 'Dû par le locataire' : 'À rembourser'}
                                        </span>
                                    </div>
                                </div>

                                {/* Details row */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                                    <div className="flex gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                                        <span>
                                            Charges réelles : {(record.totalRealChargesCents / 100).toFixed(2)} €
                                        </span>
                                        <span>
                                            Provisions : {(record.totalProvisionsCents / 100).toFixed(2)} €
                                        </span>
                                    </div>

                                    {record.reportUrl && (
                                        <a
                                            href={record.reportUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RegularizationHistorySection;
