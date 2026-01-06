'use client';

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

import { SafeUser } from "@/types";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import WishlistCard from "@/components/listings/WishlistCard";

interface FavoritesClientProps {
    wishlists: any[];
    currentUser?: SafeUser | null;
}

const FavoritesClient: React.FC<FavoritesClientProps> = ({
    wishlists,
    currentUser
}) => {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [deletingId, setDeletingId] = useState('');

    const toggleEdit = useCallback(() => {
        setIsEditing((prev) => !prev);
    }, []);

    const onDelete = useCallback((id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette wishlist ?")) {
            setDeletingId(id);
            axios.delete(`/api/wishlists/${id}`)
                .then(() => {
                    toast.success('Wishlist supprimée');
                    router.refresh();
                })
                .catch((error) => {
                    toast.error('Une erreur s\'est produite.');
                })
                .finally(() => {
                    setDeletingId('');
                })
        }
    }, [router]);

    return (
        <Container>
            <PageHeader
                title="Favoris"
                titleClassName="font-medium"
                actionLabel={isEditing ? "Terminer" : "Modifier"}
                onAction={toggleEdit}
                hideSeparator
            />
            <div
                className="
          mt-6
          grid 
          grid-cols-2
          md:grid-cols-3 
          lg:grid-cols-4
          xl:grid-cols-5
          2xl:grid-cols-6
          gap-8
        "
            >
                {/* All Saved Card */}
                <WishlistCard
                    data={{
                        id: 'all',
                        name: 'Tous les favoris',
                        listings: wishlists.find(w => w.listings.length > 0)?.listings || [],
                        _count: {
                            listings: wishlists.reduce((acc, w) => acc + w._count.listings, 0)
                        }
                    }}
                />

                {wishlists.map((wishlist) => (
                    <WishlistCard
                        currentUser={currentUser}
                        key={wishlist.id}
                        data={wishlist}
                        isEditing={isEditing}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </Container>
    );
}

export default FavoritesClient;
