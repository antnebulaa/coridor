'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: LucideIcon;
    onClick?: () => void;
}

const CircleButton: React.FC<CircleButtonProps> = ({
    icon: Icon,
    onClick,
    className,
    ...props
}) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-12 h-12 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center transition",
                className
            )}
            {...props}
        >
            <Icon size={20} />
        </button>
    );
}

export default CircleButton;
