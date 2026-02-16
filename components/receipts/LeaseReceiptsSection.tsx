'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
    Receipt,
    Download,
    Send,
    Calendar,
    Plus,
    X,
    Loader2,
    ChevronDown,
} from 'lucide-react';

interface ReceiptData {
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

interface LeaseReceiptsSectionProps {
    applicationId: string;
    propertyAddress: string;
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

/**
 * Generate an array of the last 12 months as { month, year, label } objects
 */
function getLast12Months(): { month: number; year: number; label: string }[] {
    const result: { month: number; year: number; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        result.push({
            month: d.getMonth() + 1, // 1-indexed
            year: d.getFullYear(),
            label: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`,
        });
    }
    return result;
}

export default function LeaseReceiptsSection({
    applicationId,
    propertyAddress,
}: LeaseReceiptsSectionProps) {
    const [receipts, setReceipts] = useState<ReceiptData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const last12Months = useMemo(() => getLast12Months(), []);
    const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    const fetchReceipts = useCallback(async () => {
        try {
            const res = await axios.get(`/api/receipts?applicationId=${applicationId}`);
            setReceipts(res.data.receipts || []);
        } catch {
            console.error('Failed to fetch receipts');
        } finally {
            setLoading(false);
        }
    }, [applicationId]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    // Get all available years from receipts for the year filter
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        receipts.forEach((r) => years.add(getYear(r.periodStart)));
        return Array.from(years).sort((a, b) => b - a);
    }, [receipts]);

    // Filter receipts by selected year
    const filteredReceipts = useMemo(() => {
        if (!selectedYear) return receipts;
        return receipts.filter((r) => getYear(r.periodStart) === selectedYear);
    }, [receipts, selectedYear]);

    const handleGenerate = async () => {
        const selected = last12Months[selectedMonthIndex];
        if (!selected) return;

        setGenerating(true);
        try {
            await axios.post('/api/receipts/generate', {
                applicationId,
                year: selected.year,
                month: selected.month,
            });
            toast.success('Quittance generee avec succes');
            setShowGenerateForm(false);
            await fetchReceipts();
        } catch (err: any) {
            const message = err?.response?.data?.error || 'Erreur lors de la generation';
            toast.error(message);
        } finally {
            setGenerating(false);
        }
    };

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
            toast.error('Erreur lors du telechargement');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleSend = async (receiptId: string) => {
        setSendingId(receiptId);
        try {
            await axios.post(`/api/receipts/${receiptId}/send`);
            toast.success('Quittance envoyee au locataire');
            await fetchReceipts();
        } catch {
            toast.error("Erreur lors de l'envoi");
        } finally {
            setSendingId(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Receipt size={22} className="text-slate-700 dark:text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Quittances de loyer
                    </h3>
                </div>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Receipt size={22} className="text-slate-700 dark:text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Quittances de loyer
                    </h3>
                    {receipts.length > 0 && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            ({receipts.length})
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowGenerateForm(!showGenerateForm)}
                    className="
                        flex items-center gap-2 px-4 py-2
                        bg-slate-900 dark:bg-slate-100
                        text-white dark:text-slate-900
                        rounded-lg text-sm font-medium
                        hover:bg-slate-800 dark:hover:bg-slate-200
                        transition
                    "
                >
                    {showGenerateForm ? (
                        <>
                            <X size={16} />
                            Annuler
                        </>
                    ) : (
                        <>
                            <Plus size={16} />
                            Generer une quittance
                        </>
                    )}
                </button>
            </div>

            {/* Generate form */}
            {showGenerateForm && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-700">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        Generer une nouvelle quittance
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                                Mois
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedMonthIndex}
                                    onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                                    className="
                                        w-full appearance-none bg-white dark:bg-slate-800
                                        border border-slate-200 dark:border-slate-700
                                        rounded-lg px-3 py-2.5 pr-8
                                        text-slate-900 dark:text-slate-100
                                        text-sm cursor-pointer
                                        focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent
                                    "
                                >
                                    {last12Months.map((m, idx) => (
                                        <option key={`${m.year}-${m.month}`} value={idx}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="
                                flex items-center justify-center gap-2
                                px-5 py-2.5 rounded-lg
                                bg-emerald-600 text-white
                                hover:bg-emerald-700
                                disabled:opacity-50
                                text-sm font-medium
                                transition
                            "
                        >
                            {generating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Generation...
                                </>
                            ) : (
                                'Generer'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Year filter */}
            {availableYears.length > 1 && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <button
                        onClick={() => setSelectedYear(null)}
                        className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition
                            ${!selectedYear
                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
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
                                px-3 py-1.5 rounded-lg text-xs font-medium transition
                                ${selectedYear === year
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
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
                <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Receipt className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Aucune quittance
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        Generez votre premiere quittance avec le bouton ci-dessus.
                    </p>
                </div>
            ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    {filteredReceipts.map((receipt, index) => {
                        const monthLabel = getMonthLabel(receipt.periodStart);
                        const isLast = index === filteredReceipts.length - 1;

                        return (
                            <div
                                key={receipt.id}
                                className={`
                                    flex items-center justify-between gap-3 px-4 py-3.5
                                    ${!isLast ? 'border-b border-slate-100 dark:border-slate-700' : ''}
                                    hover:bg-slate-50 dark:hover:bg-slate-750 transition
                                `}
                            >
                                {/* Left: month + badges */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`
                                        w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                                        ${receipt.isPartialPayment
                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                        }
                                    `}>
                                        <Calendar size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                                            {monthLabel}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            <span className={`
                                                inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium
                                                ${receipt.isPartialPayment
                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }
                                            `}>
                                                {receipt.isPartialPayment ? 'Recu' : 'Quittance'}
                                            </span>
                                            <span className={`
                                                inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium
                                                ${receipt.sentAt
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                                }
                                            `}>
                                                {receipt.sentAt ? 'Envoyee' : 'Non envoyee'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: amount + actions */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                            {formatCents(receipt.totalAmountCents)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleDownload(receipt.id, monthLabel, receipt.isPartialPayment)}
                                            disabled={downloadingId === receipt.id}
                                            className="
                                                p-2 rounded-lg
                                                text-slate-600 dark:text-slate-400
                                                hover:bg-slate-100 dark:hover:bg-slate-700
                                                disabled:opacity-50
                                                transition
                                            "
                                            title="Telecharger"
                                        >
                                            {downloadingId === receipt.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Download size={16} />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleSend(receipt.id)}
                                            disabled={sendingId === receipt.id}
                                            className="
                                                p-2 rounded-lg
                                                text-slate-600 dark:text-slate-400
                                                hover:bg-blue-50 dark:hover:bg-blue-900/20
                                                hover:text-blue-600 dark:hover:text-blue-400
                                                disabled:opacity-50
                                                transition
                                            "
                                            title={receipt.sentAt ? 'Renvoyer' : 'Envoyer'}
                                        >
                                            {sendingId === receipt.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Send size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
