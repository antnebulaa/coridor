'use client';

import { Lock, TrendingUp, FileDown, Save, BarChart3 } from 'lucide-react';
import useLoginModal from '@/hooks/useLoginModal';

interface PaywallOverlayProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

const FEATURES = [
  { icon: BarChart3, label: 'Projection détaillée année par année' },
  { icon: FileDown, label: 'Export PDF du rapport complet' },
  { icon: Save, label: 'Sauvegarde de vos simulations' },
  { icon: TrendingUp, label: 'Suivi de vos investissements' },
];

export function PaywallOverlay({ children, isAuthenticated }: PaywallOverlayProps) {
  const loginModal = useLoginModal();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: 'blur(8px)', transition: 'filter 500ms' }}
      >
        {children}
      </div>

      {/* CTA overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-(--sim-bg-card)/60 backdrop-blur-[2px]">
        <div className="bg-(--sim-bg-card) rounded-2xl p-6 md:p-8 shadow-(--sim-shadow-hover) max-w-sm mx-4 text-center border border-neutral-200 dark:border-neutral-800">
          <div className="w-12 h-12 rounded-full bg-(--sim-amber-50) flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-(--sim-amber-500)" />
          </div>

          <h4
            className="text-lg text-neutral-900 dark:text-white mb-2"
            style={{ fontFamily: 'var(--font-serif-sim), serif' }}
          >
            Accédez aux détails complets
          </h4>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
            Créez un compte gratuit pour débloquer tous les indicateurs avancés.
          </p>

          <ul className="space-y-2.5 mb-6 text-left">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                <f.icon size={14} className="text-(--sim-amber-500) shrink-0" />
                {f.label}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => loginModal.onOpen()}
            className="w-full py-3 rounded-full text-sm font-medium text-white bg-linear-to-r from-[#E8A838] via-[#D4922A] to-[#B87A1E] shadow-md hover:shadow-lg transition-all"
          >
            Créer un compte gratuit
          </button>
        </div>
      </div>
    </div>
  );
}
