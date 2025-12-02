'use client';

import { SafeUser } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";

import Heading from "@/components/Heading";
import SoftInput from "@/components/inputs/SoftInput";
import { Button } from "@/components/ui/Button";

interface PersonalInfoClientProps {
    currentUser?: SafeUser | null;
}

const PersonalInfoClient: React.FC<PersonalInfoClientProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);

    const {
        register,
        handleSubmit,
        formState: {
            errors,
        }
    } = useForm<FieldValues>({
        defaultValues: {
            name: currentUser?.name,
            email: currentUser?.email,
        }
    });

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.post('/api/settings', data)
            .then(() => {
                toast.success('Profile updated!');
                router.refresh();
                setIsEditingName(false);
                setIsEditingEmail(false);
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
            <div className="flex flex-row items-center justify-between">
                <Heading
                    title="Personal info"
                    subtitle="Update your personal details and how we can reach you."
                />
            </div>

            <hr />

            {/* Name Section */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="text-lg font-medium">
                            Legal name
                        </div>
                        <div className="text-neutral-500 font-light">
                            {isEditingName ? 'This is the name on your travel document, which could be a license or a passport.' : currentUser?.name}
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingName(!isEditingName)}
                        className="text-black underline font-medium cursor-pointer hover:text-neutral-800"
                    >
                        {isEditingName ? 'Cancel' : 'Edit'}
                    </div>
                </div>

                {isEditingName && (
                    <div className="w-full md:w-2/3 flex flex-col gap-4">
                        <SoftInput
                            id="name"
                            label="Name"
                            register={register}
                            errors={errors}
                            disabled={isLoading}
                        />
                        <Button
                            label="Save"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                        />
                    </div>
                )}
            </div>

            <hr />

            {/* Email Section */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="text-lg font-medium">
                            Email address
                        </div>
                        <div className="text-neutral-500 font-light">
                            {isEditingEmail ? 'Use an address you’ll always have access to.' : currentUser?.email}
                        </div>
                    </div>
                    <div
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        className="text-black underline font-medium cursor-pointer hover:text-neutral-800"
                    >
                        {isEditingEmail ? 'Cancel' : 'Edit'}
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
                            label="Save"
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
