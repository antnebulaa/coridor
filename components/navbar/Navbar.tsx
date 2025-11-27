'use client';

import Container from '../Container';
import Logo from './Logo';
import Search from './Search';
import UserMenu from './UserMenu';

import Categories from './Categories';
import { Suspense } from 'react';

interface NavbarProps {
    currentUser?: any;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
    return (
        <div className="fixed w-full bg-white z-10">
            <div className="py-4 border-b-[1px] border-[#dfdfdf] hidden md:block">
                <Container>
                    <div className="flex flex-row items-center justify-between gap-3 md:gap-0">
                        <Logo />
                        <Search />
                        <UserMenu currentUser={currentUser} />
                    </div>
                </Container>
            </div>
            {currentUser?.userMode !== 'LANDLORD' && (
                <Suspense fallback={<div>Loading...</div>}>
                    <Categories />
                </Suspense>
            )}
        </div>
    );
};

export default Navbar;
