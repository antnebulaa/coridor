import { create } from 'zustand';

interface PseudonymData {
    emoji: string;
    text: string;
    full: string;
}

interface PseudonymModalStore {
    isOpen: boolean;
    initialData: PseudonymData | null;
    onOpen: (data?: PseudonymData) => void;
    onClose: () => void;
}

const usePseudonymModal = create<PseudonymModalStore>((set) => ({
    isOpen: false,
    initialData: null,
    onOpen: (data) => set({ isOpen: true, initialData: data || null }),
    onClose: () => set({ isOpen: false }),
}));

export default usePseudonymModal;
