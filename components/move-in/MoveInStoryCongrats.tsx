'use client';

import React from 'react';
import type { MoveInLeaseData } from '@/lib/moveInGuide';

interface MoveInStoryCongratsProps {
  lease: MoveInLeaseData;
  onNext: () => void;
}

const MoveInStoryCongrats: React.FC<MoveInStoryCongratsProps> = ({ lease, onNext }) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatRent = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div
      className="flex flex-col items-left justify-center h-full px-6 animate-scaleIn"
      style={{ background: 'linear-gradient(160deg, #FFF9F0 0%, #FFFFFF 50%, #F0F7FF 100%)' }}
    >
      {/* Emoji */}
      <div className="text-[64px] mb-4">🎉</div>

      {/* Titre */}
      <h1 className="text-[28px] font-medium text-[#1A1A1A] text-left leading-tight mb-2">
        Félicitations !
      </h1>
      <p className="text-[15px] text-left leading-relaxed mb-8" style={{ color: 'rgba(0,0,0,0.5)' }}>
        Votre bail est signé.{'\n'}Bienvenue chez vous.
      </p>

      {/* Card logement */}
      <div
        className="w-full rounded-2xl p-5"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Adresse */}
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[13px] font-medium text-[#1A1A1A] leading-snug">
            {lease.propertyAddress}
          </p>
        </div>

        {/* 3 mini-cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'TYPE', value: lease.propertyType },
            { label: 'SURFACE', value: `${lease.propertySurface} m²` },
            { label: 'LOYER', value: `${formatRent(lease.rentAmount)}/mois` },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-2.5 text-center" style={{ backgroundColor: '#F8F8FA' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(0,0,0,0.35)' }}>
                {item.label}
              </p>
              <p className="text-[14px] font-bold text-[#1A1A1A]">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Bandeau date */}
        <div className="rounded-xl py-2.5 px-3 text-center" style={{ backgroundColor: '#F0FAF3' }}>
          <p className="text-[13px] font-semibold" style={{ color: '#2D9F4F' }}>
            Début du bail : {formatDate(lease.startDate)}
          </p>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onNext}
        className="mt-8 w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-transform active:scale-[0.97]"
        style={{
          backgroundColor: '#E8A838',
          boxShadow: '0 4px 16px rgba(232,168,56,0.3)',
        }}
      >
        Découvrir les prochaines étapes →
      </button>
    </div>
  );
};

export default MoveInStoryCongrats;
