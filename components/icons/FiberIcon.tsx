import React from 'react';

export const FiberIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {/* Base Ring/Hole */}
            <ellipse cx="12" cy="19" rx="6" ry="2.5" />

            {/* Center Cable */}
            <path d="M12 17V4" />
            <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />

            {/* Inner Left Cable */}
            <path d="M10.5 17C10.5 12 8 8 6.5 6.5" />
            <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />

            {/* Inner Right Cable */}
            <path d="M13.5 17C13.5 12 16 8 17.5 6.5" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />

            {/* Outer Left Cable */}
            <path d="M9 18C7 14 5 12 3 10" />
            <circle cx="3" cy="10" r="1.5" fill="currentColor" stroke="none" />

            {/* Outer Right Cable */}
            <path d="M15 18C17 14 19 12 21 10" />
            <circle cx="21" cy="10" r="1.5" fill="currentColor" stroke="none" />
        </svg>
    );
};
