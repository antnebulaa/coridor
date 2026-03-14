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
import { useTranslations } from 'next-intl';
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
    const t = useTranslations('properties');
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
            toast.custom((toastData) => (
                <CustomToast
                    t={toastData}
                    message={t('edit.legal.saved')}
                    type="success"
                />
            ));
            router.refresh();
        } catch (error) {
            console.error('Failed to save legal info:', error);
            toast.custom((toastData) => (
                <CustomToast
                    t={toastData}
                    message={t('edit.legal.error')}
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
                    <h3 className="font-medium text-neutral-800">{t('edit.legal.legalRegime')}</h3>
                </div>
                <div>
                    <label className={labelClass}>{t('edit.legal.propertyOwnershipType')}</label>
                    <select
                        value={legalRegime}
                        onChange={(e) => setLegalRegime(e.target.value)}
                        disabled={isLoading}
                        className={selectClass}
                    >
                        <option value="">{t('edit.legal.select')}</option>
                        <option value="COPROPRIETE">{t('edit.legal.copropriete')}</option>
                        <option value="MONOPROPRIETE">{t('edit.legal.monopropriete')}</option>
                    </select>
                </div>
            </div>

            {/* --- Annexes du logement --- */}
            <div className="border border-neutral-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Warehouse size={18} className="text-neutral-600" />
                    <h3 className="font-medium text-neutral-800">{t('edit.legal.annexes')}</h3>
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
                        <span className="text-sm text-neutral-700">{t('edit.legal.cave')}</span>
                    </div>
                    {hasCave && (
                        <div className="ml-14">
                            <label className={labelClass}>{t('edit.legal.caveReference')}</label>
                            <input
                                type="text"
                                value={caveReference}
                                onChange={(e) => setCaveReference(e.target.value)}
                                disabled={isLoading}
                                placeholder={t('edit.legal.cavePlaceholder')}
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
                        <span className="text-sm text-neutral-700">{t('edit.legal.parking')}</span>
                    </div>
                    {hasParking && (
                        <div className="ml-14">
                            <label className={labelClass}>{t('edit.legal.parkingReference')}</label>
                            <input
                                type="text"
                                value={parkingReference}
                                onChange={(e) => setParkingReference(e.target.value)}
                                disabled={isLoading}
                                placeholder={t('edit.legal.parkingPlaceholder')}
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
                        <span className="text-sm text-neutral-700">{t('edit.legal.garage')}</span>
                    </div>
                    {hasGarage && (
                        <div className="ml-14">
                            <label className={labelClass}>{t('edit.legal.garageReference')}</label>
                            <input
                                type="text"
                                value={garageReference}
                                onChange={(e) => setGarageReference(e.target.value)}
                                disabled={isLoading}
                                placeholder={t('edit.legal.garagePlaceholder')}
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
                    <h3 className="font-medium text-neutral-800">{t('edit.legal.zoneTendue')}</h3>
                </div>

                {detectedZoneTendue ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                        <span className="text-sm font-medium text-green-700">
                            {t('edit.legal.zoneTendueDetected')}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                        <span className="text-sm text-neutral-500">
                            {t('edit.legal.zoneTendueNot')}
                        </span>
                    </div>
                )}

                {isZoneTendue && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700">
                                {t('edit.legal.zoneTendueInfo')}
                            </p>
                        </div>

                        {/* Zone selector for cities that require it */}
                        {rentControlInfo?.zoneRequired && (
                            <div>
                                <label className={labelClass}>
                                    {t('edit.legal.rentControlZone', { territory: rentControlInfo.territory ?? '' })}
                                </label>
                                <select
                                    value={rentControlZone}
                                    onChange={(e) => setRentControlZone(e.target.value)}
                                    disabled={isLoading}
                                    className={selectClass}
                                >
                                    <option value="">{t('edit.legal.selectZone')}</option>
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
                                        {t('edit.legal.selectZoneHint')}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Auto-filled rent info from official data */}
                        {rentControlInfo?.referenceRent && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-green-700">
                                    {t('edit.legal.officialData', { territory: rentControlInfo.territory ?? '', reference: rentControlInfo.referenceRent ?? 0, max: rentControlInfo.referenceRentMax ?? 0, min: rentControlInfo.referenceRentMin ?? 0 })}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('edit.legal.referenceRent')}</label>
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
                                <label className={labelClass}>{t('edit.legal.referenceRentIncreased')}</label>
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
                                <label className={labelClass}>{t('edit.legal.rentSupplement')}</label>
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
                                <label className={labelClass}>{t('edit.legal.previousRent')}</label>
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
                                    {t('edit.legal.rentSupplementJustificationLabel')}
                                </label>
                                <textarea
                                    value={rentSupplementJustification}
                                    onChange={(e) => setRentSupplementJustification(e.target.value)}
                                    disabled={isLoading}
                                    placeholder={t('edit.legal.rentSupplementJustificationPlaceholder')}
                                    rows={3}
                                    className={inputClass}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    {t('edit.legal.rentSupplementJustificationHelper')}
                                </p>
                            </div>
                        )}

                        <div className="max-w-xs">
                            <label className={labelClass}>{t('edit.legal.previousRentDate')}</label>
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
                    <h3 className="font-medium text-neutral-800">{t('edit.legal.landlordQuality')}</h3>
                </div>

                <div>
                    <label className={labelClass}>{t('edit.legal.landlordLegalStatus')}</label>
                    <select
                        value={ownerLegalStatus}
                        onChange={(e) => setOwnerLegalStatus(e.target.value)}
                        disabled={isLoading}
                        className={selectClass}
                    >
                        <option value="">{t('edit.legal.select')}</option>
                        <option value="PERSONNE_PHYSIQUE">{t('edit.legal.personnePhysique')}</option>
                        <option value="SCI">{t('edit.legal.sci')}</option>
                        <option value="PERSONNE_MORALE">{t('edit.legal.personneMorale')}</option>
                    </select>
                </div>

                {(ownerLegalStatus === 'SCI' || ownerLegalStatus === 'PERSONNE_MORALE') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{t('edit.legal.siren')}</label>
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
                            <label className={labelClass}>{t('edit.legal.registeredOffice')}</label>
                            <input
                                type="text"
                                value={ownerSiege}
                                onChange={(e) => setOwnerSiege(e.target.value)}
                                disabled={isLoading}
                                placeholder={t('edit.legal.registeredOfficePlaceholder')}
                                className={inputClass}
                            />
                        </div>
                    </div>
                )}
            </div>

            <EditSectionFooter
                disabled={isLoading}
                label={t('edit.save')}
                onClick={handleSave}
            />
        </div>
    );
};

export default LegalInfoSection;
