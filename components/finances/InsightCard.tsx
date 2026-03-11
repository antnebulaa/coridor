'use client';

import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

interface FinancialInsight {
  id: string;
  priority: number;
  color: 'red' | 'amber' | 'purple' | 'blue' | 'emerald';
  doodleName: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

interface InsightCardProps {
  insight: FinancialInsight;
}

const colorMap: Record<
  string,
  { bg: string; border: string; cta: string }
> = {
  red: {
    bg: 'bg-neutral-50 dark:bg-neutral-950/30',
    border: 'border-red-100 dark:border-red-900/50',
    cta: 'text-red-600 dark:text-red-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-100 dark:border-amber-900/50',
    cta: 'text-amber-600 dark:text-amber-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-100 dark:border-purple-900/50',
    cta: 'text-purple-600 dark:text-purple-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-100 dark:border-blue-900/50',
    cta: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    bg: 'bg-neutral-50 dark:bg-neutral-950/30',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    cta: 'text-emerald-600 dark:text-emerald-400',
  },
};

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const colors = colorMap[insight.color] || colorMap.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 ${colors.bg} ${colors.border}`}
    >
      <div className="pr-16">
        <p className="text-xl font-semibold text-neutral-700 dark:text-neutral-100">
          {insight.title}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
          {insight.description}
        </p>
        <Link
          href={insight.actionHref}
          className={`inline-flex items-center gap-1 text-sm font-semibold mt-2.5 hover:gap-2 transition-all ${colors.cta}`}
        >
          {insight.actionLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Open Doodle illustration */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://opendoodles.s3-us-west-1.amazonaws.com/${insight.doodleName}.svg`}
        alt=""
        aria-hidden
        className="absolute right-2 bottom-0 w-20 h-20 object-contain opacity-40 dark:opacity-20 pointer-events-none select-none grayscale"
      />
    </div>
  );
};

export default InsightCard;
