import { create } from 'zustand';

import { SafeListing, SafeProperty } from '@/types';

interface RentModalStore {
    isOpen: boolean;
    editingListing?: SafeListing | null;
    propertyContext?: SafeProperty | null; // Phase 3: Add Unit Context
    mode: 'FULL' | 'ROOM_CONFIG';
    onOpen: (listing?: SafeListing, property?: SafeProperty, mode?: 'FULL' | 'ROOM_CONFIG') => void;
    onClose: () => void;
}

const useRentModal = create<RentModalStore>((set) => ({
    isOpen: false,
    editingListing: null,
    propertyContext: null,
    mode: 'FULL',
    onOpen: (listing, property, mode = 'FULL') => set({ isOpen: true, editingListing: listing, propertyContext: property, mode }),
    onClose: () => set({ isOpen: false, editingListing: null, propertyContext: null, mode: 'FULL' }),
}));

export default useRentModal;
