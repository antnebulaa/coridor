'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

import { SafeListing } from "@/types";
import SoftInput from "@/components/inputs/SoftInput";
import EditSectionFooter from "./EditSectionFooter";
import CustomToast from "@/components/ui/CustomToast";

interface TitleSectionProps {
    listing: SafeListing;
}

const TitleSection: React.FC<TitleSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues: {
            title: listing.title
        }
    });

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.put(`/api/listings/${listing.id}`, data)
            .then(() => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Titre mis à jour"
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
        <div className="flex flex-col gap-8">
            <SoftInput
                id="title"
                label="Titre"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />
            <EditSectionFooter
                disabled={isLoading}
                label="Enregistrer"
                onClick={handleSubmit(onSubmit)}
            />
        </div>
    );
}

export default TitleSection;
