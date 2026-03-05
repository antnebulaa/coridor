'use client';

import { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { format, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Clock, Calendar, MessageSquare, FileText, ArrowLeft, Star, ClipboardCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import TenantProfilePreview from '@/components/profile/TenantProfilePreview';
import AddToCalendarButton from '@/components/calendar/AddToCalendarButton';
import ScorecardSheet from './ScorecardSheet';

interface EventDetailPanelProps {
    event: any;
    onEvaluationSaved?: () => void;
    onClose?: () => void;
}

const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
    event,
    onEvaluationSaved,
    onClose
}) => {
    const router = useRouter();
    const [view, setView] = useState<'DETAILS' | 'DOSSIER'>('DETAILS');
    const [isScorecardOpen, setIsScorecardOpen] = useState(false);

    const onMessage = useCallback(() => {
        if (event?.candidate?.conversationId) {
            router.push(`/inbox/${event.candidate.conversationId}`);
        } else {
            router.push('/inbox');
        }
    }, [event, router]);

    const hasDossier = !!event?.candidate?.tenantProfile;

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

    if (!event) return null;

    return (
        <>
            <div className="flex flex-col h-full">
                {/* Header */}
                {onClose && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-none">
                        <h2 className="text-lg font-semibold">
                            {view === 'DETAILS' ? 'Détails de la visite' : 'Dossier Candidat'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-secondary transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {view === 'DETAILS' ? (
                        <div className="flex flex-col gap-6">
                            {/* Candidate Header */}
                            <div className="flex flex-col items-center justify-center text-center p-6 bg-secondary rounded-xl">
                                <div className="w-24 h-24 relative mb-4">
                                    <Avatar
                                        src={event?.candidate?.image || event?.image}
                                        seed={event?.candidate?.name || event?.title || '?'}
                                        size={96}
                                    />
                                </div>
                                <h3 className="text-xl font-bold">{event?.candidate?.name || event?.title || 'Candidat'}</h3>
                                <div className="text-muted-foreground text-sm mt-1">
                                    Candidat Locataire
                                </div>
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
                            <div className="space-y-3">
                                <div className="flex items-center gap-4 p-3 border border-border rounded-xl hover:bg-secondary transition">
                                    <Calendar className="text-muted-foreground shrink-0" size={20} />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Date</div>
                                        <div className="font-semibold">
                                            {event?.date && format(new Date(event.date), 'EEEE d MMMM yyyy', { locale: fr })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 border border-border rounded-xl hover:bg-secondary transition">
                                    <Clock className="text-muted-foreground shrink-0" size={20} />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Horaire</div>
                                        <div className="font-semibold">
                                            {event?.startTime} - {event?.endTime}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 border border-border rounded-xl hover:bg-secondary transition">
                                    <MapPin className="text-muted-foreground shrink-0" size={20} />
                                    <div>
                                        <div className="text-sm text-muted-foreground">Lieu</div>
                                        <div className="font-semibold">{event?.subtitle}</div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-border" />

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
                                    'bg-secondary text-muted-foreground border border-border'
                                }`}>
                                    <Star size={16} />
                                    {existingEvaluation.decision === 'SHORTLISTED' && 'Shortliste'}
                                    {existingEvaluation.decision === 'UNDECIDED' && 'Indecis'}
                                    {existingEvaluation.decision === 'ELIMINATED' && 'Ecarte'}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
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
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition w-fit"
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
                    )}
                </div>
            </div>

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
};

export default EventDetailPanel;
