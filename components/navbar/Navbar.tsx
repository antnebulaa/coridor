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
        <div className={`fixed w-full bg-white z-[9999] ${!isHomePage ? 'hidden md:block' : ''}`}>
            <div className="py-2 md:py-4 border-b border-[#dfdfdf]">
                <Container>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        {/* Top Row: Logo, Badges, Mobile Menu - HIDDEN on Mobile Home */}
                        <div className={`
                            flex flex-row items-center justify-between w-full md:w-auto
                            ${isHomePage ? 'hidden md:flex' : 'flex'}
                        `}>
                            <div className="flex items-center gap-2">
                                <Logo />
                                {currentUser?.plan === 'PLUS' && (
                                    <div className="
                                        bg-rose-500 
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
                        <div className="hidden md:block">
                            <UserMenu currentUser={currentUser} unreadCount={unreadCount} />
                        </div>
                    </div>
                </Container>
            </div>
        </div>
    );
};

export default Navbar;
