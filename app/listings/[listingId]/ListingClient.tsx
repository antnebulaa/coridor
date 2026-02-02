'use client';

import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import useLoginModal from "@/hooks/useLoginModal";
import { SafeListing, SafeUser } from "@/types";

import Container from "@/components/Container";
import { categories } from "@/components/navbar/Categories";
import ListingHead from "@/components/listings/ListingHead";
import ListingInfo from "@/components/listings/ListingInfo";
import { Button } from "@/components/ui/Button";
import ApplicationModal from "@/components/modals/ApplicationModal";
import IncompleteProfileModal from "@/components/modals/IncompleteProfileModal";
import ListingMobileFooter from "@/components/listings/ListingMobileFooter";

interface ListingClientProps {
    listing: SafeListing & {
        user: SafeUser;
    };

    currentUser?: SafeUser | null;
}

const ListingClient: React.FC<ListingClientProps> = ({
    listing,

    currentUser
}) => {
    const loginModal = useLoginModal();
    const router = useRouter();

    const category = useMemo(() => {
        return categories.find((items) =>
            items.label === listing.category);
    }, [listing.category]);

    const [isLoading, setIsLoading] = useState(false);
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [isIncompleteProfileModalOpen, setIsIncompleteProfileModalOpen] = useState(false);

    const { data: session } = useSession();
    const sessionUserId = (session?.user as any)?.id;
    const effectiveUserId = currentUser?.id || sessionUserId;
    const isOwner = effectiveUserId === listing.user.id;

    const onContactHost = useCallback(() => {
        if (!effectiveUserId) {
            return loginModal.onOpen();
        }

        if (isOwner) {
            return toast.error("Vous ne pouvez pas vous contacter vous-même");
        }

        setIsLoading(true);

        axios.post('/api/conversations', {
            userId: listing.user.id,
            listingId: listing.id
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
    }, [effectiveUserId, loginModal, listing.user.id, router, isOwner]);

    const onApply = useCallback(() => {
        if (!effectiveUserId) {
            return loginModal.onOpen();
        }

        if (isOwner) {
            return toast.error("Vous ne pouvez pas candidater à votre propre annonce");
        }

        // Check if profile is complete (basic check: jobType OR netSalary)
        const isProfileComplete = !!(currentUser?.tenantProfile?.jobType || currentUser?.tenantProfile?.netSalary);

        if (!isProfileComplete && !session) {
            // If we rely on session, we might not have profile data unless we fetch it.
            // But for now let's assume if currentUser is null, we can't check profile easily 
            // unless we trust the user is logged in.
            // If currentUser is null but session exists, we should probably allow or warn.
            // Let's rely on currentUser being populated if possible.
            // But if server failed, currentUser is null.
            // We can skip profile check or assume incomplete?
            // Let's skip profile check if using session fallback for now (or improve logic later).
        }

        // Keep original profile check using currentUser if available. 
        // If currentUser is null, we can't check profile.
        if (currentUser && !isProfileComplete) {
            return setIsIncompleteProfileModalOpen(true);
        }
        // If currentUser is null (using session), we proceed to modal.

        setIsApplicationModalOpen(true);
    }, [currentUser, effectiveUserId, loginModal, isOwner, session]);

    return (
        <Container>
            <div
                className="
          max-w-5xl 
          mx-auto
        "
            >
                <div className="flex flex-col gap-6">
                    <ListingHead
                        title={listing.title}
                        imageSrc={listing.images?.[0]?.url}
                        locationValue={(listing as any).locationValue}
                        id={listing.id}
                        currentUser={currentUser}
                        listing={listing}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">
                        <ListingInfo
                            user={listing.user}
                            category={category}
                            description={listing.description}
                            roomCount={listing.roomCount || 0}
                            guestCount={listing.guestCount || 0}
                            bathroomCount={listing.bathroomCount || 0}
                            locationValue={(listing as any).locationValue}
                            listing={listing}
                            currentUser={currentUser}
                        />
                        <div className="order-first mb-10 md:order-last md:col-span-3">
                            <div className="bg-card border border-border overflow-hidden rounded-xl p-4 flex flex-col gap-4 sticky top-28">
                                <div className="text-xl font-semibold">
                                    Intéressé ?
                                </div>
                                <div className="text-muted-foreground font-light">
                                    Contactez l'hôte pour plus d'informations ou pour organiser une visite.
                                </div>
                                {!isOwner && (
                                    <>
                                        <Button
                                            label="Contacter l'hôte"
                                            onClick={onContactHost}
                                            disabled={isLoading}
                                        />
                                        <hr />
                                        <div className="text-muted-foreground font-light text-sm">
                                            Vous avez un dossier complet ? Déposez votre candidature directement.
                                        </div>
                                        <Button
                                            label="Déposer ma candidature"
                                            onClick={onApply}
                                            disabled={isLoading}
                                            className="bg-[#1719FF] border-[#1719FF] hover:opacity-90"
                                        />
                                    </>
                                )}
                                {isOwner && (
                                    <div className="text-center text-neutral-500 font-light py-4">
                                        C'est votre annonce
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ApplicationModal
                isOpen={isApplicationModalOpen}
                onClose={() => setIsApplicationModalOpen(false)}
                listing={listing}
                currentUser={currentUser}
            />
            <IncompleteProfileModal
                isOpen={isIncompleteProfileModalOpen}
                onClose={() => setIsIncompleteProfileModalOpen(false)}
            />
            <ListingMobileFooter
                listing={listing}
                onApply={onApply}
                disabled={isLoading}
                isOwner={isOwner}
            />
        </Container>
    );
}

export default ListingClient;
