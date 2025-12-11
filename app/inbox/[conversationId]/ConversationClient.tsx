'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SafeUser, SafeMessage, SafeListing } from "@/types";
import clsx from "clsx";
import Header from "./components/Header";
import Body from "./components/Body";
import Form from "./components/Form";
import TenantProfilePreview from "@/components/profile/TenantProfilePreview";
import VisitSlotSelector from "@/components/visits/VisitSlotSelector";
import { Conversation, User } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import axios from "axios";
import { toast } from "react-hot-toast";

interface ConversationClientProps {
    conversation: Conversation & {
        users: User[]
    };
    currentUser: SafeUser | null;
    initialMessages: SafeMessage[];
    rent?: number;
    otherUser: SafeUser | null;
    showDossier: boolean;
    candidateScope?: {
        compositionType: string;
        membersIds: string[];
        coupleLegalStatus?: string | null;
        targetLeaseType: string;
        targetMoveInDate?: string | null;
        childCount: number;
    } | null;
    listing?: (SafeListing & { user?: SafeUser }) | null;
}

const ConversationClient: React.FC<ConversationClientProps> = ({
    conversation,
    currentUser,
    initialMessages,
    rent,
    otherUser,
    showDossier,
    listing,
    candidateScope
}) => {
    const router = useRouter();



    const [messages, setMessages] = useState(initialMessages);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    const handleOptimisticMessage = useCallback((message: SafeMessage) => {
        setMessages((current) => [...current, message]);
    }, []);

    const [isDossierOpen, setIsDossierOpen] = useState(false);

    useEffect(() => {
        if (window.innerWidth >= 1024) {
            setIsDossierOpen(true);
        }
    }, []);

    const [isVisitSelectionOpen, setIsVisitSelectionOpen] = useState(false);

    const toggleDossier = useCallback(() => {
        setIsDossierOpen((value) => !value);
    }, []);

    const handleOpenVisitSelection = useCallback(() => {
        setIsVisitSelectionOpen(true);
        // Ensure dossier is closed if we open visit selection (though they are mutually exclusive in render logic usually)
        if (showDossier) {
            // If showDossier is true (owner view), this handler shouldn't strictly be called by candidate logic, 
            // but just in case. 
            // Actually, candidate view is !showDossier.
        }
    }, [showDossier]);

    const isImperial = currentUser?.measurementSystem === 'imperial';
    const surface = listing?.surface;
    const displaySurface = surface
        ? (isImperial ? Math.round(surface * 10.764) : surface)
        : null;
    const unit = isImperial ? 'sq ft' : 'm²';

    return (
        <div className="h-full flex flex-row">
            <div className="h-full flex flex-col flex-1 min-w-0 border-r border-gray-200">
                <div className="flex-none">
                    <Header conversation={conversation} onToggleDossier={toggleDossier} />
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                    <Body initialMessages={messages} onOpenVisitSlots={handleOpenVisitSelection} />
                </div>
                <div className="flex-none bg-white">
                    <Form
                        onOptimisticMessage={handleOptimisticMessage}
                        currentUser={currentUser}
                    />
                </div>
            </div>
            {/* Dossier Sidebar - Desktop Only for now or Drawer? keeping simple for existing logic */}
            {showDossier && otherUser && otherUser.id !== currentUser?.id && otherUser.tenantProfile && (
                <div className="hidden xl:flex flex-col w-[410px] h-full bg-white border-l border-gray-200">
                    <div className="
                        flex-none
                        bg-white 
                        w-full 
                        flex 
                        border-b 
                        border-gray-200
                        py-3 
                        px-6 
                        items-center
                        h-[73px]
                    ">
                        <h2 className="text-2xl font-medium text-neutral-800">Dossier candidat</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <TenantProfilePreview
                            user={otherUser}
                            tenantProfile={otherUser.tenantProfile as any}
                            rent={rent}
                            candidateScope={candidateScope}
                        />
                    </div>
                    <div className="
                        flex-none
                        bg-white
                        border-t
                        border-gray-200
                        p-4
                    ">
                        <Button
                            label="Proposer une visite"
                            onClick={() => {
                                if (!listing) return;
                                axios.post('/api/messages', {
                                    message: 'INVITATION_VISITE',
                                    conversationId: conversation.id,
                                    listingId: listing.id
                                })
                                    .then(() => {
                                        toast.success('Invitation envoyée');
                                        router.refresh();
                                    })
                                    .catch(() => toast.error('Erreur lors de l\'envoi'));
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Right Sidebar (Visit Selection or Listing Recap) */}
            {!showDossier && rent && (
                <div className={clsx(`
                    flex flex-col h-full bg-white border-l border-gray-200
                    xl:w-[410px]
                    `,
                    isVisitSelectionOpen ? "fixed inset-0 z-50 w-full xl:static xl:z-auto" : "hidden xl:flex w-[410px]"
                )}>
                    <div className="
                        flex-none
                        bg-white 
                        w-full 
                        flex 
                        border-b 
                        border-gray-200
                        py-3 
                        px-6 
                        items-center
                        justify-between
                        h-[73px]
                    ">
                        <h2 className="text-2xl font-medium text-neutral-800">
                            {isVisitSelectionOpen ? 'Visites' : 'Récapitulatif'}
                        </h2>
                        {/* Mobile Close Button */}
                        {isVisitSelectionOpen && (
                            <button
                                onClick={() => setIsVisitSelectionOpen(false)}
                                className="p-2 -mr-2 text-gray-500 hover:text-black xl:hidden"
                            >
                                <span className="sr-only">Fermer</span>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {isVisitSelectionOpen && listing ? (
                        <div className="flex-1 overflow-y-auto">
                            <VisitSlotSelector
                                listingId={listing.id}
                                currentUser={currentUser}
                                onSuccess={() => setIsVisitSelectionOpen(false)}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex flex-col gap-4">
                                <div className="aspect-square w-full relative overflow-hidden rounded-xl">
                                    <img
                                        src={listing?.images?.[0]?.url || "/images/placeholder.jpg"}
                                        alt="Listing"
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-xl font-bold">
                                            {rent} € <span className="font-light text-neutral-500 text-sm">/ mois</span>
                                        </div>
                                        <div className="text-sm font-medium text-neutral-500">
                                            {listing?.category || "Appartement"} - {listing?.city}
                                        </div>
                                        <div className="text-sm text-neutral-500">
                                            Propriétaire : {listing?.user?.name}
                                        </div>
                                        <div className="text-sm text-neutral-500 mt-1">
                                            {listing?.roomCount} pièces • {listing?.guestCount} chambres • {displaySurface} {unit}
                                        </div>
                                        <div className="mt-4">
                                            <div className="font-bold text-sm text-neutral-900">
                                                Vous avez envoyé une candidature
                                            </div>
                                            <div className="text-sm text-neutral-500 mt-1">
                                                {listing?.user?.name} a bien reçu votre résumé et dossier et va maintenant étudier votre profil.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ConversationClient;
