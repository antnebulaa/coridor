import { create } from 'zustand';

interface WishlistModalStore {
    isOpen: boolean;
    listingId: string;
    onOpen: (listingId: string) => void;
    onClose: () => void;
}

const useWishlistModal = create<WishlistModalStore>((set) => ({
    isOpen: false,
    listingId: '',
    onOpen: (listingId) => set({ isOpen: true, listingId }),
    onClose: () => set({ isOpen: false, listingId: '' }),
}));

export default useWishlistModal;
