'use client';

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { SafeUser } from "@/types";
import { AlertTriangle, Loader2, FileDown, FileSpreadsheet, ChevronDown, Home, Building } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { toast } from "react-hot-toast";
import CustomToast from "@/components/ui/CustomToast";

interface FiscalProperty {
    id: string;
    title: string;
    address: string;
    imageUrl: string | null;
}

interface FiscalSummary {
    year: number;
    propertyId?: string;
    properties?: FiscalProperty[];
    grossRevenueCents: number;
    totalDeductibleCents: number;
    managementFeesCents: number;
    netTaxableIncomeCents: number;
    byCategory: {
        category: string;
        label: string;
        totalCents: number;
    }[];
    declaration2044: {
        line: string;
        description: string;
        amountCents: number;
    }[];
}

interface FiscalClientProps {
    currentUser: SafeUser;
}

const FiscalClient: React.FC<FiscalClientProps> = ({ currentUser }) => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear - 1);
    const [selectedProperty, setSelectedProperty] = useState<string>('all');
    const [data, setData] = useState<FiscalSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [switcherOpen, setSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);

    // Close switcher on click outside
    useEffect(() => {
        if (!switcherOpen) return;
        const handler = (e: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setSwitcherOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [switcherOpen]);

    const handleExport = async (format: 'pdf' | 'csv') => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams({ format, year: year.toString() });
            if (selectedProperty !== 'all') {
                params.set('propertyId', selectedProperty);
            }
            const res = await fetch(`/api/accounting/export?${params}`);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = format === 'pdf'
                ? `recap-fiscal-coridor-${year}.pdf`
                : `comptabilite-coridor-${year}.csv`;
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
        setIsLoading(true);
        setError(null);
        const url = selectedProperty === 'all'
            ? `/api/fiscal/summary-all?year=${year}`
            : `/api/fiscal/summary?propertyId=${selectedProperty}&year=${year}`;

        axios.get(url)
            .then(res => setData(res.data))
            .catch(err => {
                console.error(err);
                setError("Impossible de charger les données fiscales.");
            })
            .finally(() => setIsLoading(false));
    }, [year, selectedProperty]);

    const formatEuro = (cents: number) =>
        (cents / 100).toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' \u20AC';

    const yearOptions = [currentYear - 1, currentYear - 2, currentYear - 3];

    return (
        <div className="pb-20">
                <PageHeader
                    title={`Récap fiscal ${year}`}
                    subtitle="Synthèse de vos revenus fonciers pour la déclaration"
                    actionControls={data && !isLoading && !error ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleExport('csv')}
                                disabled={isExporting}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                            >
                                <FileSpreadsheet size={14} />
                                CSV
                            </button>
                            <button
                                onClick={() => handleExport('pdf')}
                                disabled={isExporting}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition disabled:opacity-50"
                            >
                                <FileDown size={14} />
                                PDF
                            </button>
                        </div>
                    ) : undefined}
                />

                <div className="mt-10 flex flex-col gap-6">

                {/* Year Selector */}
                <div className="flex gap-2">
                    {yearOptions.map(y => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition
                                ${year === y
                                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                                    : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                                }`}
                        >
                            {y}
                        </button>
                    ))}
                </div>

                {/* Property Switcher — Glass Morphism Dropdown */}
                {data?.properties && data.properties.length > 0 && (() => {
                    const hasMultiple = data.properties!.length > 1;
                    const activeProperty = selectedProperty === 'all'
                        ? null
                        : data.properties!.find(p => p.id === selectedProperty) || null;

                    return (
                        <div ref={switcherRef} className="relative" style={{ zIndex: switcherOpen ? 10000 : 'auto' }}>
                            {/* Trigger */}
                            <button
                                onClick={() => hasMultiple && setSwitcherOpen(o => !o)}
                                className={`w-full flex items-center gap-3 border transition-all duration-250 ${hasMultiple ? 'cursor-pointer' : 'cursor-default'}`}
                                style={{
                                    padding: '12px 16px',
                                    background: switcherOpen ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
                                    backdropFilter: 'blur(20px) saturate(1.2)',
                                    WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
                                    borderColor: switcherOpen ? 'rgba(168,130,94,0.4)' : '#e8e4dc',
                                    borderRadius: switcherOpen ? '16px 16px 0 0' : '16px',
                                    boxShadow: switcherOpen
                                        ? '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)'
                                        : '0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6)',
                                }}
                            >
                                <div
                                    className="shrink-0 overflow-hidden"
                                    style={{
                                        width: 50, height: 50, borderRadius: 12,
                                        border: '1px solid #d4c4a8',
                                    }}
                                >
                                    {activeProperty?.imageUrl ? (
                                        <img src={activeProperty.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                                            <Building size={18} className="text-neutral-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-base font-medium text-neutral-900 dark:text-white truncate leading-tight">
                                        {activeProperty ? activeProperty.title : 'Tous les biens'}
                                    </p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                        {activeProperty ? activeProperty.address : `${data.properties!.length} biens`}
                                    </p>
                                </div>
                                {hasMultiple && (
                                    <ChevronDown
                                        size={14}
                                        className="text-[#a8825e] shrink-0"
                                        style={{
                                            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                            transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0)',
                                        }}
                                    />
                                )}
                            </button>

                            {/* Glass Dropdown Panel */}
                            {switcherOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[10000]"
                                        onClick={() => setSwitcherOpen(false)}
                                    />
                                    <div
                                        className="absolute top-full left-0 right-0 z-[10001] overflow-y-auto overscroll-contain"
                                        style={{
                                            maxHeight: '60vh',
                                            background: 'rgba(255,255,255,0.82)',
                                            backdropFilter: 'blur(24px) saturate(1.3)',
                                            WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
                                            border: '1px solid rgba(168,130,94,0.3)',
                                            borderTop: '1px solid rgba(255,255,255,0.3)',
                                            borderRadius: '0 0 16px 16px',
                                            boxShadow: '0 16px 48px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
                                            animation: 'glassDrop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                            WebkitOverflowScrolling: 'touch',
                                        }}
                                    >
                                        <style>{`
                                            @keyframes glassDrop { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
                                            @keyframes glassItem { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
                                        `}</style>

                                        {/* "Tous les biens" option */}
                                        <button
                                            onClick={() => { setSelectedProperty('all'); setSwitcherOpen(false); }}
                                            className="w-full flex items-center gap-3 border-0 transition-colors duration-150"
                                            style={{
                                                padding: '14px 16px',
                                                cursor: 'pointer',
                                                background: selectedProperty === 'all' ? 'linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)' : 'transparent',
                                                borderBottom: '4px solid rgba(0,0,0,0.04)',
                                                animation: 'glassItem 0.2s ease-out both',
                                            }}
                                            onMouseEnter={e => { if (selectedProperty !== 'all') e.currentTarget.style.background = 'rgba(168,130,94,0.05)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = selectedProperty === 'all' ? 'linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)' : 'transparent'; }}
                                        >
                                            <div
                                                className="shrink-0 relative overflow-hidden transition-all duration-200"
                                                style={{
                                                    width: 50, height: 50, borderRadius: 16,
                                                    border: selectedProperty === 'all' ? '2px solid #a8825e' : '1px solid rgba(0,0,0,0.06)',
                                                    boxShadow: selectedProperty === 'all' ? '0 2px 8px rgba(168,130,94,0.25)' : 'none',
                                                }}
                                            >
                                                <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                                                    <Building size={18} className="text-neutral-400" />
                                                </div>
                                                {selectedProperty === 'all' && (
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className={`text-[15px] truncate ${selectedProperty === 'all' ? 'font-semibold text-neutral-900 dark:text-white' : 'font-medium text-neutral-900 dark:text-white'}`}>
                                                    Tous les biens
                                                </p>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                                    {data.properties!.length} biens
                                                </p>
                                            </div>
                                        </button>

                                        {/* Individual properties */}
                                        {data.properties!.map((p, i) => {
                                            const isActive = selectedProperty === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => { setSelectedProperty(p.id); setSwitcherOpen(false); }}
                                                    className="w-full flex items-center gap-3 border-0 transition-colors duration-150"
                                                    style={{
                                                        padding: '14px 16px',
                                                        cursor: 'pointer',
                                                        background: isActive ? 'linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)' : 'transparent',
                                                        borderBottom: i < data.properties!.length - 1 ? '4px solid rgba(0,0,0,0.04)' : 'none',
                                                        animation: `glassItem 0.2s ease-out ${(i + 1) * 0.04}s both`,
                                                    }}
                                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(168,130,94,0.05)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'linear-gradient(90deg, rgba(168,130,94,0.12) 0%, transparent 100%)' : 'transparent'; }}
                                                >
                                                    <div
                                                        className="shrink-0 relative overflow-hidden transition-all duration-200"
                                                        style={{
                                                            width: 50, height: 50, borderRadius: 16,
                                                            border: isActive ? '2px solid #a8825e' : '1px solid rgba(0,0,0,0.06)',
                                                            boxShadow: isActive ? '0 2px 8px rgba(168,130,94,0.25)' : 'none',
                                                        }}
                                                    >
                                                        {p.imageUrl ? (
                                                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                                                                <Home size={16} className="text-neutral-400" />
                                                            </div>
                                                        )}
                                                        {isActive && (
                                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className={`text-[15px] truncate ${isActive ? 'font-semibold text-neutral-900 dark:text-white' : 'font-medium text-neutral-900 dark:text-white'}`}>
                                                            {p.title}
                                                        </p>
                                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                                            {p.address}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })()}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-600 font-medium">{error}</p>
                        <p className="text-sm text-red-500 mt-1">Vérifiez que des données existent pour cette période.</p>
                    </div>
                )}

                {/* Data Display */}
                {data && !isLoading && !error && (
                    <>
                        {/* Summary Card */}
                        <div>
                            <h2 className="font-medium text-xl text-neutral-900 dark:text-white mb-2">Synthèse</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
                                    <p className="text-sm font-medium leading-tight text-purple-600 dark:text-purple-400 mb-1">Revenus fonciers bruts</p>
                                    <p className="text-xl font-medium text-neutral-900 dark:text-white">
                                        {formatEuro(data.grossRevenueCents)}
                                    </p>
                                </div>
                                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
                                    <p className="text-sm font-medium leading-tight text-purple-600 dark:text-purple-400 mb-1">Total charges déductibles</p>
                                    <p className="text-xl font-medium text-purple-700 dark:text-purple-400">
                                        {formatEuro(data.totalDeductibleCents)}
                                    </p>
                                </div>
                                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
                                    <p className="text-sm font-medium leading-tight text-purple-600 dark:text-purple-400 mb-1">Frais de gestion (forfait)</p>
                                    <p className="text-xl font-medium text-neutral-900 dark:text-white">
                                        {formatEuro(data.managementFeesCents)}
                                    </p>
                                </div>
                                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
                                    <p className="text-sm font-medium leading-tight text-neutral-900 dark:text-white mb-1">Revenu foncier net imposable</p>
                                    <p className="text-xl font-medium text-purple-700 dark:text-purple-400">
                                        {formatEuro(data.netTaxableIncomeCents)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        {data.byCategory && data.byCategory.length > 0 && (
                            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
                                <h2 className="font-semibold text-neutral-900 dark:text-white mb-4">Détail par catégorie</h2>
                                <div className="space-y-3">
                                    {data.byCategory.map((cat, i) => {
                                        const maxAmount = Math.max(
                                            ...data.byCategory.map(c => c.totalCents)
                                        );
                                        const widthPercent = maxAmount > 0
                                            ? Math.max(5, (cat.totalCents / maxAmount) * 100)
                                            : 0;

                                        return (
                                            <div key={cat.category || i} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-neutral-700 dark:text-neutral-300 font-medium truncate">
                                                        {cat.label}
                                                    </div>
                                                    <div className="text-sm font-semibold text-neutral-900 dark:text-white shrink-0 ml-3">
                                                        {formatEuro(cat.totalCents)}
                                                    </div>
                                                </div>
                                                <div className="bg-neutral-200 dark:bg-neutral-700 rounded-full h-5 overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${widthPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Déclaration 2044 Table */}
                        {data.declaration2044 && data.declaration2044.length > 0 && (
                            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-6">
                                <h2 className="font-semibold text-neutral-900 dark:text-white">Formulaire n°2044</h2>
                                <p className="text-base text-neutral-700 dark:text-neutral-300 font-medium mb-4">
                                    Déclaration des revenus fonciers
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-200 dark:border-neutral-700">
                                                <th className="text-left py-3 font-semibold text-neutral-600 dark:text-neutral-400 w-15">Ligne</th>
                                                <th className="text-left py-3 font-semibold text-neutral-600 dark:text-neutral-400">Description</th>
                                                <th className="text-right py-3 font-semibold text-neutral-600 dark:text-neutral-400 w-32">Montant</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.declaration2044.map((row) => (
                                                <tr
                                                    key={row.line}
                                                    className={`border-b border-neutral-100 dark:border-neutral-700/50
                                                        ${row.line === '420' ? 'font-medium' : ''}`}
                                                >
                                                    <td className="py-3 font-mono text-neutral-500 dark:text-neutral-400">{row.line}</td>
                                                    <td className="py-3 text-neutral-800 dark:text-neutral-200">{row.description}</td>
                                                    <td className={`py-3 text-right font-medium
                                                        ${row.line === '420' ? 'text-purple-700 dark:text-purple-400' : 'text-neutral-700 dark:text-neutral-300'}`}
                                                    >
                                                        {formatEuro(row.amountCents)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Information importante</p>
                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                    Ce récap est fourni à titre indicatif. Coridor n&apos;est pas un cabinet comptable.
                                    Consultez votre conseiller fiscal pour votre déclaration.
                                </p>
                            </div>
                        </div>
                    </>
                )}
                </div>
        </div>
    );
};

export default FiscalClient;
