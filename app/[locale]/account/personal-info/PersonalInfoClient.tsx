'use client';

import { SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";

import Heading from "@/components/Heading";
import PageHeader from "@/components/PageHeader";
import SoftInput from "@/components/inputs/SoftInput";
import PhoneInput from "@/components/inputs/PhoneInput";
import MapboxAddressSelect, { AddressSelectValue } from "@/components/inputs/MapboxAddressSelect";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";
import CustomToast from "@/components/ui/CustomToast";
import ProfileGradientGenerator from "@/components/inputs/ProfileGradientGenerator";
import { useTranslations, useFormatter } from 'next-intl';

// Helper for status badges
const StatusBadge = ({ isComplete }: { isComplete: boolean }) => {
    const tCommon = useTranslations('common');
    return (
        <div className={`flex items-center gap-1.5 text-sm font-medium ${isComplete ? 'text-green-600' : 'text-neutral-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-red-500'}`} />
            {isComplete ? tCommon('completed') : tCommon('mandatory')}
        </div>
    );
};

interface PersonalInfoClientProps {
    currentUser?: SafeUser | null;
}

const PersonalInfoClient: React.FC<PersonalInfoClientProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('account.personalInfo');
    const tCommon = useTranslations('common');
    const format = useFormatter();

    // Toggle States
    const [isEditingIdentity, setIsEditingIdentity] = useState(false); // First/Last Name + Birth
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [isEditingImage, setIsEditingImage] = useState(false); // NEW

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
            image: currentUser?.image, // NEW
        }
    });

    // Check completion status for badges
    const isIdentityComplete = !!(currentUser?.firstName && currentUser?.lastName && currentUser?.birthDate && currentUser?.birthPlace);
    const isEmailComplete = !!currentUser?.email;
    const isPhoneComplete = !!currentUser?.phoneNumber;
    const isAddressComplete = !!(currentUser?.address && currentUser?.zipCode && currentUser?.city);

    // Watch address for Mapbox
    const addressValue = watch('address');

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        // Normalize Date
        if (data.birthDate) {
            data.birthDate = new Date(data.birthDate).toISOString();
        } else {
            data.birthDate = null;
        }

        // Reconstruct 'name' for backward compatibility
        if (data.firstName && data.lastName) {
            data.name = `${data.firstName} ${data.lastName}`;
        }

        // Normalize phone to E.164 format (+33...)
        if (data.phoneNumber) {
            let phone = data.phoneNumber.replace(/[\s.\-()]/g, '');
            // Convert 06/07... to +336/+337...
            if (phone.startsWith('0') && phone.length === 10) {
                phone = '+33' + phone.slice(1);
            }
            // Ensure + prefix if starts with 33
            if (phone.startsWith('33') && !phone.startsWith('+')) {
                phone = '+' + phone;
            }
            data.phoneNumber = phone;
        }

        axios.post('/api/settings', data)
            .then(() => {
                toast.custom((tToast) => (
                    <CustomToast
                        t={tToast}
                        message={t('toasts.success')}
                        type="success"
                    />
                ));
                router.refresh();
                setIsEditingIdentity(false);
                setIsEditingEmail(false);
                setIsEditingPhone(false);
                setIsEditingAddress(false);
                setIsEditingImage(false); // NEW
            })
            .catch(() => {
                toast.custom((tToast) => (
                    <CustomToast
                        t={tToast}
                        message={t('toasts.error')}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <PageHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />

            {/* BLOCK 0: PHOTO DE PROFIL */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className="text-lg font-medium dark:text-white">
                                {t('profilePhoto.title')}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingImage ?
                                t('profilePhoto.editHint') :
                                (
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden border border-neutral-200">
                                            {currentUser?.image ? (
                                                <img src={currentUser.image} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs">
                                                    {t('profilePhoto.none')}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-neutral-500">
                                            {t('profilePhoto.visibility')}
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingImage(!isEditingImage)}
                        className="text-black dark:text-white animated-underline font-medium cursor-pointer"
                    >
                        {isEditingImage ? tCommon('cancel') : tCommon('edit')}
                    </div>
                </div>

                {
                    isEditingImage && (
                        <div className="w-full flex flex-col gap-6">
                            <ProfileGradientGenerator
                                initialImage={currentUser?.image}
                                onImageGenerated={(base64) => {
                                    setValue('image', base64, { shouldDirty: true });
                                }}
                            />
                            <div className="w-full md:w-1/3">
                                <Button
                                    label={t('profilePhoto.save')}
                                    onClick={handleSubmit(onSubmit)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )
                }
            </div >

            <hr />

            {/* BLOCK 1: IDENTITÉ (Nom, Prénom, Naissance) */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className="text-lg font-medium dark:text-white">
                                {t('identity.title')}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingIdentity ?
                                t('identity.hint') :
                                (
                                    <>
                                        <StatusBadge isComplete={isIdentityComplete} />
                                        <div className="flex flex-col gap-1">
                                            {(currentUser?.firstName && currentUser?.lastName) && (
                                                <div className="font-medium text-neutral-800 dark:text-gray-200">
                                                    {currentUser.firstName} {currentUser.lastName}
                                                </div>
                                            )}
                                            {(currentUser?.birthDate && currentUser?.birthPlace) && (
                                                <div>
                                                    {t('identity.bornAt', {
                                                        date: format.dateTime(new Date(currentUser.birthDate), { dateStyle: 'long' }),
                                                        place: currentUser.birthPlace
                                                    })}
                                                </div>
                                            )}
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
                        {isEditingIdentity ? tCommon('cancel') : tCommon('edit')}
                    </div>
                </div>

                {isEditingIdentity && (
                    <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SoftInput
                            id="firstName"
                            label={t('identity.firstName')}
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <SoftInput
                            id="lastName"
                            label={t('identity.lastName')}
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <SoftInput
                            id="birthDate"
                            label={t('identity.birthDate')}
                            type="date"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <MapboxAddressSelect
                            label={t('identity.birthPlace')}
                            value={{ label: watch('birthPlace'), value: '', latlng: [], region: '' }}
                            onChange={(val) => {
                                setValue('birthPlace', val.city || val.label, { shouldValidate: true, shouldDirty: true });
                            }}
                            searchTypes="place"
                            customInputClass="px-3 pb-2 pt-6 rounded-xl border-input border-[1px] font-normal bg-background focus:border-foreground"
                        />
                        <div className="md:col-span-2 mt-2">
                            <Button
                                label={tCommon('save')}
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
                        <div className="flex items-center gap-3">
                            <div className="text-lg font-medium dark:text-white">
                                {t('email.title')}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingEmail ?
                                t('email.hint') :
                                <>
                                    <StatusBadge isComplete={isEmailComplete} />
                                    {currentUser?.email && <div>{currentUser.email}</div>}
                                </>
                            }
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        className="text-black dark:text-white animated-underline font-medium cursor-pointer"
                    >
                        {isEditingEmail ? tCommon('cancel') : tCommon('edit')}
                    </div>
                </div>

                {
                    isEditingEmail && (
                        <div className="w-full md:w-2/3 flex flex-col gap-4">
                            <SoftInput
                                id="email"
                                label={t('email.label')}
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                            <Button
                                label={tCommon('save')}
                                onClick={handleSubmit(onSubmit)}
                                disabled={isLoading}
                            />
                        </div>
                    )
                }
            </div >

            <hr />

            {/* BLOCK 3: NUMÉRO DE TÉLÉPHONE */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className="text-lg font-medium dark:text-white">
                                {t('phone.title')}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingPhone ?
                                t('phone.hint') :
                                <>
                                    <StatusBadge isComplete={isPhoneComplete} />
                                    {currentUser?.phoneNumber && <div>{currentUser.phoneNumber}</div>}
                                </>
                            }
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingPhone(!isEditingPhone)}
                        className="text-black dark:text-white animated-underline font-medium cursor-pointer"
                    >
                        {isEditingPhone ? tCommon('cancel') : tCommon('edit')}
                    </div>
                </div>

                {isEditingPhone && (
                    <div className="w-full md:w-2/3 flex flex-col gap-4">
                        <div className="text-xs text-neutral-500 mb-2">
                            {t('phone.privacy')}
                        </div>
                        <PhoneInput
                            value={watch('phoneNumber') || ''}
                            onChange={(val) => setValue('phoneNumber', val, { shouldDirty: true })}
                            disabled={isLoading}
                        />
                        <Button
                            label={tCommon('save')}
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
                        <div className="flex items-center gap-3">
                            <div className="text-lg font-medium dark:text-white">
                                {t('address.title')}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-neutral-500 dark:text-neutral-400 font-light text-sm">
                            {isEditingAddress ?
                                t('address.hint') :
                                <>
                                    <StatusBadge isComplete={isAddressComplete} />
                                    {(currentUser?.address && currentUser?.city && currentUser?.zipCode) && (
                                        <div>{currentUser.address}, {currentUser.zipCode} {currentUser.city}</div>
                                    )}
                                </>
                            }
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingAddress(!isEditingAddress)}
                        className="text-black dark:text-white animated-underline font-medium cursor-pointer"
                    >
                        {isEditingAddress ? tCommon('cancel') : tCommon('edit')}
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
                            label={t('address.label')}
                            customInputClass="px-3 pb-2 pt-6 rounded-xl border-input border-[1px] font-normal bg-background focus:border-foreground"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <SoftInput
                                id="apartment"
                                label={t('address.apartment')}
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                            <SoftInput
                                id="building"
                                label={t('address.building')}
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <SoftInput
                                id="zipCode"
                                label={t('address.zipCode')}
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                            <SoftInput
                                id="city"
                                label={t('address.city')}
                                register={register}
                                errors={errors}
                                disabled={isLoading}
                            />
                        </div>
                        <Button
                            label={tCommon('save')}
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                        />
                    </div>
                )}
            </div>

            <hr />
        </div >
    );
}

export default PersonalInfoClient;
