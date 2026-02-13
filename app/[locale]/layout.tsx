import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";
import Navbar from "@/components/navbar/Navbar";
import MobileMenu from "@/components/navbar/MobileMenu";
import ClientFooter from "@/components/ClientFooter";
import SearchModal from "@/components/modals/SearchModal";
import CommuteModal from "@/components/modals/CommuteModal";
import RegisterModal from "@/components/modals/RegisterModal";
import LoginModal from "@/components/modals/LoginModal";
import RentModalLoader from "@/components/modals/RentModalLoader";
import WishlistModal from "@/components/modals/WishlistModal";
import dynamic from "next/dynamic";


import MyCodeModal from "@/components/modals/MyCodeModal";
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

const font = localFont({
    src: [
        {
            path: '../../public/fonts/Matter-Light.ttf',
            weight: '300',
            style: 'normal',
        },
        {
            path: '../../public/fonts/Matter-Regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../../public/fonts/Matter-Medium.ttf',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../../public/fonts/Matter-SemiBold.ttf',
            weight: '600',
            style: 'normal',
        },
        {
            path: '../../public/fonts/Matter-Bold.ttf',
            weight: '700',
            style: 'normal',
        },
        {
            path: '../../public/fonts/Matter-Heavy.ttf',
            weight: '800',
            style: 'normal',
        },
    ],
});

export const metadata: Metadata = {
    title: "Coridor",
    description: "Location sharing app",
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    interactiveWidget: 'resizes-content',
    viewportFit: 'cover',
    themeColor: '#ffffff',
};

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

    const currentUser = await getCurrentUser();
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <head>
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            </head>
            <body className={font.className}>
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
                            <Suspense fallback={<div></div>}>
                                <SearchModal />
                                <CommuteModal />
                            </Suspense>
                            <RentModalLoader />
                            <RegisterModal />
                            <LoginModal />
                            <WishlistModal />
                            <MyCodeModal currentUser={currentUser} />
                            <PushNotificationManager />
                            <InstallPrompt />

                            <Suspense fallback={<div></div>}>
                                <Navbar currentUser={currentUser} />
                            </Suspense>
                            <MainLayout>
                                <TransitionProvider>
                                    {children}
                                </TransitionProvider>
                            </MainLayout>
                            <ClientFooter />
                            <Suspense fallback={<div></div>}>
                                <MobileMenu currentUser={currentUser} />
                            </Suspense>
                            <SpeedInsights />
                        </ThemeProvider>
                    </NextIntlClientProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
