import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar/Navbar";
import MobileMenu from "@/components/navbar/MobileMenu";
import Footer from "@/components/Footer";
import SearchModal from "@/components/modals/SearchModal";
import RegisterModal from "@/components/modals/RegisterModal";
import LoginModal from "@/components/modals/LoginModal";
import RentModal from "@/components/modals/RentModal";
import WishlistModal from "@/components/modals/WishlistModal";
import LeaseModal from "@/components/modals/LeaseModal";
import { Toaster } from "react-hot-toast";
import getCurrentUser from "@/app/actions/getCurrentUser";
import AuthProvider from "@/providers/AuthProvider";
import MainLayout from "@/components/MainLayout";

import { Suspense } from "react";

const font = Inter({
  subsets: ["latin"],
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

  return (
    <html lang="en">
      <body className={font.className}>
        <AuthProvider>
          <Toaster />
          <Suspense fallback={<div></div>}>
            <SearchModal />
          </Suspense>
          <RentModal />
          <RegisterModal />
          <LoginModal />
          <WishlistModal />
          <LeaseModal currentUser={currentUser} />
          <Suspense fallback={<div></div>}>
            <Navbar currentUser={currentUser} />
          </Suspense>
          <MainLayout>
            {children}
          </MainLayout>
          <Footer />
          <Suspense fallback={<div></div>}>
            <MobileMenu currentUser={currentUser} />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
