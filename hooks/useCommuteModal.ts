import { create } from 'zustand';

interface CommuteModalStore {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

const useCommuteModal = create<CommuteModalStore>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));

export default useCommuteModal;
