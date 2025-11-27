'use client';

import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";

import { SafeListing } from "@/types";
import Input from "@/components/inputs/Input";
import { Button } from "@/components/ui/Button";

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
                toast.success('Title updated!');
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
        <div className="flex flex-col gap-8">
            <Input
                id="title"
                label="Titre"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
            />
            <div className="flex flex-row justify-end">
                <Button
                    disabled={isLoading}
                    label="Enregistrer"
                    onClick={handleSubmit(onSubmit)}
                />
            </div>
        </div>
    );
}

export default TitleSection;
