'use client';

import { ChevronRight, BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface WelcomeStepProps {
    onStart: () => void;
    onGuide: () => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart, onGuide }) => {
    const t = useTranslations('regularization');

    return (
        <div className="flex flex-col h-full px-6 py-8">
            <div className="flex-1 flex flex-col justify-center gap-8">
                <div>
                    <h1 className="text-[36px] font-medium text-neutral-900 dark:text-white leading-none tracking-tight ">
                        {t('welcome.title')}
                    </h1>
                    <p className="text-base text-neutral-900 dark:text-neutral-400 mt-3 leading-normal">
                        {t('welcome.description')}
                    </p>
                </div>

                <button
                    onClick={onGuide}
                    className="
                        w-full flex items-center justify-between
                        bg-neutral-50 p-5 rounded-2xl
                        hover:bg-neutral-50 dark:hover:bg-neutral-800
                        transition cursor-pointer
                        group
                    "
                >
                    <div className="flex items-center gap-5">
                        <BookOpen size={30} className="text-neutral-500 dark:text-neutral-400" />
                        <div className="text-left">
                            <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                                {t('welcome.guideTitle')}
                            </p>
                            <p className="text-base text-neutral-900 dark:text-neutral-400 leading-tight">
                                {t('welcome.guideSubtitle')}
                            </p>
                        </div>
                    </div>
                    <ChevronRight
                        size={18}
                        className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition"
                    />
                </button>
            </div>

            <div className="mt-8">
                <button
                    onClick={onStart}
                    className="
                        w-full
                        bg-neutral-900 dark:bg-white
                        text-white dark:text-neutral-900
                        text-base font-medium
                        rounded-2xl py-5 px-6
                        hover:opacity-90 transition
                        cursor-pointer
                    "
                >
                    {t('welcome.startButton')}
                </button>
            </div>
        </div>
    );
};

export default WelcomeStep;
