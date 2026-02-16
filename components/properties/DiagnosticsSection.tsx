'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
    FileCheck,
    Thermometer,
    Zap,
    Flame,
    AlertTriangle,
    Loader2,
    Info,
    AlertCircle,
} from 'lucide-react';

// ---------- Types ----------

interface DiagnosticsSectionProps {
    propertyId: string;
    initialData: {
        dpe?: string | null;
        dpeDate?: string | null;
        dpeExpiryDate?: string | null;
        electricalDiagnosticDate?: string | null;
        electricalInstallYear?: number | null;
        gasDiagnosticDate?: string | null;
        gasInstallYear?: number | null;
        hasGasInstallation?: boolean;
        erpDate?: string | null;
    };
}

// ---------- Helpers ----------

const DPE_COLORS: Record<string, string> = {
    A: 'bg-green-600 text-white',
    B: 'bg-green-400 text-white',
    C: 'bg-yellow-400 text-neutral-900',
    D: 'bg-yellow-500 text-white',
    E: 'bg-orange-500 text-white',
    F: 'bg-red-500 text-white',
    G: 'bg-red-700 text-white',
};

function toInputDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

function addYears(dateStr: string, years: number): string {
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

// ---------- Component ----------

const DiagnosticsSection: React.FC<DiagnosticsSectionProps> = ({ propertyId, initialData }) => {
    const [saving, setSaving] = useState(false);

    // Form state
    const [dpeDate, setDpeDate] = useState(toInputDate(initialData.dpeDate));
    const [electricalDiagnosticDate, setElectricalDiagnosticDate] = useState(toInputDate(initialData.electricalDiagnosticDate));
    const [electricalInstallYear, setElectricalInstallYear] = useState<number | ''>(initialData.electricalInstallYear ?? '');
    const [gasDiagnosticDate, setGasDiagnosticDate] = useState(toInputDate(initialData.gasDiagnosticDate));
    const [gasInstallYear, setGasInstallYear] = useState<number | ''>(initialData.gasInstallYear ?? '');
    const [hasGasInstallation, setHasGasInstallation] = useState(initialData.hasGasInstallation ?? false);
    const [erpDate, setErpDate] = useState(toInputDate(initialData.erpDate));

    // Computed
    const dpeExpiryDate = useMemo(() => {
        if (!dpeDate) return '';
        return addYears(dpeDate, 10);
    }, [dpeDate]);

    const isDpeFG = initialData.dpe === 'F' || initialData.dpe === 'G';

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            await axios.patch(`/api/properties/${propertyId}/diagnostics`, {
                dpeDate: dpeDate || null,
                electricalDiagnosticDate: electricalDiagnosticDate || null,
                electricalInstallYear: electricalInstallYear || null,
                gasDiagnosticDate: gasDiagnosticDate || null,
                gasInstallYear: gasInstallYear || null,
                hasGasInstallation,
                erpDate: erpDate || null,
            });
            toast.success('Diagnostics enregistres avec succes');
        } catch (error) {
            console.error('Failed to save diagnostics:', error);
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    }, [propertyId, dpeDate, electricalDiagnosticDate, electricalInstallYear, gasDiagnosticDate, gasInstallYear, hasGasInstallation, erpDate]);

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neutral-100 rounded-xl">
                    <FileCheck size={22} className="text-neutral-700" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Diagnostics immobiliers</h2>
                    <p className="text-sm text-neutral-500">
                        Renseignez les dates pour recevoir des rappels automatiques
                    </p>
                </div>
            </div>

            {/* ── DPE ── */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Thermometer size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">DPE - Diagnostic de Performance Energetique</h3>
                    {initialData.dpe && (
                        <span className={`ml-auto px-3 py-0.5 rounded-full text-sm font-bold ${DPE_COLORS[initialData.dpe] || 'bg-neutral-200 text-neutral-600'}`}>
                            {initialData.dpe}
                        </span>
                    )}
                </div>

                {isDpeFG && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 font-medium">
                            Attention : gel des loyers en vigueur pour les logements classes F ou G
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Date du diagnostic
                        </label>
                        <input
                            type="date"
                            value={dpeDate}
                            onChange={(e) => setDpeDate(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Date d&apos;expiration
                        </label>
                        <input
                            type="date"
                            value={dpeExpiryDate}
                            readOnly
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 text-neutral-500 cursor-not-allowed"
                        />
                        {dpeExpiryDate && (
                            <p className="text-xs text-neutral-400 mt-1">
                                Expire le {formatDisplayDate(dpeExpiryDate)} (duree : 10 ans)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Electricite ── */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Diagnostic Electricite</h3>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">
                        Obligatoire si installation &gt; 15 ans. Valide 6 ans.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Date du diagnostic
                        </label>
                        <input
                            type="date"
                            value={electricalDiagnosticDate}
                            onChange={(e) => setElectricalDiagnosticDate(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Annee d&apos;installation
                        </label>
                        <input
                            type="number"
                            value={electricalInstallYear}
                            onChange={(e) => setElectricalInstallYear(e.target.value ? parseInt(e.target.value) : '')}
                            placeholder="ex: 2005"
                            min={1900}
                            max={new Date().getFullYear()}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* ── Gaz ── */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Flame size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Diagnostic Gaz</h3>
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setHasGasInstallation(!hasGasInstallation)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                            hasGasInstallation ? 'bg-neutral-900' : 'bg-neutral-300'
                        }`}
                    >
                        <span
                            className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                hasGasInstallation ? 'translate-x-[22px]' : 'translate-x-[2px]'
                            }`}
                        />
                    </button>
                    <span className="text-sm text-neutral-700">
                        Le logement dispose d&apos;une installation gaz
                    </span>
                </div>

                {hasGasInstallation && (
                    <>
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700">
                                Obligatoire si installation gaz &gt; 15 ans. Valide 6 ans.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Date du diagnostic
                                </label>
                                <input
                                    type="date"
                                    value={gasDiagnosticDate}
                                    onChange={(e) => setGasDiagnosticDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Annee d&apos;installation
                                </label>
                                <input
                                    type="number"
                                    value={gasInstallYear}
                                    onChange={(e) => setGasInstallYear(e.target.value ? parseInt(e.target.value) : '')}
                                    placeholder="ex: 2005"
                                    min={1900}
                                    max={new Date().getFullYear()}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── ERP ── */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">ERP - Etat des Risques et Pollutions</h3>
                </div>

                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-700 font-medium">
                        Attention : valide seulement 6 mois !
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Date du diagnostic
                    </label>
                    <input
                        type="date"
                        value={erpDate}
                        onChange={(e) => setErpDate(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent sm:max-w-xs"
                    />
                </div>
            </div>

            {/* ── Save button ── */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    Enregistrer les diagnostics
                </button>
            </div>
        </div>
    );
};

export default DiagnosticsSection;
