'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SafeUser, SafeMessage, SafeListing } from "@/types";
import clsx from "clsx";
import { format } from "date-fns";
import AddToCalendarButton from "@/components/calendar/AddToCalendarButton";
import Header from "./components/Header";
import Body from "./components/Body";
import MessageForm from "./components/MessageForm";
import TenantProfilePreview from "@/components/profile/TenantProfilePreview";
import VisitSlotSelector from "@/components/visits/VisitSlotSelector";
import { Conversation, User } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import axios from "axios";
import { toast } from "react-hot-toast";
import Modal from "@/components/modals/Modal";
import Heading from "@/components/Heading";
import useRealtimeNotifications from "@/hooks/useRealtimeNotifications";
import { XCircle } from "lucide-react";

const REJECTION_REASONS = [
    "Le logement a déjà trouvé preneur",
    "Votre dossier ne correspond pas aux critères requis",
    "Un autre candidat a été retenu",
] as const;

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
    applicationStatus?: string | null;
    applicationRejectionReason?: string | null;
    leaseStatus?: string | null;
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
    applicationStatus: initialApplicationStatus,
    applicationRejectionReason: initialRejectionReason,
    leaseStatus: initialLeaseStatus,
    conversationId,
    confirmedVisit
}) => {
    const router = useRouter();

    const [messages, setMessages] = useState(initialMessages);
    const hasProposedVisit = messages.some(m => m.body === 'INVITATION_VISITE' || m.body?.startsWith('VISIT_CONFIRMED|') || m.body?.startsWith('VISIT_PENDING|'));
    const [applicationStatus, setApplicationStatus] = useState(initialApplicationStatus);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        setApplicationStatus(initialApplicationStatus);
    }, [initialApplicationStatus]);

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
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [customReason, setCustomReason] = useState('');
    const [isDeclining, setIsDeclining] = useState(false);

    const isRejected = applicationStatus === 'REJECTED';

    // Check if listing has availability defined
    const [hasAvailability, setHasAvailability] = useState(() => {
        if (!listing || !listing.visitSlots) return false;
        return listing.visitSlots.length > 0;
    });

    useEffect(() => {
        if (listing?.id) {
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
    }, []);

    const handleOpenListingRecap = useCallback(() => {
        setIsMobileRecapOpen(true);
    }, []);

    const handleDecline = useCallback(async () => {
        const reason = selectedReason === 'other' ? customReason.trim() : selectedReason;
        if (!reason) {
            toast.error('Veuillez sélectionner un motif');
            return;
        }
        if (!applicationId) {
            toast.error('Aucune candidature trouvée');
            return;
        }

        setIsDeclining(true);
        try {
            await axios.patch(`/api/applications/${applicationId}`, {
                status: 'REJECTED',
                rejectionReason: reason,
                conversationId: conversation.id
            });
            toast.success('Candidature déclinée');
            setIsDeclineModalOpen(false);
            setApplicationStatus('REJECTED');
            router.refresh();
        } catch {
            toast.error('Erreur lors du rejet');
        } finally {
            setIsDeclining(false);
        }
    }, [applicationId, selectedReason, customReason, conversation.id, router]);

    const isImperial = currentUser?.measurementSystem === 'imperial';
    const surface = listing?.surface;
    const displaySurface = surface
        ? (isImperial ? Math.round(surface * 10.764) : surface)
        : null;
    const unit = isImperial ? 'sq ft' : 'm²';

    // Helper to create calendar event object
    const getCalendarEvent = useCallback(() => {
        if (!confirmedVisit || !listing) return null;

        const roomInfo = listing.roomCount ? `T${listing.roomCount}` : (listing.category || 'Visite');
        const surfaceInfo = listing.surface ? ` ${listing.surface}m²` : '';
        const title = `Visite - ${roomInfo}${surfaceInfo} à ${listing.city || ''}`;

        const parts = [
            listing.addressLine1,
            listing.zipCode,
            listing.city
        ].filter(Boolean);

        return {
            title,
            date: confirmedVisit.date,
            startTime: confirmedVisit.startTime,
            endTime: confirmedVisit.endTime,
            location: parts.join(' '),
        };
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

        if (isRejected) {
            steps.push({
                title: "Candidature non retenue",
                description: initialRejectionReason
                    ? `Motif : ${initialRejectionReason}`
                    : "Le propriétaire a décliné votre candidature.",
                completed: true
            });
            return steps;
        }

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

            const calendarEvent = getCalendarEvent();
            steps.push({
                title: "Rendez-vous confirmé",
                description: (
                    <div className="flex flex-col gap-2">
                        <span>
                            Visite programmée le {dateFormatted} à {confirmedVisit.startTime}.
                        </span>
                        {calendarEvent && (
                            <AddToCalendarButton
                                event={calendarEvent}
                                variant="compact"
                                className="mt-1"
                            />
                        )}
                    </div>
                ),
                completed: true
            });
        }

        if (initialLeaseStatus === 'PENDING_SIGNATURE') {
            steps.push({
                title: "Bail envoyé pour signature",
                description: (
                    <div className="flex flex-col gap-2">
                        <span>Le bail de location est prêt à être signé. Vous allez recevoir un email de Yousign.</span>
                        {applicationId && (
                            <button
                                onClick={() => window.open(`/leases/${applicationId}`, '_blank')}
                                className="text-left text-sm font-medium text-blue-600 hover:text-blue-700 underline"
                            >
                                Consulter le bail
                            </button>
                        )}
                    </div>
                ),
                completed: true
            });
        } else if (initialLeaseStatus === 'SIGNED') {
            steps.push({
                title: "Bail signé",
                description: (
                    <div className="flex flex-col gap-2">
                        <span>Le bail a été signé par toutes les parties.</span>
                        {applicationId && (
                            <button
                                onClick={() => window.open(`/leases/${applicationId}`, '_blank')}
                                className="text-left text-sm font-medium text-green-600 hover:text-green-700 underline"
                            >
                                Voir le bail signé
                            </button>
                        )}
                    </div>
                ),
                completed: true
            });
        }

        return steps;
    }, [hasProposedVisit, confirmedVisit, getCalendarEvent, isRejected, initialRejectionReason, initialLeaseStatus, applicationId]);

    return (
        <div className="h-full flex flex-row">
            <div className="h-full flex flex-col flex-1 min-w-0">
                <div className="flex-none pt-safe bg-white dark:bg-neutral-900">
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
                        applicationId={applicationId}
                        confirmedVisit={confirmedVisit}
                    />
                </div>
                <div className="flex-none bg-white dark:bg-neutral-900"
                >
                    <MessageForm
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
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-medium text-neutral-800 dark:text-white">Dossier candidat</h2>
                            {isRejected && (
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                    Déclinée
                                </span>
                            )}
                        </div>
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

                    <div className={clsx("flex-1 overflow-y-auto p-6", isRejected && "opacity-50 grayscale")}>
                        <TenantProfilePreview
                            user={otherUser}
                            tenantProfile={otherUser.tenantProfile as any}
                            rent={rent}
                            charges={listing?.charges}
                            candidateScope={candidateScope}
                            showFullDossierLink={
                                hasProposedVisit &&
                                otherUser.accounts?.some((acc: any) => acc.provider === 'dossier-facile')
                            }
                        />
                    </div>

                    {/* Action buttons - hidden when rejected */}
                    {!isRejected && (
                        <div className="
                            flex-none
                            bg-white dark:bg-neutral-900
                            border-t
                            border-gray-200 dark:border-neutral-800
                            p-4
                            flex flex-col gap-2
                        ">
                            {/* Lease status-based actions */}
                            {initialLeaseStatus === 'SIGNED' ? (
                                <Button
                                    label="Voir le bail signé"
                                    outline
                                    onClick={() => {
                                        if (applicationId) {
                                            window.open(`/leases/${applicationId}`, '_blank');
                                        }
                                    }}
                                />
                            ) : initialLeaseStatus === 'PENDING_SIGNATURE' ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                                        En cours de signature...
                                    </div>
                                    <Button
                                        label="Voir le bail"
                                        outline
                                        onClick={() => {
                                            if (applicationId) {
                                                window.open(`/leases/${applicationId}`, '_blank');
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <Button
                                    disabled={!listing}
                                    label={hasProposedVisit ? "Générer le bail de location" : "Proposer une visite"}
                                    onClick={() => {
                                        if (!listing) return;

                                        if (hasProposedVisit) {
                                            if (applicationId) {
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
                            )}
                            <button
                                onClick={() => {
                                    setSelectedReason('');
                                    setCustomReason('');
                                    setIsDeclineModalOpen(true);
                                }}
                                className="w-full py-2.5 px-4 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                            >
                                Décliner la candidature
                            </button>
                        </div>
                    )}

                    {/* Rejected state footer */}
                    {isRejected && (
                        <div className="flex-none border-t border-gray-200 dark:border-neutral-800 p-4">
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                                <XCircle size={16} className="shrink-0" />
                                <span>Candidature déclinée</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Decline Modal */}
            <Modal
                isOpen={isDeclineModalOpen}
                onClose={() => setIsDeclineModalOpen(false)}
                title="Décliner la candidature"
                actionLabel={isDeclining ? "..." : "Confirmer le refus"}
                onSubmit={handleDecline}
                disabled={isDeclining || (!selectedReason || (selectedReason === 'other' && !customReason.trim()))}
                body={
                    <div className="flex flex-col gap-4">
                        <p className="text-neutral-500 text-sm">
                            Sélectionnez un motif pour informer le candidat. Coridor protège contre les discriminations en proposant des motifs respectueux et objectifs.
                        </p>
                        <div className="flex flex-col gap-2">
                            {REJECTION_REASONS.map((reason) => (
                                <label
                                    key={reason}
                                    className={clsx(
                                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition",
                                        selectedReason === reason
                                            ? "border-red-300 bg-red-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="rejectionReason"
                                        value={reason}
                                        checked={selectedReason === reason}
                                        onChange={() => setSelectedReason(reason)}
                                        className="accent-red-600"
                                    />
                                    <span className="text-sm text-neutral-800">{reason}</span>
                                </label>
                            ))}
                            <label
                                className={clsx(
                                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition",
                                    selectedReason === 'other'
                                        ? "border-red-300 bg-red-50"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                            >
                                <input
                                    type="radio"
                                    name="rejectionReason"
                                    value="other"
                                    checked={selectedReason === 'other'}
                                    onChange={() => setSelectedReason('other')}
                                    className="accent-red-600 mt-1"
                                />
                                <div className="flex-1">
                                    <span className="text-sm text-neutral-800">Autre raison</span>
                                    {selectedReason === 'other' && (
                                        <textarea
                                            value={customReason}
                                            onChange={(e) => setCustomReason(e.target.value)}
                                            placeholder="Précisez le motif..."
                                            rows={2}
                                            maxLength={200}
                                            className="mt-2 w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:border-red-300"
                                        />
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>
                }
            />

            <Modal
                isOpen={isAvailabilityModalOpen}
                onClose={() => setIsAvailabilityModalOpen(false)}
                title="Définissez vos disponibilités"
                actionLabel="Définir mes créneaux"
                onSubmit={() => {
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
                                                        const isRejectedStep = step.title === "Candidature non retenue";
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
                                                                    className={clsx(
                                                                        "absolute left-0 top-1.5 h-2 w-2 rounded-full z-10",
                                                                        isRejectedStep ? "bg-red-500" : "bg-neutral-900 dark:bg-white"
                                                                    )}
                                                                    aria-hidden="true"
                                                                />

                                                                <div className="flex flex-col gap-1">
                                                                    <div className={clsx(
                                                                        "font-medium text-base leading-none mt-0.5",
                                                                        isRejectedStep ? "text-red-600" : "text-neutral-900 dark:text-white"
                                                                    )}>
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
