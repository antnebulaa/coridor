'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import { CONDITION_MAP, EVOLUTION_CONFIG } from '@/lib/inspection';
import { computeEvolution } from '@/hooks/useInspection';
import type { InspectionPhoto, ElementCondition, ElementEvolution } from '@prisma/client';

interface EntryExitComparisonProps {
  label: string; // "Sols — Séjour"
  entryPhoto?: InspectionPhoto | null;
  exitPhoto?: InspectionPhoto | null;
  entryCondition?: ElementCondition | null;
  exitCondition?: ElementCondition | null;
  entryNatures?: string[];
  exitNatures?: string[];
  degradationTypes?: string[];
  compact?: boolean;
}

const EntryExitComparison: React.FC<EntryExitComparisonProps> = ({
  label,
  entryPhoto,
  exitPhoto,
  entryCondition,
  exitCondition,
  entryNatures,
  exitNatures,
  degradationTypes,
  compact = false,
}) => {
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  const evolution = computeEvolution(entryCondition, exitCondition);
  const entryCondConfig = entryCondition ? CONDITION_MAP[entryCondition] : null;
  const exitCondConfig = exitCondition ? CONDITION_MAP[exitCondition] : null;
  const evolutionConfig = evolution ? EVOLUTION_CONFIG[evolution] : null;

  const getEvolutionBadgeClass = (evo: ElementEvolution): string => {
    switch (evo) {
      case 'UNCHANGED': return t.evolutionUnchanged;
      case 'NORMAL_WEAR': return t.evolutionNormalWear;
      case 'DETERIORATION': return t.evolutionDeterioration;
      case 'IMPROVEMENT': return t.evolutionImprovement;
      default: return '';
    }
  };

  return (
    <>
      <div className="mb-4">
        {/* Label */}
        <div className={`text-[15px] font-medium mb-3 ${t.textPrimary}`}>{label}</div>

        {/* Split-screen photos */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Entry */}
          <div>
            <div className={`mb-1.5 ${t.exitEntryLabel}`}>Entrée</div>
            {entryPhoto ? (
              <button
                onClick={() => setFullscreenUrl(entryPhoto.url)}
                className={`w-full aspect-[4/3] rounded-xl overflow-hidden ${t.exitEntryBg}`}
              >
                <Image
                  src={entryPhoto.thumbnailUrl || entryPhoto.url}
                  alt="Photo entrée"
                  width={300}
                  height={225}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className={`w-full aspect-[4/3] rounded-xl flex items-center justify-center ${t.exitNoPhoto}`}>
                <span className="text-[13px]">Pas de photo</span>
              </div>
            )}
            {entryCondConfig && !compact && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: entryCondConfig.color }}
                />
                <span className={`text-[13px] ${t.textSecondary}`}>{entryCondConfig.label}</span>
              </div>
            )}
          </div>

          {/* Exit */}
          <div>
            <div className={`mb-1.5 ${t.exitExitLabel}`}>Sortie</div>
            {exitPhoto ? (
              <button
                onClick={() => setFullscreenUrl(exitPhoto.url)}
                className={`w-full aspect-[4/3] rounded-xl overflow-hidden ${t.exitExitBg}`}
              >
                <Image
                  src={exitPhoto.thumbnailUrl || exitPhoto.url}
                  alt="Photo sortie"
                  width={300}
                  height={225}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className={`w-full aspect-[4/3] rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 ${t.exitNoPhoto}`}>
                <span className="text-[13px]">À prendre</span>
              </div>
            )}
            {exitCondConfig && !compact && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: exitCondConfig.color }}
                />
                <span className={`text-[13px] ${t.textPrimary}`}>{exitCondConfig.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Natures (if different) */}
        {!compact && entryNatures && exitNatures && (
          <div className={`text-[13px] mb-2 ${t.textSecondary}`}>
            {entryNatures.join(', ')}
            {JSON.stringify(entryNatures) !== JSON.stringify(exitNatures) && (
              <span className={`${t.textPrimary}`}> → {exitNatures.join(', ')}</span>
            )}
          </div>
        )}

        {/* Evolution badge */}
        {evolution && evolutionConfig && (
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-[13px] font-medium ${getEvolutionBadgeClass(evolution)}`}>
              {evolutionConfig.label}
            </span>
          </div>
        )}

        {/* Degradation types */}
        {degradationTypes && degradationTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {degradationTypes.map((dt) => (
              <span key={dt} className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[12px] font-medium">
                {dt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreenUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl z-10"
            onClick={() => setFullscreenUrl(null)}
          >
            ✕
          </button>
          <Image
            src={fullscreenUrl}
            alt="Photo plein écran"
            width={1200}
            height={900}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};

export default EntryExitComparison;
