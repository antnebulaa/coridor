'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: LucideIcon;
}

const CircleButton: React.FC<CircleButtonProps> = ({
    icon: Icon,
    className,
    ...props
}) => {
    return (
        <button
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
