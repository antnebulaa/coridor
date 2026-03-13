import { create } from 'zustand';

import { SafeListing, SafeProperty } from '@/types';

interface ImportedData {
    values: Record<string, any>;
    importedFields: string[];
    source: string;
}

interface RentModalStore {
    isOpen: boolean;
    editingListing?: SafeListing | null;
    propertyContext?: SafeProperty | null; // Phase 3: Add Unit Context
    mode: 'FULL' | 'ROOM_CONFIG';
    importedData?: ImportedData | null;
    onOpen: (listing?: SafeListing, property?: SafeProperty, mode?: 'FULL' | 'ROOM_CONFIG') => void;
    onClose: () => void;
    setImportedData: (data: ImportedData) => void;
    clearImportedData: () => void;
}

const useRentModal = create<RentModalStore>((set) => ({
    isOpen: false,
    editingListing: null,
    propertyContext: null,
    mode: 'FULL',
    importedData: null,
    onOpen: (listing, property, mode = 'FULL') => set({ isOpen: true, editingListing: listing, propertyContext: property, mode }),
    onClose: () => set({ isOpen: false, editingListing: null, propertyContext: null, mode: 'FULL', importedData: null }),
    setImportedData: (data) => set({ importedData: data }),
    clearImportedData: () => set({ importedData: null }),
}));

export default useRentModal;
