import { create } from 'zustand';
import { SafeReservation } from '@/types';

interface LeaseModalStore {
    isOpen: boolean;
    reservation: SafeReservation | null;
    onOpen: (reservation: SafeReservation) => void;
    onClose: () => void;
}

const useLeaseModal = create<LeaseModalStore>((set) => ({
    isOpen: false,
    reservation: null,
    onOpen: (reservation) => set({ isOpen: true, reservation }),
    onClose: () => set({ isOpen: false, reservation: null }),
}));

export default useLeaseModal;
