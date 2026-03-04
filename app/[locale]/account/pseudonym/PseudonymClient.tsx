'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Info, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SafeUser } from '@/types';
import { generatePseudonym, type Pseudonym } from '@/lib/pseudonym';
import Avatar from '@/components/Avatar';
import PageHeader from '@/components/PageHeader';
import CustomToast from '@/components/ui/CustomToast';

interface PseudonymClientProps {
    currentUser: SafeUser;
}

const PseudonymClient: React.FC<PseudonymClientProps> = ({ currentUser }) => {
    const router = useRouter();
    const t = useTranslations('pseudonym');

    const [currentPseudo, setCurrentPseudo] = useState<{
        emoji: string;
        text: string;
        full: string;
    }>({
        emoji: currentUser.pseudonymEmoji || '⭐',
        text: currentUser.pseudonymText || 'Étoile Mystérieuse',
        full: currentUser.pseudonymFull || '⭐ Étoile Mystérieuse',
    });

    const [previewPseudo, setPreviewPseudo] = useState<Pseudonym | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [key, setKey] = useState(0);

    const displayPseudo = previewPseudo || currentPseudo;

    const handleGenerate = useCallback(() => {
        setIsSpinning(true);
        setTimeout(() => {
            const newPseudo = generatePseudonym();
            setPreviewPseudo(newPseudo);
            setKey(k => k + 1);
            setIsSpinning(false);
        }, 300);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!previewPseudo) return;
        setIsSaving(true);
        try {
            await axios.post('/api/pseudonym/generate', {
                emoji: previewPseudo.emoji,
                text: previewPseudo.text,
                full: previewPseudo.full,
                pattern: previewPseudo.pattern,
            });
            setCurrentPseudo({
                emoji: previewPseudo.emoji,
                text: previewPseudo.text,
                full: previewPseudo.full,
            });
            setPreviewPseudo(null);
            router.refresh();
            toast.custom((tToast) => (
                <CustomToast t={tToast} message={t('page.saved')} type="success" />
            ));
        } catch (error: any) {
            if (error?.response?.status === 409) {
                toast.custom((tToast) => (
                    <CustomToast t={tToast} message={t('error.activeApplication')} type="error" />
                ));
            } else {
                toast.custom((tToast) => (
                    <CustomToast t={tToast} message={t('page.saveError')} type="error" />
                ));
            }
        } finally {
            setIsSaving(false);
        }
    }, [previewPseudo, router, t]);

    const handleCancel = useCallback(() => {
        setPreviewPseudo(null);
        setKey(k => k + 1);
    }, []);

    return (
        <div className="flex flex-col gap-8">
            

            {/* Current pseudonym card */}
            <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mt-3">
                <div className="flex flex-col items-center gap-5">
                    {/* Avatar with emoji overlay */}
                    <div className="flex flex-col items-center gap-3 mb-4">
                        <motion.div
                            key={`avatar-${key}`}
                            animate={isSpinning
                                ? { rotate: 360, scale: 0.8 }
                                : { rotate: 0, scale: [1.1, 1] }
                            }
                            transition={isSpinning
                                ? { duration: 0.2, ease: 'easeInOut' }
                                : { duration: 0.3, ease: 'easeOut' }
                            }
                            className="relative select-none"
                        >
                            {/* Gradient circle */}
                            <Avatar src={null} seed={displayPseudo.full} size={96} />
                            {/* Emoji centered on top */}
                            <span className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-md">
                                {displayPseudo.emoji}
                            </span>
                        </motion.div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`text-${key}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.15 }}
                                className="h-24 flex flex-col items-center justify-center text-4xl uppercase font-extrabold text-neutral-900 dark:text-white text-center"
                            >
                                <span>{displayPseudo.text.split(' ')[0]}</span>
                                <span>{displayPseudo.text.split(' ').slice(1).join(' ')}</span>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Landlord preview */}
                    <div className="w-full max-w-sm">
                        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-center mb-3">
                            {t('page.landlordView')}
                        </p>
                        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700">
                            <div className="relative shrink-0">
                                <Avatar src={null} seed={displayPseudo.full} size={44} />
                                <span className="absolute inset-0 flex items-center justify-center text-2xl drop-shadow-sm">
                                    {displayPseudo.emoji}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                    {displayPseudo.text}
                                </span>
                                <span className="text-xs text-neutral-500">
                                    {t('page.candidatLabel')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-3 w-full max-w-xs pt-2">
                        {!previewPseudo ? (
                            <button
                                onClick={handleGenerate}
                                disabled={isSpinning}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-base font-semibold text-white bg-[#B9592D] hover:bg-[#A34E27] transition cursor-pointer disabled:opacity-50"
                            >
                                <motion.div
                                    animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <RefreshCw size={18} />
                                </motion.div>
                                {t('generator.regenerate')}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isSaving}
                                    className="w-full py-3 rounded-full text-base font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition cursor-pointer disabled:opacity-50"
                                >
                                    {isSaving ? t('generator.saving') : t('generator.confirm')}
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isSpinning}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-base font-semibold text-white bg-[#B9592D] hover:bg-[#A34E27] transition cursor-pointer disabled:opacity-50"
                                >
                                    <motion.div
                                        animate={isSpinning ? { rotate: 360 } : { rotate: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <RefreshCw size={18} />
                                    </motion.div>
                                    {t('generator.regenerate')}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition cursor-pointer"
                                >
                                    {t('page.cancel')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Info cards */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl">
                    <ShieldCheck size={20} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            {t('page.infoAnonymous.title')}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {t('page.infoAnonymous.description')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl">
                    <Info size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            {t('page.infoReveal.title')}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {t('page.infoReveal.description')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PseudonymClient;
