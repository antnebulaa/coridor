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
            <div className="py-2 md:py-4 border-b-[1px] border-[#dfdfdf]">
                <Container>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-row items-center justify-between w-full md:w-auto">
                            <Logo />
                            <div className="md:hidden">
                                <UserMenu currentUser={currentUser} />
                            </div>
                        </div>
                        <Search />
                        <div className="hidden md:block">
                            <UserMenu currentUser={currentUser} />
                        </div>
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
