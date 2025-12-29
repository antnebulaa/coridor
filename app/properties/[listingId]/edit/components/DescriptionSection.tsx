'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import SoftTextArea from "@/components/inputs/SoftTextArea";
import EditSectionFooter from "./EditSectionFooter";

interface DescriptionSectionProps {
    listing: SafeListing;
}

const DescriptionSection: React.FC<DescriptionSectionProps> = ({ listing }) => {
    const router = useRouter();
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
                toast.success('Description mise à jour !');
                router.refresh();
            })
            .catch(() => {
                toast.error('Une erreur est survenue.');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="text-neutral-500 text-sm">
                Décrivez votre logement en détail pour donner envie aux futurs locataires.
            </div>
            <SoftTextArea
                id="description"
                label="Description détaillée"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
                maxLength={1000}
                watchValue={descriptionValue}
            />
            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
}

export default DescriptionSection;
