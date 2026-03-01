'use client';

import { ArrowRight, Share2 } from 'lucide-react';
import useLoginModal from '@/hooks/useLoginModal';

export function SignupBanner() {
  const loginModal = useLoginModal();

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Simulateur d\'investissement locatif — Coridor',
        text: 'Calculez gratuitement la rentabilité de votre investissement immobilier.',
        url: window.location.href,
      }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  return (
    <div className="text-center">
      <h4
        className="text-xl md:text-2xl text-neutral-900 dark:text-white mb-2"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        Cette simulation vous a été utile ?
      </h4>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
        Créez votre compte pour sauvegarder vos simulations, exporter vos rapports,
        comparer plusieurs scénarios et gérer vos investissements.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => loginModal.onOpen()}
          className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white bg-linear-to-r from-[#E8A838] via-[#D4922A] to-[#B87A1E] shadow-md hover:shadow-lg transition-all"
        >
          Découvrir Coridor
          <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <Share2 size={14} />
          Partager
        </button>
      </div>
    </div>
  );
}
