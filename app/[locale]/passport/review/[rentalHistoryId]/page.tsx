import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import ReviewPageClient from "./ReviewPageClient";

interface ReviewPageProps {
    params: {
        rentalHistoryId: string;
    };
}

const ReviewPage = async ({ params }: ReviewPageProps) => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return (
            <ClientOnly>
                <EmptyState
                    title="Non autorisé"
                    subtitle="Veuillez vous connecter"
                />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <ReviewPageClient
                currentUser={currentUser}
                rentalHistoryId={params.rentalHistoryId}
            />
        </ClientOnly>
    );
}

export default ReviewPage;
