'use client';

import Link from 'next/link';
import { DM_Serif_Display, Nunito } from 'next/font/google';

const serifFont = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif-sim',
  display: 'swap',
});

const nunitoFont = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-nunito-sim',
  display: 'swap',
});

export default function SimulateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`fixed inset-0 z-9990 flex flex-col ${serifFont.variable} ${nunitoFont.variable}`}>
      {/* Minimal header with logo — transitions dark via data-dark attribute set by ScrollSpyNav */}
      <header
        data-sim-header
        className="group shrink-0 border-b pt-safe transition-all duration-300 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 data-[dark=true]:bg-[#1A1A1A] data-[dark=true]:border-[#333]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-[16px] text-[#151515] dark:text-white group-data-[dark=true]:text-white transition-colors duration-300"
            style={{ fontFamily: "'Boldonse', sans-serif" }}
          >
            CORIDOR
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white group-data-[dark=true]:text-neutral-400 group-data-[dark=true]:hover:text-white transition-colors duration-300"
          >
            Retour au site
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-safe bg-(--sim-bg)">
        {children}
      </main>
    </div>
  );
}
