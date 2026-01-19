'use client';

import Container from '../Container';
import Logo from './Logo';
import Search from './Search';
import UserMenu from './UserMenu';

import { usePathname } from 'next/navigation';

interface NavbarProps {
    currentUser?: any;
    unreadCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, unreadCount }) => {
    const pathname = usePathname();
    const isHomePage = pathname === '/';

    return (
        <div
            className={`fixed w-full z-[9999] transition-colors duration-200 pt-safe ${isHomePage ? 'bg-transparent md:bg-background' : 'bg-background'} ${!isHomePage ? 'hidden md:block' : ''}`}
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
                                        bg-primary
                                        text-white
                                        text-[10px]
                                        font-bold
                                        px-2
                                        py-0.5
                                        rounded-full
                                    ">
                                            PLUS
                                        </div>
                                    )}
                                    {currentUser?.plan === 'PRO' && (
                                        <div className="
                                        bg-black
                                        text-white
                                        text-[10px]
                                        font-bold
                                        px-2
                                        py-0.5
                                        rounded-full
                                    ">
                                            PRO
                                        </div>
                                    )}
                                </div>
                                <div className="md:hidden">
                                    <UserMenu currentUser={currentUser} unreadCount={unreadCount} />
                                </div>
                            </div>
                            {isHomePage && <Search />}
                        </div>

                        {/* Right Side: User Menu */}
                        <div className="hidden md:block">
                            <UserMenu currentUser={currentUser} unreadCount={unreadCount} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
