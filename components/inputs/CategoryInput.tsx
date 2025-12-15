'use client';

import { IconType } from "react-icons";
import Image from "next/image";

interface CategoryInputProps {
    icon: IconType;
    label: string;
    selected?: boolean;
    onClick: (value: string) => void;
    image?: string;
}

const CategoryInput: React.FC<CategoryInputProps> = ({
    icon: Icon,
    label,
    selected,
    onClick,
    image
}) => {
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
