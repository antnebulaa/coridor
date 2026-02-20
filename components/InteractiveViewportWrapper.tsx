'use client';

import { useEffect, useRef } from 'react';

interface InteractiveViewportWrapperProps {
    children: React.ReactNode;
}

const InteractiveViewportWrapper: React.FC<InteractiveViewportWrapperProps> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Desktop: offset below the sticky navbar
    useEffect(() => {
        const computeOffset = () => {
            if (!containerRef.current) return;
            const navbar = document.querySelector('[data-navbar]');
            if (window.innerWidth >= 768 && navbar) {
                containerRef.current.style.top = `${navbar.getBoundingClientRect().height}px`;
            } else {
                containerRef.current.style.top = '0';
            }
        };

        computeOffset();
        window.addEventListener('resize', computeOffset);
        return () => window.removeEventListener('resize', computeOffset);
    }, []);

    // Mobile: keyboard handling
    useEffect(() => {
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
                containerRef.current.style.bottom = '';
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
            className="fixed inset-0 z-0 overflow-hidden bg-background"
        >
            {children}
        </div>
    );
};

export default InteractiveViewportWrapper;
