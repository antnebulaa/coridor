'use client';

import { LayoutGrid, List } from 'lucide-react';

import { toast } from "react-hot-toast";
import axios from "axios";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import useRentModal from "@/hooks/useRentModal";

import { SafeListing, SafeUser } from "@/types";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import ListingCard from "@/components/listings/ListingCard";
import PropertiesListRow from "./components/PropertiesListRow";

interface PropertiesClientProps {
    listings: SafeListing[];
    currentUser?: SafeUser | null;
}

const PropertiesClient: React.FC<PropertiesClientProps> = ({
    listings,
    currentUser
}) => {
    const router = useRouter();
    const rentModal = useRentModal();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [deletingId, setDeletingId] = useState('');

    const onCancel = useCallback((id: string) => {
        setDeletingId(id);

        axios.delete(`/api/listings/${id}`)
            .then(() => {
                toast.success('Listing deleted');
                router.refresh();
            })
            .catch((error) => {
                toast.error(error?.response?.data?.error);
            })
            .finally(() => {
                setDeletingId('');
            })
    }, [router]);

    return (
        <Container>
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Properties"
                    subtitle="List of your properties"
                    actionLabel="Add Property"
                    onAction={() => rentModal.onOpen()}
                    actionControls={
                        <div className="flex items-center bg-neutral-100 rounded-full p-1 gap-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`
                                    p-1.5 rounded-full transition
                                    ${viewMode === 'grid' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}
                                `}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`
                                    p-1.5 rounded-full transition
                                    ${viewMode === 'list' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}
                                `}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    }
                />
            </div>

            <div className="mt-10">
                {viewMode === 'list' ? (
                    <div className="flex flex-col">
                        <div className="
                            flex 
                            items-center 
                            gap-4 
                            px-4 
                            py-3
                            border-b
                            border-neutral-200
                            text-sm 
                            text-neutral-500 
                            font-medium
                        ">
                            <span className="flex-[3]">Annonce</span>
                            <span className="flex-[2]">Adresse</span>
                            <span className="flex-1">Prix</span>
                            <span className="flex-1 text-right md:pr-1">Statut</span>
                        </div>
                        <div className="flex flex-col">
                            {listings.map((listing: any) => (
                                <PropertiesListRow
                                    key={listing.id}
                                    data={listing}
                                    currentUser={currentUser}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div
                        className="
                            grid 
                            grid-cols-1 
                            sm:grid-cols-2 
                            md:grid-cols-3 
                            lg:grid-cols-4
                            xl:grid-cols-5
                            2xl:grid-cols-6
                            gap-8
                        "
                    >
                        {listings.map((listing: any) => (
                            <div
                                key={listing.id}
                                onClick={() => router.push(`/properties/${listing.id}/edit`)}
                                className="cursor-pointer"
                            >
                                <ListingCard
                                    data={listing}
                                    currentUser={currentUser}
                                    showHeart={false}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Container>
    );
}

export default PropertiesClient;
