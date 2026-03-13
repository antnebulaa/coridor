'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

interface GuideSlidesProps {
    onComplete: () => void;
    onBack: () => void;
    propertyId?: string;
}

const TOTAL_SLIDES = 5;

const GuideSlides: React.FC<GuideSlidesProps> = ({ onComplete, onBack, propertyId }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [animKey, setAnimKey] = useState(0);
    const t = useTranslations('regularization');
    const router = useRouter();

    const next = () => {
        if (currentSlide < TOTAL_SLIDES - 1) {
            setCurrentSlide(currentSlide + 1);
            setAnimKey(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const back = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
            setAnimKey(prev => prev + 1);
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
            <div className="flex-1 flex flex-col justify-center" key={animKey}>
                {currentSlide === 0 && <SlideOne t={t} />}
                {currentSlide === 1 && <SlideTwo t={t} />}
                {currentSlide === 2 && <SlideThree t={t} />}
                {currentSlide === 3 && <SlideFour t={t} propertyId={propertyId} router={router} />}
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

// --- Shared animation wrapper ---
function AnimatedContent({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className="transition-all duration-500 ease-out"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
            }}
        >
            {children}
        </div>
    );
}

// --- Individual Slides ---
// Layout: illustration top, text bottom (inverted from before)
// Text style matches WelcomeStep: 36px font-medium leading-none tracking-tight for titles

function SlideOne({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-8">
            {/* Illustration */}
            <AnimatedContent>
                <div className="flex items-center justify-center gap-3">
                    <div className="flex-1 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-center">
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-white tabular-nums">952 €</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('guide.slide1.estimated')}</p>
                    </div>
                    <span className="text-sm font-medium text-neutral-400">vs</span>
                    <div className="flex-1 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-center">
                        <p className="text-2xl font-semibold text-neutral-900 dark:text-white tabular-nums">1 057 €</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('guide.slide1.real')}</p>
                    </div>
                </div>
            </AnimatedContent>

            {/* Text */}
            <div>
                <AnimatedContent delay={100}>
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        {t('guide.eyebrow')}
                    </p>
                </AnimatedContent>
                <AnimatedContent delay={200}>
                    <h2 className="text-[36px] font-medium text-neutral-900 dark:text-white leading-none tracking-tight mt-3">
                        {t('guide.slide1.title')}
                    </h2>
                </AnimatedContent>
                <AnimatedContent delay={300}>
                    <p className="text-base text-neutral-900 dark:text-neutral-400 mt-3 leading-normal">
                        {t('guide.slide1.body1')}
                    </p>
                    <p className="text-base text-neutral-900 dark:text-neutral-400 mt-2 leading-normal">
                        {t('guide.slide1.body2')}
                    </p>
                </AnimatedContent>
            </div>
        </div>
    );
}

function SlideTwo({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-8">
            {/* Illustration — the two outcome cards */}
            <AnimatedContent>
                <div className="flex flex-col gap-3">
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl p-4">
                        <div className="flex items-center gap-2">
                            <ArrowUp size={18} className="text-red-500 shrink-0" />
                            <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                                {t('guide.slide2.overspendTitle')}
                            </p>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {t('guide.slide2.overspendBody')}
                        </p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-4">
                        <div className="flex items-center gap-2">
                            <ArrowDown size={18} className="text-emerald-500 shrink-0" />
                            <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                                {t('guide.slide2.underspendTitle')}
                            </p>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            {t('guide.slide2.underspendBody')}
                        </p>
                    </div>
                </div>
            </AnimatedContent>

            {/* Text */}
            <div>
                <AnimatedContent delay={150}>
                    <h2 className="text-[36px] font-medium text-neutral-900 dark:text-white leading-none tracking-tight">
                        {t('guide.slide2.title')}
                    </h2>
                </AnimatedContent>
            </div>
        </div>
    );
}

function SlideThree({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-8">
            {/* Illustration — calendar visual */}
            <AnimatedContent>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-5 text-center">
                    <p className="text-[48px] font-bold text-neutral-900 dark:text-white tabular-nums leading-none">2025</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">{t('guide.slide3.visual')}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => (
                            <div key={i} className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">{m}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </AnimatedContent>

            {/* Text */}
            <div>
                <AnimatedContent delay={100}>
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        {t('guide.slide3.eyebrow')}
                    </p>
                </AnimatedContent>
                <AnimatedContent delay={200}>
                    <h2 className="text-[36px] font-medium text-neutral-900 dark:text-white leading-none tracking-tight mt-3">
                        {t('guide.slide3.title')}
                    </h2>
                </AnimatedContent>
                <AnimatedContent delay={300}>
                    <p className="text-base text-neutral-900 dark:text-neutral-400 mt-3 leading-normal">
                        {t('guide.slide3.body1')}
                    </p>
                    <p className="text-base text-neutral-900 dark:text-neutral-400 mt-3 leading-normal">
                        {t('guide.slide3.body2')}
                    </p>
                </AnimatedContent>
            </div>
        </div>
    );
}

function SlideFour({ t, propertyId, router }: { t: ReturnType<typeof useTranslations>; propertyId?: string; router: ReturnType<typeof useRouter> }) {
    const expensesItems = [
        { label: t('guide.slide4.item1'), checked: true },
        { label: t('guide.slide4.item2'), checked: true },
        { label: t('guide.slide4.item3'), checked: true },
        { label: t('guide.slide4.item4'), checked: false },
    ];

    return (
        <div className="flex flex-col gap-8">
            {/* Illustration — expenses checklist */}
            <AnimatedContent>
                <div className="flex flex-col gap-2">
                    {expensesItems.map((item, i) => (
                        <div
                            key={i}
                            className={`
                                flex items-center gap-3 rounded-xl border p-4
                                ${item.checked
                                    ? 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                                    : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900'
                                }
                            `}
                        >
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center shrink-0
                                ${item.checked
                                    ? 'bg-neutral-900 dark:bg-white'
                                    : 'border-2 border-neutral-300 dark:border-neutral-600'
                                }
                            `}>
                                {item.checked && (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-neutral-900" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-base ${item.checked ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </AnimatedContent>

            {/* Text */}
            <div>
                <AnimatedContent delay={100}>
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        {t('guide.slide4.eyebrow')}
                    </p>
                </AnimatedContent>
                <AnimatedContent delay={200}>
                    <h2 className="text-[36px] font-medium text-neutral-900 dark:text-white leading-none tracking-tight mt-3">
                        {t('guide.slide4.title')}
                    </h2>
                </AnimatedContent>
                <AnimatedContent delay={300}>
                    <p className="text-base text-neutral-900 dark:text-neutral-400 mt-3 leading-normal">
                        {t('guide.slide4.body')}
                    </p>
                </AnimatedContent>
                <AnimatedContent delay={400}>
                    <button
                        onClick={() => {
                            if (propertyId) {
                                router.push(`/properties/${propertyId}/edit?tab=expenses`);
                            } else {
                                router.push('/finances');
                            }
                        }}
                        className="flex items-center gap-1.5 text-base font-medium text-neutral-900 dark:text-white mt-3 hover:opacity-70 transition cursor-pointer"
                    >
                        {t('guide.slide4.link')}
                        <ArrowRight size={16} />
                    </button>
                </AnimatedContent>
            </div>
        </div>
    );
}

function SlideFive({ t }: { t: ReturnType<typeof useTranslations> }) {
    return (
        <div className="flex flex-col gap-8">
            {/* Illustration */}
            <AnimatedContent>
                <div className="flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center">
                        <Sparkles size={36} className="text-neutral-400 dark:text-neutral-500" />
                    </div>
                </div>
            </AnimatedContent>

            {/* Text */}
            <div>
                <AnimatedContent delay={150}>
                    <h2 className="text-[36px] font-medium text-neutral-900 dark:text-white leading-none tracking-tight">
                        {t('guide.slide5.title')}
                    </h2>
                </AnimatedContent>
                <AnimatedContent delay={300}>
                    <p className="text-base text-neutral-900 dark:text-neutral-400 mt-3 leading-normal">
                        {t('guide.slide5.body1')}
                    </p>
                    <p className="text-base text-neutral-900 dark:text-neutral-400 mt-2 leading-normal">
                        {t('guide.slide5.body2')}
                    </p>
                </AnimatedContent>
            </div>
        </div>
    );
}

export default GuideSlides;
