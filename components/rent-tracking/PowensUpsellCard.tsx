'use client';

import { Link2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface PowensUpsellCardProps {
  show: boolean;
}

export default function PowensUpsellCard({ show }: PowensUpsellCardProps) {
  if (!show) return null;

  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
              Paiement des loyers
            </p>
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded-full">
              Essentiel
            </span>
          </div>
          <p className="text-sm font-semibold text-white leading-snug">
            Connectez votre banque pour être alerté automatiquement
          </p>
          <p className="text-sm text-neutral-400 mt-1.5 leading-relaxed">
            Les paiements seront détectés et rapprochés sans intervention.
          </p>
        </div>
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
          <Link2 size={20} className="text-white" />
        </div>
      </div>
      <Link
        href="/pricing"
        className="mt-4 w-full bg-white text-neutral-900 text-sm font-semibold py-2.5 rounded-xl hover:bg-neutral-100 transition-colors block text-center"
      >
        Passer à Essentiel — 7,90 €/mois
      </Link>
    </div>
  );
}
