import localFont from "next/font/local";
import type { Metadata } from "next";
import "./globals.css";

const font = localFont({
    src: [
        { path: '../public/fonts/Matter-Light.ttf', weight: '300', style: 'normal' },
        { path: '../public/fonts/Matter-Regular.ttf', weight: '400', style: 'normal' },
        { path: '../public/fonts/Matter-Medium.ttf', weight: '500', style: 'normal' },
        { path: '../public/fonts/Matter-SemiBold.ttf', weight: '600', style: 'normal' },
        { path: '../public/fonts/Matter-Bold.ttf', weight: '700', style: 'normal' },
        { path: '../public/fonts/Matter-Heavy.ttf', weight: '800', style: 'normal' },
    ],
    variable: '--font-matter',
});

export const metadata: Metadata = {
    title: "Coridor",
    description: "Location sharing app",
    robots: { index: false, follow: false },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
    },
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

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html suppressHydrationWarning className={font.variable}>
            <body className={`${font.className} bg-background`}>
                {children}
            </body>
        </html>
    );
}
