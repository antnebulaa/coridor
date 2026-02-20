'use client';

import { usePathname } from "next/navigation";

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const pathname = usePathname();
    const isMainPage = pathname === '/' || pathname === '/fr' || pathname === '/en';

    // Mobile:
    // Home: Categories visible -> pt-32 (approx)
    // Others: Navbar hidden -> pt-0

    // Desktop:
    // Home: Top + Categories -> pt-48 (approx 192px) or keep pt-28 if it was working?
    // User complained about gap on Dashboard (non-home).
    // Dashboard has only Top Bar (~80px).
    // pt-28 (112px) - 80px = 32px gap.
    // So for non-home, we want pt-20 (80px) or pt-24 (96px).

    // Let's try:
    // Home: pt-24 md:pt-28 (Keep original-ish)
    // Others: pt-0 md:pt-20 (Reduce gap)

    // Home (Search only):
    // Mobile: Logo + Search ~ 120px -> pt-32 (128px) or pt-28
    // Desktop: Navbar ~ 80px -> pt-24 (96px)
    // Simplified Layout: Navbar is static, so no top padding needed.
    // Inbox might still need pb-0 if it handles its own scroll, otherwise default padding.

    // const paddingTop = isMainPage ? 'pt-32 md:pt-24' : 'pt-20 md:pt-24'; // Removed

    const isInbox = pathname?.includes('/inbox');
    const isAdmin = pathname?.includes('/admin');
    const isInspection = pathname?.includes('/inspection');
    const paddingBottom = (isInbox || isMainPage || isAdmin || isInspection) ? 'pb-0' : 'pb-20';

    // Navbar positioning:
    // - Home page: Navbar is FIXED (transparent overlay on map) → needs padding
    // - All other pages: Navbar is STICKY (in document flow) → NO padding needed
    // - Admin: No main Navbar at all
    // - Mobile (non-home): Navbar hidden, bottom nav used → pt-safe for notch

    let paddingTop = 'pt-0';
    if (isAdmin || isInspection) {
        paddingTop = 'pt-0';
    } else if (isMainPage) {
        // Home: Navbar is fixed + transparent over map
        paddingTop = 'pt-0 md:pt-20';
    } else {
        // All other pages: Navbar is sticky on desktop (no compensation needed)
        // Mobile: Navbar hidden, just need safe area padding for notch
        paddingTop = 'pt-safe md:pt-0';
    }

    return (
        <div className={`${paddingBottom} ${isInbox ? 'h-full w-full bg-background overflow-hidden relative' : 'min-h-screen relative'}`}>
            <div className={paddingTop}>
                {children}
            </div>
        </div>
    );
};

export default MainLayout;
