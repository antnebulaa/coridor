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
        <div className={`fixed w-full bg-white z-10 ${!isHomePage ? 'hidden md:block' : ''}`}>
            <div className="py-2 md:py-4 border-b-[1px] border-[#dfdfdf]">
                <Container>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-row items-center justify-between w-full md:w-auto">
                            <Logo />
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
