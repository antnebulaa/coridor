'use client';

import { ArrowRight } from 'lucide-react';

export interface DataInviteCardProps {
  title: string;
  description: string;
  unlocks: string;
  doodleName: string;
  color: 'blue' | 'purple' | 'amber' | 'emerald';
  propertyName: string;
  extraCount?: number; // "et 2 autres biens"
  onAction: () => void;
}

const colorMap: Record<string, { bg: string; border: string; cta: string; unlockBg: string }> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-100 dark:border-blue-900/50',
    cta: 'text-blue-600 dark:text-blue-400',
    unlockBg: 'bg-blue-100/60 dark:bg-blue-900/40',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-100 dark:border-purple-900/50',
    cta: 'text-purple-600 dark:text-purple-400',
    unlockBg: 'bg-purple-100/60 dark:bg-purple-900/40',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-100 dark:border-amber-900/50',
    cta: 'text-amber-600 dark:text-amber-400',
    unlockBg: 'bg-amber-100/60 dark:bg-amber-900/40',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    cta: 'text-emerald-600 dark:text-emerald-400',
    unlockBg: 'bg-emerald-100/60 dark:bg-emerald-900/40',
  },
};

const DataInviteCard: React.FC<DataInviteCardProps> = ({
  title,
  description,
  unlocks,
  doodleName,
  color,
  propertyName,
  extraCount,
  onAction,
}) => {
  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${colors.bg} ${colors.border}`}>
      <div className="pr-16">
        <p className="text-xl font-semibold text-neutral-700 dark:text-neutral-100">
          {title}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
          {description}
        </p>

        {/* Property name */}
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1.5">
          {propertyName}
          {extraCount && extraCount > 0 && (
            <span> et {extraCount} autre{extraCount > 1 ? 's' : ''} bien{extraCount > 1 ? 's' : ''}</span>
          )}
        </p>

        {/* What it unlocks */}
        <p className={`inline-block text-sm font-medium px-2.5 py-1 rounded-lg mt-2 ${colors.unlockBg} text-neutral-600 dark:text-neutral-300`}>
          Débloque : {unlocks}
        </p>

        {/* CTA */}
        <button
          onClick={onAction}
          className={`flex items-center gap-1 text-sm font-semibold mt-2.5 hover:gap-2 transition-all ${colors.cta}`}
        >
          Renseigner
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Open Doodle illustration */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://opendoodles.s3-us-west-1.amazonaws.com/${doodleName}.svg`}
        alt=""
        aria-hidden
        className="absolute right-2 bottom-0 w-20 h-20 object-contain opacity-40 dark:opacity-20 pointer-events-none select-none grayscale"
      />
    </div>
  );
};

export default DataInviteCard;
