'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { generatePseudonym, type Pseudonym } from '@/lib/pseudonym';
import Avatar from '@/components/Avatar';
import { useTranslations } from 'next-intl';

interface PseudonymGeneratorProps {
  initialPseudonym?: { emoji: string; text: string; full: string } | null;
  onConfirm: (pseudonym: Pseudonym) => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

const PseudonymGenerator: React.FC<PseudonymGeneratorProps> = ({
  initialPseudonym,
  onConfirm,
  onSkip,
  isLoading = false,
}) => {
  const t = useTranslations('pseudonym.generator');

  const [current, setCurrent] = useState<Pseudonym>(() => {
    if (initialPseudonym) {
      return {
        emoji: initialPseudonym.emoji,
        text: initialPseudonym.text,
        full: initialPseudonym.full,
        pattern: 'A',
      };
    }
    return generatePseudonym();
  });

  const [key, setKey] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRegenerate = useCallback(() => {
    setIsSpinning(true);
    setTimeout(() => {
      setCurrent(generatePseudonym());
      setKey(k => k + 1);
      setIsSpinning(false);
    }, 300);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          {t('title')}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
          {t('description')}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 min-h-40 justify-center">
        <motion.div
          key={`avatar-${key}`}
          animate={isSpinning
            ? { rotate: 360, scale: 0.8 }
            : { rotate: 0, scale: [1.15, 1] }
          }
          transition={isSpinning
            ? { duration: 0.2, ease: 'easeInOut' }
            : { duration: 0.3, ease: 'easeOut' }
          }
          className="relative select-none"
        >
          <Avatar src={null} seed={current.full} size={112} />
          <span className="absolute inset-0 flex items-center justify-center text-6xl drop-shadow-md">
            {current.emoji}
          </span>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${key}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="text-2xl font-bold text-neutral-900 dark:text-white text-center"
          >
            {current.text}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <button
          onClick={() => onConfirm(current)}
          disabled={isLoading}
          className="w-full py-3 rounded-full text-base font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition cursor-pointer disabled:opacity-50"
        >
          {isLoading ? t('saving') : t('confirm')}
        </button>

        <button
          onClick={handleRegenerate}
          disabled={isSpinning}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-base font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer disabled:opacity-50"
        >
          <motion.div
            animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RefreshCw size={18} />
          </motion.div>
          {t('regenerate')}
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition cursor-pointer"
          >
            {t('skip')}
          </button>
        )}
      </div>
    </div>
  );
};

export default PseudonymGenerator;
