import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import ReviewPageClient from "./ReviewPageClient";

interface ReviewPageProps {
    params: {
        rentalHistoryId: string;
    };
}

const ReviewPage = async ({ params }: ReviewPageProps) => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect('/');
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
