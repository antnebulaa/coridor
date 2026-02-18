'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    Scale,
    Building2,
    Droplets,
    Warehouse,
    MapPin,
    ShieldCheck,
    Loader2,
    Info,
} from 'lucide-react';
import { SafeListing } from '@/types';
import EditSectionFooter from './EditSectionFooter';
import CustomToast from '@/components/ui/CustomToast';

interface LegalInfoSectionProps {
    listing: SafeListing;
}

function toInputDate(dateStr?: string | Date | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

const LegalInfoSection: React.FC<LegalInfoSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const property = listing.rentalUnit?.property;
    const propertyId = property?.id;

    // --- Regime juridique ---
    const [legalRegime, setLegalRegime] = useState(property?.legalRegime || '');

    // --- Production d'eau chaude ---
    const [waterHeatingSystem, setWaterHeatingSystem] = useState(property?.waterHeatingSystem || '');

    // --- Annexes ---
    const [hasCave, setHasCave] = useState(property?.hasCave ?? false);
    const [caveReference, setCaveReference] = useState(property?.caveReference || '');
    const [hasParking, setHasParking] = useState(property?.hasParking ?? false);
    const [parkingReference, setParkingReference] = useState(property?.parkingReference || '');
    const [hasGarage, setHasGarage] = useState(property?.hasGarage ?? false);
    const [garageReference, setGarageReference] = useState(property?.garageReference || '');

    // --- Zone tendue ---
    const [isZoneTendue, setIsZoneTendue] = useState(property?.isZoneTendue ?? false);
    const [referenceRent, setReferenceRent] = useState<number | ''>(property?.referenceRent ?? '');
    const [referenceRentIncreased, setReferenceRentIncreased] = useState<number | ''>(property?.referenceRentIncreased ?? '');
    const [rentSupplement, setRentSupplement] = useState<number | ''>(property?.rentSupplement ?? '');
    const [previousRent, setPreviousRent] = useState<number | ''>(property?.previousRent ?? '');
    const [previousRentDate, setPreviousRentDate] = useState(toInputDate((property as any)?.previousRentDate));

    // --- Diagnostics complementaires ---
    const [leadDiagnosticDate, setLeadDiagnosticDate] = useState(toInputDate((property as any)?.leadDiagnosticDate));
    const [leadDiagnosticResult, setLeadDiagnosticResult] = useState((property as any)?.leadDiagnosticResult || '');
    const [asbestosDiagnosticDate, setAsbestosDiagnosticDate] = useState(toInputDate((property as any)?.asbestosDiagnosticDate));
    const [asbestosDiagnosticResult, setAsbestosDiagnosticResult] = useState((property as any)?.asbestosDiagnosticResult || '');

    // --- Qualite du bailleur ---
    const [ownerLegalStatus, setOwnerLegalStatus] = useState(property?.ownerLegalStatus || '');
    const [ownerSiren, setOwnerSiren] = useState(property?.ownerSiren || '');
    const [ownerSiege, setOwnerSiege] = useState(property?.ownerSiege || '');

    const handleSave = useCallback(async () => {
        if (!propertyId) return;
        setIsLoading(true);
        try {
            await axios.patch(`/api/properties/${propertyId}/legal`, {
                legalRegime: legalRegime || null,
                waterHeatingSystem: waterHeatingSystem || null,
                hasCave,
                caveReference: caveReference || null,
                hasParking,
                parkingReference: parkingReference || null,
                hasGarage,
                garageReference: garageReference || null,
                isZoneTendue,
                referenceRent: referenceRent || null,
                referenceRentIncreased: referenceRentIncreased || null,
                rentSupplement: rentSupplement || null,
                previousRent: previousRent || null,
                previousRentDate: previousRentDate || null,
                leadDiagnosticDate: leadDiagnosticDate || null,
                leadDiagnosticResult: leadDiagnosticResult || null,
                asbestosDiagnosticDate: asbestosDiagnosticDate || null,
                asbestosDiagnosticResult: asbestosDiagnosticResult || null,
                ownerLegalStatus: ownerLegalStatus || null,
                ownerSiren: ownerSiren || null,
                ownerSiege: ownerSiege || null,
            });
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Informations legales mises a jour"
                    type="success"
                />
            ));
            router.refresh();
        } catch (error) {
            console.error('Failed to save legal info:', error);
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la sauvegarde"
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
        }
    }, [
        propertyId, router,
        legalRegime, waterHeatingSystem,
        hasCave, caveReference, hasParking, parkingReference, hasGarage, garageReference,
        isZoneTendue, referenceRent, referenceRentIncreased, rentSupplement, previousRent, previousRentDate,
        leadDiagnosticDate, leadDiagnosticResult, asbestosDiagnosticDate, asbestosDiagnosticResult,
        ownerLegalStatus, ownerSiren, ownerSiege,
    ]);

    const inputClass = "w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent";
    const selectClass = "w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white appearance-none";
    const labelClass = "block text-sm font-medium text-neutral-700 mb-1";

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-0">
            {/* --- Regime juridique --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Scale size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Regime juridique</h3>
                </div>
                <div>
                    <label className={labelClass}>Type de propriete</label>
                    <select
                        value={legalRegime}
                        onChange={(e) => setLegalRegime(e.target.value)}
                        disabled={isLoading}
                        className={selectClass}
                    >
                        <option value="">-- Selectionner --</option>
                        <option value="COPROPRIETE">Copropriete</option>
                        <option value="MONOPROPRIETE">Monopropriete</option>
                    </select>
                </div>
            </div>

            {/* --- Production d'eau chaude --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Droplets size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Production d&apos;eau chaude</h3>
                </div>
                <div>
                    <label className={labelClass}>Systeme de production</label>
                    <select
                        value={waterHeatingSystem}
                        onChange={(e) => setWaterHeatingSystem(e.target.value)}
                        disabled={isLoading}
                        className={selectClass}
                    >
                        <option value="">-- Selectionner --</option>
                        <option value="IND_ELEC">Individuel electrique</option>
                        <option value="COL_GAZ">Collectif gaz</option>
                        <option value="COL_FIO">Collectif fioul</option>
                        <option value="IND_GAZ">Individuel gaz</option>
                        <option value="COL">Collectif (autre)</option>
                        <option value="IND">Individuel (autre)</option>
                    </select>
                </div>
            </div>

            {/* --- Annexes du logement --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Warehouse size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Annexes du logement</h3>
                </div>

                {/* Cave */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setHasCave(!hasCave)}
                            disabled={isLoading}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                                hasCave ? 'bg-neutral-900' : 'bg-neutral-300'
                            }`}
                        >
                            <span
                                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    hasCave ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                }`}
                            />
                        </button>
                        <span className="text-sm text-neutral-700">Cave</span>
                    </div>
                    {hasCave && (
                        <div className="ml-14">
                            <label className={labelClass}>Reference de la cave</label>
                            <input
                                type="text"
                                value={caveReference}
                                onChange={(e) => setCaveReference(e.target.value)}
                                disabled={isLoading}
                                placeholder="Ex: Cave n 3, sous-sol 1"
                                className={inputClass}
                            />
                        </div>
                    )}
                </div>

                {/* Parking */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setHasParking(!hasParking)}
                            disabled={isLoading}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                                hasParking ? 'bg-neutral-900' : 'bg-neutral-300'
                            }`}
                        >
                            <span
                                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    hasParking ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                }`}
                            />
                        </button>
                        <span className="text-sm text-neutral-700">Place de parking</span>
                    </div>
                    {hasParking && (
                        <div className="ml-14">
                            <label className={labelClass}>Reference du parking</label>
                            <input
                                type="text"
                                value={parkingReference}
                                onChange={(e) => setParkingReference(e.target.value)}
                                disabled={isLoading}
                                placeholder="Ex: Place n 12, niveau -1"
                                className={inputClass}
                            />
                        </div>
                    )}
                </div>

                {/* Garage */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setHasGarage(!hasGarage)}
                            disabled={isLoading}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                                hasGarage ? 'bg-neutral-900' : 'bg-neutral-300'
                            }`}
                        >
                            <span
                                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    hasGarage ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                }`}
                            />
                        </button>
                        <span className="text-sm text-neutral-700">Garage</span>
                    </div>
                    {hasGarage && (
                        <div className="ml-14">
                            <label className={labelClass}>Reference du garage</label>
                            <input
                                type="text"
                                value={garageReference}
                                onChange={(e) => setGarageReference(e.target.value)}
                                disabled={isLoading}
                                placeholder="Ex: Box n 5"
                                className={inputClass}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* --- Zone tendue --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Zone tendue</h3>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsZoneTendue(!isZoneTendue)}
                        disabled={isLoading}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                            isZoneTendue ? 'bg-neutral-900' : 'bg-neutral-300'
                        }`}
                    >
                        <span
                            className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                isZoneTendue ? 'translate-x-[22px]' : 'translate-x-[2px]'
                            }`}
                        />
                    </button>
                    <span className="text-sm text-neutral-700">Ce bien est situe en zone tendue</span>
                </div>

                {isZoneTendue && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700">
                                En zone tendue, l&apos;encadrement des loyers s&apos;applique. Renseignez les informations ci-dessous pour la generation du bail.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Loyer de reference (EUR/m2/mois)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={referenceRent}
                                    onChange={(e) => setReferenceRent(e.target.value ? parseFloat(e.target.value) : '')}
                                    disabled={isLoading}
                                    placeholder="Ex: 26.50"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Loyer de reference majore (EUR/m2/mois)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={referenceRentIncreased}
                                    onChange={(e) => setReferenceRentIncreased(e.target.value ? parseFloat(e.target.value) : '')}
                                    disabled={isLoading}
                                    placeholder="Ex: 31.80"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Complement de loyer (EUR)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={rentSupplement}
                                    onChange={(e) => setRentSupplement(e.target.value ? parseFloat(e.target.value) : '')}
                                    disabled={isLoading}
                                    placeholder="0"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Dernier loyer applique (EUR)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={previousRent}
                                    onChange={(e) => setPreviousRent(e.target.value ? parseFloat(e.target.value) : '')}
                                    disabled={isLoading}
                                    placeholder="Ex: 850"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="max-w-xs">
                            <label className={labelClass}>Date du dernier loyer</label>
                            <input
                                type="date"
                                value={previousRentDate}
                                onChange={(e) => setPreviousRentDate(e.target.value)}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* --- Diagnostics complementaires --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Diagnostics complementaires</h3>
                </div>

                {/* Plomb (CREP) */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-neutral-600">Plomb (CREP)</h4>
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
                            <label className={labelClass}>Resultat</label>
                            <select
                                value={leadDiagnosticResult}
                                onChange={(e) => setLeadDiagnosticResult(e.target.value)}
                                disabled={isLoading}
                                className={selectClass}
                            >
                                <option value="">-- Selectionner --</option>
                                <option value="POSITIF">Positif (presence de plomb)</option>
                                <option value="NEGATIF">Negatif (absence de plomb)</option>
                                <option value="NON_APPLICABLE">Non applicable</option>
                            </select>
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-200" />

                {/* Amiante */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-neutral-600">Amiante</h4>
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
                            <label className={labelClass}>Resultat</label>
                            <select
                                value={asbestosDiagnosticResult}
                                onChange={(e) => setAsbestosDiagnosticResult(e.target.value)}
                                disabled={isLoading}
                                className={selectClass}
                            >
                                <option value="">-- Selectionner --</option>
                                <option value="POSITIF">Positif (presence d&apos;amiante)</option>
                                <option value="NEGATIF">Negatif (absence d&apos;amiante)</option>
                                <option value="NON_APPLICABLE">Non applicable</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Qualite du bailleur --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">Qualite du bailleur</h3>
                </div>

                <div>
                    <label className={labelClass}>Statut juridique du bailleur</label>
                    <select
                        value={ownerLegalStatus}
                        onChange={(e) => setOwnerLegalStatus(e.target.value)}
                        disabled={isLoading}
                        className={selectClass}
                    >
                        <option value="">-- Selectionner --</option>
                        <option value="PERSONNE_PHYSIQUE">Personne physique</option>
                        <option value="SCI">SCI (Societe Civile Immobiliere)</option>
                        <option value="PERSONNE_MORALE">Personne morale (autre)</option>
                    </select>
                </div>

                {(ownerLegalStatus === 'SCI' || ownerLegalStatus === 'PERSONNE_MORALE') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Numero SIREN</label>
                            <input
                                type="text"
                                value={ownerSiren}
                                onChange={(e) => setOwnerSiren(e.target.value)}
                                disabled={isLoading}
                                placeholder="Ex: 123 456 789"
                                maxLength={11}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Siege social</label>
                            <input
                                type="text"
                                value={ownerSiege}
                                onChange={(e) => setOwnerSiege(e.target.value)}
                                disabled={isLoading}
                                placeholder="Adresse du siege social"
                                className={inputClass}
                            />
                        </div>
                    </div>
                )}
            </div>

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSave}
            />
        </div>
    );
};

export default LegalInfoSection;
