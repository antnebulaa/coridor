'use client';

import { useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { SafeUser } from "@/types";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import CommutePreferences from "@/components/profile/CommutePreferences";
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from "@/i18n/navigation";

interface PreferencesClientProps {
    currentUser: SafeUser;
}

const PreferencesClient: React.FC<PreferencesClientProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const locale = useLocale();
    const [isLoading, setIsLoading] = useState(false);
    const [measurementSystem, setMeasurementSystem] = useState(currentUser.measurementSystem || 'metric');
    const t = useTranslations('account.preferences');

    const onSubmit = () => {
        setIsLoading(true);

        axios.post('/api/settings', {
            measurementSystem
        })
            .then(() => {
                toast.success(t('toasts.success'));
                router.refresh();
            })
            .catch(() => {
                toast.error(t('toasts.error'));
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    return (
        <Container>
            <div className="max-w-2xl mx-auto pb-10">
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                />

                <div className="mt-10 flex flex-col gap-8">
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-semibold">{t('measurement.title')}</h3>
                            <p className="text-muted-foreground text-sm">
                                {t('measurement.description')}
                            </p>
                        </div>

                        <div className="flex flex-row gap-4 mt-2">
                            <div
                                onClick={() => setMeasurementSystem('metric')}
                                className={`
                                    flex-1 
                                    p-4 
                                    border-2 
                                    rounded-xl 
                                    cursor-pointer 
                                    transition
                                    flex
                                    items-center
                                    justify-center
                                    font-medium
                                    ${measurementSystem === 'metric'
                                        ? 'border-black dark:border-white bg-secondary'
                                        : 'border-border hover:border-neutral-300 dark:hover:border-neutral-500 bg-transparent'}
                                `}
                            >
                                {t('measurement.metric')}
                            </div>
                            <div
                                onClick={() => setMeasurementSystem('imperial')}
                                className={`
                                    flex-1 
                                    p-4 
                                    border-2 
                                    rounded-xl 
                                    cursor-pointer 
                                    transition
                                    flex
                                    items-center
                                    justify-center
                                    font-medium
                                    ${measurementSystem === 'imperial'
                                        ? 'border-black dark:border-white bg-secondary'
                                        : 'border-border hover:border-neutral-300 dark:hover:border-neutral-500 bg-transparent'}
                                `}
                            >
                                {t('measurement.imperial')}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-semibold">{t('language.title')}</h3>
                            <p className="text-muted-foreground text-sm">
                                {t('language.description')}
                            </p>
                        </div>

                        <div className="flex flex-row gap-4 mt-2">
                            <div
                                onClick={() => router.replace(pathname, { locale: 'fr' })}
                                className={`
                                    flex-1 
                                    p-4 
                                    border-2 
                                    rounded-xl 
                                    cursor-pointer 
                                    transition
                                    flex
                                    items-center
                                    justify-center
                                    font-medium
                                    ${locale === 'fr'
                                        ? 'border-black dark:border-white bg-secondary'
                                        : 'border-border hover:border-neutral-300 dark:hover:border-neutral-500 bg-transparent'}
                                `}
                            >
                                <span className="text-xl mr-2">🇫🇷</span>
                                {t('language.french')}
                            </div>
                            <div
                                onClick={() => router.replace(pathname, { locale: 'en' })}
                                className={`
                                    flex-1 
                                    p-4 
                                    border-2 
                                    rounded-xl 
                                    cursor-pointer 
                                    transition
                                    flex
                                    items-center
                                    justify-center
                                    font-medium
                                    ${locale === 'en'
                                        ? 'border-black dark:border-white bg-secondary'
                                        : 'border-border hover:border-neutral-300 dark:hover:border-neutral-500 bg-transparent'}
                                `}
                            >
                                <span className="text-xl mr-2">🇬🇧</span>
                                {t('language.english')}
                            </div>
                        </div>
                    </div>

                    <CommutePreferences currentUser={currentUser} />

                    <div className="flex justify-end">
                        <Button
                            label={t('save')}
                            onClick={onSubmit}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default PreferencesClient;
