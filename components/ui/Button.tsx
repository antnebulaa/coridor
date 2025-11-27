'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    small?: boolean;
    label?: string;
    icon?: React.ElementType;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', small, label, icon: Icon, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "relative disabled:opacity-70 disabled:cursor-not-allowed rounded-lg hover:opacity-80 transition w-full active:scale-95",
                    small ? 'py-1 text-sm font-light border-[1px]' : 'py-3 text-md font-medium border-2',
                    variant === 'primary' && "bg-rose-500 border-rose-500 text-white",
                    variant === 'outline' && "bg-white border-black text-black",
                    variant === 'ghost' && "bg-transparent border-transparent hover:bg-neutral-100",
                    className
                )}
                {...props}
            >
                {Icon && (
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
