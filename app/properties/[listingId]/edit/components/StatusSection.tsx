'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axios from "axios";
import { SafeListing } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Heading from "@/components/Heading";
import CustomToast from "@/components/ui/CustomToast";

interface StatusSectionProps {
    listing: SafeListing;
}

const StatusSection: React.FC<StatusSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isPublished, setIsPublished] = useState(listing.isPublished);

    const onToggle = () => {
        setIsLoading(true);
        const newStatus = !isPublished;

        axios.patch(`/api/listings/${listing.id}`, {
            isPublished: newStatus
        })
            .then(() => {
                setIsPublished(newStatus);
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message={newStatus ? 'Annonce publiée !' : 'Annonce mise en pause.'}
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
            });
    }

    const formattedDate = listing.statusUpdatedAt ? formatDistanceToNow(new Date(listing.statusUpdatedAt), {
        addSuffix: true,
        locale: fr
    }) : 'récemment';

    return (
        <div className="flex flex-col gap-8">
            <Heading
                title="Statut de l'annonce"
                subtitle="Gérez la visibilité de votre annonce sur la plateforme."
            />
            <div className="
                flex 
                flex-col 
                gap-4 
                p-6 
                border 
                rounded-xl 
                transition
                hover:shadow-md
                bg-white
            ">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <div className="font-semibold text-lg">
                            {isPublished ? 'Annonce publiée' : 'Annonce en pause'}
                        </div>
                        <div className="font-light text-neutral-500 mt-1">
                            {isPublished
                                ? "Votre annonce est visible par tous les utilisateurs."
                                : "Votre annonce est masquée et n'apparaît plus dans les résultats de recherche."}
                        </div>
                        <div className="text-sm text-neutral-400 mt-2">
                            {isPublished ? 'Publié' : 'En pause'} {formattedDate}
                        </div>
                    </div>
                    <div
                        onClick={!isLoading ? onToggle : undefined}
                        className={`
                            relative
                            inline-flex
                            h-8
                            w-14
                            shrink-0
                            cursor-pointer
                            items-center
                            rounded-full
                            border-2
                            border-transparent
                            transition-colors
                            duration-200
                            ease-in-out
                            focus:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-black
                            focus-visible:ring-offset-2
                            ${isPublished ? 'bg-primary' : 'bg-neutral-200'}
                            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <span
                            className={`
                                pointer-events-none
                                inline-block
                                h-7
                                w-7
                                transform
                                rounded-full
                                bg-white
                                shadow-lg
                                ring-0
                                transition
                                duration-200
                                ease-in-out
                                ${isPublished ? 'translate-x-6' : 'translate-x-0'}
                            `}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StatusSection;
