'use client';

import { useState, useEffect } from 'react';
import { getFinancialAnalytics, AnalyticData } from '@/app/actions/analytics';
import CashflowChart from './CashflowChart';
import ExpenseDistributionBar from './ExpenseDistributionBar';
import KPICards from './KPICards';
import { Loader2, FileDown, FileSpreadsheet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CustomToast from '@/components/ui/CustomToast';

interface FinancialDashboardProps {
    propertyId: string;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ propertyId }) => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [data, setData] = useState<AnalyticData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

    const handleExport = async (format: 'pdf' | 'csv') => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams({
                format,
                year: year.toString(),
                propertyId,
            });
            const res = await fetch(`/api/accounting/export?${params}`);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = format === 'pdf'
                ? `recap-fiscal-${year}.pdf`
                : `comptabilite-${year}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.custom((t) => (
                <CustomToast t={t} message="Export téléchargé" type="success" />
            ));
        } catch {
            toast.custom((t) => (
                <CustomToast t={t} message="Erreur lors de l'export" type="error" />
            ));
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
        <div className="flex flex-col gap-6 mb-8 animate-fade-in">
            {/* Header / Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Years Tabs */}
                <div className="flex gap-2 bg-neutral-100 p-1.5 rounded-2xl overflow-x-auto max-w-full">
                    {years.map(y => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`
                                px-4 py-2 rounded-2xl text-sm font-medium transition whitespace-nowrap
                                ${year === y ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:text-black'}
                            `}
                        >
                            {y}
                        </button>
                    ))}
                </div>

                {/* Export Buttons */}
                {data && !loading && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExport('csv')}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-50"
                        >
                            <FileSpreadsheet size={14} />
                            CSV
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-neutral-900 text-white hover:opacity-90 transition disabled:opacity-50"
                        >
                            <FileDown size={14} />
                            PDF
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="h-64 w-full flex items-center justify-center text-neutral-400 gap-2">
                    <Loader2 className="animate-spin" /> Chargement...
                </div>
            ) : data ? (
                <>
                    <KPICards data={data} />
                    <CashflowChart data={data.cashflow} />
                    <ExpenseDistributionBar data={data.expenseDistribution} />
                </>
            ) : (
                <div className="text-center text-neutral-400 py-10">Données indisponibles</div>
            )}
        </div>
    );
};

export default FinancialDashboard;
