'use client';

import { IconType } from "react-icons";

interface SoftButtonProps {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    icon?: IconType;
}

const SoftButton: React.FC<SoftButtonProps> = ({
    label,
    onClick,
    disabled,
    icon: Icon
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                relative
                disabled:opacity-70
                disabled:cursor-not-allowed
                rounded-[12px]
                transition
                w-auto
                bg-[#f2f2f2]
                hover:bg-[#EBEBEB]
                text-neutral-800
                px-[18px]
                py-[13px]
                font-medium
                text-[14px]
                flex
                items-center
                justify-center
                gap-2
            `}
        >
            {Icon && (
                <Icon size={18} />
            )}
            {label}
        </button>
    );
}

export default SoftButton;
