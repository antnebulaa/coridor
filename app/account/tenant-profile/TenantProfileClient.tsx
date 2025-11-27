'use client';

import axios from "axios";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { SafeUser } from "@/types";
import { GuarantorType, GuarantorStatus, IncomeType } from "@prisma/client";
import { generateDossierHtml } from "@/utils/dossierGenerator";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import Input from "@/components/inputs/Input";
import { Button } from "@/components/ui/Button";

interface TenantProfileClientProps {
    currentUser: SafeUser;
    tenantProfile: any; // Full profile with relations
}

const TenantProfileClient: React.FC<TenantProfileClientProps> = ({
    currentUser,
    tenantProfile
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Prepare default values
    const defaultValues = {
        jobType: tenantProfile?.jobType || '',
        jobTitle: tenantProfile?.jobTitle || '',
        netSalary: tenantProfile?.netSalary || '',
        guarantors: tenantProfile?.guarantors || [],
        additionalIncomes: tenantProfile?.additionalIncomes || []
    };

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues
    });

    // We need to handle dynamic lists for Guarantors and Incomes.
    // Since we don't have a complex form builder, let's do a simple implementation.
    // We can use `watch` to get the arrays and render them.
    // But `register` needs unique names. `guarantors.0.type`, etc.

    const guarantors = watch('guarantors');
    const additionalIncomes = watch('additionalIncomes');

    const addGuarantor = () => {
        const current = watch('guarantors');
        setValue('guarantors', [...current, { type: 'FAMILY', status: 'CDI', netIncome: 0 }]);
    };

    const removeGuarantor = (index: number) => {
        const current = watch('guarantors');
        setValue('guarantors', current.filter((_: any, i: number) => i !== index));
    };

    const addIncome = () => {
        const current = watch('additionalIncomes');
        setValue('additionalIncomes', [...current, { type: 'OTHER', amount: 0 }]);
    };

    const removeIncome = (index: number) => {
        const current = watch('additionalIncomes');
        setValue('additionalIncomes', current.filter((_: any, i: number) => i !== index));
    };

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.post('/api/profile', data)
            .then(() => {
                toast.success('Profile updated!');
                router.refresh();
            })
            .catch(() => {
                toast.error('Something went wrong.');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    const handleDownloadDossier = () => {
        // We need the latest data, but for now we use the initial data passed + local state if we wanted to be perfect.
        // But simpler: use the props data (which is server state). 
        // Ideally user saves first.

        // Let's use the form values to be up to date with unsaved changes? 
        // No, safer to use saved data or warn user. 
        // Let's use the current form values for the preview!

        const currentData = watch();
        // Construct a profile object similar to what the generator expects
        const profileData = {
            ...currentData,
            // Ensure numbers are numbers
            netSalary: parseInt(currentData.netSalary || '0'),
            additionalIncomes: currentData.additionalIncomes?.map((i: any) => ({ ...i, amount: parseInt(i.amount || '0') })),
            guarantors: currentData.guarantors?.map((g: any) => ({ ...g, netIncome: parseInt(g.netIncome || '0') }))
        };

        const html = generateDossierHtml(currentUser, profileData);

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    return (
        <Container>
            <div className="max-w-2xl mx-auto">
                <div className="flex flex-row items-center justify-between">
                    <Heading
                        title="My Rental Profile"
                        subtitle="Complete your profile to apply for listings."
                    />
                    <Button
                        label="Download Dossier"
                        onClick={handleDownloadDossier}
                        small
                        variant="outline"
                    />
                </div>
                <div className="mt-10 flex flex-col gap-8">
                    {/* Employment Section */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xl font-medium">Employment & Income</h3>
                        <Input
                            id="jobTitle"
                            label="Job Title"
                            disabled={isLoading}
                            register={register}
                            errors={errors}
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="jobType"
                                label="Job Type (CDI, CDD...)"
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                required
                            />
                            <Input
                                id="netSalary"
                                label="Net Monthly Salary (€)"
                                type="number"
                                formatPrice
                                disabled={isLoading}
                                register={register}
                                errors={errors}
                                required
                            />
                        </div>
                    </div>

                    <hr />

                    {/* Additional Incomes Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-medium">Additional Incomes</h3>
                            <Button
                                label="Add Income"
                                onClick={addIncome}
                                small
                                variant="outline"
                            />
                        </div>
                        {additionalIncomes.map((item: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg flex flex-col gap-4 relative">
                                <button
                                    onClick={() => removeIncome(index)}
                                    className="absolute top-2 right-2 text-red-500 hover:underline text-sm"
                                >
                                    Remove
                                </button>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-gray-700">Type</label>
                                        <select
                                            {...register(`additionalIncomes.${index}.type`)}
                                            className="p-3 border-2 rounded-md outline-none focus:border-black transition"
                                        >
                                            {Object.values(IncomeType).map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Input
                                        id={`additionalIncomes.${index}.amount`}
                                        label="Amount (€)"
                                        type="number"
                                        formatPrice
                                        disabled={isLoading}
                                        register={register}
                                        errors={errors}
                                        required
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <hr />

                    {/* Guarantors Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-medium">Guarantors</h3>
                            <Button
                                label="Add Guarantor"
                                onClick={addGuarantor}
                                small
                                variant="outline"
                            />
                        </div>
                        {guarantors.map((item: any, index: number) => (
                            <div key={index} className="p-4 border rounded-lg flex flex-col gap-4 relative">
                                <button
                                    onClick={() => removeGuarantor(index)}
                                    className="absolute top-2 right-2 text-red-500 hover:underline text-sm"
                                >
                                    Remove
                                </button>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-gray-700">Type</label>
                                        <select
                                            {...register(`guarantors.${index}.type`)}
                                            className="p-3 border-2 rounded-md outline-none focus:border-black transition"
                                        >
                                            {Object.values(GuarantorType).map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-gray-700">Status</label>
                                        <select
                                            {...register(`guarantors.${index}.status`)}
                                            className="p-3 border-2 rounded-md outline-none focus:border-black transition"
                                        >
                                            {Object.values(GuarantorStatus).map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Input
                                        id={`guarantors.${index}.netIncome`}
                                        label="Net Monthly Income (€)"
                                        type="number"
                                        formatPrice
                                        disabled={isLoading}
                                        register={register}
                                        errors={errors}
                                        required
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4">
                        <Button
                            label="Save Profile"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default TenantProfileClient;
