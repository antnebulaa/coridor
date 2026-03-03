import { create } from 'zustand';

interface LoginModalStore {
    isOpen: boolean;
    callbackUrl?: string;
    onOpen: (callbackUrl?: string) => void;
    onClose: () => void;
}

const useLoginModal = create<LoginModalStore>((set) => ({
    isOpen: false,
    callbackUrl: undefined,
    onOpen: (callbackUrl?: string) => set({ isOpen: true, callbackUrl }),
    onClose: () => set({ isOpen: false, callbackUrl: undefined }),
}));

export default useLoginModal;
