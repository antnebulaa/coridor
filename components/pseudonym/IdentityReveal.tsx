'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '@/components/Avatar';
import { useTranslations } from 'next-intl';

interface IdentityRevealProps {
  pseudonymEmoji: string;
  pseudonymText: string;
  pseudonymFull?: string;
  realName: string;
  realImage?: string | null;
  realEmail?: string | null;
  onClose: () => void;
  onViewProfile?: () => void;
}

const IdentityReveal: React.FC<IdentityRevealProps> = ({
  pseudonymEmoji,
  pseudonymText,
  pseudonymFull,
  realName,
  realImage,
  realEmail,
  onClose,
  onViewProfile,
}) => {
  const t = useTranslations('pseudonym.reveal');
  const [phase, setPhase] = useState<'pseudo' | 'flip' | 'revealed'>('pseudo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flip'), 800);
    const t2 = setTimeout(() => setPhase('revealed'), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Emoji / Avatar flip */}
        <div className="relative w-24 h-24 mx-auto mb-4" style={{ perspective: '600px' }}>
          <AnimatePresence mode="wait">
            {phase === 'pseudo' || phase === 'flip' ? (
              <motion.div
                key="emoji"
                initial={{ rotateY: 0 }}
                animate={phase === 'flip' ? { rotateY: 90 } : { rotateY: 0 }}
                exit={{ rotateY: 90 }}
                transition={{ duration: 0.3, ease: 'easeIn' }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="relative">
                  <Avatar src={null} seed={pseudonymFull || pseudonymText} size={96} />
                  <span className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-md">
                    {pseudonymEmoji}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="avatar"
                initial={{ rotateY: -90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <Avatar src={realImage} seed={realEmail || realName} size={96} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text transition */}
        <AnimatePresence mode="wait">
          {phase !== 'revealed' ? (
            <motion.div
              key="pseudoText"
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {pseudonymText}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="realText"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-1">
                {t('transition')}
              </p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {realName}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <AnimatePresence>
          {phase === 'revealed' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mt-6 space-y-3"
            >
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('description')}
              </p>

              {onViewProfile && (
                <button
                  onClick={onViewProfile}
                  className="w-full py-2.5 rounded-full text-sm font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition cursor-pointer"
                >
                  {t('viewProfile')} →
                </button>
              )}

              <button
                onClick={onClose}
                className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition cursor-pointer"
              >
                {t('close')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default IdentityReveal;
