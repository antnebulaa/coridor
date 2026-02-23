'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    Thermometer,
    Flame,
    ShieldCheck,
    Zap,
    AlertTriangle,
    Info,
    AlertCircle,
    Loader2,
    Droplets,
} from 'lucide-react';
import { SafeListing } from '@/types';
import EditSectionFooter from './EditSectionFooter';
import CustomToast from '@/components/ui/CustomToast';
import SoftSelect from '@/components/inputs/SoftSelect';
import SoftInput from '@/components/inputs/SoftInput';

interface EnergyDiagnosticsSectionProps {
    listing: SafeListing;
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

function toInputDate(dateStr?: string | Date | null): string {
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

const EnergyDiagnosticsSection: React.FC<EnergyDiagnosticsSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const property = listing.rentalUnit?.property;
    const propertyId = property?.id || '';

    // ═══════════════════════════════════
    // A) DPE & Performance Énergétique
    // ═══════════════════════════════════
    const [dpe, setDpe] = useState(listing.dpe || 'C');
    const [ges, setGes] = useState(listing.ges || 'A');
    const [dpeDate, setDpeDate] = useState(toInputDate((property as any)?.dpeDate));
    const [dpe_year, setDpeYear] = useState<number | ''>(listing.dpe_year ?? '');
    const [energy_cost_min, setEnergyCostMin] = useState<number | ''>(listing.energy_cost_min ?? '');
    const [energy_cost_max, setEnergyCostMax] = useState<number | ''>(listing.energy_cost_max ?? '');

    const dpeExpiryDate = useMemo(() => {
        if (!dpeDate) return '';
        return addYears(dpeDate, 10);
    }, [dpeDate]);

    const isDpeFG = dpe === 'F' || dpe === 'G';

    // ═══════════════════════════════════
    // B) Chauffage & Isolation
    // ═══════════════════════════════════
    const [heatingSystem, setHeatingSystem] = useState(listing.heatingSystem || 'IND_ELEC');
    const [waterHeatingSystem, setWaterHeatingSystem] = useState((property as any)?.waterHeatingSystem || '');
    const [glazingType, setGlazingType] = useState(listing.glazingType || 'DOUBLE');

    // ═══════════════════════════════════
    // C) Diagnostics obligatoires
    // ═══════════════════════════════════
    const [electricalDiagnosticDate, setElectricalDiagnosticDate] = useState(toInputDate((property as any)?.electricalDiagnosticDate));
    const [electricalInstallYear, setElectricalInstallYear] = useState<number | ''>(
        (property as any)?.electricalInstallYear ?? ''
    );
    const [hasGasInstallation, setHasGasInstallation] = useState((property as any)?.hasGasInstallation ?? false);
    const [gasDiagnosticDate, setGasDiagnosticDate] = useState(toInputDate((property as any)?.gasDiagnosticDate));
    const [gasInstallYear, setGasInstallYear] = useState<number | ''>(
        (property as any)?.gasInstallYear ?? ''
    );
    const [erpDate, setErpDate] = useState(toInputDate((property as any)?.erpDate));
    const [leadDiagnosticDate, setLeadDiagnosticDate] = useState(toInputDate((property as any)?.leadDiagnosticDate));
    const [leadDiagnosticResult, setLeadDiagnosticResult] = useState((property as any)?.leadDiagnosticResult || '');
    const [asbestosDiagnosticDate, setAsbestosDiagnosticDate] = useState(toInputDate((property as any)?.asbestosDiagnosticDate));
    const [asbestosDiagnosticResult, setAsbestosDiagnosticResult] = useState((property as any)?.asbestosDiagnosticResult || '');

    // ═══════════════════════════════════
    // Save — two API calls
    // ═══════════════════════════════════
    const handleSave = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Save listing-level fields (DPE grade, GES, heating, glazing, energy costs)
            await axios.put(`/api/listings/${listing.id}`, {
                dpe,
                ges,
                heatingSystem,
                glazingType,
                energy_cost_min: energy_cost_min || null,
                energy_cost_max: energy_cost_max || null,
                dpe_year: dpe_year || null,
            });

            // 2. Save property-level fields (dates, diagnostics)
            if (propertyId) {
                await axios.patch(`/api/properties/${propertyId}/diagnostics`, {
                    dpeDate: dpeDate || null,
                    electricalDiagnosticDate: electricalDiagnosticDate || null,
                    electricalInstallYear: electricalInstallYear || null,
                    gasDiagnosticDate: gasDiagnosticDate || null,
                    gasInstallYear: gasInstallYear || null,
                    hasGasInstallation,
                    erpDate: erpDate || null,
                    waterHeatingSystem: waterHeatingSystem || null,
                    leadDiagnosticDate: leadDiagnosticDate || null,
                    leadDiagnosticResult: leadDiagnosticResult || null,
                    asbestosDiagnosticDate: asbestosDiagnosticDate || null,
                    asbestosDiagnosticResult: asbestosDiagnosticResult || null,
                });
            }

            toast.custom((t) => (
                <CustomToast t={t} message="Énergie & diagnostics enregistrés" type="success" />
            ));
            router.refresh();
        } catch (error) {
            console.error('Failed to save energy & diagnostics:', error);
            toast.custom((t) => (
                <CustomToast t={t} message="Erreur lors de la sauvegarde" type="error" />
            ));
        } finally {
            setIsLoading(false);
        }
    }, [
        listing.id, propertyId, router,
        dpe, ges, heatingSystem, glazingType, energy_cost_min, energy_cost_max, dpe_year,
        dpeDate, electricalDiagnosticDate, electricalInstallYear,
        gasDiagnosticDate, gasInstallYear, hasGasInstallation, erpDate,
        waterHeatingSystem,
        leadDiagnosticDate, leadDiagnosticResult, asbestosDiagnosticDate, asbestosDiagnosticResult,
    ]);

    const inputClass = "w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";
    const selectClass = "w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white appearance-none";
    const labelClass = "block text-sm font-medium text-neutral-700 mb-1";

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-0">

            {/* ════════════════════════════════════════════ */}
            {/* A) DPE & Performance Énergétique            */}
            {/* ════════════════════════════════════════════ */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Thermometer size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">DPE &amp; Performance Énergétique</h3>
                    {dpe && (
                        <span className={`ml-auto px-3 py-0.5 rounded-full text-sm font-bold ${DPE_COLORS[dpe] || 'bg-neutral-200 text-neutral-600'}`}>
                            {dpe}
                        </span>
                    )}
                </div>

                {isDpeFG && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 font-medium">
                            Attention : gel des loyers en vigueur pour les logements classés F ou G
                        </p>
                    </div>
                )}

                {/* DPE + GES grades */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>DPE (Classe énergie)</label>
                        <select
                            value={dpe}
                            onChange={(e) => setDpe(e.target.value)}
                            disabled={isLoading}
                            className={selectClass}
                        >
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>GES (Gaz à effet de serre)</label>
                        <select
                            value={ges}
                            onChange={(e) => setGes(e.target.value)}
                            disabled={isLoading}
                            className={selectClass}
                        >
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* DPE dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Date du diagnostic DPE</label>
                        <input
                            type="date"
                            value={dpeDate}
                            onChange={(e) => setDpeDate(e.target.value)}
                            disabled={isLoading}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Date d&apos;expiration</label>
                        <input
                            type="date"
                            value={dpeExpiryDate}
                            readOnly
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-50 text-neutral-500 cursor-not-allowed"
                        />
                        {dpeExpiryDate && (
                            <p className="text-xs text-neutral-400 mt-1">
                                Expire le {formatDisplayDate(dpeExpiryDate)} (durée : 10 ans)
                            </p>
                        )}
                    </div>
                </div>

                {/* Energy costs */}
                <div className="space-y-2">
                    <label className={labelClass}>Coûts annuels d&apos;énergie</label>
                    <p className="text-xs text-neutral-500">
                        Ces montants figurent sur la première page de votre DPE. Si vous ne les avez pas, laissez vide.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <input
                                type="number"
                                value={energy_cost_min}
                                onChange={(e) => setEnergyCostMin(e.target.value ? parseInt(e.target.value) : '')}
                                disabled={isLoading}
                                placeholder="Min (€/an)"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <input
                                type="number"
                                value={energy_cost_max}
                                onChange={(e) => setEnergyCostMax(e.target.value ? parseInt(e.target.value) : '')}
                                disabled={isLoading}
                                placeholder="Max (€/an)"
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                {/* DPE year */}
                <div className="max-w-xs">
                    <label className={labelClass}>Année de référence du DPE</label>
                    <input
                        type="number"
                        value={dpe_year}
                        onChange={(e) => setDpeYear(e.target.value ? parseInt(e.target.value) : '')}
                        disabled={isLoading}
                        placeholder="Ex: 2024"
                        className={inputClass}
                    />
                </div>
            </div>

            {/* ════════════════════════════════════════════ */}
            {/* B) Chauffage & Isolation                     */}
            {/* ════════════════════════════════════════════ */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Flame size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Chauffage &amp; Isolation</h3>
                </div>

                <div>
                    <label className={labelClass}>Système de chauffage</label>
                    <select
                        value={heatingSystem}
                        onChange={(e) => setHeatingSystem(e.target.value)}
                        disabled={isLoading}
                        className={selectClass}
                    >
                        <option value="IND_ELEC">Individuel Électrique</option>
                        <option value="IND_GAS">Individuel Gaz</option>
                        <option value="COL_GAS">Collectif Gaz</option>
                        <option value="COL_URB">Collectif Urbain</option>
                        <option value="PAC">Pompe à Chaleur</option>
                        <option value="WOOD">Bois / Granulés</option>
                        <option value="REV_AC">Clim. Réversible</option>
                    </select>
                </div>

                <div>
                    <label className={labelClass}>Production d&apos;eau chaude</label>
                    <select
                        value={waterHeatingSystem}
                        onChange={(e) => setWaterHeatingSystem(e.target.value)}
                        disabled={isLoading}
                        className={selectClass}
                    >
                        <option value="">-- Sélectionner --</option>
                        <option value="IND_ELEC">Individuel électrique</option>
                        <option value="COL_GAZ">Collectif gaz</option>
                        <option value="COL_FIO">Collectif fioul</option>
                        <option value="IND_GAZ">Individuel gaz</option>
                        <option value="COL">Collectif (autre)</option>
                        <option value="IND">Individuel (autre)</option>
                    </select>
                </div>

                <div>
                    <label className={labelClass}>Type de vitrage</label>
                    <select
                        value={glazingType}
                        onChange={(e) => setGlazingType(e.target.value)}
                        disabled={isLoading}
                        className={selectClass}
                    >
                        <option value="SINGLE">Simple vitrage</option>
                        <option value="DOUBLE">Double vitrage</option>
                        <option value="TRIPLE">Triple vitrage</option>
                    </select>
                </div>
            </div>

            {/* ════════════════════════════════════════════ */}
            {/* C) Diagnostics obligatoires                  */}
            {/* ════════════════════════════════════════════ */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-6">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Diagnostics obligatoires</h3>
                </div>

                <p className="text-sm text-neutral-500">
                    Renseignez les dates pour recevoir des rappels automatiques avant expiration.
                </p>

                {/* Électricité */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-neutral-500" />
                        <h4 className="text-sm font-medium text-neutral-700">Diagnostic Électricité</h4>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700">
                            Obligatoire si installation &gt; 15 ans. Valide 6 ans.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Date du diagnostic</label>
                            <input
                                type="date"
                                value={electricalDiagnosticDate}
                                onChange={(e) => setElectricalDiagnosticDate(e.target.value)}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Année d&apos;installation</label>
                            <input
                                type="number"
                                value={electricalInstallYear}
                                onChange={(e) => setElectricalInstallYear(e.target.value ? parseInt(e.target.value) : '')}
                                placeholder="ex: 2005"
                                min={1900}
                                max={new Date().getFullYear()}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-200" />

                {/* Gaz */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Flame size={16} className="text-neutral-500" />
                        <h4 className="text-sm font-medium text-neutral-700">Diagnostic Gaz</h4>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setHasGasInstallation(!hasGasInstallation)}
                            disabled={isLoading}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                                hasGasInstallation ? 'bg-neutral-900' : 'bg-neutral-300'
                            }`}
                        >
                            <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                hasGasInstallation ? 'translate-x-[22px]' : 'translate-x-[2px]'
                            }`} />
                        </button>
                        <span className="text-sm text-neutral-700">Le logement dispose d&apos;une installation gaz</span>
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
                                    <label className={labelClass}>Date du diagnostic</label>
                                    <input
                                        type="date"
                                        value={gasDiagnosticDate}
                                        onChange={(e) => setGasDiagnosticDate(e.target.value)}
                                        disabled={isLoading}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Année d&apos;installation</label>
                                    <input
                                        type="number"
                                        value={gasInstallYear}
                                        onChange={(e) => setGasInstallYear(e.target.value ? parseInt(e.target.value) : '')}
                                        placeholder="ex: 2005"
                                        min={1900}
                                        max={new Date().getFullYear()}
                                        disabled={isLoading}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <hr className="border-neutral-200" />

                {/* ERP */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-neutral-500" />
                        <h4 className="text-sm font-medium text-neutral-700">ERP - État des Risques et Pollutions</h4>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-700 font-medium">
                            Attention : valide seulement 6 mois !
                        </p>
                    </div>
                    <div className="max-w-xs">
                        <label className={labelClass}>Date du diagnostic</label>
                        <input
                            type="date"
                            value={erpDate}
                            onChange={(e) => setErpDate(e.target.value)}
                            disabled={isLoading}
                            className={inputClass}
                        />
                    </div>
                </div>

                <hr className="border-neutral-200" />

                {/* Plomb (CREP) */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-neutral-700">Plomb (CREP)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Date du diagnostic</label>
                            <input
                                type="date"
                                value={leadDiagnosticDate}
                                onChange={(e) => setLeadDiagnosticDate(e.target.value)}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Résultat</label>
                            <select
                                value={leadDiagnosticResult}
                                onChange={(e) => setLeadDiagnosticResult(e.target.value)}
                                disabled={isLoading}
                                className={selectClass}
                            >
                                <option value="">-- Sélectionner --</option>
                                <option value="POSITIF">Positif (présence de plomb)</option>
                                <option value="NEGATIF">Négatif (absence de plomb)</option>
                                <option value="NON_APPLICABLE">Non applicable</option>
                            </select>
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-200" />

                {/* Amiante */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-neutral-700">Amiante</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Date du diagnostic</label>
                            <input
                                type="date"
                                value={asbestosDiagnosticDate}
                                onChange={(e) => setAsbestosDiagnosticDate(e.target.value)}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Résultat</label>
                            <select
                                value={asbestosDiagnosticResult}
                                onChange={(e) => setAsbestosDiagnosticResult(e.target.value)}
                                disabled={isLoading}
                                className={selectClass}
                            >
                                <option value="">-- Sélectionner --</option>
                                <option value="POSITIF">Positif (présence d&apos;amiante)</option>
                                <option value="NEGATIF">Négatif (absence d&apos;amiante)</option>
                                <option value="NON_APPLICABLE">Non applicable</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSave}
            />
        </div>
    );
};

export default EnergyDiagnosticsSection;
