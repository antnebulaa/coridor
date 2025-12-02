'use client';

import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

import useLoginModal from "@/hooks/useLoginModal";
import { SafeListing, SafeReservation, SafeUser } from "@/types";

import Container from "@/components/Container";
import { categories } from "@/components/navbar/Categories";
import ListingHead from "@/components/listings/ListingHead";
import ListingInfo from "@/components/listings/ListingInfo";
import { Button } from "@/components/ui/Button";

interface ListingClientProps {
    listing: SafeListing & {
        user: SafeUser;
    };
    reservations?: SafeReservation[];
    currentUser?: SafeUser | null;
}

const ListingClient: React.FC<ListingClientProps> = ({
    listing,
    reservations = [],
    currentUser
}) => {
    const loginModal = useLoginModal();
    const router = useRouter();

    const category = useMemo(() => {
        return categories.find((items) =>
            items.label === listing.category);
    }, [listing.category]);

    const [isLoading, setIsLoading] = useState(false);

    const onContactHost = useCallback(() => {
        if (!currentUser) {
            return loginModal.onOpen();
        }

        setIsLoading(true);

        axios.post('/api/conversations', {
            userId: listing.user.id
        })
            .then((data) => {
                router.push(`/inbox/${data.data.id}`);
            })
            .catch((error) => {
                toast.error('Something went wrong');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }, [currentUser, loginModal, listing.user.id, router]);

    return (
        <Container>
            <div
                className="
          max-w-screen-lg 
          mx-auto
        "
            >
                <div className="flex flex-col gap-6">
                    <ListingHead
                        title={listing.title}
                        imageSrc={listing.images?.[0]?.url}
                        locationValue={listing.locationValue}
                        id={listing.id}
                        currentUser={currentUser}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
                        <ListingInfo
                            user={listing.user}
                            category={category}
                            description={listing.description}
                            roomCount={listing.roomCount}
                            guestCount={listing.guestCount}
                            bathroomCount={listing.bathroomCount}
                            locationValue={listing.locationValue}
                            listing={listing}
                        />
                        <div className="order-first mb-10 md:order-last md:col-span-3">
                            <div className="bg-white border-[1px] border-neutral-200 overflow-hidden rounded-xl p-4 flex flex-col gap-4 sticky top-28">
                                <div className="text-xl font-semibold">
                                    Intéressé ?
                                </div>
                                <div className="text-neutral-500 font-light">
                                    Contactez l'hôte pour plus d'informations ou pour organiser une visite.
                                </div>
                                <Button
                                    label="Contacter l'hôte"
                                    onClick={onContactHost}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default ListingClient;
