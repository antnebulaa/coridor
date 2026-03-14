'use client';

import { useState, useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { useTranslations } from "next-intl";
import { SafeListing, SafeUser } from "@/types";
import CustomToast from "@/components/ui/CustomToast";
import Counter from "@/components/inputs/Counter";
import SoftInput from "@/components/inputs/SoftInput";
import SoftSelect from "@/components/inputs/SoftSelect";
import EditSectionFooter from "./EditSectionFooter";

interface CategorySectionProps {
    listing: SafeListing;
    currentUser: SafeUser;
    isRoom?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({ listing, currentUser, isRoom }) => {
    const router = useRouter();
    const t = useTranslations('properties');
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues: {
            category: listing.category,
            hasPrivateBathroom: (listing as any).hasPrivateBathroom || false,
            // rentalUnitType: listing.rentalUnitType || 'ENTIRE_PLACE', // Removed
            isFurnished: listing.isFurnished,
            surface: listing.surface,
            surfaceUnit: listing.surfaceUnit || currentUser.measurementSystem || 'metric',
            roomCount: listing.roomCount,
            guestCount: listing.guestCount,
            bathroomCount: listing.bathroomCount,
            kitchenType: listing.kitchenType,
            totalFloors: listing.totalFloors,
            floor: listing.floor,
            buildYear: listing.buildYear,
            propertyAdjective: listing.propertyAdjective,
            propertySubType: (listing as any).propertySubType || '',
        }
    });

    const category = watch('category');
    // const rentalUnitType = watch('rentalUnitType'); // Removed
    const propertyAdjective = watch('propertyAdjective');
    const isFurnished = watch('isFurnished');
    const surfaceUnit = watch('surfaceUnit');
    const kitchenType = watch('kitchenType');
    const roomCount = watch('roomCount');
    const guestCount = watch('guestCount');
    const bathroomCount = watch('bathroomCount');
    const totalFloors = watch('totalFloors');
    const floor = watch('floor');
    // Explicit watchers for SoftInput fields to ensure controlled updates
    const surface = watch('surface');
    const buildYear = watch('buildYear');

    const isRoomMode = isRoom; // rentalUnitType !== 'ENTIRE_PLACE';

    // Clamp floor to totalFloors when totalFloors decreases
    useEffect(() => {
        if (totalFloors != null && floor != null && floor > totalFloors) {
            setValue('floor', totalFloors, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
    }, [totalFloors, floor, setValue]);

    const setCustomValue = (id: string, value: any) => {
        setValue(id, value, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
        })
    }

    // ------------------------

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.put(`/api/listings/${listing.id}`, data)
            .then(() => {
                toast.custom((toastData) => (
                    <CustomToast
                        t={toastData}
                        message={t('edit.category.saved')}
                        type="success"
                    />
                ));
                router.refresh();
            })
            .catch(() => {
                toast.custom((toastData) => (
                    <CustomToast
                        t={toastData}
                        message={t('edit.category.error')}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-24">
            {/* Type de bien */}
            {!isRoom && (
                <div className="flex flex-col gap-2">
                    <SoftSelect
                        id="category"
                        label={t('edit.category.propertyType')}
                        value={category}
                        onChange={(e) => setCustomValue('category', e.target.value)}
                        disabled={isLoading}
                        options={[
                            { value: "Maison", label: t('edit.category.house') },
                            { value: "Appartement", label: t('edit.category.apartment') },
                            { value: "Bateau", label: t('edit.category.boat') }
                        ]}
                    />
                </div>
            )}

            {/* Sous-type de propriété */}
            {!isRoom && category === 'Appartement' && (
                <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-neutral-800">
                        {t('edit.category.apartmentType')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: '', label: t('edit.category.subTypes.standard') },
                            { value: 'duplex', label: t('edit.category.subTypes.duplex') },
                            { value: 'triplex', label: t('edit.category.subTypes.triplex') },
                            { value: 'loft', label: t('edit.category.subTypes.loft') },
                            { value: 'penthouse', label: t('edit.category.subTypes.penthouse') },
                            { value: 'mansarde', label: t('edit.category.subTypes.mansarde') },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setCustomValue('propertySubType', opt.value || null)}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition
                                    ${(watch('propertySubType') || '') === opt.value
                                        ? 'bg-neutral-900 text-white border-neutral-900'
                                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Adjectif du bien */}
            {!isRoom && (
                <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-neutral-800">
                        {t('edit.category.adjectiveTitle')}
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">
                        {t('edit.category.adjectiveHelper')}
                    </div>
                    <SoftSelect
                        id="propertyAdjective"
                        label={t('edit.category.adjectiveLabel')}
                        value={propertyAdjective || ""}
                        onChange={(e) => setCustomValue('propertyAdjective', e.target.value)}
                        disabled={isLoading}
                        options={[
                            // Lumière/Espace
                            { value: "Lumineux", label: t('edit.category.adjectives.lumineux') },
                            { value: "Spacieux", label: t('edit.category.adjectives.spacieux') },
                            { value: "Traversant", label: t('edit.category.adjectives.traversant') },
                            { value: "Ensoleillé", label: t('edit.category.adjectives.ensoleille') },
                            // Style/Architecture
                            { value: "Haussmannien", label: t('edit.category.adjectives.haussmannien') },
                            { value: "Atypique", label: t('edit.category.adjectives.atypique') },
                            { value: "Loft", label: t('edit.category.adjectives.loft') },
                            { value: "Ancien", label: t('edit.category.adjectives.ancien') },
                            { value: "Moderne", label: t('edit.category.adjectives.moderne') },
                            { value: "Neuf", label: t('edit.category.adjectives.neuf') },
                            { value: "Rénové", label: t('edit.category.adjectives.renove') },
                            // Ambiance
                            { value: "Calme", label: t('edit.category.adjectives.calme') },
                            { value: "Cosy", label: t('edit.category.adjectives.cosy') },
                            { value: "De charme", label: t('edit.category.adjectives.charme') },
                            { value: "Familial", label: t('edit.category.adjectives.familial') },
                            { value: "Étudiant", label: t('edit.category.adjectives.etudiant') },
                            // Standing
                            { value: "De standing", label: t('edit.category.adjectives.standing') },
                            { value: "De prestige", label: t('edit.category.adjectives.prestige') },
                        ]}
                    />
                </div>
            )}

            {/* Meublé */}
            <div className="flex flex-col gap-2">
                <SoftSelect
                    id="isFurnished"
                    label={t('edit.category.furnishedQuestion')}
                    value={isFurnished ? 'true' : 'false'}
                    onChange={(e) => setCustomValue('isFurnished', e.target.value === 'true')}
                    disabled={isLoading}
                    options={[
                        { value: "true", label: t('edit.category.furnished') },
                        { value: "false", label: t('edit.category.unfurnished') }
                    ]}
                />
            </div>

            {/* Surface */}
            <div className="flex flex-row gap-2">
                <div className="w-full">
                    <SoftInput
                        id="surface"
                        label={isRoom ? t('edit.category.roomSurface', { unit: surfaceUnit === 'metric' ? 'm²' : 'sq ft' }) : t('edit.category.propertySurface', { unit: surfaceUnit === 'metric' ? 'm²' : 'sq ft' })}
                        type="number"
                        disabled={isLoading}
                        value={surface ?? ''}
                        onChange={(e) => setCustomValue('surface', e.target.value)}
                        errors={errors}
                        required
                    />
                </div>
                <div className="w-[140px]">
                    <SoftSelect
                        id="surfaceUnit"
                        label={t('edit.category.unit')}
                        value={surfaceUnit}
                        onChange={(e) => setCustomValue('surfaceUnit', e.target.value)}
                        disabled={isLoading}
                        options={[
                            { value: "metric", label: "m²" },
                            { value: "imperial", label: "sq ft" }
                        ]}
                    />
                </div>
            </div>

            <hr />

            {/* Pièces */}
            {!isRoomMode && (
                <>
                    <Counter
                        title={t('edit.category.roomCount')}
                        subtitle={t('edit.category.roomCountHelper')}
                        value={roomCount}
                        onChange={(value) => setCustomValue('roomCount', value)}
                    />

                    <hr />
                </>
            )}

            {/* Chambres */}
            {!isRoomMode && (
                <>
                    <Counter
                        title={t('edit.category.bedroomCount')}
                        subtitle={t('edit.category.bedroomCountHelper')}
                        value={guestCount}
                        onChange={(value) => setCustomValue('guestCount', value)}
                        min={0}
                    />

                    <hr />
                </>
            )}

            {/* Salles de bain */}
            {isRoomMode ? (
                <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-col">
                        <div className="font-medium">{t('edit.category.privateBathroom')}</div>
                        <div className="font-light text-gray-600 text-sm">
                            {t('edit.category.privateBathroomHelper')}
                        </div>
                    </div>
                    <div className="flex flex-row items-center gap-3">
                        <div
                            onClick={() => setCustomValue('hasPrivateBathroom', false)}
                            className={`
                                rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition
                                ${watch('hasPrivateBathroom') === false ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}
                            `}
                        >
                            <X size={18} />
                        </div>

                        <div
                            onClick={() => setCustomValue('hasPrivateBathroom', true)}
                            className={`
                                rounded-full w-10 h-10 flex items-center justify-center cursor-pointer transition
                                ${watch('hasPrivateBathroom') === true ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}
                            `}
                        >
                            <Check size={18} />
                        </div>
                    </div>
                </div>
            ) : (
                <Counter
                    title={t('edit.category.bathroomCount')}
                    subtitle=""
                    value={bathroomCount}
                    onChange={(value) => setCustomValue('bathroomCount', value)}
                />
            )}

            <hr />

            {/* Cuisine */}
            <div className="flex flex-col gap-2">
                <SoftSelect
                    id="kitchenType"
                    label={t('edit.category.kitchenQuestion')}
                    value={kitchenType || 'open'}
                    onChange={(e) => setCustomValue('kitchenType', e.target.value)}
                    disabled={isLoading}
                    options={[
                        { value: "separate", label: t('edit.category.kitchenSeparate') },
                        { value: "open", label: t('edit.category.kitchenOpen') }
                    ]}
                />
            </div>

            {/* Etages (Conditional) */}
            {category === 'Appartement' && (
                <>
                    <hr />
                    <Counter
                        title={t('edit.category.totalFloors')}
                        subtitle=""
                        value={totalFloors || 1}
                        onChange={(value) => setCustomValue('totalFloors', value)}
                    />
                </>
            )}

            <hr />

            {/* Etage du logement */}
            <Counter
                title={t('edit.category.floor')}
                subtitle=""
                value={floor || 0}
                onChange={(value) => setCustomValue('floor', value)}
                min={0}
                max={totalFloors || undefined}
            />

            <hr />

            {/* Année construction */}
            {/* Année construction */}
            <SoftSelect
                id="buildYear"
                label={t('edit.category.buildYear')}
                value={
                    buildYear
                        ? buildYear <= 1945 ? "1945"
                            : buildYear <= 1970 ? "1960"
                                : buildYear <= 1990 ? "1980"
                                    : "2000"
                        : ""
                }
                onChange={(e) => setCustomValue('buildYear', e.target.value)}
                disabled={isLoading}
                options={[
                    { value: "1945", label: t('edit.category.buildPeriods.before1946') },
                    { value: "1960", label: t('edit.category.buildPeriods.1946to1970') },
                    { value: "1980", label: t('edit.category.buildPeriods.1971to1990') },
                    { value: "2000", label: t('edit.category.buildPeriods.after1990') }
                ]}
            />
            <div className="text-xs text-neutral-500 mt-[-24px] mb-4">
                {t.rich('edit.category.buildYearHelper', { link: (chunks) => <a href="https://gorenove.fr/adresse" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{chunks}</a> })}
            </div>

            <EditSectionFooter
                disabled={isLoading}
                label={t('edit.save')}
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
}

export default CategorySection;
