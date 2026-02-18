'use client';

import React from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface UpgradePromptProps {
  feature: string;
  description?: string;
}

export default function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  return (
    <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-2xl p-6 text-white">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Zap size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{feature}</h3>
          <p className="text-neutral-300 text-sm mt-1">
            {description || 'Disponible avec un abonnement sup\u00E9rieur.'}
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-100 transition"
          >
            Voir les plans
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
