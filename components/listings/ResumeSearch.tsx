'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ResumeSearchProps {
    className?: string;
}

interface LastSearchData {
    locationLabel: string;
    queryString: string;
    details: string;
}

const ResumeSearch: React.FC<ResumeSearchProps> = ({ className }) => {
    const router = useRouter();
    const [lastSearch, setLastSearch] = useState<LastSearchData | null>(null);

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
                bg-card border border-border rounded-xl p-4 md:p-6 
                cursor-pointer shadow-md hover:shadow-lg transition 
                flex items-center justify-between gap-4
                mb-6
                ${className}
            `}
        >
            <div className="flex flex-col gap-1">
                <div className="font-semibold text-lg text-foreground">
                    Continuez votre recherche à {lastSearch.locationLabel}
                </div>
                <div className="text-muted-foreground text-sm font-medium">
                    {lastSearch.details || 'Voir les annonces'}
                </div>
            </div>

        </div>
    );
};

export default ResumeSearch;
