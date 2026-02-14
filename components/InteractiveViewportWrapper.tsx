'use client';

import { useEffect, useRef } from 'react';

interface InteractiveViewportWrapperProps {
    children: React.ReactNode;
}

const InteractiveViewportWrapper: React.FC<InteractiveViewportWrapperProps> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Keyboard fallback: only needed if interactiveWidget: 'resizes-content' is not supported
        if (!window.visualViewport) return;

        const updateGeometry = () => {
            if (!containerRef.current || !window.visualViewport) return;

            const viewport = window.visualViewport;
            // Detect keyboard: visual viewport at least 150px smaller than layout viewport
            const isKeyboardOpen = viewport.height < window.innerHeight - 150;

            if (isKeyboardOpen) {
                // Keyboard open — shrink to visual viewport height
                containerRef.current.style.height = `${viewport.height}px`;
                containerRef.current.style.bottom = 'auto';
            } else {
                // Keyboard closed — let CSS inset handle full viewport
                containerRef.current.style.height = '';
                containerRef.current.style.bottom = '0';
            }
        };

        window.visualViewport.addEventListener('resize', updateGeometry);
        window.visualViewport.addEventListener('scroll', updateGeometry);
        updateGeometry();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateGeometry);
                window.visualViewport.removeEventListener('scroll', updateGeometry);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                overflow: 'hidden',
                backgroundColor: 'var(--background)'
            }}
        >
            {children}
        </div>
    );
};

export default InteractiveViewportWrapper;
