'use client';

import { useTranslations } from 'next-intl';
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import LandlordReviewForm from "@/components/passport/LandlordReviewForm";
import { SafeUser } from "@/types";

interface ReviewPageClientProps {
    currentUser: SafeUser;
    rentalHistoryId: string;
}

const ReviewPageClient: React.FC<ReviewPageClientProps> = ({
    currentUser,
    rentalHistoryId,
}) => {
    const t = useTranslations('account.passport.review');

    return (
        <Container>
            <div className="max-w-2xl mx-auto pb-10">
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                />

                <div className="mt-10">
                    <LandlordReviewForm rentalHistoryId={rentalHistoryId} />
                </div>
            </div>
        </Container>
    );
};

export default ReviewPageClient;
