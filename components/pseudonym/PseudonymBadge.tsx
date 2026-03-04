'use client';

import { useTranslations } from 'next-intl';

interface PseudonymBadgeProps {
  pseudonymFull?: string | null;
  pseudonymEmoji?: string | null;
  realName?: string | null;
  variant?: 'compact' | 'pill' | 'revealed';
}

const PseudonymBadge: React.FC<PseudonymBadgeProps> = ({
  pseudonymFull,
  pseudonymEmoji,
  realName,
  variant = 'compact',
}) => {
  const t = useTranslations('pseudonym.badge');

  if (!pseudonymFull) return null;

  if (variant === 'revealed' && realName) {
    return (
      <span className="text-sm font-medium">
        {realName}
        <span className="text-neutral-400 dark:text-neutral-500 ml-1.5 font-normal">
          ({pseudonymFull})
        </span>
      </span>
    );
  }

  if (variant === 'pill') {
    // Remove the leading emoji + space from pseudonymFull to avoid duplication
    const textOnly = pseudonymEmoji
      ? pseudonymFull.replace(pseudonymEmoji, '').trim()
      : pseudonymFull;

    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm font-medium text-neutral-800 dark:text-neutral-200"
        title={t('tooltip')}
      >
        {pseudonymEmoji && <span className="text-base">{pseudonymEmoji}</span>}
        <span>{textOnly}</span>
      </span>
    );
  }

  // compact (default)
  return (
    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
      {pseudonymFull}
    </span>
  );
};

export default PseudonymBadge;
