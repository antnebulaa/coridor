'use client';

import { useEffect, useState } from 'react';

interface ProgressRingProps {
    percent: number;
    size?: number;
    stroke?: number;
    color?: string;
    className?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
    percent,
    size = 56,
    stroke = 5,
    color = '#172DFF',
    className,
}) => {
    const [animatedPercent, setAnimatedPercent] = useState(0);
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (animatedPercent / 100) * circumference;

    useEffect(() => {
        const timer = setTimeout(() => setAnimatedPercent(percent), 100);
        return () => clearTimeout(timer);
    }, [percent]);

    return (
        <div className={className} style={{ width: size, height: size, position: 'relative' }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={stroke}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{percent}%</span>
            </div>
        </div>
    );
};

export default ProgressRing;
