'use client';

import Link from 'next/link';
import { DM_Serif_Display } from 'next/font/google';

const serifFont = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif-sim',
  display: 'swap',
});

export default function SimulateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col ${serifFont.variable}`}>
      {/* Minimal header with logo */}
      <header className="shrink-0 border-b border-neutral-200 dark:border-neutral-800 pt-safe bg-white dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-[16px] text-[#151515] dark:text-white"
            style={{ fontFamily: "'Boldonse', sans-serif" }}
          >
            CORIDOR
          </Link>
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
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
