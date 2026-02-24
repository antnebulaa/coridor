'use client';

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
    Scale,
    Building2,
    Warehouse,
    MapPin,
    Info,
    CheckCircle2,
} from 'lucide-react';
import { SafeListing } from '@/types';
import EditSectionFooter from './EditSectionFooter';
import CustomToast from '@/components/ui/CustomToast';
import { checkZoneTendue } from '@/lib/zoneTendue';
import { lookupRentControl } from '@/lib/rentControl';

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

    // --- Annexes ---
    const [hasCave, setHasCave] = useState(property?.hasCave ?? false);
    const [caveReference, setCaveReference] = useState(property?.caveReference || '');
    const [hasParking, setHasParking] = useState(property?.hasParking ?? false);
    const [parkingReference, setParkingReference] = useState(property?.parkingReference || '');
    const [hasGarage, setHasGarage] = useState(property?.hasGarage ?? false);
    const [garageReference, setGarageReference] = useState(property?.garageReference || '');

    // --- Zone tendue (auto-detected with city for disambiguation) ---
    const detectedZoneTendue = checkZoneTendue(property?.zipCode, property?.city);
    const isZoneTendue = detectedZoneTendue || (property?.isZoneTendue ?? false);
    const [referenceRent, setReferenceRent] = useState<number | ''>(property?.referenceRent ?? '');
    const [referenceRentIncreased, setReferenceRentIncreased] = useState<number | ''>(property?.referenceRentIncreased ?? '');
    const [rentSupplement, setRentSupplement] = useState<number | ''>(property?.rentSupplement ?? '');
    const [rentSupplementJustification, setRentSupplementJustification] = useState(
        (property as any)?.rentSupplementJustification || ''
    );
    const [previousRent, setPreviousRent] = useState<number | ''>(property?.previousRent ?? '');
    const [previousRentDate, setPreviousRentDate] = useState(toInputDate((property as any)?.previousRentDate));

    // --- Rent control zone selection (Lyon, Montpellier, Grenoble, Bordeaux) ---
    const [rentControlZone, setRentControlZone] = useState((property as any)?.rentControlZone || '');
    const rentControlInfo = isZoneTendue && property?.city && property?.zipCode
        ? lookupRentControl({
            city: property.city,
            zipCode: property.zipCode,
            roomCount: 1,
            buildYear: 2000,
            isFurnished: false,
            surface: 1,
            rentControlZone: rentControlZone || undefined,
        })
        : null;

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
                rentSupplementJustification: rentSupplementJustification || null,
                previousRent: previousRent || null,
                previousRentDate: previousRentDate || null,
                rentControlZone: rentControlZone || null,
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
        legalRegime,
        hasCave, caveReference, hasParking, parkingReference, hasGarage, garageReference,
        isZoneTendue, referenceRent, referenceRentIncreased, rentSupplement, rentSupplementJustification, previousRent, previousRentDate, rentControlZone,
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

                {detectedZoneTendue ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                        <span className="text-sm font-medium text-green-700">
                            Zone tendue detectee automatiquement
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                        <span className="text-sm text-neutral-500">
                            Ce bien n&apos;est pas situe en zone tendue
                        </span>
                    </div>
                )}

                {isZoneTendue && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700">
                                En zone tendue, l&apos;encadrement des loyers s&apos;applique. Renseignez les informations ci-dessous pour la generation du bail.
                            </p>
                        </div>

                        {/* Zone selector for cities that require it */}
                        {rentControlInfo?.zoneRequired && (
                            <div>
                                <label className={labelClass}>
                                    Zone d&apos;encadrement ({rentControlInfo.territory})
                                </label>
                                <select
                                    value={rentControlZone}
                                    onChange={(e) => setRentControlZone(e.target.value)}
                                    disabled={isLoading}
                                    className={selectClass}
                                >
                                    <option value="">-- Selectionnez votre zone --</option>
                                    {rentControlInfo.availableZones?.map((z) => (
                                        <option key={z} value={z}>
                                            Zone {z}
                                            {rentControlInfo.zoneDescriptions?.[z]
                                                ? ` — ${rentControlInfo.zoneDescriptions[z]}`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                                {!rentControlZone && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        Selectionnez votre zone pour obtenir les loyers de reference.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Auto-filled rent info from official data */}
                        {rentControlInfo?.referenceRent && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-green-700">
                                    Donnees officielles ({rentControlInfo.territory}) : ref. {rentControlInfo.referenceRent} EUR/m2,
                                    majore {rentControlInfo.referenceRentMax} EUR/m2,
                                    minore {rentControlInfo.referenceRentMin} EUR/m2.
                                </p>
                            </div>
                        )}

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

                        {/* Justification required by law when rent supplement > 0 */}
                        {rentSupplement !== '' && Number(rentSupplement) > 0 && (
                            <div>
                                <label className={labelClass}>
                                    Justification du complement de loyer
                                </label>
                                <textarea
                                    value={rentSupplementJustification}
                                    onChange={(e) => setRentSupplementJustification(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Decrivez les caracteristiques exceptionnelles justifiant le complement de loyer (ex: terrasse, vue, equipements haut de gamme...)"
                                    rows={3}
                                    className={inputClass}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Obligatoire legalement (art. 140 VI loi ELAN). Le complement doit etre justifie par des caracteristiques exceptionnelles du logement.
                                </p>
                            </div>
                        )}

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
