'use client';

import { useState, useEffect } from 'react';
import { getFinancialAnalytics, AnalyticData } from '@/app/actions/analytics';
import { Link } from '@/i18n/navigation';
import { useCountUp } from '@/hooks/useCountUp';
import {
    Loader2,
    FileDown,
    FileSpreadsheet,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    ArrowRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import CustomToast from '@/components/ui/CustomToast';

interface FinancialDashboardProps {
    propertyId: string;
    listingId?: string;
    year: number;
    onYearChange: (year: number) => void;
}

// ─── Dark KPI Card ────────────────────────────────────────

const KPICardInner: React.FC<{ data: AnalyticData }> = ({ data }) => {
    // AnalyticData returns values in euros already
    const cashflowEuros = Math.round(Math.abs(data.netBenefit));
    const revenueEuros = Math.round(data.totalIncome);
    const expensesEuros = Math.round(data.totalExpenses);

    const cashflowUp = useCountUp(cashflowEuros, 500);
    const revenueUp = useCountUp(revenueEuros, 400);
    const expensesUp = useCountUp(expensesEuros, 400);

    const isPositive = data.netBenefit > 0;
    const isNegative = data.netBenefit < 0;

    const recoverableEuros = Math.round(data.totalRecoverable);
    const deductibleEuros = Math.round(data.totalDeductible);

    const evolution = data.netBenefitEvolution;

    return (
        <div className="bg-[#18160f] dark:bg-neutral-900 rounded-xl overflow-hidden mb-3">
            <div className="grid grid-cols-3">
                {/* Cashflow */}
                <div className="p-4 md:p-5 border-r border-white/8">
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                        Cashflow Net
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-2xl md:text-3xl font-bold tabular-nums leading-none ${
                            isPositive ? 'text-emerald-400' :
                            isNegative ? 'text-red-400' :
                            'text-white/40'
                        }`}>
                            {isPositive ? '+' : isNegative ? '-' : ''}{cashflowUp.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-sm text-white/30">€</span>
                    </div>
                    {evolution !== null && (
                        <p className={`text-[11px] font-medium mt-1.5 ${
                            evolution >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
                        }`}>
                            {evolution >= 0 ? '↗' : '↘'} {Math.abs(evolution).toFixed(1)}% vs {data.year - 1}
                        </p>
                    )}
                </div>

                {/* Revenue */}
                <div className="p-4 md:p-5 border-r border-white/8">
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                        Revenus
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl md:text-2xl font-bold text-white tabular-nums leading-none">
                            {revenueUp.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-sm text-white/30">€</span>
                    </div>
                    <p className="text-[11px] text-white/35 mt-1.5">Loyers + charges</p>
                </div>

                {/* Expenses */}
                <div className="p-4 md:p-5">
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                        Dépenses
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl md:text-2xl font-bold text-amber-300 tabular-nums leading-none">
                            {expensesUp.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-sm text-white/30">€</span>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                        {recoverableEuros > 0 && (
                            <span className="text-[10px] font-semibold text-emerald-300">
                                Récup. {recoverableEuros.toLocaleString('fr-FR')}€
                            </span>
                        )}
                        {deductibleEuros > 0 && (
                            <span className="text-[10px] font-semibold text-violet-300">
                                Déd. {deductibleEuros.toLocaleString('fr-FR')}€
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ propertyId, listingId, year, onYearChange }) => {
    const currentYear = new Date().getFullYear();
    const [data, setData] = useState<AnalyticData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const handleExport = async (format: 'pdf' | 'csv') => {
        setIsExporting(true);
        setShowMobileMenu(false);
        try {
            const params = new URLSearchParams({ format, year: year.toString(), propertyId });
            const res = await fetch(`/api/accounting/export?${params}`);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = format === 'pdf' ? `recap-fiscal-${year}.pdf` : `comptabilite-${year}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.custom((t) => <CustomToast t={t} message="Export téléchargé" type="success" />);
        } catch {
            toast.custom((t) => <CustomToast t={t} message="Erreur lors de l'export" type="error" />);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        getFinancialAnalytics(propertyId, year)
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [propertyId, year]);

    return (
        <div className="flex flex-col gap-2.5 mb-2.5 animate-fade-in">
            {/* Header: Title + Year Selector + Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Compact Year Selector */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onYearChange(year - 1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f3efe8] transition text-[#6b6660]"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-lg font-bold tabular-nums text-[#18160f] dark:text-white min-w-10 text-center">
                            {year}
                        </span>
                        <button
                            onClick={() => onYearChange(year + 1)}
                            disabled={year >= currentYear}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f3efe8] transition text-[#6b6660] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden md:flex gap-2">
                    <button
                        onClick={() => handleExport('csv')}
                        disabled={isExporting || !data}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#e8e4dc] text-[#6b6660] hover:bg-[#f3efe8] transition disabled:opacity-50"
                    >
                        <FileSpreadsheet size={14} />
                        CSV
                    </button>
                    <button
                        onClick={() => handleExport('pdf')}
                        disabled={isExporting || !data}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#e8e4dc] text-[#6b6660] hover:bg-[#f3efe8] transition disabled:opacity-50"
                    >
                        <FileDown size={14} />
                        PDF
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden relative">
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f3efe8] transition text-[#6b6660]"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                    {showMobileMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 rounded-xl border border-[#e8e4dc] dark:border-neutral-700 shadow-lg z-50 min-w-[160px] py-1">
                                <button
                                    onClick={() => handleExport('csv')}
                                    disabled={isExporting || !data}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-[#3d3a32] dark:text-neutral-200 hover:bg-[#f3efe8] dark:hover:bg-neutral-700 transition disabled:opacity-50"
                                >
                                    <FileSpreadsheet size={14} />
                                    Exporter CSV
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    disabled={isExporting || !data}
                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-[#3d3a32] dark:text-neutral-200 hover:bg-[#f3efe8] dark:hover:bg-neutral-700 transition disabled:opacity-50"
                                >
                                    <FileDown size={14} />
                                    Exporter PDF
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* KPI Card */}
            {loading ? (
                <div className="bg-[#18160f] dark:bg-neutral-900 rounded-[14px] h-[88px] flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-white/30" />
                </div>
            ) : data ? (
                <KPICardInner data={data} />
            ) : (
                <div className="bg-[#18160f] dark:bg-neutral-900 rounded-[14px] h-[88px] flex items-center justify-center text-white/30 text-xs">
                    Données indisponibles
                </div>
            )}

            {/* Link to /finances */}
            <Link
                href={`/finances?year=${year}&mode=year`}
                className="text-xs text-[#9e9890] hover:text-[#a8825e] transition flex items-center gap-1.5 mb-2"
            >
                Rendement & finances consolidées
                <ArrowRight size={12} />
            </Link>
        </div>
    );
};

export default FinancialDashboard;
