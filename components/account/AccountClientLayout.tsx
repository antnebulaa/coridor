'use client';

import { usePathname, useRouter } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";
import { AccountHeaderContext, useAccountHeader, useAccountHeaderState } from "@/hooks/useAccountHeader";

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
    '/account/fiscal': 'Récap fiscal',
    '/account/simulations': 'Mes simulations',
    '/account/receipts': 'Quittances',
    '/account/passport': 'Passeport Locatif',
};

const AccountHeader = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { titleVisibility, barRef } = useAccountHeader();
    const title = PAGE_TITLES[pathname] || 'Mon compte';
    const showBarTitle = titleVisibility === 0;

    const handleBack = () => {
        router.back();
    };

    return (
        <div ref={barRef} className={`shrink-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg border-b transition-colors duration-200 md:hidden ${
            showBarTitle ? 'border-neutral-200 dark:border-neutral-800' : 'border-transparent'
        }`}>
            <div className="flex items-center h-14 px-4">
                <button
                    onClick={handleBack}
                    className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1
                    className={`flex-1 text-center font-semibold text-lg pr-8 transition-all duration-200 ${
                        showBarTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
                    }`}
                >
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

    const headerState = useAccountHeaderState();

    return (
        <AccountHeaderContext.Provider value={headerState}>
            <div className={
                !isMainPage
                    ? 'fixed inset-0 pt-safe flex flex-col z-40 bg-white dark:bg-neutral-950 md:static md:inset-auto md:pt-0 md:block md:h-auto md:z-auto md:bg-transparent'
                    : ''
            }>
                {/* Bar at top — in flow, never scrolls, content never goes under */}
                {!isMainPage && <AccountHeader />}

                {/* Content scrolls within its own area */}
                <div
                    ref={!isMainPage ? headerState.scrollRef : undefined}
                    className={!isMainPage ? 'flex-1 overflow-y-auto min-h-0 md:overflow-visible' : ''}
                >
                    <div className={`
                        max-w-5xl mx-auto px-4 md:px-8
                        pt-4
                        pb-24 md:pb-8
                    `}>
                        <div className="grid grid-cols-1 md:grid-cols-8 gap-y-6 md:gap-10">
                            {/* Sidebar - hidden on mobile for subpages, sticky on desktop */}
                            <div className={`
                                col-span-3
                                ${!isMainPage ? 'hidden md:block' : 'block'}
                            `}>
                                <div className="md:sticky md:top-0 md:px-2 md:max-h-[calc(100dvh-5rem)] md:overflow-y-auto md:scrollbar-none">
                                    {sidebar}
                                </div>
                            </div>

                            {/* Content area - hidden on mobile for main page */}
                            <div className={`
                                col-span-1 md:col-span-5
                                ${isMainPage ? 'hidden md:block' : 'block'}
                            `}>
                                {children}
                            </div>
                        </div>
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
        </AccountHeaderContext.Provider>
    );
}

export default AccountClientLayout;
