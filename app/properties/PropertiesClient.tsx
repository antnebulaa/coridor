'use client';

import { toast } from "react-hot-toast";
import axios from "axios";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import useRentModal from "@/hooks/useRentModal";

import { SafeListing, SafeUser } from "@/types";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import ListingCard from "@/components/listings/ListingCard";

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
            <PageHeader
                title="Properties"
                subtitle="List of your properties"
                actionLabel="Add Property"
                onAction={() => rentModal.onOpen()}
            />
            <div
                className="
          mt-10
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
        </Container>
    );
}

export default PropertiesClient;
