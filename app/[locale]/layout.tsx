import Navbar from "@/components/navbar/Navbar";
import MobileMenu from "@/components/navbar/MobileMenu";
import ClientFooter from "@/components/ClientFooter";
import ModalProvider from "@/components/modals/ModalProvider";

import CapacitorInit from "@/components/native/CapacitorInit";
import BackButtonHandler from "@/components/native/BackButtonHandler";
import OfflineBanner from "@/components/native/OfflineBanner";

import PushNotificationManager from "@/components/PushNotificationManager";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import { Toaster } from "react-hot-toast";
import getCurrentUser from "@/app/actions/getCurrentUser";
import AuthProvider from "@/providers/AuthProvider";
import MainLayout from "@/components/MainLayout";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import TransitionProvider from "@/app/[locale]/components/providers/TransitionProvider";

import { Suspense } from "react";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

import { SpeedInsights } from "@vercel/speed-insights/next";

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Validate locale
    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    // Enable static rendering
    setRequestLocale(locale);

    // Set html lang attribute for the current locale
    // (html/body tags are in root layout, lang is set client-side)
    const langScript = `document.documentElement.lang="${locale}";`;

    const currentUser = await getCurrentUser();
    const messages = await getMessages();

    return (
        <>
            <script dangerouslySetInnerHTML={{ __html: langScript }} />
            <CapacitorInit />
            <BackButtonHandler />
            <OfflineBanner />
            <AuthProvider>
                <NextIntlClientProvider messages={messages}>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        <Toaster
                            position="bottom-center"
                            toastOptions={{
                                className: 'z-[100000] !max-w-[calc(100vw-32px)] !w-full md:!w-auto md:!min-w-[400px] text-center justify-center',
                                style: {
                                    padding: '16px 30px',
                                    fontSize: '16px',
                                    borderRadius: '20px',
                                    fontWeight: 500,
                                },
                                duration: 2000
                            }}
                            containerStyle={{
                                zIndex: 100000,
                                bottom: 112,
                            }}
                        />
                        <ModalProvider currentUser={currentUser} />
                        <PushNotificationManager />
                        <InstallPrompt />

                        {/* Desktop: flex-col layout keeps navbar at top, content scrolls below */}
                        <div className="md:flex md:flex-col md:h-dvh">
                            <Suspense fallback={<div></div>}>
                                <Navbar currentUser={currentUser} />
                            </Suspense>
                            <div className="md:flex-1 md:overflow-y-auto md:min-h-0">
                                <MainLayout>
                                    <TransitionProvider>
                                        {children}
                                    </TransitionProvider>
                                </MainLayout>
                                <ClientFooter />
                            </div>
                        </div>
                        <Suspense fallback={<div></div>}>
                            <MobileMenu currentUser={currentUser} />
                        </Suspense>
                        <SpeedInsights />
                    </ThemeProvider>
                </NextIntlClientProvider>
            </AuthProvider>
        </>
    );
}
