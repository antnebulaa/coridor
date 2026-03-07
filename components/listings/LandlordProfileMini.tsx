'use client';

import LandlordAvatar from '@/components/profile/LandlordAvatar';

interface LandlordProfileMiniProps {
    owner: {
        firstName?: string | null;
        lastName?: string | null;
        name?: string | null;
        image?: string | null;
        averageResponseTime?: number | null;
        createdAt?: string | null;
    };
    propertyCount?: number;
}

function formatResponseTime(minutes: number | null | undefined): string | null {
    if (minutes == null) return null;
    if (minutes < 60) return '< 1h';
    if (minutes < 120) return '~1h';
    if (minutes < 1440) return `~${Math.round(minutes / 60)}h`;
    if (minutes < 2880) return '~1 jour';
    return `~${Math.round(minutes / 1440)} jours`;
}

export default function LandlordProfileMini({
    owner,
    propertyCount,
}: LandlordProfileMiniProps) {
    const firstName = owner.firstName ?? owner.name?.split(' ')[0] ?? '';
    const lastInitial = owner.lastName?.charAt(0) ?? owner.name?.split(' ')[1]?.charAt(0) ?? '';
    const displayName = lastInitial
        ? `${firstName} ${lastInitial}.`
        : firstName;

    const responseTimeLabel = formatResponseTime(owner.averageResponseTime);

    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <LandlordAvatar
                avatarUrl={owner.image}
                firstName={firstName || '?'}
                lastInitial={lastInitial || '?'}
                size="sm"
            />
            <span className="font-medium text-foreground">{displayName}</span>
            {responseTimeLabel && (
                <>
                    <span>·</span>
                    <span>{responseTimeLabel}</span>
                </>
            )}
            {propertyCount != null && propertyCount > 1 && (
                <>
                    <span>·</span>
                    <span>🏠 {propertyCount}</span>
                </>
            )}
        </div>
    );
}
