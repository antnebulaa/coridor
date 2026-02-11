'use client';

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { signOut } from "next-auth/react";
import { Shield } from "lucide-react";
import { useTranslations } from 'next-intl';

interface SecurityClientProps {
}

const SecurityClient: React.FC<SecurityClientProps> = () => {
    const t = useTranslations('account.security');

    return (
        <Container>
            <div className="max-w-4xl mx-auto">
                <div className="mb-0">
                    <PageHeader
                        title={t('title')}
                        subtitle={t('subtitle')}
                    />
                </div>

                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex items-center gap-4 text-foreground">
                            <Shield size={24} />
                            <h3 className="text-xl font-semibold">{t('sectionTitle')}</h3>
                        </div>
                        <p className="text-neutral-500">
                            {t('description')}
                        </p>
                        <div className="w-full md:w-auto mt-4">
                            <Button
                                label={t('signOut')}
                                onClick={() => signOut()}
                                variant="outline"
                                className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default SecurityClient;
