'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

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
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Votre annonce a été mise à jour"
                        type="success"
                    />
                ));
                router.refresh();
            })
            .catch(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Une erreur est survenue"
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
                        label="Quel type de bien louez-vous ?"
                        value={category}
                        onChange={(e) => setCustomValue('category', e.target.value)}
                        disabled={isLoading}
                        options={[
                            { value: "Maison", label: "Une maison" },
                            { value: "Appartement", label: "Un appartement" },
                            { value: "Bateau", label: "Un bateau" }
                        ]}
                    />
                </div>
            )}

            {/* Sous-type de propriété */}
            {!isRoom && category === 'Appartement' && (
                <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium text-neutral-800">
                        Type d&apos;appartement
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: '', label: 'Standard' },
                            { value: 'duplex', label: 'Duplex' },
                            { value: 'triplex', label: 'Triplex' },
                            { value: 'loft', label: 'Loft' },
                            { value: 'penthouse', label: 'Penthouse' },
                            { value: 'mansarde', label: 'Mansardé' },
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
                        Comment décririez-vous votre bien ?
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">
                        Cet adjectif apparaîtra après le type de bien sur l'annonce (ex: "Maison calme").
                    </div>
                    <SoftSelect
                        id="propertyAdjective"
                        label="Choisir un adjectif"
                        value={propertyAdjective || ""}
                        onChange={(e) => setCustomValue('propertyAdjective', e.target.value)}
                        disabled={isLoading}
                        options={[
                            // Lumière/Espace
                            { value: "Lumineux", label: "Lumineux" },
                            { value: "Spacieux", label: "Spacieux" },
                            { value: "Traversant", label: "Traversant" },
                            { value: "Ensoleillé", label: "Ensoleillé" },
                            // Style/Architecture
                            { value: "Haussmannien", label: "Haussmannien" },
                            { value: "Atypique", label: "Atypique" },
                            { value: "Loft", label: "Loft" },
                            { value: "Ancien", label: "Ancien" },
                            { value: "Moderne", label: "Moderne" },
                            { value: "Neuf", label: "Neuf" },
                            { value: "Rénové", label: "Rénové" },
                            // Ambiance
                            { value: "Calme", label: "Calme" },
                            { value: "Cosy", label: "Cosy" },
                            { value: "De charme", label: "De charme" },
                            { value: "Familial", label: "Familial" },
                            { value: "Étudiant", label: "Étudiant" },
                            // Standing
                            { value: "De standing", label: "De standing" },
                            { value: "De prestige", label: "De prestige" },
                        ]}
                    />
                </div>
            )}

            {/* Meublé */}
            <div className="flex flex-col gap-2">
                <SoftSelect
                    id="isFurnished"
                    label="Votre logement est-il meublé ?"
                    value={isFurnished ? 'true' : 'false'}
                    onChange={(e) => setCustomValue('isFurnished', e.target.value === 'true')}
                    disabled={isLoading}
                    options={[
                        { value: "true", label: "Logement meublé" },
                        { value: "false", label: "Logement non meublé" }
                    ]}
                />
            </div>

            {/* Surface */}
            <div className="flex flex-row gap-2">
                <div className="w-full">
                    <SoftInput
                        id="surface"
                        label={isRoom ? `Surface de la chambre (${surfaceUnit === 'metric' ? 'm²' : 'sq ft'})` : `Surface du logement (${surfaceUnit === 'metric' ? 'm²' : 'sq ft'})`}
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
                        label="Unité"
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
                        title="Nombre de pièces"
                        subtitle="La cuisine, les salles de bain et les toilettes sont à exclure"
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
                        title="Nombre de chambres"
                        subtitle="Un studio n’a pas de chambre"
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
                        <div className="font-medium">Salle de bain privée</div>
                        <div className="font-light text-gray-600 text-sm">
                            Y a-t-il une salle de bain exclusive à cette pièce ?
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
                    title="Nombre de salles de bain"
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
                    label="Votre bien dispose t-il d’une cuisine séparée?"
                    value={kitchenType || 'open'}
                    onChange={(e) => setCustomValue('kitchenType', e.target.value)}
                    disabled={isLoading}
                    options={[
                        { value: "separate", label: "Cuisine séparée" },
                        { value: "open", label: "Cuisine ouverte" }
                    ]}
                />
            </div>

            {/* Etages (Conditional) */}
            {category === 'Appartement' && (
                <>
                    <hr />
                    <Counter
                        title="Combien y a-t-il d’étages dans l’immeuble ?"
                        subtitle=""
                        value={totalFloors || 1}
                        onChange={(value) => setCustomValue('totalFloors', value)}
                    />
                </>
            )}

            <hr />

            {/* Etage du logement */}
            <Counter
                title="A quel étage se situe le logement ?"
                subtitle=""
                value={floor || 0}
                onChange={(value) => setCustomValue('floor', value)}
                min={0}
            />

            <hr />

            {/* Année construction */}
            {/* Année construction */}
            <SoftSelect
                id="buildYear"
                label="Année de construction"
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
                    { value: "1945", label: "Avant 1946" },
                    { value: "1960", label: "1946 - 1970" },
                    { value: "1980", label: "1971 - 1990" },
                    { value: "2000", label: "Après 1990" }
                ]}
            />
            <div className="text-xs text-neutral-500 mt-[-24px] mb-4">
                Si vous ne connaissez pas la période de construction, vous pouvez la trouver <a href="https://gorenove.fr/adresse" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">ici</a>.
            </div>

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
}

export default CategorySection;
