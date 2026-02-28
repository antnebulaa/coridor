'use client';

import { ArrowRight } from 'lucide-react';
import useLoginModal from '@/hooks/useLoginModal';

export function SignupBanner() {
  const loginModal = useLoginModal();

  return (
    <div className="rounded-2xl bg-linear-to-br from-(--sim-amber-50) to-transparent p-6 md:p-8 text-center">
      <h4
        className="text-xl md:text-2xl text-neutral-900 dark:text-white mb-2"
        style={{ fontFamily: 'var(--font-serif-sim), serif' }}
      >
        Cette simulation vous a été utile ?
      </h4>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
        Créez votre compte pour sauvegarder vos simulations, exporter vos rapports et gérer vos investissements.
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
      </div>
    </div>
  );
}
