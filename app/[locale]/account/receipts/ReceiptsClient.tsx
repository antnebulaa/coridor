'use client';

import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Calendar, Download, FileText, Receipt, ChevronDown } from 'lucide-react';
import PageHeader from "@/components/PageHeader";

interface SerializedReceipt {
    id: string;
    periodStart: string;
    periodEnd: string;
    rentAmountCents: number;
    chargesAmountCents: number;
    totalAmountCents: number;
    isPartialPayment: boolean;
    pdfUrl: string | null;
    sentAt: string | null;
    createdAt: string;
}

interface SerializedApplication {
    id: string;
    listing: {
        id: string;
        title: string;
        rentalUnit: {
            id: string;
            name: string;
            property: {
                id: string;
                address: string | null;
                city: string | null;
                zipCode: string | null;
            };
        };
    };
    rentReceipts: SerializedReceipt[];
}

interface ReceiptsClientProps {
    applications: SerializedApplication[];
}

const MONTHS_FR = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

function formatCents(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + ' \u20AC';
}

function getMonthLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return `${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

function getYear(dateStr: string): number {
    return new Date(dateStr).getFullYear();
}

function getPropertyAddress(app: SerializedApplication): string {
    const property = app.listing.rentalUnit.property;
    const parts = [property.address, property.zipCode, property.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : app.listing.title;
}

export default function ReceiptsClient({ applications }: ReceiptsClientProps) {
    const [selectedAppIndex, setSelectedAppIndex] = useState(0);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const selectedApp = applications[selectedAppIndex] || null;

    // Get all available years from receipts
    const availableYears = useMemo(() => {
        if (!selectedApp) return [];
        const years = new Set<number>();
        selectedApp.rentReceipts.forEach((r) => years.add(getYear(r.periodStart)));
        return Array.from(years).sort((a, b) => b - a);
    }, [selectedApp]);

    // Filter receipts by selected year
    const filteredReceipts = useMemo(() => {
        if (!selectedApp) return [];
        if (!selectedYear) return selectedApp.rentReceipts;
        return selectedApp.rentReceipts.filter((r) => getYear(r.periodStart) === selectedYear);
    }, [selectedApp, selectedYear]);

    const handleDownload = async (receiptId: string, monthLabel: string, isPartial: boolean) => {
        setDownloadingId(receiptId);
        try {
            const response = await fetch(`/api/receipts/${receiptId}/download`);
            if (!response.ok) throw new Error();
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${isPartial ? 'Recu' : 'Quittance'}_${monthLabel.replace(' ', '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Erreur lors du telechargement");
        } finally {
            setDownloadingId(null);
        }
    };

    // No signed leases at all
    if (applications.length === 0) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <PageHeader
                    title="Mes quittances"
                    subtitle="Retrouvez toutes vos quittances de loyer"
                />
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                        <Receipt className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                        Aucune quittance disponible
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                        Les quittances de loyer apparaitront ici une fois que votre bail sera signe et que votre proprietaire les aura generees.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader
                title="Mes quittances"
                subtitle="Retrouvez toutes vos quittances de loyer"
            />

            {/* Lease selector if multiple leases */}
            {applications.length > 1 && (
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Bail
                    </label>
                    <div className="relative">
                        <select
                            value={selectedAppIndex}
                            onChange={(e) => {
                                setSelectedAppIndex(Number(e.target.value));
                                setSelectedYear(null);
                            }}
                            className="
                                w-full appearance-none bg-white dark:bg-neutral-800
                                border border-neutral-200 dark:border-neutral-700
                                rounded-xl px-4 py-3 pr-10
                                text-neutral-900 dark:text-neutral-100
                                font-medium cursor-pointer
                                focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent
                                transition
                            "
                        >
                            {applications.map((app, index) => (
                                <option key={app.id} value={index}>
                                    {getPropertyAddress(app)}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            size={18}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                        />
                    </div>
                </div>
            )}

            {/* Single lease address display */}
            {applications.length === 1 && (
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-sm">
                    <FileText size={16} />
                    <span>{getPropertyAddress(applications[0])}</span>
                </div>
            )}

            {/* Year filter */}
            {availableYears.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedYear(null)}
                        className={`
                            px-4 py-2 rounded-lg text-sm font-medium transition
                            ${!selectedYear
                                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                            }
                        `}
                    >
                        Toutes
                    </button>
                    {availableYears.map((year) => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-medium transition
                                ${selectedYear === year
                                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                                }
                            `}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            )}

            {/* Receipts list */}
            {filteredReceipts.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                        <Receipt className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                        Aucune quittance disponible
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                        {selectedYear
                            ? `Aucune quittance pour l'annee ${selectedYear}.`
                            : 'Votre proprietaire n\'a pas encore genere de quittance pour ce bail.'
                        }
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    {filteredReceipts.map((receipt, index) => {
                        const monthLabel = getMonthLabel(receipt.periodStart);
                        const isLast = index === filteredReceipts.length - 1;

                        return (
                            <div
                                key={receipt.id}
                                className={`
                                    flex items-center justify-between gap-4 p-5
                                    ${!isLast ? 'border-b border-neutral-100 dark:border-neutral-700' : ''}
                                    hover:bg-neutral-50 dark:hover:bg-neutral-750 transition
                                `}
                            >
                                {/* Left side: month and info */}
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`
                                        w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                                        ${receipt.isPartialPayment
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                        }
                                    `}>
                                        <Calendar size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                            {monthLabel}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={`
                                                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                                ${receipt.isPartialPayment
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }
                                            `}>
                                                {receipt.isPartialPayment ? 'Recu partiel' : 'Quittance'}
                                            </span>
                                            {receipt.sentAt && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    Envoyee
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right side: amount and download */}
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                            {formatCents(receipt.totalAmountCents)}
                                        </div>
                                        {receipt.chargesAmountCents > 0 && (
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                                dont {formatCents(receipt.chargesAmountCents)} de charges
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDownload(receipt.id, monthLabel, receipt.isPartialPayment)}
                                        disabled={downloadingId === receipt.id}
                                        className="
                                            p-2.5 rounded-xl
                                            bg-neutral-100 dark:bg-neutral-700
                                            text-neutral-700 dark:text-neutral-300
                                            hover:bg-neutral-200 dark:hover:bg-neutral-600
                                            disabled:opacity-50
                                            transition
                                        "
                                        title="Telecharger le PDF"
                                    >
                                        {downloadingId === receipt.id ? (
                                            <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Download size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Mobile total display */}
            {filteredReceipts.length > 0 && (
                <div className="sm:hidden bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                        Total des quittances affichees
                    </div>
                    <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatCents(filteredReceipts.reduce((sum, r) => sum + r.totalAmountCents, 0))}
                    </div>
                </div>
            )}
        </div>
    );
}
