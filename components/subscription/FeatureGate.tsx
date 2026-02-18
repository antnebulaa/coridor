'use client';

import React from 'react';
import { useFeature } from '@/hooks/useFeature';
import { Lock, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function FeatureGate({ featureKey, children, fallback }: FeatureGateProps) {
  const { loading, hasFeature } = useFeature(featureKey);

  if (loading) return <>{children}</>;

  if (!hasFeature) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="relative">
        <div className="pointer-events-none opacity-30 blur-[1px] select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
          <div className="text-center p-6 max-w-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <Lock size={20} className="text-neutral-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Fonctionnalit&eacute; Premium
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
              Passez &agrave; un plan sup&eacute;rieur pour d&eacute;bloquer cette fonctionnalit&eacute;.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition"
            >
              Voir les plans
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
