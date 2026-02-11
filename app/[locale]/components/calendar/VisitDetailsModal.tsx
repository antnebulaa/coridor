'use client';

import { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/modals/Modal';
import Heading from '@/components/Heading';
import Avatar from '@/components/Avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Clock, Calendar, MessageSquare, Phone, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import TenantProfilePreview from '@/components/profile/TenantProfilePreview';
import AddToCalendarButton from '@/components/calendar/AddToCalendarButton';

interface VisitDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: any; // Type accurately if possible
}

const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({
    isOpen,
    onClose,
    event
}) => {
    const router = useRouter();
    const [view, setView] = useState<'DETAILS' | 'DOSSIER'>('DETAILS');

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

            {/* Actions */}
            <div className="flex flex-col gap-3">
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
                    variant="outline" // Changed to outline as per current implementation, or maybe primary? Current code had outline.
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
    );
}

export default VisitDetailsModal;
