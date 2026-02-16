'use client';

import { useState, useEffect } from "react";
import axios from "axios";
import { SafeUser } from "@/types";
import Container from "@/components/Container";
import { Calculator, AlertTriangle, Building, Loader2 } from "lucide-react";

interface FiscalSummary {
    year: number;
    propertyId?: string;
    properties?: { id: string; title: string }[];
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
                setError("Impossible de charger les donnees fiscales.");
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
        <Container>
            <div className="pb-20 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 rounded-xl">
                        <Calculator className="w-6 h-6 text-purple-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">
                            Recap fiscal {year}
                        </h1>
                        <p className="text-sm text-neutral-500">
                            Synthese de vos revenus fonciers pour la declaration
                        </p>
                    </div>
                </div>

                {/* Year Selector */}
                <div className="flex gap-2">
                    {yearOptions.map(y => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition
                                ${year === y
                                    ? 'bg-neutral-900 text-white shadow-sm'
                                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                                }`}
                        >
                            {y}
                        </button>
                    ))}
                </div>

                {/* Property Selector */}
                {data?.properties && data.properties.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedProperty('all')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition
                                ${selectedProperty === 'all'
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                                }`}
                        >
                            <Building size={14} />
                            Tous les biens
                        </button>
                        {data.properties.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProperty(p.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition
                                    ${selectedProperty === p.id
                                        ? 'bg-neutral-900 text-white'
                                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                                    }`}
                            >
                                {p.title}
                            </button>
                        ))}
                    </div>
                )}

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
                        <p className="text-sm text-red-500 mt-1">Verifiez que des donnees existent pour cette periode.</p>
                    </div>
                )}

                {/* Data Display */}
                {data && !isLoading && !error && (
                    <>
                        {/* Summary Card */}
                        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                            <h2 className="font-semibold text-neutral-900 mb-4">Synthese</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-green-50 rounded-xl">
                                    <p className="text-xs font-medium text-green-600 mb-1">Revenus fonciers bruts</p>
                                    <p className="text-xl font-bold text-green-700">
                                        {formatEuro(data.grossRevenueCents)}
                                    </p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-xl">
                                    <p className="text-xs font-medium text-red-600 mb-1">Total charges deductibles</p>
                                    <p className="text-xl font-bold text-red-700">
                                        {formatEuro(data.totalDeductibleCents)}
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-xl">
                                    <p className="text-xs font-medium text-amber-600 mb-1">Frais de gestion (forfait)</p>
                                    <p className="text-xl font-bold text-amber-700">
                                        {formatEuro(data.managementFeesCents)}
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-xl">
                                    <p className="text-xs font-medium text-purple-600 mb-1">Revenu foncier net imposable</p>
                                    <p className="text-xl font-bold text-purple-700">
                                        {formatEuro(data.netTaxableIncomeCents)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        {data.byCategory && data.byCategory.length > 0 && (
                            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                                <h2 className="font-semibold text-neutral-900 mb-4">Detail par categorie</h2>
                                <div className="space-y-3">
                                    {data.byCategory.map((cat, i) => {
                                        const maxAmount = Math.max(
                                            ...data.byCategory.map(c => c.totalCents)
                                        );
                                        const widthPercent = maxAmount > 0
                                            ? Math.max(5, (cat.totalCents / maxAmount) * 100)
                                            : 0;

                                        return (
                                            <div key={cat.category || i} className="flex items-center gap-4">
                                                <div className="w-40 text-sm text-neutral-700 font-medium truncate shrink-0">
                                                    {cat.label}
                                                </div>
                                                <div className="flex-1 bg-neutral-100 rounded-full h-6 overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${widthPercent}%` }}
                                                    />
                                                </div>
                                                <div className="w-28 text-sm font-semibold text-neutral-900 text-right shrink-0">
                                                    {formatEuro(cat.totalCents)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Declaration 2044 Table */}
                        {data.declaration2044 && data.declaration2044.length > 0 && (
                            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                                <h2 className="font-semibold text-neutral-900 mb-4">Declaration 2044</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-200">
                                                <th className="text-left py-3 px-4 font-semibold text-neutral-600 w-20">Ligne</th>
                                                <th className="text-left py-3 px-4 font-semibold text-neutral-600">Description</th>
                                                <th className="text-right py-3 px-4 font-semibold text-neutral-600 w-32">Montant</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.declaration2044.map((row, i) => (
                                                <tr
                                                    key={row.line}
                                                    className={`border-b border-neutral-100 ${i % 2 === 0 ? 'bg-neutral-50' : 'bg-white'}
                                                        ${row.line === '420' ? 'font-bold bg-purple-50' : ''}`}
                                                >
                                                    <td className="py-3 px-4 font-mono text-neutral-500">{row.line}</td>
                                                    <td className="py-3 px-4 text-neutral-800">{row.description}</td>
                                                    <td className={`py-3 px-4 text-right font-semibold
                                                        ${row.line === '211' ? 'text-green-700' : ''}
                                                        ${row.line === '420' ? 'text-purple-700' : ''}
                                                        ${!['211', '420'].includes(row.line) ? 'text-red-600' : ''}`}
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
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800">Information importante</p>
                                <p className="text-sm text-amber-700 mt-1">
                                    Ce recap est fourni a titre indicatif. Coridor n&apos;est pas un cabinet comptable.
                                    Consultez votre conseiller fiscal pour votre declaration.
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Container>
    );
};

export default FiscalClient;
