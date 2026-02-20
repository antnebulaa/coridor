'use client';

import Container from '../Container';
import Logo from './Logo';
import Search from './Search';
import UserMenu from './UserMenu';
import NotificationCenter from './NotificationCenter';

import { usePathname } from 'next/navigation';

import useUserCounters from '@/hooks/useUserCounters';

interface NavbarProps {
    currentUser?: any;
    // unreadCount removed from props
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
    const pathname = usePathname();
    const isHomePage = pathname === '/' || pathname === '/fr' || pathname === '/en';
    const isAdmin = pathname?.includes('/admin');
    const { unreadCount } = useUserCounters(currentUser);

    if (isAdmin) return null;

    return (
        <div
            data-navbar
            className={`${isHomePage ? 'fixed' : 'sticky top-0'} w-full z-9999 transition-colors duration-200 pt-safe ${isHomePage ? 'bg-transparent md:bg-background' : 'bg-background'} ${!isHomePage ? 'hidden md:block' : ''}`}
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
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        {/* Left Side: Logo + Search */}
                        <div className="flex items-center gap-6">
                            {/* Top Row: Logo, Badges, Mobile Menu - HIDDEN on Mobile Home */}
                            <div className={`
                            flex flex-row items-center justify-between w-full md:w-auto
                            ${isHomePage ? 'hidden md:flex' : 'flex'}
                        `}>
                                <div className="flex items-center gap-2">
                                    <Logo />
                                    {currentUser?.plan === 'PLUS' && (
                                        <div className="
                                         text-black
                                        text-[12px]
                                        font-medium
                                        px-2
                                        py-0.5
                                    ">
                                            PLUS
                                        </div>
                                    )}
                                    {currentUser?.plan === 'PRO' && (
                                        <div className="
                                    
                                        text-black
                                        text-[12px]
                                        font-medium
                                        px-2
                                        py-0.5
                                        
                                    ">
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
                                    <div className="md:hidden shrink-0">
                                        <NotificationCenter currentUser={currentUser} redirectToPage />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Side: User Menu */}
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
