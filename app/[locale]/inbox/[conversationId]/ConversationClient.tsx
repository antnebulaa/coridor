'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SafeUser, SafeMessage, SafeListing } from "@/types";
import clsx from "clsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import { XCircle, CalendarDays, Play } from "lucide-react";
import BottomSheet from "@/components/ui/BottomSheet";
import DocumentsPanel from "@/components/messaging/DocumentsPanel";
import { AnimatePresence, motion } from "framer-motion";
import { shouldRevealIdentity } from "@/lib/pseudonym/utils";

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
    inspectionData?: {
        id: string;
        status: string;
        type: string;
        pdfUrl: string | null;
        scheduledAt: string | null;
    } | null;
    exitInspectionData?: {
        id: string;
        status: string;
        type: string;
        pdfUrl: string | null;
        scheduledAt: string | null;
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
    confirmedVisit,
    inspectionData,
    exitInspectionData
}) => {
    const router = useRouter();

    const [messages, setMessages] = useState(initialMessages);
    const hasProposedVisit = messages.some(m => m.body === 'INVITATION_VISITE' || m.body?.startsWith('VISIT_CONFIRMED|') || m.body?.startsWith('VISIT_PENDING|'));
    const [applicationStatus, setApplicationStatus] = useState(initialApplicationStatus);
    const isLandlord = listing?.user?.id === currentUser?.id;
    const isIdentityRevealed = !isLandlord || shouldRevealIdentity(applicationStatus, initialLeaseStatus);

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

    const [isDocumentsPanelOpen, setIsDocumentsPanelOpen] = useState(false);
    const [highlightedDocumentId, setHighlightedDocumentId] = useState<string | null>(null);

    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [customReason, setCustomReason] = useState('');
    const [isDeclining, setIsDeclining] = useState(false);

    // EDL scheduling
    const [isEdlSheetOpen, setIsEdlSheetOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('10:00');
    const [isScheduling, setIsScheduling] = useState(false);

    // EDL sortie
    const [isExitEdlSheetOpen, setIsExitEdlSheetOpen] = useState(false);
    const [isStartingExitEdl, setIsStartingExitEdl] = useState(false);

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

    const handleToggleDocuments = useCallback(() => {
        setIsDocumentsPanelOpen((v) => !v);
        setHighlightedDocumentId(null);
    }, []);

    const handleViewInPanel = useCallback((documentId: string) => {
        setIsDocumentsPanelOpen(true);
        setHighlightedDocumentId(documentId);
        // Auto-clear highlight after 3s
        setTimeout(() => setHighlightedDocumentId(null), 3000);
    }, []);

    const handleScrollToMessage = useCallback((messageId: string) => {
        setIsDocumentsPanelOpen(false);
        // Small delay for panel close animation
        setTimeout(() => {
            const el = document.getElementById(`message-${messageId}`);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("bg-amber-50", "dark:bg-amber-900/20");
                setTimeout(() => {
                    el.classList.remove("bg-amber-50", "dark:bg-amber-900/20");
                }, 2000);
            }
        }, 100);
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

    const handleScheduleEdl = useCallback(async () => {
        if (!scheduleDate || !applicationId) return;
        setIsScheduling(true);
        try {
            const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
            await axios.post('/api/inspection', {
                applicationId,
                type: 'ENTRY',
                scheduledAt,
            });
            toast.success('État des lieux planifié');
            setIsScheduleModalOpen(false);
            router.refresh();
        } catch {
            toast.error("Erreur lors de la planification");
        } finally {
            setIsScheduling(false);
        }
    }, [scheduleDate, scheduleTime, applicationId, router]);

    const handleStartExitEdl = useCallback(async (scheduled?: boolean) => {
        if (!applicationId) return;
        setIsStartingExitEdl(true);
        try {
            const payload: Record<string, unknown> = { applicationId, type: 'EXIT' };
            if (scheduled && scheduleDate) {
                payload.scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
            }
            const res = await axios.post('/api/inspection', payload);
            toast.success('État des lieux de sortie créé');
            setIsExitEdlSheetOpen(false);
            if (!scheduled) {
                router.push(`/inspection/${res.data.id}`);
            } else {
                router.refresh();
            }
        } catch {
            toast.error("Erreur lors de la création de l'EDL de sortie");
        } finally {
            setIsStartingExitEdl(false);
        }
    }, [applicationId, scheduleDate, scheduleTime, router]);

    const isImperial = currentUser?.measurementSystem === 'imperial';
    const surface = listing?.surface;
    const displaySurface = surface
        ? (isImperial ? Math.round(surface * 10.764) : surface)
        : null;
    const unit = isImperial ? 'sq ft' : 'm²';

    // Helper to create calendar event object
    const getCalendarEvent = useCallback(() => {
        if (!confirmedVisit || !listing) return null;

        const roomInfo = listing.roomCount ? `T${listing.roomCount}` : (listing.rentalUnit?.property?.category || 'Visite');
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
    const isSelected = initialApplicationStatus === 'SELECTED' || initialApplicationStatus === 'SHORTLISTED' || initialApplicationStatus === 'FINALIST';
    const hasLeaseAction = initialLeaseStatus === 'PENDING_SIGNATURE' || initialLeaseStatus === 'SIGNED';

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

        // Selected / shortlisted — show if explicitly selected OR if lease process has started
        if (isSelected || hasLeaseAction) {
            steps.push({
                title: "Candidature retenue",
                description: "Votre profil a été sélectionné par le propriétaire.",
                completed: true
            });
        }

        // Lease steps
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
            // Show both steps when signed: the signature step (completed) + signed step
            steps.push({
                title: "Bail envoyé pour signature",
                description: "Le bail a été envoyé pour signature électronique.",
                completed: true
            });
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

        // EDL timeline step
        if (inspectionData) {
            if (inspectionData.status === 'CANCELLED') {
                steps.push({
                    title: "État des lieux annulé",
                    description: "L'état des lieux a été annulé par le propriétaire.",
                    completed: true
                });
            } else if (inspectionData.status === 'SIGNED' || inspectionData.status === 'LOCKED') {
                steps.push({
                    title: "État des lieux signé",
                    description: "L'état des lieux a été signé par les deux parties.",
                    completed: true
                });
            } else if (inspectionData.status === 'DRAFT' && inspectionData.scheduledAt) {
                const schedDate = new Date(inspectionData.scheduledAt);
                const dateStr = schedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
                const timeStr = schedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                steps.push({
                    title: "État des lieux planifié",
                    description: `Prévu le ${dateStr} à ${timeStr}.`,
                    completed: false
                });
            } else if (inspectionData.status === 'DRAFT') {
                steps.push({
                    title: "État des lieux en cours",
                    description: "L'inspection du logement est en cours de réalisation.",
                    completed: false
                });
            } else if (inspectionData.status === 'PENDING_SIGNATURE') {
                steps.push({
                    title: "État des lieux — signature",
                    description: "En attente de la signature du locataire.",
                    completed: false
                });
            }
        }

        // EXIT inspection timeline step
        if (exitInspectionData) {
            if (exitInspectionData.status === 'CANCELLED') {
                steps.push({
                    title: "EDL de sortie annulé",
                    description: "L'état des lieux de sortie a été annulé.",
                    completed: true
                });
            } else if (exitInspectionData.status === 'SIGNED' || exitInspectionData.status === 'LOCKED') {
                steps.push({
                    title: "EDL de sortie signé",
                    description: "L'état des lieux de sortie a été signé par les deux parties.",
                    completed: true
                });
            } else if (exitInspectionData.status === 'DRAFT' && exitInspectionData.scheduledAt) {
                const schedDate = new Date(exitInspectionData.scheduledAt);
                const dateStr = schedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
                const timeStr = schedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                steps.push({
                    title: "EDL de sortie planifié",
                    description: `Prévu le ${dateStr} à ${timeStr}.`,
                    completed: false
                });
            } else if (exitInspectionData.status === 'DRAFT') {
                steps.push({
                    title: "EDL de sortie en cours",
                    description: "L'état des lieux de sortie est en cours de réalisation.",
                    completed: false
                });
            } else if (exitInspectionData.status === 'PENDING_SIGNATURE') {
                steps.push({
                    title: "EDL de sortie — signature",
                    description: "En attente de la signature du locataire.",
                    completed: false
                });
            }
        }

        return steps;
    }, [hasProposedVisit, confirmedVisit, getCalendarEvent, isRejected, initialRejectionReason, isSelected, hasLeaseAction, initialLeaseStatus, applicationId, inspectionData, exitInspectionData]);

    return (
        <div className="h-full flex flex-row">
            <div className="h-full flex flex-col flex-1 min-w-0">
                <div className="flex-none pt-safe bg-white dark:bg-neutral-900">
                    <Header
                        conversation={conversation}
                        onToggleDossier={toggleDossier}
                        onOpenListingRecap={handleOpenListingRecap}
                        showDossier={showDossier}
                        onToggleDocuments={handleToggleDocuments}
                        conversationId={conversation.id}
                        isIdentityRevealed={isIdentityRevealed}
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
                        leaseStatus={initialLeaseStatus}
                        onViewInPanel={handleViewInPanel}
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
                    <div className="flex-none pt-safe bg-white dark:bg-neutral-900" />

                    {/* Sliding panels container */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        <AnimatePresence initial={false} mode="sync">
                            {!isDocumentsPanelOpen ? (
                                <motion.div
                                    key="dossier"
                                    initial={{ x: "-100%", opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: "-100%", opacity: 0 }}
                                    transition={{ type: "spring", bounce: 0.05, duration: 0.35 }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    {/* Dossier Header */}
                                    <div className="
                                        flex-none
                                        bg-white dark:bg-neutral-900
                                        w-full
                                        flex
                                        border-b
                                        border-gray-200 dark:border-neutral-800
                                        h-[72px]
                                        px-6
                                        items-center
                                        justify-between
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

                                    {/* Dossier Content */}
                                    <div className={clsx("flex-1 overflow-y-auto p-6", isRejected && "opacity-50 grayscale")}>
                                        <TenantProfilePreview
                                            user={otherUser}
                                            tenantProfile={otherUser.tenantProfile as any}
                                            rent={rent}
                                            charges={listing?.charges}
                                            candidateScope={candidateScope}
                                            isIdentityRevealed={isIdentityRevealed}
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
                                            pb-12
                                            flex flex-col gap-2
                                        ">
                                            {initialLeaseStatus === 'SIGNED' ? (
                                                <div className="flex flex-col gap-2">
                                                    <Button
                                                        label="Voir le bail signé"
                                                        outline
                                                        onClick={() => {
                                                            if (applicationId) {
                                                                window.open(`/leases/${applicationId}`, '_blank');
                                                            }
                                                        }}
                                                    />
                                                    {isLandlord ? (
                                                        !inspectionData || inspectionData.status === 'CANCELLED' ? (
                                                            <>
                                                                <Button
                                                                    label="État des lieux"
                                                                    onClick={() => setIsEdlSheetOpen(true)}
                                                                />
                                                                <BottomSheet
                                                                    isOpen={isEdlSheetOpen}
                                                                    onClose={() => setIsEdlSheetOpen(false)}
                                                                    title="État des lieux"
                                                                >
                                                                    <div className="flex flex-col p-2 pb-8">
                                                                        <button
                                                                            onClick={() => {
                                                                                setIsEdlSheetOpen(false);
                                                                                setIsScheduleModalOpen(true);
                                                                            }}
                                                                            className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition"
                                                                        >
                                                                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                                                                <CalendarDays size={20} className="text-amber-600" />
                                                                            </div>
                                                                            <div className="flex flex-col text-left">
                                                                                <span className="font-medium text-[16px]">Planifier un état des lieux</span>
                                                                                <span className="text-sm text-neutral-500">Choisir une date et notifier le locataire</span>
                                                                            </div>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setIsEdlSheetOpen(false);
                                                                                if (applicationId) {
                                                                                    router.push(`/inspection/new/${applicationId}`);
                                                                                }
                                                                            }}
                                                                            className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition"
                                                                        >
                                                                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                                                                <Play size={20} className="text-green-600" />
                                                                            </div>
                                                                            <div className="flex flex-col text-left">
                                                                                <span className="font-medium text-[16px]">Démarrer l&apos;état des lieux</span>
                                                                                <span className="text-sm text-neutral-500">Commencer immédiatement</span>
                                                                            </div>
                                                                        </button>
                                                                    </div>
                                                                </BottomSheet>
                                                            </>
                                                        ) : inspectionData.status === 'DRAFT' ? (
                                                            <Button
                                                                label={inspectionData.scheduledAt ? "Démarrer l'état des lieux" : "Reprendre l'état des lieux"}
                                                                onClick={() => router.push(`/inspection/${inspectionData!.id}`)}
                                                            />
                                                        ) : inspectionData.status === 'SIGNED' || inspectionData.status === 'LOCKED' ? (
                                                            <>
                                                                {inspectionData.pdfUrl && (
                                                                    <a
                                                                        href={inspectionData.pdfUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="w-full py-2.5 px-4 text-sm font-medium text-center text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition block"
                                                                    >
                                                                        Voir le PDF de l&apos;EDL d&apos;entrée
                                                                    </a>
                                                                )}
                                                                {/* EXIT inspection buttons */}
                                                                {!exitInspectionData || exitInspectionData.status === 'CANCELLED' ? (
                                                                    <>
                                                                        <Button
                                                                            label="État des lieux de sortie"
                                                                            onClick={() => setIsExitEdlSheetOpen(true)}
                                                                        />
                                                                        <BottomSheet
                                                                            isOpen={isExitEdlSheetOpen}
                                                                            onClose={() => setIsExitEdlSheetOpen(false)}
                                                                            title="État des lieux de sortie"
                                                                        >
                                                                            <div className="flex flex-col p-2 pb-8">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setIsExitEdlSheetOpen(false);
                                                                                        handleStartExitEdl(false);
                                                                                    }}
                                                                                    disabled={isStartingExitEdl}
                                                                                    className="flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition"
                                                                                >
                                                                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                                                                        <Play size={20} className="text-green-600" />
                                                                                    </div>
                                                                                    <div className="flex flex-col text-left">
                                                                                        <span className="font-medium text-[16px]">Démarrer maintenant</span>
                                                                                        <span className="text-sm text-neutral-500">Comparer avec l&apos;EDL d&apos;entrée</span>
                                                                                    </div>
                                                                                </button>
                                                                            </div>
                                                                        </BottomSheet>
                                                                    </>
                                                                ) : exitInspectionData.status === 'DRAFT' ? (
                                                                    <Button
                                                                        label={exitInspectionData.scheduledAt ? "Démarrer l'EDL de sortie" : "Reprendre l'EDL de sortie"}
                                                                        onClick={() => router.push(`/inspection/${exitInspectionData!.id}`)}
                                                                    />
                                                                ) : exitInspectionData.status === 'SIGNED' || exitInspectionData.status === 'LOCKED' ? (
                                                                    exitInspectionData.pdfUrl && (
                                                                        <a
                                                                            href={exitInspectionData.pdfUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="w-full py-2.5 px-4 text-sm font-medium text-center text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition block"
                                                                        >
                                                                            Voir le PDF de l&apos;EDL de sortie
                                                                        </a>
                                                                    )
                                                                ) : exitInspectionData.status === 'PENDING_SIGNATURE' ? (
                                                                    <div className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                                                                        EDL de sortie — en attente de signature
                                                                    </div>
                                                                ) : null}
                                                            </>
                                                        ) : inspectionData.status === 'PENDING_SIGNATURE' ? (
                                                            <div className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-neutral-900 rounded-xl border border-neutral-900">
                                                                En attente de signature locataire
                                                            </div>
                                                        ) : null
                                                    ) : (
                                                        <>
                                                            {inspectionData && inspectionData.status !== 'CANCELLED' && (inspectionData.status === 'SIGNED' || inspectionData.status === 'LOCKED') && inspectionData.pdfUrl && (
                                                                <a
                                                                    href={inspectionData.pdfUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-full py-2.5 px-4 text-sm font-medium text-center text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition block"
                                                                >
                                                                    Voir le PDF de l&apos;EDL d&apos;entrée
                                                                </a>
                                                            )}
                                                            {exitInspectionData && exitInspectionData.status !== 'CANCELLED' && (exitInspectionData.status === 'SIGNED' || exitInspectionData.status === 'LOCKED') && exitInspectionData.pdfUrl && (
                                                                <a
                                                                    href={exitInspectionData.pdfUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-full py-2.5 px-4 text-sm font-medium text-center text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition block"
                                                                >
                                                                    Voir le PDF de l&apos;EDL de sortie
                                                                </a>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
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
                                            {!initialLeaseStatus && (
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
                                            )}
                                        </div>
                                    )}

                                    {isRejected && (
                                        <div className="flex-none border-t border-gray-200 dark:border-neutral-800 p-4">
                                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                                                <XCircle size={16} className="shrink-0" />
                                                <span>Candidature déclinée</span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="documents"
                                    initial={{ x: "100%" }}
                                    animate={{ x: 0 }}
                                    exit={{ x: "100%" }}
                                    transition={{ type: "spring", bounce: 0.05, duration: 0.35 }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    <DocumentsPanel
                                        conversationId={conversation.id}
                                        onClose={() => setIsDocumentsPanelOpen(false)}
                                        onScrollToMessage={handleScrollToMessage}
                                        highlightedDocumentId={highlightedDocumentId}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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

            {/* Schedule EDL BottomSheet */}
            <BottomSheet
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                title="Planifier l'état des lieux"
            >
                <div className="flex flex-col px-6 pb-8">
                    {/* Hero date display */}
                    {(() => {
                        const displayDate = scheduleDate
                            ? new Date(scheduleDate + 'T12:00')
                            : new Date();
                        const hasSelected = !!scheduleDate;
                        return (
                            <div className="flex flex-col items-center py-6">
                                <span className={clsx(
                                    "text-sm font-medium uppercase tracking-widest",
                                    hasSelected ? "text-neutral-400" : "text-neutral-300 dark:text-neutral-600"
                                )}>
                                    {format(displayDate, 'EEEE', { locale: fr })}
                                </span>
                                <span className={clsx(
                                    "text-7xl font-bold leading-none mt-1",
                                    hasSelected ? "text-neutral-900 dark:text-white" : "text-neutral-200 dark:text-neutral-700"
                                )}>
                                    {format(displayDate, 'd')}
                                </span>
                                <span className={clsx(
                                    "text-xl font-medium mt-1",
                                    hasSelected ? "text-neutral-400" : "text-neutral-300 dark:text-neutral-600"
                                )}>
                                    {format(displayDate, 'MMMM yyyy', { locale: fr })}
                                </span>
                            </div>
                        );
                    })()}

                    {/* Date picker */}
                    <div className="relative mb-5">
                        <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl text-center text-sm font-medium text-transparent focus:outline-none transition appearance-none"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xl font-medium text-neutral-500 dark:text-neutral-400 pointer-events-none">
                            {scheduleDate ? 'Modifier la date' : 'Choisir une date'}
                        </span>
                    </div>

                    {/* Time selector */}
                    <div className="mb-5">
                        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3 block">Heure</span>
                        <div className="flex flex-wrap gap-2">
                            {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                                <button
                                    key={time}
                                    onClick={() => setScheduleTime(time)}
                                    className={clsx(
                                        "px-4 py-2.5 rounded-full text-sm font-semibold transition-all",
                                        scheduleTime === time
                                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 scale-105"
                                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                    )}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tip */}
                    <p className="text-xs text-neutral-400 text-center mb-5">
                        Prévoyez 1h à 1h30 selon la taille du logement
                    </p>

                    {/* CTA */}
                    <button
                        onClick={handleScheduleEdl}
                        disabled={isScheduling || !scheduleDate}
                        className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl text-base font-semibold disabled:opacity-30 transition-all active:scale-[0.98]"
                    >
                        {isScheduling ? "Planification..." : "Confirmer"}
                    </button>
                </div>
            </BottomSheet>

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
                                                        const isRejectedStep = step.title === "Candidature non retenue" || step.title === "État des lieux annulé";
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
