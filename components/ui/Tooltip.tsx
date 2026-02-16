'use client';

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
    const [visible, setVisible] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (visible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
            // Keep within viewport
            if (left < 8) left = 8;
            if (left + tooltipRect.width > window.innerWidth - 8) {
                left = window.innerWidth - tooltipRect.width - 8;
            }
            setTooltipStyle({
                left: left - triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
            });
        }
    }, [visible]);

    return (
        <span
            ref={triggerRef}
            className="relative inline-flex items-center"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div
                    ref={tooltipRef}
                    className={`absolute z-50 px-3 py-2 text-xs font-normal text-white bg-slate-800 rounded-lg shadow-lg whitespace-normal max-w-[240px] min-w-[200px] leading-relaxed pointer-events-none ${
                        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                    }`}
                    style={tooltipStyle}
                >
                    {content}
                    <div className={`absolute left-5/6 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 ${
                        position === 'top' ? '-bottom-1' : '-top-1'
                    }`} />
                </div>
            )}
        </span>
    );
};

export default Tooltip;
