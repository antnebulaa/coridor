import { create } from 'zustand';

interface MyCodeModalStore {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

const useMyCodeModal = create<MyCodeModalStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));

export default useMyCodeModal;
