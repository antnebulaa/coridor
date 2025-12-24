'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

import { SafeListing, SafeUser } from "@/types";
import { Button } from "@/components/ui/Button";
import Counter from "@/components/inputs/Counter";
import SoftInput from "@/components/inputs/SoftInput";
import SoftSelect from "@/components/inputs/SoftSelect";

interface CategorySectionProps {
    listing: SafeListing;
    currentUser: SafeUser;
}

const CategorySection: React.FC<CategorySectionProps> = ({ listing, currentUser }) => {
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
            heatingSystem: listing.heatingSystem || 'IND_ELEC',
            glazingType: listing.glazingType || 'DOUBLE',
            dpe: listing.dpe || 'C',
            ges: listing.ges || 'A',
            energy_cost_min: listing.energy_cost_min,
            energy_cost_max: listing.energy_cost_max,
            dpe_year: listing.dpe_year,
            propertyAdjective: listing.propertyAdjective
        }
    });

    const category = watch('category');
    const propertyAdjective = watch('propertyAdjective');
    const isFurnished = watch('isFurnished');
    const surfaceUnit = watch('surfaceUnit');
    const kitchenType = watch('kitchenType');
    const roomCount = watch('roomCount');
    const guestCount = watch('guestCount');
    const bathroomCount = watch('bathroomCount');
    const totalFloors = watch('totalFloors');
    const floor = watch('floor');
    const heatingSystem = watch('heatingSystem');
    const glazingType = watch('glazingType');
    const dpe = watch('dpe');
    const ges = watch('ges');

    // Explicit watchers for SoftInput fields to ensure controlled updates
    const surface = watch('surface');
    const buildYear = watch('buildYear');
    const energy_cost_min = watch('energy_cost_min');
    const energy_cost_max = watch('energy_cost_max');
    const dpe_year = watch('dpe_year');

    const setCustomValue = (id: string, value: any) => {
        setValue(id, value, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
        })
    }



    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.put(`/api/listings/${listing.id}`, data)
            .then(() => {
                toast.success('Listing updated!');
                router.refresh();
            })
            .catch(() => {
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    return (
        <div className="flex flex-col gap-8 pb-28 md:pb-0">
            {/* Type de bien */}
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

            {/* Adjectif du bien */}
            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-neutral-800">
                    Comment décririez-vous votre bien ? (Optionnel)
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
                        { value: "", label: "Aucun" },
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
                        label={`Surface du logement (${surfaceUnit === 'metric' ? 'm²' : 'sq ft'})`}
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
            <Counter
                title="Nombre de pièces"
                subtitle="La cuisine, les salles de bain et les toilettes sont à exclure"
                value={roomCount}
                onChange={(value) => setCustomValue('roomCount', value)}
            />

            <hr />

            {/* Chambres */}
            <Counter
                title="Nombre de chambres"
                subtitle="Un studio n’a pas de chambre"
                value={guestCount}
                onChange={(value) => setCustomValue('guestCount', value)}
                min={0}
            />

            <hr />

            {/* Salles de bain */}
            <Counter
                title="Nombre de salles de bain"
                subtitle=""
                value={bathroomCount}
                onChange={(value) => setCustomValue('bathroomCount', value)}
            />

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
            <SoftInput
                id="buildYear"
                label="Année de construction"
                type="number"
                disabled={isLoading}
                value={buildYear ?? ''}
                onChange={(e) => setCustomValue('buildYear', e.target.value)}
                errors={errors}
            />

            <hr />

            {/* Heating System */}
            <div className="flex flex-col gap-2">
                <SoftSelect
                    id="heatingSystem"
                    label="Système de chauffage"
                    value={heatingSystem || 'IND_ELEC'}
                    onChange={(e) => setCustomValue('heatingSystem', e.target.value)}
                    disabled={isLoading}
                    options={[
                        { value: "IND_ELEC", label: "Individuel Électrique" },
                        { value: "IND_GAS", label: "Individuel Gaz" },
                        { value: "COL_GAS", label: "Collectif Gaz" },
                        { value: "COL_URB", label: "Collectif Urbain" },
                        { value: "PAC", label: "Pompe à Chaleur" },
                        { value: "WOOD", label: "Bois / Granulés" },
                        { value: "REV_AC", label: "Clim. Réversible" }
                    ]}
                />
            </div>

            {/* Glazing Type */}
            <div className="flex flex-col gap-2">
                <SoftSelect
                    id="glazingType"
                    label="Type de vitrage"
                    value={glazingType || 'DOUBLE'}
                    onChange={(e) => setCustomValue('glazingType', e.target.value)}
                    disabled={isLoading}
                    options={[
                        { value: "SINGLE", label: "Simple vitrage" },
                        { value: "DOUBLE", label: "Double vitrage" },
                        { value: "TRIPLE", label: "Triple vitrage" }
                    ]}
                />
            </div>

            <hr />

            {/* DPE & GES */}
            <div className="flex flex-row gap-4 w-full">
                <div className="flex flex-col gap-2 w-full">
                    <SoftSelect
                        id="dpe"
                        label="DPE (Classe énergie)"
                        value={dpe}
                        onChange={(e) => setCustomValue('dpe', e.target.value)}
                        disabled={isLoading}
                        options={['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(grade => ({ value: grade, label: grade }))}
                    />
                </div>
                <div className="flex flex-col gap-2 w-full">
                    <SoftSelect
                        id="ges"
                        label="GES"
                        value={ges}
                        onChange={(e) => setCustomValue('ges', e.target.value)}
                        disabled={isLoading}
                        options={['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(grade => ({ value: grade, label: grade }))}
                    />
                </div>
            </div>

            {(dpe === 'F' || dpe === 'G') && (
                <div className="bg-orange-500/10 border border-orange-500 text-orange-700 p-4 rounded-xl text-sm font-medium">
                    ⚠️ Attention : Vérifiez que votre logement respecte les critères de décence énergétique en vigueur pour la mise en location.
                </div>
            )}

            {/* Energy Costs */}
            <div className="flex flex-col gap-2">
                <div className="text-sm font-medium text-neutral-800">
                    Coûts annuels d'énergie
                </div>
                <div className="text-xs text-neutral-500 mb-2">
                    Ces montants figurent sur la première page de votre diagnostic DPE. Si vous ne les avez pas, laissez vide, nous ferons une estimation automatique.
                </div>
                <div className="flex flex-row gap-4">
                    <SoftInput
                        id="energy_cost_min"
                        label="Min (€/an)"
                        type="number"
                        disabled={isLoading}
                        value={energy_cost_min ?? ''}
                        onChange={(e) => setCustomValue('energy_cost_min', e.target.value)}
                        errors={errors}
                    />
                    <SoftInput
                        id="energy_cost_max"
                        label="Max (€/an)"
                        type="number"
                        disabled={isLoading}
                        value={energy_cost_max ?? ''}
                        onChange={(e) => setCustomValue('energy_cost_max', e.target.value)}
                        errors={errors}
                    />
                </div>
            </div>

            <div className="w-full">
                <SoftInput
                    id="dpe_year"
                    label="Année de référence du DPE"
                    type="number"
                    disabled={isLoading}
                    value={dpe_year ?? ''}
                    onChange={(e) => setCustomValue('dpe_year', e.target.value)}
                    errors={errors}
                />
            </div>

            <div className="
                fixed 
                bottom-0 
                left-0 
                w-full 
                bg-white 
                border-t-[1px] 
                border-neutral-200 
                p-4 
                z-50 
                md:relative 
                md:bottom-auto 
                md:left-auto 
                md:w-auto 
                md:bg-transparent 
                md:border-none 
                md:p-0 
                md:mt-4 
                md:flex 
                md:justify-end
            ">
                <div className="w-full md:w-auto">
                    <Button
                        disabled={isLoading}
                        label="Enregistrer"
                        onClick={handleSubmit(onSubmit)}
                    />
                </div>
            </div>
        </div>
    );
}

export default CategorySection;
