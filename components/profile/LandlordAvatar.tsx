'use client';

import Image from 'next/image';

interface LandlordAvatarProps {
    avatarUrl?: string | null;
    firstName: string;
    lastInitial: string;
    size?: 'sm' | 'md' | 'lg';
    isActive?: boolean;
}

const AVATAR_COLORS = [
    'bg-amber-100 text-amber-700',
    'bg-orange-100 text-orange-700',
    'bg-rose-100 text-rose-700',
    'bg-emerald-100 text-emerald-700',
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
];

const SIZE_CLASSES = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
} as const;

const SIZE_PX = {
    sm: 32,
    md: 48,
    lg: 64,
} as const;

function getColorFromName(name: string): string {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function LandlordAvatar({
    avatarUrl,
    firstName,
    lastInitial,
    size = 'md',
    isActive,
}: LandlordAvatarProps) {
    const initials = `${firstName.charAt(0).toUpperCase()}${lastInitial.toUpperCase()}`;
    const colorClass = getColorFromName(`${firstName}${lastInitial}`);
    const px = SIZE_PX[size];

    return (
        <div className={`relative inline-flex items-center justify-center rounded-full font-semibold shrink-0 ${SIZE_CLASSES[size]}`}>
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt={`${firstName} ${lastInitial}.`}
                    width={px}
                    height={px}
                    className="rounded-full object-cover w-full h-full"
                />
            ) : (
                <div className={`flex items-center justify-center rounded-full w-full h-full ${colorClass}`}>
                    {initials}
                </div>
            )}

            {isActive && (
                <span
                    className={`absolute bottom-0 right-0 rounded-full bg-green-500 ${
                        size === 'sm'
                            ? 'w-2 h-2 border-[1.5px] border-white dark:border-neutral-900'
                            : 'w-3 h-3 border-2 border-white dark:border-neutral-900'
                    }`}
                />
            )}
        </div>
    );
}
