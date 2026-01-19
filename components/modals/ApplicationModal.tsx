'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import Heading from "../Heading";
import SoftInput from "../inputs/SoftInput";
import { SafeListing, SafeUser } from "@/types";
import Image from "next/image";
import { Button } from "../ui/Button";
import CustomToast from "../ui/CustomToast";

interface ApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    listing: SafeListing;
    currentUser?: SafeUser | null;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({
    isOpen,
    onClose,
    listing,
    currentUser
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [encodedUrl, setEncodedUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setEncodedUrl(encodeURIComponent(window.location.href));
        }
    }, []);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: {
            errors,
        },
        reset
    } = useForm<FieldValues>({
        defaultValues: {
            message: ''
        }
    });

    const message = watch('message');

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        axios.post('/api/applications', {
            listingId: listing.id,
            message: data.message
        })
            .then((response) => {
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Candidature envoyée !"
                        type="success"
                    />
                ));
                reset();
                onClose();
                router.push(`/inbox/${response.data.id}`);
            })
            .catch((error) => {
                const message = error?.response?.data || 'Une erreur est survenue.';
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={message}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            })
    }

    const bodyContent = (
        <div className="flex flex-col gap-4">
            <Heading
                title="Déposer ma candidature"
                subtitle="Envoyez votre dossier complet au propriétaire."
            />

            {/* Listing Summary */}
            <div className="flex gap-4 items-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                    <Image
                        fill
                        src={listing.images[0].url}
                        alt="Listing"
                        className="object-cover"
                    />
                </div>
                <div className="flex flex-col">
                    <div className="font-bold">{listing.title}</div>
                    <div className="text-sm text-neutral-500">
                        {listing.city}, {listing.district}
                    </div>
                    <div className="font-semibold text-neutral-900 mt-1">
                        {listing.price} € / mois
                    </div>
                </div>
            </div>

            {/* Message Input */}
            <div className="flex flex-col gap-2">
                <label className="font-semibold text-neutral-900">
                    Message au propriétaire
                </label>
                <textarea
                    disabled={isLoading}
                    {...register('message', { required: true })}
                    placeholder="Bonjour, je suis très intéressé par votre appartement..."
                    className={`
                        w-full
                        p-4
                        font-light 
                        bg-white 
                        border-2
                        rounded-md
                        outline-none
                        transition
                        disabled:opacity-70
                        disabled:cursor-not-allowed
                        ${errors['message'] ? 'border-primary' : 'border-neutral-300'}
                        ${errors['message'] ? 'focus:border-primary' : 'focus:border-black'}
                    `}
                    rows={5}
                />
            </div>

            <div className="flex justify-between items-center text-sm text-neutral-500">
                <span>Votre dossier complet sera joint à ce message.</span>
                <Link
                    href={`/account/tenant-profile?returnUrl=${encodedUrl}`}
                    onClick={onClose}
                    className="text-neutral-800 underline font-medium hover:text-black"
                >
                    Modifier mon dossier
                </Link>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit(onSubmit)}
            actionLabel="Envoyer ma candidature"
            disabled={isLoading}
            body={bodyContent}
            title="Candidature"
        />
    );
}

export default ApplicationModal;
