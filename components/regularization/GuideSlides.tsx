'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface GuideSlidesProps {
    onComplete: () => void;
    onBack: () => void;
}

const TOTAL_SLIDES = 5;

const GuideSlides: React.FC<GuideSlidesProps> = ({ onComplete, onBack }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const t = useTranslations('regularization');

    const next = () => {
        if (currentSlide < TOTAL_SLIDES - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onComplete();
        }
    };

    const back = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        } else {
            onBack();
        }
    };

    return (
        <div className="flex flex-col h-full px-6 py-6">
            {/* Progress bar */}
            <div className="flex items-center gap-1.5 mb-2">
                {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                    <div
                        key={i}
                        className={`
                            h-1 flex-1 rounded-full transition-colors duration-300
                            ${i <= currentSlide
                                ? 'bg-neutral-900 dark:bg-white'
                                : 'bg-neutral-200 dark:bg-neutral-700'
                            }
                        `}
                    />
                ))}
            </div>

            {/* Skip link on slide 1 only */}
            <div className="flex justify-end h-6 mb-2">
                {currentSlide === 0 && (
                    <button
                        onClick={onComplete}
                        className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition cursor-pointer"
                    >
                        {t('guide.skip')}
                    </button>
                )}
            </div>

            {/* Slide content */}
            <div className="flex-1 flex flex-col justify-center gap-6">
                {currentSlide === 0 && <SlideOne t={t} />}
                {currentSlide === 1 && <SlideTwo t={t} />}
                {currentSlide === 2 && <SlideThree t={t} />}
                {currentSlide === 3 && <SlideFour t={t} />}
                {currentSlide === 4 && <SlideFive t={t} />}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
                <button
                    onClick={back}
                    className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                >
                    {t('guide.back')}
                </button>

                <button
                    onClick={next}
                    className="
                        bg-neutral-900 dark:bg-white
                        text-white dark:text-neutral-900
                        text-base font-medium
                        rounded-xl py-3 px-6
                        hover:opacity-90 transition
                        cursor-pointer
                    "
                >
                    {currentSlide === TOTAL_SLIDES - 1
                        ? t('guide.letsGo')
                        : t('guide.next')
                    }
                </button>
            </div>
        </div>
    );
};

// --- Individual Slides ---

function SlideOne({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                {t('guide.eyebrow')}
            </p>
            <h2 className="text-[24px] font-semibold text-neutral-900 dark:text-white leading-tight">
                {t('guide.slide1.title')}
            </h2>
            <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('guide.slide1.body')}
            </p>
            {/* Visual: two blocks side by side */}
            <div className="flex items-center justify-center gap-3 mt-4">
                <div className="flex-1 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-center">
                    <p className="text-2xl font-semibold text-neutral-900 dark:text-white">1 057 €</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('guide.slide1.real')}</p>
                </div>
                <span className="text-sm font-medium text-neutral-400">vs</span>
                <div className="flex-1 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-center">
                    <p className="text-2xl font-semibold text-neutral-900 dark:text-white">952 €</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('guide.slide1.estimated')}</p>
                </div>
            </div>
        </div>
    );
}

function SlideTwo({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-[24px] font-semibold text-neutral-900 dark:text-white leading-tight">
                {t('guide.slide2.title')}
            </h2>
            <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl p-4">
                    <ArrowUp size={20} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                        {t('guide.slide2.overspend')}
                    </p>
                </div>
                <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-4">
                    <ArrowDown size={20} className="text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                        {t('guide.slide2.underspend')}
                    </p>
                </div>
            </div>
        </div>
    );
}

function SlideThree({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-[24px] font-semibold text-neutral-900 dark:text-white leading-tight">
                {t('guide.slide3.title')}
            </h2>
            <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('guide.slide3.body')}
            </p>
        </div>
    );
}

function SlideFour({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-[24px] font-semibold text-neutral-900 dark:text-white leading-tight">
                {t('guide.slide4.title')}
            </h2>
            <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('guide.slide4.body')}
            </p>
        </div>
    );
}

function SlideFive({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-[24px] font-semibold text-neutral-900 dark:text-white leading-tight">
                {t('guide.slide5.title')}
            </h2>
            <p className="text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('guide.slide5.body')}
            </p>
        </div>
    );
}

export default GuideSlides;
