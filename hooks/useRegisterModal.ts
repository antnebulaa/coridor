import { create } from 'zustand';

interface RegisterModalStore {
    isOpen: boolean;
    callbackUrl?: string;
    onOpen: (callbackUrl?: string) => void;
    onClose: () => void;
}

const useRegisterModal = create<RegisterModalStore>((set) => ({
    isOpen: false,
    callbackUrl: undefined,
    onOpen: (callbackUrl?: string | any) => set({
        isOpen: true,
        callbackUrl: typeof callbackUrl === 'string' ? callbackUrl : undefined
    }),
    onClose: () => set({ isOpen: false, callbackUrl: undefined }),
}));

export default useRegisterModal;
