'use client';

import { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modals/Modal';
import Heading from '@/components/Heading';
import Avatar from '@/components/Avatar';
import { format, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Clock, Calendar, MessageSquare, Phone, FileText, ArrowLeft, Star, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import TenantProfilePreview from '@/components/profile/TenantProfilePreview';
import AddToCalendarButton from '@/components/calendar/AddToCalendarButton';
import ScorecardSheet from './ScorecardSheet';

interface VisitDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: any; // Type accurately if possible
    onEvaluationSaved?: () => void;
}

const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({
    isOpen,
    onClose,
    event,
    onEvaluationSaved
}) => {
    const router = useRouter();
    const [view, setView] = useState<'DETAILS' | 'DOSSIER'>('DETAILS');
    const [isScorecardOpen, setIsScorecardOpen] = useState(false);

    // Reset view when modal closes or event changes
    useMemo(() => {
        if (!isOpen) setView('DETAILS');
    }, [isOpen]);

    const onMessage = useCallback(() => {
        if (event?.candidate?.conversationId) {
            router.push(`/inbox/${event.candidate.conversationId}`);
        } else {
            router.push('/inbox');
        }
    }, [event, router]);

    const hasDossier = !!event?.candidate?.tenantProfile;

    // Determine if the visit is in the past and confirmed (eligible for evaluation)
    const isVisitPast = useMemo(() => {
        if (!event?.date || !event?.endTime) return false;
        try {
            const visitDate = new Date(event.date);
            const [endH, endM] = event.endTime.split(':').map(Number);
            visitDate.setHours(endH, endM, 0, 0);
            return isBefore(visitDate, new Date());
        } catch {
            return false;
        }
    }, [event?.date, event?.endTime]);

    const isConfirmed = event?.status === 'CONFIRMED';
    const canEvaluate = isVisitPast && isConfirmed;
    const existingEvaluation = event?.evaluation || null;
    const hasEvaluation = !!existingEvaluation;

    const handleEvaluationSaved = useCallback(() => {
        if (onEvaluationSaved) onEvaluationSaved();
    }, [onEvaluationSaved]);

    const bodyContent = view === 'DETAILS' ? (
        <div className="flex flex-col gap-6">
            {/* Candidate Header */}
            <div className="flex flex-col items-center justify-center text-center p-4 bg-neutral-50 rounded-xl">
                <div className="w-24 h-24 relative mb-4">
                    <Avatar
                        src={event?.candidate?.image || event?.image}
                        seed={event?.candidate?.name || event?.title || '?'}
                        size={96}
                    />
                </div>
                <h3 className="text-xl font-bold">{event?.candidate?.name || event?.title || 'Candidat'}</h3>
                <div className="text-neutral-500 text-sm mt-1">
                    Candidat Locataire
                </div>
                {/* Visit Status Badge */}
                {event?.status && (
                    <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                        event.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        event.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {event.status === 'PENDING' && 'En attente de confirmation'}
                        {event.status === 'CONFIRMED' && 'Confirmée'}
                        {event.status === 'CANCELLED' && 'Annulée'}
                    </div>
                )}
            </div>

            {/* Visit Info */}
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-neutral-50 transition">
                    <Calendar className="text-neutral-500 shrink-0" size={20} />
                    <div>
                        <div className="text-sm text-neutral-500">Date</div>
                        <div className="font-semibold">
                            {event?.date && format(new Date(event.date), 'EEEE d MMMM yyyy', { locale: fr })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-neutral-50 transition">
                    <Clock className="text-neutral-500 shrink-0" size={20} />
                    <div>
                        <div className="text-sm text-neutral-500">Horaire</div>
                        <div className="font-semibold">
                            {event?.startTime} - {event?.endTime}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 p-3 border rounded-lg hover:bg-neutral-50 transition">
                    <MapPin className="text-neutral-500 shrink-0" size={20} />
                    <div>
                        <div className="text-sm text-neutral-500">Lieu</div>
                        <div className="font-semibold">{event?.subtitle}</div>
                    </div>
                </div>
            </div>

            <hr />

            {/* Calendar Button */}
            {event?.date && event?.startTime && (
                <AddToCalendarButton
                    event={{
                        title: `Visite - ${event?.candidate?.name || event?.title || 'Candidat'}`,
                        date: event.date,
                        startTime: event.startTime,
                        endTime: event.endTime,
                        location: event?.subtitle,
                    }}
                />
            )}

            {/* Evaluation Badge */}
            {hasEvaluation && (
                <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                    existingEvaluation.decision === 'SHORTLISTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    existingEvaluation.decision === 'ELIMINATED' ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-neutral-100 text-neutral-600 border border-neutral-200'
                }`}>
                    <Star size={16} />
                    {existingEvaluation.decision === 'SHORTLISTED' && 'Shortliste'}
                    {existingEvaluation.decision === 'UNDECIDED' && 'Indecis'}
                    {existingEvaluation.decision === 'ELIMINATED' && 'Ecarte'}
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
                {/* Evaluate button - only show for past confirmed visits */}
                {canEvaluate && (
                    <Button
                        label={hasEvaluation ? "Modifier l'evaluation" : "Evaluer ce candidat"}
                        onClick={() => setIsScorecardOpen(true)}
                        icon={ClipboardCheck}
                        variant={hasEvaluation ? 'outline' : 'primary'}
                    />
                )}
                {hasDossier && (
                    <Button
                        label="Voir le dossier complet"
                        onClick={() => setView('DOSSIER')}
                        icon={FileText}
                        variant="outline"
                    />
                )}
                <Button
                    label="Envoyer un message"
                    onClick={onMessage}
                    icon={MessageSquare}
                    variant="outline"
                />
            </div>
        </div>
    ) : (
        <div className="flex flex-col gap-6">
            <button
                onClick={() => setView('DETAILS')}
                className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition w-fit"
            >
                <ArrowLeft size={16} />
                Retour aux détails
            </button>
            <TenantProfilePreview
                user={event.candidate}
                tenantProfile={event.candidate.tenantProfile}
                candidateScope={event.candidate.candidateScope}
                rent={event.listing?.price}
                charges={event.listing?.charges}
            />
        </div>
    );

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                onSubmit={() => { }}
                title={view === 'DETAILS' ? "Détails de la visite" : "Dossier Candidat"}
                body={bodyContent}
                actionLabel=""
                secondaryActionLabel={view === 'DETAILS' ? "Fermer" : "Retour"}
                secondaryAction={view === 'DETAILS' ? onClose : () => setView('DETAILS')}
            />

            {/* Scorecard Sheet */}
            {event && (
                <ScorecardSheet
                    isOpen={isScorecardOpen}
                    onClose={() => setIsScorecardOpen(false)}
                    visit={{
                        id: event.id,
                        date: event.date,
                        startTime: event.startTime,
                        candidate: {
                            name: event.candidate?.name || 'Candidat',
                            id: event.candidate?.id || '',
                        },
                    }}
                    applicationId={event.applicationId || ''}
                    listing={{
                        id: event.listing?.id || '',
                        title: event.listing?.title || '',
                        price: event.listing?.price || 0,
                        leaseType: event.listing?.leaseType || null,
                        availableFrom: event.listing?.availableFrom || null,
                    }}
                    tenantProfile={event.candidate?.tenantProfile || null}
                    candidateScope={event.candidate?.candidateScope || null}
                    existingEvaluation={existingEvaluation}
                    onEvaluationSaved={handleEvaluationSaved}
                />
            )}
        </>
    );
}

export default VisitDetailsModal;
