'use client';

import { Search as SearchIcon } from 'lucide-react';
import useSearchModal from '@/hooks/useSearchModal';

const Search = () => {
    const searchModal = useSearchModal();

    return (
        <div
            onClick={searchModal.onOpen}
            className="border-[1px] w-full md:w-auto py-2 rounded-full shadow-sm hover:shadow-md transition cursor-pointer hidden md:block"
        >
            <div className="flex flex-row items-center justify-between pl-6 pr-2">
                <div className="text-sm font-medium px-6">
                    Rechercher une location
                </div>
                <div className="p-2 bg-primary rounded-full text-white">
                    <SearchIcon size={18} />
                </div>
            </div>
        </div>
    );
};

export default Search;
