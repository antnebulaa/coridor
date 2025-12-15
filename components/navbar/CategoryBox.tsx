'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CategoryBoxProps {
    icon: LucideIcon;
    label: string;
    selected?: boolean;
    image?: string;
}

const CategoryBox: React.FC<CategoryBoxProps> = ({
    icon: Icon,
    label,
    selected,
    image,
}) => {
    const router = useRouter();
    const params = useSearchParams();

    const handleClick = useCallback(() => {
        let currentQuery = {};

        if (params) {
            // currentQuery = qs.parse(params.toString());
        }

        // Simplified logic for now
        const url = `/?category=${label}`;

        if (params?.get('category') === label) {
            router.push('/');
        } else {
            router.push(url);
        }
    }, [label, params, router]);

    return (
        <div
            onClick={handleClick}
            className={cn(
                'flex flex-col items-center justify-center gap-2 p-3 border-b-2 hover:text-neutral-800 transition cursor-pointer active:scale-95',
                selected ? 'border-b-neutral-800 text-neutral-800' : 'border-transparent text-neutral-500'
            )}
        >
            {image ? (
                <div className="relative w-[26px] h-[26px]">
                    <Image
                        src={image}
                        alt={label}
                        fill
                        className="object-contain"
                    />
                </div>
            ) : (
                <Icon size={26} />
            )}
            <div className="font-medium text-xs">
                {label}
            </div>
        </div>
    );
};

export default CategoryBox;
