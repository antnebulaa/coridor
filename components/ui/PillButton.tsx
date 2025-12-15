'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    onClick?: () => void;
    icon?: React.ElementType;
}

const PillButton: React.FC<PillButtonProps> = ({
    label,
    onClick,
    className,
    icon: Icon,
    ...props
}) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "h-12 px-6 bg-neutral-100 hover:bg-neutral-200 rounded-full font-semibold text-sm transition flex items-center gap-2 whitespace-nowrap",
                className
            )}
            {...props}
        >
            {Icon && <Icon size={18} />}
            {label}
        </button>
    );
}

export default PillButton;
