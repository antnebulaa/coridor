'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SafeUser, SafeMessage, SafeListing } from "@/types";
import clsx from "clsx";
import { format } from "date-fns";
import Header from "./components/Header";
import Body from "./components/Body";
import Form from "./components/Form";
import TenantProfilePreview from "@/components/profile/TenantProfilePreview";
import VisitSlotSelector from "@/components/visits/VisitSlotSelector";
import { Conversation, User } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import axios from "axios";
import { toast } from "react-hot-toast";
import Modal from "@/components/modals/Modal";
import Heading from "@/components/Heading";
import useRealtimeNotifications from "@/hooks/useRealtimeNotifications";

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
    applicationId?: string | null;
    conversationId?: string;
    confirmedVisit?: {
        id: string;
        date: string;
        startTime: string;
        endTime: string;
    } | null;
}

const ConversationClient: React.FC<ConversationClientProps> = ({
    conversation,
    currentUser,
    initialMessages,
    rent,
    otherUser,
    showDossier,
    listing,
    candidateScope,
    applicationId,
    conversationId,
    confirmedVisit
}) => {
    const router = useRouter();

    const [messages, setMessages] = useState(initialMessages);
    const hasProposedVisit = messages.some(m => m.body === 'INVITATION_VISITE' || m.body?.startsWith('VISIT_CONFIRMED|'));

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    // Realtime subscription for new messages in this conversation
    useRealtimeNotifications({
        userId: currentUser?.id,
        conversationId: conversation.id,
        onNewMessage: () => {
            router.refresh();
        }
    });

    const handleOptimisticMessage = useCallback((message: SafeMessage) => {
        setMessages((current) => [...current, message]);
    }, []);

    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);

    // Check if listing has availability defined
    // Check if listing has availability defined
    const [hasAvailability, setHasAvailability] = useState(() => {
        if (!listing || !listing.visitSlots) return false;
        return listing.visitSlots.length > 0;
    });

    useEffect(() => {
        if (listing?.id) {
            // Double check with API to handle Back-button navigation (stale props)
            // AND to ensure we have *future* slots available.
            axios.get(`/api/listings/${listing.id}/available-visits`)
                .then((response) => {
                    if (response.data && response.data.length > 0) {
                        setHasAvailability(true);
                    }
                })
                .catch((error) => console.error("Failed to check availability", error));
        }
    }, [listing?.id]);

    const [isDossierOpen, setIsDossierOpen] = useState(false);

    useEffect(() => {
        if (window.innerWidth >= 1024) {
            setIsDossierOpen(true);
        }
    }, []);

    const [isVisitSelectionOpen, setIsVisitSelectionOpen] = useState(false);
    const [isMobileRecapOpen, setIsMobileRecapOpen] = useState(false);

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

    const handleOpenListingRecap = useCallback(() => {
        setIsMobileRecapOpen(true);
    }, []);

    const isImperial = currentUser?.measurementSystem === 'imperial';
    const surface = listing?.surface;
    const displaySurface = surface
        ? (isImperial ? Math.round(surface * 10.764) : surface)
        : null;
    const unit = isImperial ? 'sq ft' : 'm²';

    // Helper to generate .ics file
    const downloadICS = useCallback(() => {
        if (!confirmedVisit || !listing) return;

        const { date, startTime, endTime } = confirmedVisit;
        // Clean date string to YYYYMMDD
        const dateOnly = date.split('T')[0].replace(/-/g, '');
        const startStr = startTime.replace(':', '') + '00';
        const endStr = endTime.replace(':', '') + '00';

        const startDate = `${dateOnly}T${startStr}`;
        const endDate = `${dateOnly}T${endStr}`;

        // Construct title: T{roomCount} {surface}m² {city}
        const roomInfo = listing.roomCount ? `T${listing.roomCount}` : (listing.category || 'Visite');
        const surfaceInfo = listing.surface ? ` ${listing.surface}m²` : '';
        const title = `Visite - ${roomInfo}${surfaceInfo} à ${listing.city || ''}`;

        // Construct full address
        const parts = [
            listing.addressLine1,
            listing.zipCode,
            listing.city
        ].filter(Boolean);

        const location = parts.join(' ');

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `DTSTART:${startDate}`,
            `DTEND:${endDate}`,
            `SUMMARY:${title}`,
            `LOCATION:${location}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'visite.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [confirmedVisit, listing]);

    // Timeline Steps Logic
    const timelineSteps = useMemo(() => {
        const steps: { title: string; description: any; completed: boolean }[] = [
            {
                title: "Candidature envoyée",
                description: "Le propriétaire a bien reçu votre dossier et étudie votre profil.",
                completed: true
            }
        ];

        if (hasProposedVisit) {
            steps.push({
                title: "Proposition de visite",
                description: "Votre profil intéresse le propriétaire qui vous propose une visite.",
                completed: true
            });
        }

        if (confirmedVisit) {
            let dateFormatted = confirmedVisit.date;
            try {
                dateFormatted = format(new Date(confirmedVisit.date), 'dd/MM/yyyy');
            } catch (e) { }

            steps.push({
                title: "Rendez-vous confirmé",
                description: (
                    <span>
                        Visite programmée le <button onClick={downloadICS} className="font-medium underline text-neutral-700 hover:text-black">
                            {dateFormatted}
                        </button> à <button onClick={downloadICS} className="font-medium underline text-neutral-700 hover:text-black">
                            {confirmedVisit.startTime}
                        </button>.
                    </span>
                ),
                completed: true
            });
        }

        return steps;
    }, [hasProposedVisit, confirmedVisit, downloadICS]);

    return (
        <div className="h-full flex flex-row">
            <div className="h-full flex flex-col flex-1 min-w-0">
                <div className="flex-none">
                    <Header
                        conversation={conversation}
                        onToggleDossier={toggleDossier}
                        onOpenListingRecap={handleOpenListingRecap}
                        showDossier={showDossier}
                    />
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                    <Body
                        initialMessages={messages}
                        onOpenVisitSlots={handleOpenVisitSelection}
                        onToggleDossier={toggleDossier}
                        onOpenListingRecap={handleOpenListingRecap}
                        showDossier={showDossier}
                        confirmedVisit={confirmedVisit}
                    />
                </div>
                <div className="flex-none bg-white dark:bg-neutral-900">
                    <Form
                        onOptimisticMessage={handleOptimisticMessage}
                        currentUser={currentUser}
                    />
                </div>
            </div>
            {/* Dossier Sidebar - Desktop Only for now or Drawer? keeping simple for existing logic */}
            {showDossier && otherUser && otherUser.id !== currentUser?.id && otherUser.tenantProfile && (
                <div className={clsx(`
                    flex-col h-full bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-800
                    xl:w-[410px]
                    `,
                    isDossierOpen ? "fixed inset-0 z-50 w-full flex xl:static xl:z-auto xl:w-[410px] xl:border-l" : "hidden xl:flex"
                )}>
                    <div className="
                        flex-none
                        bg-white dark:bg-neutral-900
                        w-full 
                        flex 
                        border-b 
                        border-gray-200 dark:border-neutral-800
                        py-3 
                        px-6 
                        items-center
                        justify-between
                        h-[73px]
                    ">
                        <h2 className="text-2xl font-medium text-neutral-800 dark:text-white">Dossier candidat</h2>
                        <button
                            onClick={() => setIsDossierOpen(false)}
                            className="xl:hidden p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                        >
                            <span className="sr-only">Fermer</span>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <TenantProfilePreview
                            user={otherUser}
                            tenantProfile={otherUser.tenantProfile as any}
                            rent={rent}
                            charges={listing?.charges}
                            candidateScope={candidateScope}
                        />
                    </div>
                    <div className="
                        flex-none
                        bg-white dark:bg-neutral-900
                        border-t
                        border-gray-200 dark:border-neutral-800
                        p-4
                    ">
                        <Button
                            disabled={!listing}
                            label={hasProposedVisit ? "Générer le bail de location" : "Proposer une visite"}
                            onClick={() => {
                                if (!listing) return;

                                if (hasProposedVisit) {
                                    // Generate Lease Action
                                    if (applicationId) {
                                        // Open proper viewer page
                                        window.open(`/leases/${applicationId}`, '_blank');
                                    } else {
                                        toast.error("Aucune demande de location trouvée pour ce dossier.");
                                    }
                                    return;
                                }

                                if (!hasAvailability) {
                                    setIsAvailabilityModalOpen(true);
                                    return;
                                }

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

            <Modal
                isOpen={isAvailabilityModalOpen}
                onClose={() => setIsAvailabilityModalOpen(false)}
                title="Définissez vos disponibilités"
                actionLabel="Définir mes créneaux"
                onSubmit={() => {
                    // Link to the visit section of the edit page
                    if (listing) {
                        router.push(`/properties/${listing.id}/edit?section=visits`);
                    }
                }}
                body={
                    <div className="flex flex-col gap-4">
                        <div className="w-full flex justify-center mb-2">
                            <Image
                                src="/images/no-slots.png"
                                alt="Aucun créneau"
                                width={300}
                                height={200}
                                className="object-contain"
                            />
                        </div>
                        <Heading
                            title="Vous n'avez pas de créneaux disponibles"
                            subtitle="Pour proposer une visite, vous devez d'abord définir vos disponibilités."
                        />
                        <p className="text-neutral-500">
                            Cela permet aux candidats de choisir un créneau parmi ceux que vous avez définis, évitant ainsi les allers-retours inutiles.
                        </p>
                    </div>
                }
            />

            {/* Right Sidebar (Visit Selection or Listing Recap) */}
            {
                !showDossier && rent && (
                    <div className={clsx(`
                    flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-800
                    xl:w-[410px]
                    `,
                        (isVisitSelectionOpen || isMobileRecapOpen) ? "fixed inset-0 z-50 w-full xl:static xl:z-auto" : "hidden xl:flex w-[410px]"
                    )}>
                        <div className="
                        flex-none
                        bg-white dark:bg-neutral-900
                        w-full 
                        flex 
                        border-b 
                        border-gray-200 dark:border-neutral-800
                        py-3 
                        px-6 
                        items-center
                        justify-between
                        h-[73px]
                    ">
                            <h2 className="text-2xl font-medium text-neutral-800 dark:text-white">
                                {isVisitSelectionOpen ? 'Visites' : 'Récapitulatif'}
                            </h2>
                            {/* Mobile Close Button */}
                            {(isVisitSelectionOpen || isMobileRecapOpen) && (
                                <button
                                    onClick={() => {
                                        setIsVisitSelectionOpen(false);
                                        setIsMobileRecapOpen(false);
                                    }}
                                    className="p-2 -mr-2 text-gray-500 hover:text-black dark:text-neutral-400 dark:hover:text-white xl:hidden"
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
                                    onSuccess={() => {
                                        setIsVisitSelectionOpen(false);
                                        router.refresh();
                                    }}
                                    conversationId={conversationId}
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
                                            <div className="text-2xl font-medium dark:text-white">
                                                {rent} € <span className="font-light text-neutral-500 dark:text-neutral-400 text-sm">/ mois</span>
                                            </div>
                                            <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                                                {listing?.category || "Appartement"} - {listing?.city}
                                            </div>
                                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                Propriétaire : {listing?.user?.name}
                                            </div>
                                            <div className="text-md text-neutral-500 dark:text-neutral-400 mt-1">
                                                {listing?.roomCount} pièces • {listing?.guestCount} chambres • {displaySurface} {unit}
                                            </div>
                                            <div className="mt-8 mb-12">
                                                <div className="flex flex-col">
                                                    {timelineSteps.map((step, index) => {
                                                        const isLast = index === timelineSteps.length - 1;
                                                        return (
                                                            <div key={index} className="relative pl-6 pb-8 last:pb-0">
                                                                {/* Line */}
                                                                {!isLast && (
                                                                    <div
                                                                        className="absolute left-[3.5px] top-3 w-px bg-neutral-200 dark:bg-neutral-800 -bottom-2 mt-2 mb-2"
                                                                        aria-hidden="true"
                                                                    />
                                                                )}

                                                                {/* Dot */}
                                                                <div
                                                                    className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-neutral-900 dark:bg-white z-10"
                                                                    aria-hidden="true"
                                                                />

                                                                <div className="flex flex-col gap-1">
                                                                    <div className="font-medium text-base text-neutral-900 dark:text-white leading-none mt-0.5">
                                                                        {step.title}
                                                                    </div>
                                                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                                                        {step.description}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
}

export default ConversationClient;
