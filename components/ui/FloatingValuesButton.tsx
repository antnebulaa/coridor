'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingValuesButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    onClick?: () => void;
    loading?: boolean;
    icon?: React.ElementType;
}

const FloatingValuesButton: React.FC<FloatingValuesButtonProps> = ({
    label,
    onClick,
    className,
    loading,
    icon: Icon,
    children,
    ...props
}) => {
    return (
        <button
            onClick={onClick}
            disabled={props.disabled || loading}
            className={cn(
                "h-14 w-full px-6 rounded-xl font-semibold text-base transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed",
                className
            )}
            {...props}
        >
            {loading && (
                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {Icon && !loading && <Icon size={20} />}
            {label || children}
        </button>
    );
}

export default FloatingValuesButton;
