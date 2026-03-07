'use client';

import { MessageCircle, Home, CheckCircle, Sparkles, Globe } from 'lucide-react';
import LandlordAvatar from '@/components/profile/LandlordAvatar';

interface LandlordProfileCardProps {
    landlord: {
        id: string;
        firstName: string;
        lastInitial: string;
        avatarUrl?: string | null;
        bio?: string | null;
        languages?: string[];
        propertyCount: number;
        averageResponseTime?: number | null;
        responseRate?: number | null;
        memberSince: Date | string;
        isActive: boolean;
    };
    onContact: () => void;
    isOwner?: boolean;
}

function formatResponseTime(minutes: number | null | undefined): string | null {
    if (minutes == null) return null;
    if (minutes < 60) return '< 1h';
    if (minutes < 120) return '~1h';
    if (minutes < 1440) return `~${Math.round(minutes / 60)}h`;
    if (minutes < 2880) return '~1 jour';
    return `~${Math.round(minutes / 1440)} jours`;
}

function formatMemberSince(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (months < 1) return 'Ce mois-ci';
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 an' : `${years} ans`;
}

export default function LandlordProfileCard({
    landlord,
    onContact,
    isOwner,
}: LandlordProfileCardProps) {
    const responseTimeLabel = formatResponseTime(landlord.averageResponseTime);
    const memberLabel = formatMemberSince(landlord.memberSince);

    const memberSinceDate = new Date(landlord.memberSince);
    const now = new Date();
    const monthsSinceMember =
        (now.getFullYear() - memberSinceDate.getFullYear()) * 12 +
        (now.getMonth() - memberSinceDate.getMonth());
    const isNewMember = monthsSinceMember < 1 &&
        landlord.averageResponseTime == null && landlord.responseRate == null;

    return (
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <LandlordAvatar
                    avatarUrl={landlord.avatarUrl}
                    firstName={landlord.firstName}
                    lastInitial={landlord.lastInitial}
                    size="lg"
                    isActive={landlord.isActive}
                />
                <div className="flex flex-col">
                    <span className="text-lg font-semibold text-foreground">
                        {landlord.firstName} {landlord.lastInitial}.
                    </span>
                    {isNewMember ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            <Sparkles size={12} />
                            Nouveau sur Coridor
                        </span>
                    ) : (
                        <span className="text-sm text-muted-foreground">
                            Membre depuis {memberLabel}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats */}
            {!isNewMember && (
                <div className="flex flex-col gap-2">
                    {responseTimeLabel && (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <MessageCircle size={15} className="shrink-0" />
                            <span>Répond en général en {responseTimeLabel}</span>
                        </div>
                    )}
                    {landlord.responseRate != null && (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <CheckCircle size={15} className="shrink-0" />
                            <span>Taux de réponse : {landlord.responseRate}%</span>
                        </div>
                    )}
                    {landlord.propertyCount > 1 && (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <Home size={15} className="shrink-0" />
                            <span>{landlord.propertyCount} biens sur Coridor</span>
                        </div>
                    )}
                    {landlord.languages && landlord.languages.length > 0 && (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <Globe size={15} className="shrink-0" />
                            <span>Parle {landlord.languages.join(', ')}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Bio */}
            {landlord.bio && (
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                    &laquo;&nbsp;{landlord.bio}&nbsp;&raquo;
                </p>
            )}

            {/* Contact button */}
            {!isOwner && (
                <button
                    type="button"
                    onClick={onContact}
                    className="w-full rounded-xl bg-foreground text-background py-3 text-sm font-medium hover:opacity-90 transition"
                >
                    Contacter {landlord.firstName}
                </button>
            )}
        </div>
    );
}
