'use client';

import dynamic from 'next/dynamic';
import { SafeUser } from '@/types';

const SearchModal = dynamic(() => import("@/components/modals/SearchModal"), { ssr: false });
const CommuteModal = dynamic(() => import("@/components/modals/CommuteModal"), { ssr: false });
const RegisterModal = dynamic(() => import("@/components/modals/RegisterModal"), { ssr: false });
const LoginModal = dynamic(() => import("@/components/modals/LoginModal"), { ssr: false });
const RentModalLoader = dynamic(() => import("@/components/modals/RentModalLoader"), { ssr: false });
const WishlistModal = dynamic(() => import("@/components/modals/WishlistModal"), { ssr: false });
const PseudonymModal = dynamic(() => import("@/components/modals/PseudonymModal"), { ssr: false });
const MyCodeModal = dynamic(() => import("@/components/modals/MyCodeModal"), { ssr: false });

interface ModalProviderProps {
    currentUser?: SafeUser | null;
}

const ModalProvider: React.FC<ModalProviderProps> = ({ currentUser }) => {
    return (
        <>
            <SearchModal />
            <CommuteModal />
            <RentModalLoader />
            <RegisterModal />
            <LoginModal />
            <WishlistModal />
            <PseudonymModal />
            <MyCodeModal currentUser={currentUser} />
        </>
    );
};

export default ModalProvider;
