'use client';

import { IconType } from "react-icons";
import Image from "next/image";

interface CategoryInputProps {
    icon: IconType;
    label: string;
    selected?: boolean;
    onClick: (value: string) => void;
    image?: string;
    variant?: 'default' | 'search';
}

const CategoryInput: React.FC<CategoryInputProps> = ({
    icon: Icon,
    label,
    selected,
    onClick,
    image,
    variant = 'default'
}) => {
    if (variant === 'search') {
        const baseColor = selected
            ? 'bg-[#2E323B] border-[#2E323B] text-white dark:bg-[#8696A6] dark:border-[#8696A6] dark:text-white'
            : 'bg-[#F9F8FA] border-[#E5E5E6] text-[#8696A6] hover:border-[#8696A6] dark:bg-transparent dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-500';

        return (
            <div
                onClick={() => onClick(label)}
                className={`
                    rounded-full
                    px-3 py-2
                    flex
                    flex-row
                    items-center
                    justify-center
                    gap-2
                    border
                    transition
                    cursor-pointer
                    active:scale-95
                    text-base
                    font-normal
                    text-nowrap
                    ${baseColor}
                `}
            >
                {image ? (
                    <div className="relative w-[20px] h-[20px] shrink-0">
                        <Image
                            src={image}
                            alt={label}
                            fill
                            className="object-contain"
                        />
                    </div>
                ) : (
                    <div className="shrink-0">
                        <Icon size={20} strokeWidth={1.5} />
                    </div>
                )}
                <div className="font-normal">
                    {label}
                </div>
            </div>
        );
    }

    // Default Variant
    return (
        <div
            onClick={() => onClick(label)}
            className={`
        rounded-xl
        p-4
        flex
        flex-col
        gap-3
        hover:border-foreground
        transition
        cursor-pointer
        active:scale-95
        ${selected ? 'border-2 border-foreground' : 'border border-border'}
      `}
        >
            {image ? (
                <div className="relative w-[30px] h-[30px]">
                    <Image
                        src={image}
                        alt={label}
                        fill
                        className="object-contain"
                    />
                </div>
            ) : (
                <Icon size={30} />
            )}
            <div className="font-medium">
                {label}
            </div>
        </div>
    );
}

export default CategoryInput;
