'use client';

import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";

interface AccountClientLayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
}

// Page title mapping
const PAGE_TITLES: Record<string, string> = {
    '/account/personal-info': 'Informations personnelles',
    '/account/tenant-profile': 'Profil locataire',
    '/account/security': 'Sécurité',
    '/account/preferences': 'Préférences',
    '/account/notifications': 'Notifications',
    '/account/project': 'Mon projet',
    '/account/privacy': 'Confidentialité',
    '/account/pricing': 'Abonnement',
    '/account/alerts': 'Alertes',
    '/account/settings': 'Paramètres',
    '/account/tax-simulator': 'Simulateur fiscal',
};

const AccountHeader = () => {
    const pathname = usePathname();
    const router = useRouter();
    const title = PAGE_TITLES[pathname] || 'Mon compte';

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-neutral-200 md:hidden pt-safe">
            <div className="flex items-center h-14 px-4">
                <button
                    onClick={handleBack}
                    className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-neutral-100 transition"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="flex-1 text-center font-semibold text-lg pr-8">
                    {title}
                </h1>
            </div>
        </div>
    );
};

const AccountClientLayout: React.FC<AccountClientLayoutProps> = ({
    children,
    sidebar
}) => {
    const pathname = usePathname();
    const isMainPage = pathname === '/account';

    return (
        <>
            {/* Fixed header on mobile for subpages */}
            {!isMainPage && (
                <Suspense fallback={<div className="h-14 md:hidden" />}>
                    <AccountHeader />
                </Suspense>
            )}

            {/* Main container */}
            <div className={`
                max-w-7xl mx-auto px-4 md:px-8
                ${!isMainPage ? 'pt-16 md:pt-4' : 'pt-4'}
                pb-24 md:pb-8
            `}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-y-6 md:gap-10">
                    {/* Sidebar - hidden on mobile for subpages, sticky on desktop */}
                    <div className={`
                        col-span-1
                        ${!isMainPage ? 'hidden md:block' : 'block'}
                    `}>
                        <div className="md:sticky md:top-[88px] md:max-h-[calc(100vh-88px)] md:overflow-y-auto md:scrollbar-none">
                            {sidebar}
                        </div>
                    </div>

                    {/* Content area - hidden on mobile for main page */}
                    <div className={`
                        col-span-1 md:col-span-3
                        ${isMainPage ? 'hidden md:block' : 'block'}
                    `}>
                        {children}
                    </div>
                </div>
            </div>

            {/* Hide bottom navbar on account subpages (mobile only) */}
            {!isMainPage && (
                <style jsx global>{`
                    @media (max-width: 768px) {
                        #bottom-nav {
                            display: none !important;
                        }
                    }
                `}</style>
            )}
        </>
    );
}

export default AccountClientLayout;
