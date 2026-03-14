'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

import { useTranslations } from "next-intl";
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import SoftTextArea from "@/components/inputs/SoftTextArea";
import EditSectionFooter from "./EditSectionFooter";
import CustomToast from "@/components/ui/CustomToast";

interface DescriptionSectionProps {
    listing: SafeListing;
}

const DescriptionSection: React.FC<DescriptionSectionProps> = ({ listing }) => {
    const router = useRouter();
    const t = useTranslations('properties');
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues: {
            description: listing.description || ''
        }
    });

    const descriptionValue = watch('description');

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.put(`/api/listings/${listing.id}`, data)
            .then(() => {
                toast.custom((toastData) => (
                    <CustomToast
                        t={toastData}
                        message={t('edit.description.saved')}
                        type="success"
                    />
                ));
                router.refresh();
            })
            .catch(() => {
                toast.custom((toastData) => (
                    <CustomToast
                        t={toastData}
                        message={t('edit.description.error')}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="text-neutral-500 text-sm">
                {t('edit.description.helper')}
            </div>
            <SoftTextArea
                id="description"
                label={t('edit.description.label')}
                disabled={isLoading}
                register={register}
                errors={errors}
                required
                maxLength={1000}
                watchValue={descriptionValue}
            />
            <EditSectionFooter
                disabled={isLoading}
                label={t('edit.save')}
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
}

export default DescriptionSection;
