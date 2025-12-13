'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    small?: boolean;
    label?: string;
    icon?: React.ElementType;
    loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', small, label, icon: Icon, loading, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={props.disabled || loading}
                className={cn(
                    "relative disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer rounded-lg hover:opacity-80 transition w-full active:scale-95 flex items-center justify-center gap-2",
                    small ? 'py-1 text-sm font-light border-[1px]' : 'py-3 text-md font-medium border-2',
                    variant === 'primary' && "bg-primary border-primary text-white",
                    variant === 'outline' && "bg-white border-black text-black dark:bg-transparent dark:border-white dark:text-white dark:hover:bg-neutral-800",
                    variant === 'ghost' && "bg-transparent border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800",
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
                {Icon && !loading && (
                    <Icon
                        size={24}
                        className="absolute left-4 top-3"
                    />
                )}
                {label || children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
