import { create } from 'zustand';

interface SearchModalStore {
    isOpen: boolean;
    step?: number;
    section?: string;
    onOpen: (params?: { step?: number, section?: string }) => void;
    onClose: () => void;
}

const useSearchModal = create<SearchModalStore>((set) => ({
    isOpen: false,
    step: 0,
    section: undefined,
    onOpen: (params) => set({ isOpen: true, step: params?.step, section: params?.section }),
    onClose: () => set({ isOpen: false, step: 0, section: undefined }),
}));

export default useSearchModal;
