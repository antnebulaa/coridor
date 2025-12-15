'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PageBodyProps {
    children: React.ReactNode;
    className?: string;
    padHorizontal?: boolean;
    padVertical?: boolean;
}

const PageBody: React.FC<PageBodyProps> = ({
    children,
    className,
    padHorizontal = true,
    padVertical = true
}) => {
    return (
        <div
            className={cn(
                "w-full h-full",
                // Mobile: p-6 by default (to avoid sticking to edges), py-6
                padHorizontal && "px-6 md:px-8",
                padVertical && "py-6 md:py-8",
                className
            )}
        >
            <div className="max-w-5xl mx-auto w-full h-full">
                {children}
            </div>
        </div>
    );
}

export default PageBody;
