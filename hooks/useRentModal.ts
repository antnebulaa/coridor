import { create } from 'zustand';

import { SafeListing, SafeProperty } from '@/types';

interface RentModalStore {
    isOpen: boolean;
    editingListing?: SafeListing | null;
    propertyContext?: SafeProperty | null; // Phase 3: Add Unit Context
    onOpen: (listing?: SafeListing, property?: SafeProperty) => void;
    onClose: () => void;
}

const useRentModal = create<RentModalStore>((set) => ({
    isOpen: false,
    editingListing: null,
    propertyContext: null,
    onOpen: (listing, property) => set({ isOpen: true, editingListing: listing, propertyContext: property }),
    onClose: () => set({ isOpen: false, editingListing: null, propertyContext: null }),
}));

export default useRentModal;
