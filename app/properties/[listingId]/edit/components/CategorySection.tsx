'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { SafeListing, SafeUser } from "@/types";
import { Button } from "@/components/ui/Button";
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
            rentalUnitType: listing.rentalUnitType || 'ENTIRE_PLACE', // Default if missing
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
    const rentalUnitType = watch('rentalUnitType');
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

    const isRoomMode = rentalUnitType !== 'ENTIRE_PLACE';

    const setCustomValue = (id: string, value: any) => {
        setValue(id, value, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
        })
    }

    // --- Colocation Logic ---
    const propertyRentalUnits = (listing.rentalUnit as any)?.property?.rentalUnits || [];
    // Check if there are active rooms (ignoring the 'ENTIRE_PLACE' one which is active in Standard mode)
    // We check for PRIVATE_ROOM type specifically
    const hasActiveRooms = propertyRentalUnits.some((u: any) => u.type === 'PRIVATE_ROOM' && u.isActive);
    const [mode, setMode] = useState<string>(hasActiveRooms ? 'COLOCATION' : 'STANDARD');

    const handleModeChange = async (newMode: string) => {
        if (newMode === mode) return;
        setIsLoading(true);
        try {
            const response = await axios.post(`/api/listings/${listing.id}/mode`, { mode: newMode });

            if (response.data?.targetListingId && response.data.targetListingId !== listing.id) {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={newMode === 'COLOCATION' ? 'Mode Colocation activé (Redirection...)' : 'Mode Logement Entier activé (Redirection...)'}
                        type="success"
                    />
                ));
                router.push(`/properties/${response.data.targetListingId}/edit`);
                return;
            }

            setMode(newMode);
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message={newMode === 'COLOCATION' ? 'Mode Colocation activé' : 'Mode Logement Entier activé'}
                    type="success"
                />
            ));
            router.refresh();
        } catch (error) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors du changement de mode"
                    type="error"
                />
            ));
        } finally {
            setIsLoading(false);
        }
    };
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

            {/* Mode de location (CUSTOM SWITCH) */}
            <div className="flex flex-col gap-2">
                <SoftSelect
                    id="rentalUnitType"
                    label="Mode de location"
                    value={mode}
                    onChange={(e) => handleModeChange(e.target.value)}
                    disabled={isLoading}
                    options={[
                        { value: "STANDARD", label: "Logement entier" },
                        { value: "COLOCATION", label: "Colocation (Activation chambres)" }
                    ]}
                />
            </div>

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

            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
}

export default CategorySection;
