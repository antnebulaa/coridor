'use client';

import { useState, useCallback } from "react";
import axios from "axios";
import { SafeUser } from "@/types";
import Container from "@/components/Container";
import FeatureGate from "@/components/subscription/FeatureGate";
import {
    Calculator,
    AlertTriangle,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Loader2,
    Star,
    ArrowLeft,
    Info,
    Download,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
// Mirrors the interfaces from TaxSimulatorService (backend).
// Once the backend is in place, these can be imported from '@/services/TaxSimulatorService'.

interface BienLocatif {
    propertyId?: string;
    typeBail: 'NUE' | 'MEUBLEE';
    loyerAnnuelBrut: number;
    chargesAnnuelles: number;
    interetsEmprunt: number;
    travauxDeductibles: number;
    taxeFonciere: number;
    assurancePNO: number;
    fraisGestion: number;
    chargesCopropriete: number;
    amortissementBien?: number;
    amortissementMobilier?: number;
    amortissementTravaux?: number;
}

interface SimulationInput {
    revenuGlobalAnnuel: number;
    nombreParts: number;
    biens: BienLocatif[];
}

interface RegimeResult {
    nom: string;
    revenuImposable: number;
    impotRevenu: number;
    prelevementsSociaux: number;
    totalImposition: number;
    tauxEffectif: number;
    deficitFoncier?: number;
    deficitReportable?: number;
    eligible: boolean;
    raisonIneligibilite?: string;
}

interface SimulationResult {
    regimes: RegimeResult[];
    regimeOptimal: string;
    economieAnnuelle: number;
    alertes: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatEuro = (amount: number) =>
    amount.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }) + ' \u20AC';

const defaultBien = (): BienLocatif => ({
    typeBail: 'NUE',
    loyerAnnuelBrut: 0,
    chargesAnnuelles: 0,
    interetsEmprunt: 0,
    travauxDeductibles: 0,
    taxeFonciere: 0,
    assurancePNO: 0,
    fraisGestion: 0,
    chargesCopropriete: 0,
    amortissementBien: 0,
    amortissementMobilier: 0,
    amortissementTravaux: 0,
});

// ── Component ────────────────────────────────────────────────────────────────

interface TaxSimulatorClientProps {
    currentUser: SafeUser;
}

const TaxSimulatorClient: React.FC<TaxSimulatorClientProps> = ({ currentUser }) => {
    // ── State ────────────────────────────────────────────────────────────────
    const [view, setView] = useState<'INPUT' | 'RESULT'>('INPUT');

    // Situation du foyer
    const [revenuGlobal, setRevenuGlobal] = useState<number>(0);
    const [nombreParts, setNombreParts] = useState<number>(1);

    // Biens locatifs
    const [biens, setBiens] = useState<BienLocatif[]>([defaultBien()]);

    // Charges accordion open state per bien index
    const [chargesOpen, setChargesOpen] = useState<Record<number, boolean>>({});

    // Result
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreloading, setIsPreloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Bien management ──────────────────────────────────────────────────────

    const addBien = useCallback(() => {
        setBiens(prev => [...prev, defaultBien()]);
    }, []);

    const removeBien = useCallback((index: number) => {
        setBiens(prev => prev.filter((_, i) => i !== index));
        setChargesOpen(prev => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    }, []);

    const updateBien = useCallback((index: number, field: keyof BienLocatif, value: string | number) => {
        setBiens(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
    }, []);

    const toggleCharges = useCallback((index: number) => {
        setChargesOpen(prev => ({ ...prev, [index]: !prev[index] }));
    }, []);

    // ── Pre-fill from Coridor properties ─────────────────────────────────────

    const handlePreFill = useCallback(async () => {
        setIsPreloading(true);
        setError(null);
        try {
            const res = await axios.get('/api/tax-simulator');
            const prefilled: BienLocatif[] = res.data.biens;
            if (prefilled && prefilled.length > 0) {
                setBiens(prefilled);
            }
        } catch {
            setError("Impossible de charger vos biens. Veuillez saisir les donnees manuellement.");
        } finally {
            setIsPreloading(false);
        }
    }, []);

    // ── Submit simulation ────────────────────────────────────────────────────

    const handleCalculate = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const input: SimulationInput = {
            revenuGlobalAnnuel: revenuGlobal,
            nombreParts,
            biens,
        };

        try {
            const res = await axios.post('/api/tax-simulator', input);
            setResult(res.data);
            setView('RESULT');
        } catch (err: any) {
            const message = err?.response?.data?.error || "Erreur lors du calcul. Veuillez reessayer.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [revenuGlobal, nombreParts, biens]);

    // ── Number input helper ──────────────────────────────────────────────────

    const NumberInput = ({
        label,
        value,
        onChange,
        suffix = '\u20AC',
        step,
        min,
        helpText,
        placeholder,
    }: {
        label: string;
        value: number;
        onChange: (v: number) => void;
        suffix?: string;
        step?: number;
        min?: number;
        helpText?: string;
        placeholder?: string;
    }) => (
        <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <input
                    type="number"
                    value={value || ''}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    step={step}
                    min={min}
                    placeholder={placeholder || '0'}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
                {suffix && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400 pointer-events-none">
                        {suffix}
                    </span>
                )}
            </div>
            {helpText && (
                <p className="mt-1 text-xs text-neutral-400">{helpText}</p>
            )}
        </div>
    );

    // ── Render: INPUT view ───────────────────────────────────────────────────

    const renderInputView = () => (
        <div className="space-y-6">
            {/* Section: Votre situation */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="font-semibold text-neutral-900 mb-4">Votre situation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput
                        label="Revenus annuels du foyer (hors locatif)"
                        value={revenuGlobal}
                        onChange={setRevenuGlobal}
                        placeholder="ex: 35000"
                    />
                    <NumberInput
                        label="Nombre de parts fiscales"
                        value={nombreParts}
                        onChange={(v) => setNombreParts(Math.max(1, v))}
                        step={0.5}
                        min={1}
                        suffix=""
                        helpText="1 = celibataire, 2 = couple marie/pacse, +0.5 par enfant"
                        placeholder="1"
                    />
                </div>
            </div>

            {/* Section: Vos biens locatifs */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-neutral-900">Vos biens locatifs</h2>
                    {currentUser.userMode === 'LANDLORD' && (
                        <button
                            onClick={handlePreFill}
                            disabled={isPreloading}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition disabled:opacity-50"
                        >
                            {isPreloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Charger depuis mes biens Coridor
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {biens.map((bien, index) => (
                        <div
                            key={index}
                            className="bg-neutral-50 rounded-xl border border-neutral-100 p-5"
                        >
                            {/* Bien header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-neutral-800">
                                    Bien {index + 1}
                                </h3>
                                {biens.length > 1 && (
                                    <button
                                        onClick={() => removeBien(index)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="Supprimer ce bien"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Type bail radio */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Type de location
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => updateBien(index, 'typeBail', 'NUE')}
                                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition border
                                            ${bien.typeBail === 'NUE'
                                                ? 'bg-neutral-900 text-white border-neutral-900'
                                                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                            }`}
                                    >
                                        Location nue
                                    </button>
                                    <button
                                        onClick={() => updateBien(index, 'typeBail', 'MEUBLEE')}
                                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition border
                                            ${bien.typeBail === 'MEUBLEE'
                                                ? 'bg-neutral-900 text-white border-neutral-900'
                                                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                            }`}
                                    >
                                        Meublee
                                    </button>
                                </div>
                            </div>

                            {/* Loyers annuels */}
                            <div className="mb-4">
                                <NumberInput
                                    label="Loyers annuels bruts"
                                    value={bien.loyerAnnuelBrut}
                                    onChange={(v) => updateBien(index, 'loyerAnnuelBrut', v)}
                                    placeholder="ex: 12000"
                                />
                            </div>

                            {/* Charges accordion */}
                            <div className="border border-neutral-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleCharges(index)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-neutral-50 transition"
                                >
                                    <span className="text-sm font-medium text-neutral-700">
                                        Charges deductibles
                                    </span>
                                    {chargesOpen[index] ? (
                                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                                    )}
                                </button>

                                {chargesOpen[index] && (
                                    <div className="px-4 pb-4 pt-2 bg-white space-y-3">
                                        <NumberInput
                                            label="Taxe fonciere"
                                            value={bien.taxeFonciere}
                                            onChange={(v) => updateBien(index, 'taxeFonciere', v)}
                                        />
                                        <NumberInput
                                            label="Interets emprunt"
                                            value={bien.interetsEmprunt}
                                            onChange={(v) => updateBien(index, 'interetsEmprunt', v)}
                                        />
                                        <NumberInput
                                            label="Assurance PNO"
                                            value={bien.assurancePNO}
                                            onChange={(v) => updateBien(index, 'assurancePNO', v)}
                                        />
                                        <NumberInput
                                            label="Travaux (reparation, entretien, amelioration)"
                                            value={bien.travauxDeductibles}
                                            onChange={(v) => updateBien(index, 'travauxDeductibles', v)}
                                        />
                                        <NumberInput
                                            label="Charges copropriete"
                                            value={bien.chargesCopropriete}
                                            onChange={(v) => updateBien(index, 'chargesCopropriete', v)}
                                        />
                                        <NumberInput
                                            label="Frais de gestion"
                                            value={bien.fraisGestion}
                                            onChange={(v) => updateBien(index, 'fraisGestion', v)}
                                        />

                                        {/* Amortissements (meuble uniquement) */}
                                        {bien.typeBail === 'MEUBLEE' && (
                                            <div className="mt-4 pt-4 border-t border-neutral-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <h4 className="text-sm font-medium text-neutral-700">
                                                        Amortissements (meuble)
                                                    </h4>
                                                    <div className="group relative">
                                                        <Info className="w-3.5 h-3.5 text-neutral-400 cursor-help" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50">
                                                            En LMNP reel, vous pouvez amortir la valeur du bien (hors terrain), du mobilier et des travaux d&apos;amelioration. L&apos;amortissement ne peut pas creer de deficit.
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <NumberInput
                                                        label="Amortissement du bien (annuel)"
                                                        value={bien.amortissementBien || 0}
                                                        onChange={(v) => updateBien(index, 'amortissementBien', v)}
                                                        helpText="Environ 2-3% de la valeur du bien (hors terrain) par an"
                                                    />
                                                    <NumberInput
                                                        label="Amortissement du mobilier (annuel)"
                                                        value={bien.amortissementMobilier || 0}
                                                        onChange={(v) => updateBien(index, 'amortissementMobilier', v)}
                                                        helpText="Environ 10-20% de la valeur du mobilier par an"
                                                    />
                                                    <NumberInput
                                                        label="Amortissement travaux (annuel)"
                                                        value={bien.amortissementTravaux || 0}
                                                        onChange={(v) => updateBien(index, 'amortissementTravaux', v)}
                                                        helpText="Travaux immobilises amortis sur 10-15 ans"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add bien button */}
                <button
                    onClick={addBien}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-neutral-200 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 transition"
                >
                    <Plus className="w-4 h-4" />
                    Ajouter un bien
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Calculate button */}
            <button
                onClick={handleCalculate}
                disabled={isLoading}
                className="w-full py-3.5 bg-neutral-900 text-white rounded-xl text-sm font-semibold hover:bg-neutral-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Calcul en cours...
                    </>
                ) : (
                    <>
                        <Calculator className="w-5 h-5" />
                        Calculer
                    </>
                )}
            </button>
        </div>
    );

    // ── Render: RESULT view ──────────────────────────────────────────────────

    const renderResultView = () => {
        if (!result) return null;

        const eligibleRegimes = result.regimes.filter(r => r.eligible);
        const ineligibleRegimes = result.regimes.filter(r => !r.eligible);
        const totalLoyersBruts = biens.reduce((sum, b) => sum + b.loyerAnnuelBrut, 0);

        return (
            <div className="space-y-6">
                {/* Optimal regime banner */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <Star className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                        <p className="font-semibold text-green-900">
                            Regime optimal : {result.regimeOptimal}
                        </p>
                        <p className="text-sm text-green-700">
                            Economie de {formatEuro(result.economieAnnuelle)}/an par rapport au regime le moins favorable
                        </p>
                    </div>
                </div>

                {/* Regime cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {eligibleRegimes.map((regime) => {
                        const isOptimal = regime.nom === result.regimeOptimal;

                        return (
                            <div
                                key={regime.nom}
                                className={`bg-white rounded-2xl p-6 border-2 transition ${
                                    isOptimal
                                        ? 'border-green-400 shadow-sm'
                                        : 'border-neutral-200'
                                }`}
                            >
                                {/* Card header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-neutral-900">
                                        {regime.nom}
                                    </h3>
                                    {isOptimal && (
                                        <span className="px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                                            Recommande
                                        </span>
                                    )}
                                </div>

                                {/* Card content */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                                        <span className="text-sm text-neutral-500">Base imposable</span>
                                        <span className="text-sm font-semibold text-neutral-900">
                                            {formatEuro(regime.revenuImposable)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                                        <span className="text-sm text-neutral-500">IR estime</span>
                                        <span className="text-sm font-semibold text-red-600">
                                            {formatEuro(regime.impotRevenu)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                                        <span className="text-sm text-neutral-500">Prelevements sociaux</span>
                                        <span className="text-sm font-semibold text-red-600">
                                            {formatEuro(regime.prelevementsSociaux)}
                                        </span>
                                    </div>
                                    <div className={`flex justify-between items-center py-2.5 rounded-lg px-3 -mx-3 ${
                                        isOptimal ? 'bg-green-50' : 'bg-purple-50'
                                    }`}>
                                        <span className={`text-sm font-semibold ${
                                            isOptimal ? 'text-green-800' : 'text-purple-800'
                                        }`}>
                                            Total imposition
                                        </span>
                                        <span className={`text-lg font-bold ${
                                            isOptimal ? 'text-green-700' : 'text-purple-700'
                                        }`}>
                                            {formatEuro(regime.totalImposition)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-neutral-500">Taux effectif</span>
                                        <span className="text-sm font-semibold text-neutral-700">
                                            {totalLoyersBruts > 0
                                                ? (regime.tauxEffectif * 100).toFixed(1) + ' %'
                                                : '- %'
                                            }
                                        </span>
                                    </div>

                                    {/* Deficit info */}
                                    {regime.deficitFoncier !== undefined && regime.deficitFoncier > 0 && (
                                        <div className="mt-2 p-3 bg-amber-50 rounded-lg">
                                            <p className="text-xs font-medium text-amber-800">
                                                Deficit foncier : {formatEuro(regime.deficitFoncier)}
                                            </p>
                                            {regime.deficitReportable !== undefined && regime.deficitReportable > 0 && (
                                                <p className="text-xs text-amber-700 mt-1">
                                                    Dont {formatEuro(regime.deficitReportable)} reportable sur 10 ans
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Ineligible regime cards */}
                    {ineligibleRegimes.map((regime) => (
                        <div
                            key={regime.nom}
                            className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200 opacity-60"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-neutral-500">
                                    {regime.nom}
                                </h3>
                                <span className="px-2.5 py-1 text-xs font-medium text-neutral-500 bg-neutral-200 rounded-full">
                                    Non eligible
                                </span>
                            </div>
                            <p className="text-sm text-neutral-400">
                                {regime.raisonIneligibilite || "Vous n'etes pas eligible a ce regime."}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Alerts section */}
                {result.alertes.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <h3 className="font-semibold text-amber-900">Points d&apos;attention</h3>
                        </div>
                        <ul className="space-y-2">
                            {result.alertes.map((alerte, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-amber-500 mt-1 shrink-0">&bull;</span>
                                    <span className="text-sm text-amber-800">{alerte}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Information importante</p>
                        <p className="text-sm text-amber-700 mt-1">
                            Simulation indicative &mdash; ne constitue pas un conseil fiscal.
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                            Bareme IR 2026 (revenus 2025).
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                            Consultez un expert-comptable pour votre situation personnelle.
                        </p>
                    </div>
                </div>

                {/* Back button */}
                <button
                    onClick={() => setView('INPUT')}
                    className="w-full py-3.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-semibold hover:bg-neutral-50 transition flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Modifier les donnees
                </button>
            </div>
        );
    };

    // ── Main render ──────────────────────────────────────────────────────────

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
                            Simulateur fiscal
                        </h1>
                        <p className="text-sm text-neutral-500">
                            Comparez les regimes fiscaux pour vos revenus locatifs
                        </p>
                    </div>
                </div>

                {/* Feature Gate */}
                <FeatureGate featureKey="TAX_SIMULATOR">
                    {view === 'INPUT' ? renderInputView() : renderResultView()}
                </FeatureGate>
            </div>
        </Container>
    );
};

export default TaxSimulatorClient;
