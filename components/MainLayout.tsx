'use client';

import { usePathname } from "next/navigation";

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const pathname = usePathname();
    const isMainPage = pathname === '/';

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

    const paddingTop = isMainPage ? 'pt-24 md:pt-40' : 'pt-0 md:pt-28';

    return (
        <div className={`pb-20 ${paddingTop}`}>
            {children}
        </div>
    );
};

export default MainLayout;
