'use client';

import { useRouter } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ResumeSearchProps {
    className?: string;
}

interface LastSearchData {
    locationLabel: string;
    queryString: string;
    details: string;
    lastListingImage?: string;
    lastListingPrice?: number;
}

const ResumeSearch: React.FC<ResumeSearchProps> = ({ className }) => {
    const router = useRouter();
    const [lastSearch, setLastSearch] = useState<LastSearchData | null>(null);
    const t = useTranslations('home.resumeSearch');

    useEffect(() => {
        try {
            const stored = localStorage.getItem('coridor_last_search');
            if (stored) {
                setLastSearch(JSON.parse(stored));
            }
        } catch (e) {
            // Ignore
        }
    }, []);

    if (!lastSearch) {
        return null;
    }

    return (
        <div
            onClick={() => router.push(`/?${lastSearch.queryString}`)}
            className={`
                group
                bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30
                border border-rose-100 dark:border-rose-900
                rounded-2xl overflow-hidden
                cursor-pointer shadow-sm hover:shadow-xl
                transition-all duration-300
                mb-6
                ${className}
            `}
        >
            <div className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                {lastSearch.lastListingImage && (
                    <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0 ring-2 ring-white dark:ring-neutral-800 shadow-md">
                        <Image
                            src={lastSearch.lastListingImage}
                            alt={t('lastViewed')}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wide mb-1">
                        {t('title')}
                    </div>
                    <div className="font-bold text-neutral-900 dark:text-neutral-100 text-base md:text-lg mb-1 truncate">
                        {lastSearch.locationLabel}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-sm">
                        <MapPin size={14} />
                        <span className="truncate">{lastSearch.details || t('continue')}</span>
                    </div>
                </div>

                {/* Arrow */}
                <div className="shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all">
                        <ArrowRight className="text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform" size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeSearch;
