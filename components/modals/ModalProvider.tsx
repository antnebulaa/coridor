'use client';

import dynamic from 'next/dynamic';
import { SafeUser } from '@/types';
import useSearchModal from '@/hooks/useSearchModal';
import useCommuteModal from '@/hooks/useCommuteModal';
import useRegisterModal from '@/hooks/useRegisterModal';
import useLoginModal from '@/hooks/useLoginModal';
import useRentModal from '@/hooks/useRentModal';
import useWishlistModal from '@/hooks/useWishlistModal';
import usePseudonymModal from '@/hooks/usePseudonymModal';
import useMyCodeModal from '@/hooks/useMyCodeModal';

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
    // Only mount modals when open — saves 300-600ms TTI from 8 eagerly-rendered components
    const searchOpen = useSearchModal(s => s.isOpen);
    const commuteOpen = useCommuteModal(s => s.isOpen);
    const registerOpen = useRegisterModal(s => s.isOpen);
    const loginOpen = useLoginModal(s => s.isOpen);
    const rentOpen = useRentModal(s => s.isOpen);
    const wishlistOpen = useWishlistModal(s => s.isOpen);
    const pseudonymOpen = usePseudonymModal(s => s.isOpen);
    const myCodeOpen = useMyCodeModal(s => s.isOpen);

    return (
        <>
            {searchOpen && <SearchModal />}
            {commuteOpen && <CommuteModal />}
            {rentOpen && <RentModalLoader />}
            {registerOpen && <RegisterModal />}
            {loginOpen && <LoginModal />}
            {wishlistOpen && <WishlistModal />}
            {pseudonymOpen && <PseudonymModal />}
            {myCodeOpen && <MyCodeModal currentUser={currentUser} />}
        </>
    );
};

export default ModalProvider;
