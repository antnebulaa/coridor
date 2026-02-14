'use client';

import { useEffect, useRef } from 'react';

interface InteractiveViewportWrapperProps {
    children: React.ReactNode;
}

const InteractiveViewportWrapper: React.FC<InteractiveViewportWrapperProps> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Only run on client and if visualViewport is supported
        if (!window.visualViewport) return;

        const updateGeometry = () => {
            if (!containerRef.current || !window.visualViewport) return;

            const viewport = window.visualViewport;

            // Detect keyboard: visual viewport significantly smaller than layout viewport
            const isKeyboardOpen = viewport.height < window.innerHeight * 0.85;

            if (isKeyboardOpen) {
                // Keyboard open — shrink to visual viewport to keep input visible
                containerRef.current.style.height = `${viewport.height}px`;
                containerRef.current.style.top = `${viewport.offsetTop}px`;
            } else {
                // Keyboard closed — full viewport including safe areas
                containerRef.current.style.height = '100%';
                containerRef.current.style.top = '0';
            }

            // Force scroll to top to prevent layout viewport wandering
            if (window.scrollY > 0) {
                window.scrollTo(0, 0);
            }
        };

        window.visualViewport.addEventListener('resize', updateGeometry);
        window.visualViewport.addEventListener('scroll', updateGeometry);

        // Initial set
        updateGeometry();

        // Lock body/html
        const originalBodyStyle = {
            position: document.body.style.position,
            width: document.body.style.width,
            height: document.body.style.height,
            overflow: document.body.style.overflow
        };
        const originalHtmlStyle = {
            overflow: document.documentElement.style.overflow,
            height: document.documentElement.style.height
        };

        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';

        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100%';

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateGeometry);
                window.visualViewport.removeEventListener('scroll', updateGeometry);
            }

            // Restore styles
            document.body.style.position = originalBodyStyle.position;
            document.body.style.width = originalBodyStyle.width;
            document.body.style.height = originalBodyStyle.height;
            document.body.style.overflow = originalBodyStyle.overflow;

            document.documentElement.style.overflow = originalHtmlStyle.overflow;
            document.documentElement.style.height = originalHtmlStyle.height;
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                left: 0,
                width: '100%',
                height: '100%',
                top: 0,
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
