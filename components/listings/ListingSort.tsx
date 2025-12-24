'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import qs from "query-string";

const ListingSort = () => {
    const params = useSearchParams();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const currentSort = params?.get('sort') || '';

    const opts = [
        { label: 'Nouveautés', value: '' }, // Default
        { label: 'Prix croissant', value: 'price_asc' },
        { label: 'Prix décroissant', value: 'price_desc' },
    ];

    const handleSort = useCallback((value: string) => {
        let currentQuery = {};

        if (params) {
            currentQuery = qs.parse(params.toString());
        }

        const updatedQuery: any = {
            ...currentQuery,
            sort: value
        };

        const url = qs.stringifyUrl({
            url: '/',
            query: updatedQuery
        }, { skipNull: true });

        router.push(url);
        setIsOpen(false);
    }, [router, params]);

    const activeLabel = opts.find(o => o.value === currentSort)?.label || 'Trier par';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="
                    flex 
                    items-center 
                    gap-2 
                    px-4 
                    py-2 
                    rounded-full 
                    border 
                    border-neutral-200 
                    dark:border-neutral-800 
                    hover:shadow-md 
                    transition 
                    cursor-pointer
                    bg-background
                "
            >
                <ArrowUpDown size={14} />
                <span className="text-sm font-semibold">{activeLabel}</span>
            </button>

            {isOpen && (
                <div
                    className="
                        absolute 
                        z-50 
                        top-12 
                        right-0 
                        w-[200px] 
                        bg-background 
                        border 
                        border-neutral-200 
                        dark:border-neutral-800 
                        rounded-xl 
                        shadow-xl 
                        overflow-hidden
                    "
                >
                    {opts.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleSort(option.value)}
                            className={`
                                px-4 
                                py-3 
                                hover:bg-neutral-100 
                                dark:hover:bg-neutral-800 
                                cursor-pointer 
                                transition
                                text-sm
                                ${currentSort === option.value ? 'font-bold bg-neutral-50 dark:bg-neutral-800' : ''}
                            `}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}

            {/* Overlay to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

export default ListingSort;
