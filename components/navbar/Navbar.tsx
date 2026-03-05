'use client';

import { useState, useEffect, useRef } from 'react';
import Logo from './Logo';
import Search from './Search';
import UserMenu from './UserMenu';
import NotificationCenter from './NotificationCenter';
import { Search as SearchIcon } from 'lucide-react';
import useSearchModal from '@/hooks/useSearchModal';

import { usePathname } from '@/i18n/navigation';

import useUserCounters from '@/hooks/useUserCounters';

interface NavbarProps {
    currentUser?: any;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const isAdmin = pathname?.includes('/admin');
    const isSimulator = pathname?.includes('/simulateur');
    const { unreadCount } = useUserCounters(currentUser);
    const searchModal = useSearchModal();
    const isSearchModalOpen = searchModal.isOpen;
    const [hideNav, setHideNav] = useState(false);
    const lastScrollY = useRef(0);
    const modalOpenRef = useRef(false);

    // Track modal state in a ref so scroll handler always reads current value
    modalOpenRef.current = isSearchModalOpen;

    // Show navbar when search modal closes
    useEffect(() => {
        if (isSearchModalOpen) setHideNav(false);
    }, [isSearchModalOpen]);

    // Hide-on-scroll-down / show-on-scroll-up for mobile home
    useEffect(() => {
        if (!isHomePage) {
            setHideNav(false);
            return;
        }

        let scrollCleanup: (() => void) | undefined;

        const timer = setTimeout(() => {
            const scrollEl = document.getElementById('home-scroll-container');
            if (!scrollEl) return;

            const handleScroll = () => {
                if (modalOpenRef.current) return;

                const currentY = scrollEl.scrollTop;
                const delta = currentY - lastScrollY.current;

                if (delta > 8 && currentY > 50) {
                    setHideNav(true);
                } else if (delta < -8) {
                    setHideNav(false);
                }

                lastScrollY.current = currentY;
            };

            scrollEl.addEventListener('scroll', handleScroll, { passive: true });
            scrollCleanup = () => scrollEl.removeEventListener('scroll', handleScroll);
        }, 100);

        return () => {
            clearTimeout(timer);
            scrollCleanup?.();
        };
    }, [isHomePage]);

    if (isAdmin || isSimulator) return null;

    return (
        <div
            data-navbar
            className={`${isHomePage ? 'fixed' : 'relative'} w-full z-9998 pt-safe bg-background ${!isHomePage ? 'hidden md:block' : ''} ${isSearchModalOpen ? 'invisible' : 'transition-transform duration-300 ease-out'} ${isHomePage && hideNav ? '-translate-y-full md:translate-y-0' : ''}`}
            suppressHydrationWarning
        >
            <div className={`py-2 md:py-4 ${isHomePage ? 'border-none md:border-b' : 'border-b'} border-border`}>
                <div
                    className={`
                        max-w-[2520px]
                        mx-auto
                        ${isHomePage ? 'xl:px-6 md:px-6 sm:px-2 px-4' : 'xl:px-20 md:px-10 sm:px-2 px-4'}
                    `}
                >
                    {/* ═══ Mobile Home Header ═══ */}
                    {isHomePage && (
                        <div className="flex md:hidden flex-col gap-2.5">
                            {/* Row 1: Logo + Notifications */}
                            <div className="flex items-center justify-between">
                                <div
                                    className="cursor-pointer text-[18px] dark:text-white"
                                    style={{ fontFamily: "'Boldonse', sans-serif" }}
                                >
                                    CORIDOR
                                </div>
                                {currentUser && (
                                    <NotificationCenter currentUser={currentUser} redirectToPage />
                                )}
                            </div>
                            {/* Row 2: Search button */}
                            {currentUser?.userMode !== 'LANDLORD' && (
                                <button
                                    onClick={() => searchModal.onOpen()}
                                    className="w-full h-[50px] px-4 rounded-full bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 flex items-center gap-3 active:scale-[0.98] transition justify-center"
                                >
                                    <SearchIcon size={17} strokeWidth={2.5} className="text-neutral-800 dark:text-neutral-400 shrink-0" />
                                    <span className="text-[17px] font-medium text-neutral-800 dark:text-neutral-400 truncate">Rechercher une location</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* ═══ Desktop Header (all pages) + Mobile Non-Home ═══ */}
                    <div className={`${isHomePage ? 'hidden md:flex' : 'flex'} flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
                        {/* Left Side: Logo + Search */}
                        <div className="flex items-center gap-6">
                            <div className="flex flex-row items-center justify-between w-full md:w-auto">
                                <div className="flex items-center gap-2">
                                    <Logo />
                                    {currentUser?.plan === 'PLUS' && (
                                        <div className="text-black text-[12px] font-medium px-2 py-0.5">
                                            PLUS
                                        </div>
                                    )}
                                    {currentUser?.plan === 'PRO' && (
                                        <div className="text-black text-[12px] font-medium px-2 py-0.5">
                                            PRO
                                        </div>
                                    )}
                                </div>
                                <div className="md:hidden">
                                    <UserMenu currentUser={currentUser} unreadCount={unreadCount} />
                                </div>
                            </div>
                            {isHomePage && currentUser?.userMode !== 'LANDLORD' && (
                                <div className="flex flex-row items-center w-full gap-2 transition-all">
                                    <div className="flex-1 min-w-0">
                                        <Search />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Notifications + User Menu */}
                        <div className="hidden md:flex items-center gap-2">
                            <NotificationCenter currentUser={currentUser} />
                            <UserMenu currentUser={currentUser} unreadCount={unreadCount} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
