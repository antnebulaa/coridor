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
    const paddingBottom = (isInbox || isMainPage) ? 'pb-0' : 'pb-20';

    // Navbar is fixed now. We need top padding.
    // HomePage: Visible on Mobile & Desktop.
    // Other Pages: Visible on Desktop Only.

    let paddingTop = 'pt-0';
    if (isMainPage) {
        paddingTop = 'pt-0 md:pt-20'; // Home: map immersive, Navbar (fixed) handles its own pt-safe
    } else {
        // Non-home: Navbar hidden on mobile, need safe area padding
        paddingTop = 'pt-safe md:pt-20';
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
