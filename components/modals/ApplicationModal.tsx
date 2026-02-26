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
import { FileText, GraduationCap, Briefcase, AlertTriangle } from "lucide-react";

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

    // Determine if listing offers special lease options
    const isFurnished = !!(listing.rentalUnit as any)?.isFurnished || (listing as any).isFurnished;
    const acceptsStudent = !!(listing as any).acceptsStudentLease;
    const acceptsMobility = !!(listing as any).acceptsMobilityLease;
    const showLeaseSelector = isFurnished && (acceptsStudent || acceptsMobility);

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
            message: '',
            specificLeaseRequest: 'DEFAULT',
            mobilityReason: '',
        }
    });

    const message = watch('message');
    const specificLeaseRequest = watch('specificLeaseRequest');
    const setCustomValue = (id: string, value: any) => setValue(id, value, { shouldValidate: true, shouldDirty: true });

    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        // Validate mobility reason
        if (data.specificLeaseRequest === 'MOBILITY' && !data.mobilityReason?.trim()) {
            toast.custom((t) => (
                <CustomToast t={t} message="Veuillez indiquer le motif de votre bail mobilité." type="error" />
            ));
            setIsLoading(false);
            return;
        }

        axios.post('/api/applications', {
            listingId: listing.id,
            message: data.message,
            specificLeaseRequest: data.specificLeaseRequest || 'DEFAULT',
            ...(data.specificLeaseRequest === 'MOBILITY' && { mobilityReason: data.mobilityReason }),
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
                    {listing.images && listing.images.length > 0 ? (
                        <Image
                            fill
                            src={listing.images[0].url}
                            alt="Listing"
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-neutral-400">
                            <span className="text-xs">Aucune photo</span>
                        </div>
                    )}
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

            {/* Lease Type Selector — only when listing accepts special leases */}
            {showLeaseSelector && (
                <div className="flex flex-col gap-2">
                    <label className="font-semibold text-neutral-900 dark:text-neutral-100">
                        Type de bail souhaité
                    </label>
                    <div className="flex flex-col gap-2">
                        {/* Default lease */}
                        <button
                            type="button"
                            onClick={() => setCustomValue('specificLeaseRequest', 'DEFAULT')}
                            className={`
                                p-3 rounded-xl border flex items-center gap-3 text-left transition
                                ${specificLeaseRequest === 'DEFAULT'
                                    ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                    : 'border-neutral-200 dark:border-neutral-700'
                                }
                            `}
                        >
                            <FileText size={18} className="text-neutral-500 shrink-0" />
                            <div className="flex-1">
                                <span className="font-medium text-sm">Bail classique (1 an)</span>
                                <span className="text-xs text-neutral-500 block">Renouvelable tacitement</span>
                            </div>
                        </button>

                        {/* Student lease */}
                        {acceptsStudent && (
                            <button
                                type="button"
                                onClick={() => setCustomValue('specificLeaseRequest', 'STUDENT')}
                                className={`
                                    p-3 rounded-xl border flex items-center gap-3 text-left transition
                                    ${specificLeaseRequest === 'STUDENT'
                                        ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                        : 'border-neutral-200 dark:border-neutral-700'
                                    }
                                `}
                            >
                                <GraduationCap size={18} className="text-neutral-500 shrink-0" />
                                <div className="flex-1">
                                    <span className="font-medium text-sm">Bail étudiant (9 mois)</span>
                                    <span className="text-xs text-neutral-500 block">Non renouvelable, réservé aux étudiants</span>
                                </div>
                            </button>
                        )}

                        {/* Mobility lease */}
                        {acceptsMobility && (
                            <button
                                type="button"
                                onClick={() => setCustomValue('specificLeaseRequest', 'MOBILITY')}
                                className={`
                                    p-3 rounded-xl border flex items-center gap-3 text-left transition
                                    ${specificLeaseRequest === 'MOBILITY'
                                        ? 'border-black dark:border-white bg-neutral-50 dark:bg-neutral-800'
                                        : 'border-neutral-200 dark:border-neutral-700'
                                    }
                                `}
                            >
                                <Briefcase size={18} className="text-neutral-500 shrink-0" />
                                <div className="flex-1">
                                    <span className="font-medium text-sm">Bail mobilité (1-10 mois)</span>
                                    <span className="text-xs text-neutral-500 block">Pas de dépôt de garantie</span>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Mobility reason */}
                    {specificLeaseRequest === 'MOBILITY' && (
                        <div className="flex flex-col gap-1 mt-1">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Motif du bail mobilité *
                            </label>
                            <textarea
                                {...register('mobilityReason')}
                                placeholder="Ex : Stage de 6 mois chez..., Mission temporaire, Formation professionnelle..."
                                className="w-full p-3 text-sm font-light bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-lg outline-none focus:border-black dark:focus:border-white transition"
                                rows={2}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Tenant lease type compatibility warning */}
            {currentUser && (currentUser as any).tenantProfile?.targetLeaseType && (() => {
                const targetType = (currentUser as any).tenantProfile.targetLeaseType;
                const mismatch =
                    (targetType === 'EMPTY' && isFurnished) ||
                    (targetType === 'FURNISHED' && !isFurnished);
                if (!mismatch) return null;
                return (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>
                            Votre profil indique une préférence pour un logement {targetType === 'EMPTY' ? 'vide' : 'meublé'}, mais cette annonce est {isFurnished ? 'meublée' : 'vide'}.
                        </span>
                    </div>
                );
            })()}

            {/* Message Input */}
            <div className="flex flex-col gap-2">
                <label className="font-semibold text-neutral-900 dark:text-neutral-100">
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
