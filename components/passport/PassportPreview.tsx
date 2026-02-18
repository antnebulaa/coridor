'use client';

import { useState, useEffect } from 'react';
import {
    Award,
    ShieldCheck,
    CheckCircle,
    Clock,
    Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import PaymentBadge from '@/components/profile/PaymentBadge';

// -- Types ------------------------------------------------------------------

interface PassportPreviewData {
    score: {
        globalScore: number;
        confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    settings: {
        isEnabled: boolean;
        showPaymentBadge: boolean;
        showRentalHistory: boolean;
        showLandlordReviews: boolean;
        showVerifiedMonths: boolean;
    };
    rentalHistory: {
        id: string;
        city: string;
        propertyType: string;
        startDate: string;
        endDate: string | null;
        isVerified: boolean;
        landlordReview: {
            compositeScore: number;
            tenantConsented: boolean;
            scores: {
                criterion: string;
                rating: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
            }[];
        } | null;
    }[];
    paymentBadge?: {
        verifiedMonths?: number;
        punctualityRate?: number | null;
    };
}

interface PassportPreviewProps {
    userId: string;
    passportData?: PassportPreviewData | null;
}

const CRITERIA_ORDER = [
    'PAYMENT_REGULARITY',
    'PROPERTY_CONDITION',
    'COMMUNICATION',
    'WOULD_RECOMMEND',
] as const;

// -- Main Component ---------------------------------------------------------

const PassportPreview: React.FC<PassportPreviewProps> = ({ userId, passportData: initialData }) => {
    const t = useTranslations('account.passport.preview');
    const [data, setData] = useState<PassportPreviewData | null>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (initialData) return;

        fetch(`/api/passport/${userId}`)
            .then((res) => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then((d) => setData(d))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [userId, initialData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
        );
    }

    if (error || !data || !data.settings?.isEnabled) {
        return null;
    }

    const { score, settings, rentalHistory, paymentBadge } = data;

    const confidenceStyles = {
        HIGH: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        LOW: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    };

    const visibleHistory = rentalHistory.filter(rh => !('isHidden' in rh && (rh as any).isHidden));
    const sharedReviews = rentalHistory
        .filter(rh => rh.landlordReview?.tenantConsented)
        .map(rh => rh.landlordReview!);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
                <Award size={22} />
                {t('title')}
            </h3>

            <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-col gap-4">
                {/* Confidence badge — NO score display */}
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${confidenceStyles[score.confidence]}`}>
                        <ShieldCheck size={12} />
                        {score.confidence}
                    </span>
                </div>

                {/* Payment badge — new "Payeur verifie — X mois" format */}
                {settings.showPaymentBadge && paymentBadge?.verifiedMonths != null && (
                    <PaymentBadge
                        verifiedMonths={paymentBadge.verifiedMonths}
                        punctualityRate={paymentBadge.punctualityRate}
                    />
                )}

                {/* Rental history (brief) */}
                {settings.showRentalHistory && visibleHistory.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            {t('rentalHistory')}
                        </span>
                        <div className="flex flex-col gap-1">
                            {visibleHistory.slice(0, 5).map((entry) => (
                                <div key={entry.id} className="flex items-center gap-2 text-sm">
                                    {entry.isVerified ? (
                                        <CheckCircle size={14} className="text-green-500 shrink-0" />
                                    ) : (
                                        <Clock size={14} className="text-neutral-400 shrink-0" />
                                    )}
                                    <span className="text-neutral-800 font-medium">{entry.city}</span>
                                    <span className="text-neutral-500">
                                        {formatDate(entry.startDate)} — {entry.endDate ? formatDate(entry.endDate) : 'En cours'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Evaluations summary — 4 criteria with colored dots */}
                {settings.showLandlordReviews && sharedReviews.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            {t('evaluations')}
                        </span>
                        <div className="flex flex-col gap-1">
                            {sharedReviews.map((review, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                    <div className="flex items-center gap-1">
                                        {CRITERIA_ORDER.map((criterion) => {
                                            const scoreEntry = review.scores.find(s => s.criterion === criterion);
                                            if (!scoreEntry) return null;
                                            return (
                                                <div
                                                    key={criterion}
                                                    className={`w-2.5 h-2.5 rounded-full ${
                                                        scoreEntry.rating === 'POSITIVE'
                                                            ? 'bg-green-500'
                                                            : scoreEntry.rating === 'NEUTRAL'
                                                            ? 'bg-yellow-500'
                                                            : 'bg-red-500'
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <span className="text-neutral-700">
                                        {review.compositeScore.toFixed(2)} / 3.00
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PassportPreview;
