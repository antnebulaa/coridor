'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useContext, useEffect, useRef, useState } from 'react';

function FrozenRouter({ children }: { children: React.ReactNode }) {
    const context = useContext(LayoutRouterContext ?? ({} as any));
    const frozen = useRef(context).current;

    if (!frozen) {
        return <>{children}</>;
    }

    return (
        <LayoutRouterContext.Provider value={frozen}>
            {children}
        </LayoutRouterContext.Provider>
    );
}

const TransitionProvider = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const [direction, setDirection] = useState<'push' | 'pop'>('push');
    const isPopStateRef = useRef(false);
    const prevPathnameRef = useRef<string>(pathname);

    const getDepth = (path: string) => {
        return path.split('/').filter(Boolean).length;
    };

    useEffect(() => {
        const handlePopState = () => {
            isPopStateRef.current = true;
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const prevDepth = getDepth(prevPathnameRef.current);
        const currentDepth = getDepth(pathname);

        if (isPopStateRef.current) {
            setDirection('pop');
            isPopStateRef.current = false;
        } else {
            setDirection(currentDepth < prevDepth ? 'pop' : 'push');
        }

        prevPathnameRef.current = pathname;
    }, [pathname]);

    const isPush = direction === 'push';

    return (
        <div className="relative w-full min-h-screen">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                    key={pathname}
                    initial={{
                        // PUSH: nouvelle page vient de la droite
                        // POP: nouvelle page vient de la gauche 
                        x: isPush ? '100%' : '-100%',
                    }}
                    animate={{
                        x: 0,
                    }}
                    exit={{
                        // PUSH: ancienne page sort vers la gauche (parallaxe)
                        // POP: ancienne page sort vers la droite
                        x: isPush ? '-20%' : '100%',
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        mass: 0.8
                    }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        minHeight: '100vh',
                        width: '100%'
                    }}
                    className="bg-background"
                >
                    <FrozenRouter>{children}</FrozenRouter>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default TransitionProvider;
