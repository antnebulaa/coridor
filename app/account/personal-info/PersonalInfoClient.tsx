'use client';

import { SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";

import Heading from "@/components/Heading";
import SoftInput from "@/components/inputs/SoftInput";
import MapboxAddressSelect, { AddressSelectValue } from "@/components/inputs/MapboxAddressSelect";
import { Button } from "@/components/ui/Button";

interface PersonalInfoClientProps {
    currentUser?: SafeUser | null;
}

const PersonalInfoClient: React.FC<PersonalInfoClientProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Toggle States
    const [isEditingIdentity, setIsEditingIdentity] = useState(false); // First/Last Name + Birth
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);

    // Initial Split of Name if firstName/lastName not set
    const initialSplit = currentUser?.name ? currentUser.name.split(' ') : ['', ''];
    const defaultFirstName = currentUser?.firstName || initialSplit[0];
    const defaultLastName = currentUser?.lastName || initialSplit.slice(1).join(' ');

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
            firstName: defaultFirstName,
            lastName: defaultLastName,
            email: currentUser?.email,
            phoneNumber: currentUser?.phoneNumber,
            address: currentUser?.address,
            addressLine1: currentUser?.addressLine1 || '',
            building: currentUser?.building || '',
            apartment: currentUser?.apartment || '',
            city: currentUser?.city || '',
            zipCode: currentUser?.zipCode || '',
            country: currentUser?.country || '',
            birthDate: currentUser?.birthDate ? currentUser.birthDate.split('T')[0] : '',
            birthPlace: currentUser?.birthPlace,
        }
    });

    // Watch address for Mapbox
    const addressValue = watch('address');

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        // Normalize Date
        if (data.birthDate) {
            data.birthDate = new Date(data.birthDate).toISOString();
        }

        // Reconstruct 'name' for backward compatibility
        if (data.firstName && data.lastName) {
            data.name = `${data.firstName} ${data.lastName}`;
        }

        axios.post('/api/settings', data)
            .then(() => {
                toast.success('Profil mis à jour !');
                router.refresh();
                setIsEditingIdentity(false);
                setIsEditingEmail(false);
                setIsEditingPhone(false);
                setIsEditingAddress(false);
            })
            .catch(() => {
                toast.error('Une erreur est survenue.');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="flex flex-row items-center justify-between">
                <Heading
                    title="Informations personnelles"
                    subtitle="Mettez à jour vos informations et comment nous pouvons vous joindre."
                />
            </div>

            <hr />

            {/* BLOCK 1: IDENTITÉ (Nom, Prénom, Naissance) */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="text-lg font-medium dark:text-white">
                            Identité
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingIdentity ?
                                'Ces informations doivent correspondre à votre pièce d\'identité.' :
                                (
                                    <>
                                        <div className="font-medium text-neutral-800 dark:text-gray-200">
                                            {currentUser?.firstName || defaultFirstName} {currentUser?.lastName || defaultLastName}
                                        </div>
                                        <div>
                                            {currentUser?.birthDate ?
                                                `Né(e) le ${new Date(currentUser.birthDate).toLocaleDateString()} à ${currentUser?.birthPlace || '...'}` :
                                                'Informations de naissance manquantes'
                                            }
                                        </div>
                                    </>
                                )
                            }
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingIdentity(!isEditingIdentity)}
                        className="text-black dark:text-white animated-underline font-medium cursor-pointer"
                    >
                        {isEditingIdentity ? 'Annuler' : 'Modifier'}
                    </div>
                </div>

                {isEditingIdentity && (
                    <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SoftInput
                            id="firstName"
                            label="Prénom"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <SoftInput
                            id="lastName"
                            label="Nom"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <SoftInput
                            id="birthDate"
                            label="Date de naissance"
                            type="date"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <SoftInput
                            id="birthPlace"
                            label="Lieu de naissance"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <div className="md:col-span-2 mt-2">
                            <Button
                                label="Enregistrer"
                                onClick={handleSubmit(onSubmit)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                )}
            </div>

            <hr />

            {/* BLOCK 2: EMAIL */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="text-lg font-medium dark:text-white">
                            Adresse e-mail
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingEmail ? 'Utilisez une adresse à laquelle vous avez toujours accès.' : currentUser?.email}
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        className="text-black dark:text-white animated-underline font-medium cursor-pointer"
                    >
                        {isEditingEmail ? 'Annuler' : 'Modifier'}
                    </div>
                </div>

                {isEditingEmail && (
                    <div className="w-full md:w-2/3 flex flex-col gap-4">
                        <SoftInput
                            id="email"
                            label="Email"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <Button
                            label="Enregistrer"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                        />
                    </div>
                )}
            </div>

            <hr />

            {/* BLOCK 3: NUMÉRO DE TÉLÉPHONE */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="text-lg font-medium dark:text-white">
                            Numéro de téléphone
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingPhone ?
                                'Pour les notifications importantes concernant vos locations.' :
                                (currentUser?.phoneNumber || 'Ajoutez un numéro de téléphone')
                            }
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingPhone(!isEditingPhone)}
                        className="text-black dark:text-white animated-underline font-medium cursor-pointer"
                    >
                        {isEditingPhone ? 'Annuler' : 'Modifier'}
                    </div>
                </div>

                {isEditingPhone && (
                    <div className="w-full md:w-2/3 flex flex-col gap-4">
                        <div className="text-xs text-neutral-500 mb-2">
                            Nous utilisons ces données uniquement pour partager vos coordonnées une fois la réservation confirmée. Pas de démarchage.
                        </div>
                        <SoftInput
                            id="phoneNumber"
                            label="Numéro de téléphone"
                            type="tel"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <Button
                            label="Enregistrer"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                        />
                    </div>
                )}
            </div>

            <hr />

            {/* BLOCK 4: ADRESSE POSTALE */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="text-lg font-medium dark:text-white">
                            Adresse de résidence
                        </div>
                        <div className="text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingAddress ?
                                'L\'adresse permanente utilisée pour vos contrats.' :
                                (currentUser?.address || 'Ajoutez une adresse')
                            }
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingAddress(!isEditingAddress)}
                        className="text-black dark:text-white animated-underline font-medium cursor-pointer"
                    >
                        {isEditingAddress ? 'Annuler' : 'Modifier'}
                    </div>
                </div>

                {isEditingAddress && (
                    <div className="w-full md:w-2/3 flex flex-col gap-4">
                        <MapboxAddressSelect
                            value={{ label: addressValue, value: '', latlng: [], region: '' }}
                            onChange={(val) => {
                                // Fallback split if street is missing
                                const street = val.street || val.label.split(',')[0].trim();
                                setValue('address', street);
                                setValue('addressLine1', street);
                                setValue('city', val.city);
                                setValue('zipCode', val.zipCode);
                                setValue('country', val.country);
                            }}
                            label="Adresse postale"
                            customInputClass="px-3 pb-2 pt-6 rounded-xl border-input border-[1px] font-normal bg-background focus:border-foreground"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <SoftInput
                                id="apartment"
                                label="N° Appartement"
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                            <SoftInput
                                id="building"
                                label="Bâtiment / Escalier"
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <SoftInput
                                id="zipCode"
                                label="Code postal"
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                            <SoftInput
                                id="city"
                                label="Ville"
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                        </div>
                        <Button
                            label="Enregistrer"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                        />
                    </div>
                )}
            </div>

            <hr />
        </div>
    );
}

export default PersonalInfoClient;
