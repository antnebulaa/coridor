'use client';

import { Link } from '@/i18n/navigation';
import { FileText, Wallet, BarChart3, ArrowRight, Scale } from 'lucide-react';

interface QuickLinksProps {
  firstListingId?: string;
  onRegularizationClick?: () => void;
}

const QuickLinks: React.FC<QuickLinksProps> = ({ firstListingId, onRegularizationClick }) => {
  const links = [
    {
      label: 'Quittances Loyers',
      href: '/account/receipts',
      icon: FileText,
      iconBg: 'bg-neutral-900 dark:bg-neutral-100',
      iconColor: 'text-white dark:text-neutral-900',
    },
    {
      label: 'Dépenses & Charges',
      href: firstListingId ? `/properties/${firstListingId}/expenses` : '/properties',
      icon: Wallet,
      iconBg: 'bg-orange-500',
      iconColor: 'text-white',
    },
    {
      label: 'Suivi des Loyers',
      href: '/finances/suivi-loyers',
      icon: BarChart3,
      iconBg: 'bg-purple-500',
      iconColor: 'text-white',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 px-3 py-3.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all active:scale-95"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${link.iconBg}`}
            >
              <link.icon className={`w-4.5 h-4.5 ${link.iconColor}`} />
            </div>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 text-center leading-tight">
              {link.label}
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/account/fiscal"
        className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 px-4 py-3.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] group"
      >
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          Aide Déclaration fiscale
          <span className="text-[12px] py-1.5 font-normal tracking-wide bg-[#1719FF] dark:bg-neutral-100 text-white dark:text-neutral-900 px-2.5 rounded-full inline-flex items-center h-[20px]">
            Essentiel
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
      </Link>

      <Link
        href="/account/reminders"
        className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 px-4 py-3.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] group"
      >
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          Obligations légales & échéances
          <span className="text-[12px] py-1.5 font-normal tracking-wide bg-[#1719FF] dark:bg-neutral-100 text-white dark:text-neutral-900 px-2.5 rounded-full inline-flex items-center h-[20px]">
            Essentiel
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
      </Link>

      <button
        onClick={onRegularizationClick}
        className="w-full flex items-center justify-between bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 px-4 py-3.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] group"
      >
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          Régularisations de charges
          <span className="text-[12px] py-1.5 font-normal tracking-wide bg-neutral-800 dark:bg-neutral-100 px-2.5 rounded-full inline-flex items-center h-[20px]">
            <span className="animate-shimmer">Plus</span>
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
      </button>
    </div>
  );
};

export default QuickLinks;
