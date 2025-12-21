import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/navbar/Navbar";
import MobileMenu from "@/components/navbar/MobileMenu";
import ClientFooter from "@/components/ClientFooter";
import SearchModal from "@/components/modals/SearchModal";
import CommuteModal from "@/components/modals/CommuteModal";
import RegisterModal from "@/components/modals/RegisterModal";
import LoginModal from "@/components/modals/LoginModal";
import RentModal from "@/components/modals/RentModal";
import WishlistModal from "@/components/modals/WishlistModal";
import LeaseModal from "@/components/modals/LeaseModal";
import MyCodeModal from "@/components/modals/MyCodeModal";
import { Toaster } from "react-hot-toast";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getUnreadMessageCount from "@/app/actions/getUnreadMessageCount";
import AuthProvider from "@/providers/AuthProvider";
import MainLayout from "@/components/MainLayout";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

import { Suspense } from "react";

const font = localFont({
  src: [
    {
      path: '../public/fonts/Matter-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../public/fonts/Matter-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Matter-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../public/fonts/Matter-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../public/fonts/Matter-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Matter-Heavy.ttf',
      weight: '800',
      style: 'normal',
    },
  ],
});

export const metadata: Metadata = {
  title: "Airbnb Clone",
  description: "Airbnb Clone built with Next.js 15",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const unreadCount = await getUnreadMessageCount();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={font.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Toaster toastOptions={{ className: 'z-[100000]' }} containerStyle={{ zIndex: 100000 }} />
            <Suspense fallback={<div></div>}>
              <SearchModal />
              <CommuteModal />
            </Suspense>
            <RentModal />
            <RegisterModal />
            <LoginModal />
            <WishlistModal />
            <MyCodeModal currentUser={currentUser} />
            <LeaseModal currentUser={currentUser} />
            <Suspense fallback={<div></div>}>
              <Navbar currentUser={currentUser} unreadCount={unreadCount} />
            </Suspense>
            <MainLayout>
              {children}
            </MainLayout>
            <ClientFooter />
            <Suspense fallback={<div></div>}>
              <MobileMenu currentUser={currentUser} unreadCount={unreadCount} />
            </Suspense>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
