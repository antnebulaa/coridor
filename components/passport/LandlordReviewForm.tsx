'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { ShieldCheck } from 'lucide-react';

// -- Types ------------------------------------------------------------------

type ReviewRating = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

const CRITERIA = [
    'PAYMENT_REGULARITY',
    'PROPERTY_CONDITION',
    'COMMUNICATION',
    'WOULD_RECOMMEND',
] as const;

type Criterion = typeof CRITERIA[number];

const RATINGS: ReviewRating[] = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];

interface LandlordReviewFormProps {
    rentalHistoryId: string;
}

// -- Main Component ---------------------------------------------------------

const LandlordReviewForm: React.FC<LandlordReviewFormProps> = ({ rentalHistoryId }) => {
    const t = useTranslations('account.passport.review');
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [scores, setScores] = useState<Record<Criterion, ReviewRating | null>>({
        PAYMENT_REGULARITY: null,
        PROPERTY_CONDITION: null,
        COMMUNICATION: null,
        WOULD_RECOMMEND: null,
    });

    const setRating = (criterion: Criterion, rating: ReviewRating) => {
        setScores((prev) => ({ ...prev, [criterion]: rating }));
    };

    const allAnswered = CRITERIA.every((c) => scores[c] !== null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!allAnswered) return;

        setSubmitting(true);

        const payload = {
            rentalHistoryId,
            scores: CRITERIA.map((criterion) => ({
                criterion,
                rating: scores[criterion]!,
            })),
        };

        try {
            const res = await fetch('/api/passport/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'Error');
            }

            toast.success(t('success'));
            router.push('/');
        } catch {
            toast.error(t('error'));
        } finally {
            setSubmitting(false);
        }
    };

    const ratingStyles: Record<ReviewRating, { selected: string; border: string; dot: string }> = {
        POSITIVE: {
            selected: 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500',
            border: 'border-border hover:border-green-300 dark:hover:border-green-700',
            dot: 'bg-green-500',
        },
        NEUTRAL: {
            selected: 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-500',
            border: 'border-border hover:border-yellow-300 dark:hover:border-yellow-700',
            dot: 'bg-yellow-500',
        },
        NEGATIVE: {
            selected: 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500',
            border: 'border-border hover:border-red-300 dark:hover:border-red-700',
            dot: 'bg-red-500',
        },
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* Welcoming intro message */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                    {t('instructions')}
                </p>
            </div>

            {/* Criteria Questions */}
            {CRITERIA.map((criterion) => (
                <div
                    key={criterion}
                    className="flex flex-col gap-3 p-6 border border-border rounded-xl bg-card"
                >
                    <div className="flex flex-col gap-1">
                        <h4 className="text-base font-semibold text-foreground">
                            {t(`criteria.${criterion}.label`)}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            {t(`criteria.${criterion}.question`)}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 mt-2">
                        {RATINGS.map((rating) => {
                            const isSelected = scores[criterion] === rating;
                            const style = ratingStyles[rating];

                            return (
                                <button
                                    key={rating}
                                    type="button"
                                    onClick={() => setRating(criterion, rating)}
                                    className={`
                                        flex
                                        items-start
                                        gap-2.5
                                        p-3
                                        border-2
                                        rounded-xl
                                        cursor-pointer
                                        transition
                                        text-sm
                                        font-medium
                                        text-left
                                        ${isSelected ? style.selected : style.border + ' bg-transparent'}
                                    `}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 ${
                                        isSelected ? style.dot : 'bg-neutral-300 dark:bg-neutral-600'
                                    }`} />
                                    <span className={isSelected ? 'text-foreground' : 'text-muted-foreground'}>
                                        {t(`criteria.${criterion}.${rating}`)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Submit */}
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={!allAnswered || submitting}
                    loading={submitting}
                    label={submitting ? t('submitting') : t('submit')}
                    className="w-full sm:w-auto"
                />
            </div>
        </form>
    );
};

export default LandlordReviewForm;
