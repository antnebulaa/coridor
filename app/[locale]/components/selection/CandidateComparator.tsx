'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, Trophy, Users } from 'lucide-react';
import Modal from '@/components/modals/Modal';
import { Button } from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CandidateScore {
  criterion: string;
  score: number; // 1=bon, 2=moyen, 3=faible
  label: string;
}

interface CandidateDossier {
  revenueRatio: number | null;
  fileCompleteness: number;
  hasGuarantor: boolean;
  guarantorType: string | null;
  leaseCompatible: boolean;
  moveInCompatible: boolean;
}

export interface CandidateData {
  applicationId: string;
  candidateName: string;
  visitDate: string;
  decision: 'SHORTLISTED' | 'UNDECIDED' | 'ELIMINATED';
  compositeScore: number;
  scores: CandidateScore[];
  dossier: CandidateDossier;
  applicationStatus: string;
}

interface CandidateComparatorProps {
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  candidates: CandidateData[];
  onSelectCandidate: (applicationId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DecisionFilter = 'ALL' | 'SHORTLISTED' | 'UNDECIDED' | 'ELIMINATED';

const decisionLabels: Record<string, string> = {
  SHORTLISTED: 'Shortliste',
  UNDECIDED: 'Indecis',
  ELIMINATED: 'Ecarte',
};

const decisionColors: Record<string, string> = {
  SHORTLISTED: 'bg-green-100 text-green-700',
  UNDECIDED: 'bg-gray-100 text-gray-600',
  ELIMINATED: 'bg-red-100 text-red-700',
};

function scoreBadgeClass(score: number): string {
  if (score === 1) return 'bg-green-50 text-green-700';
  if (score === 2) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function scoreBadgeDot(score: number): string {
  if (score === 1) return 'bg-green-500';
  if (score === 2) return 'bg-amber-500';
  return 'bg-red-500';
}

function boolBadge(value: boolean): { className: string; label: string } {
  return value
    ? { className: 'bg-green-50 text-green-700', label: 'Compatible' }
    : { className: 'bg-red-50 text-red-700', label: 'Incompatible' };
}

function revenueScoreClass(ratio: number | null): string {
  if (ratio === null) return 'bg-gray-50 text-gray-500';
  if (ratio >= 3) return 'bg-green-50 text-green-700';
  if (ratio >= 2) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function completenessClass(pct: number): string {
  if (pct >= 90) return 'bg-green-50 text-green-700';
  if (pct >= 60) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function guarantorLabel(hasGuarantor: boolean, type: string | null): string {
  if (!hasGuarantor) return 'Aucun';
  if (type) return type;
  return 'Oui';
}

function guarantorClass(hasGuarantor: boolean): string {
  return hasGuarantor ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700';
}

/** Generate deterministic gradient from name for avatar */
function nameToGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40 + Math.abs((hash >> 8) % 60)) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 65%), hsl(${h2}, 80%, 55%))`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Dossier rows definition for table / card
// ---------------------------------------------------------------------------

interface DossierRow {
  label: string;
  getValue: (c: CandidateData) => string;
  getClass: (c: CandidateData) => string;
}

const dossierRows: DossierRow[] = [
  {
    label: 'Revenus',
    getValue: (c) => c.dossier.revenueRatio !== null ? `${c.dossier.revenueRatio.toFixed(1)}x le loyer` : 'N/A',
    getClass: (c) => revenueScoreClass(c.dossier.revenueRatio),
  },
  {
    label: 'Dossier',
    getValue: (c) => `${c.dossier.fileCompleteness}% complet`,
    getClass: (c) => completenessClass(c.dossier.fileCompleteness),
  },
  {
    label: 'Garant',
    getValue: (c) => guarantorLabel(c.dossier.hasGuarantor, c.dossier.guarantorType),
    getClass: (c) => guarantorClass(c.dossier.hasGuarantor),
  },
  {
    label: 'Bail',
    getValue: (c) => boolBadge(c.dossier.leaseCompatible).label,
    getClass: (c) => boolBadge(c.dossier.leaseCompatible).className,
  },
  {
    label: 'Emmenagement',
    getValue: (c) => boolBadge(c.dossier.moveInCompatible).label,
    getClass: (c) => boolBadge(c.dossier.moveInCompatible).className,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Mobile carousel card */
const CandidateCard: React.FC<{
  candidate: CandidateData;
  index: number;
  total: number;
  onChoose: () => void;
  isSelecting: boolean;
}> = ({ candidate, index, total, onChoose, isSelecting }) => {
  return (
    <div className="flex flex-col items-center w-full px-4 pb-6">
      {/* Avatar */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md mb-3"
        style={{ background: nameToGradient(candidate.candidateName) }}
      >
        {initials(candidate.candidateName)}
      </div>

      {/* Name + score */}
      <h3 className="text-lg font-semibold text-neutral-900">{candidate.candidateName}</h3>
      <p className="text-sm text-neutral-500 mb-1">Visite du {candidate.visitDate}</p>
      <div className="text-2xl font-bold text-neutral-900 mb-4">
        {candidate.compositeScore.toFixed(1)}<span className="text-sm font-normal text-neutral-400">/10</span>
      </div>

      {/* Dossier section */}
      <div className="w-full">
        <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-1">Dossier</div>
        <div className="space-y-2">
          {dossierRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-neutral-100">
              <span className="text-sm text-neutral-600">{row.label}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${row.getClass(candidate)}`}>
                {row.getValue(candidate)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Visit impression section */}
      {candidate.scores.length > 0 && (
        <div className="w-full mt-4">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-1">Impression visite</div>
          <div className="space-y-2">
            {candidate.scores.map((s) => (
              <div key={s.criterion} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-neutral-100">
                <span className="text-sm text-neutral-600">{s.label}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${scoreBadgeClass(s.score)}`}>
                  {s.score === 1 ? 'Bon' : s.score === 2 ? 'Moyen' : 'Faible'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision badge */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm text-neutral-500">Decision :</span>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${decisionColors[candidate.decision]}`}>
          {decisionLabels[candidate.decision]}
        </span>
      </div>

      {/* Choose button */}
      <div className="mt-5 w-full">
        <Button
          onClick={onChoose}
          loading={isSelecting}
          disabled={isSelecting}
          icon={Trophy}
          className="w-full rounded-full h-[48px] text-sm"
        >
          Choisir ce candidat
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CandidateComparator: React.FC<CandidateComparatorProps> = ({
  listingId,
  listingTitle,
  listingPrice,
  candidates,
  onSelectCandidate,
}) => {
  const [filter, setFilter] = useState<DecisionFilter>('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [successAppId, setSuccessAppId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filtered candidates
  const filtered = useMemo(() => {
    if (filter === 'ALL') return candidates;
    return candidates.filter((c) => c.decision === filter);
  }, [candidates, filter]);

  // Filter counts
  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: candidates.length, SHORTLISTED: 0, UNDECIDED: 0, ELIMINATED: 0 };
    candidates.forEach((c) => { map[c.decision] = (map[c.decision] || 0) + 1; });
    return map;
  }, [candidates]);

  // Navigate mobile carousel
  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, filtered.length - 1));
    setCurrentIndex(clamped);
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({ left: clamped * cardWidth, behavior: 'smooth' });
    }
  }, [filtered.length]);

  // Handle scroll snap settle on mobile
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.offsetWidth;
      if (cardWidth > 0) {
        const idx = Math.round(scrollContainerRef.current.scrollLeft / cardWidth);
        setCurrentIndex(idx);
      }
    }
  }, []);

  // Open confirmation modal
  const handleChoose = useCallback((applicationId: string) => {
    setSelectedAppId(applicationId);
    setConfirmOpen(true);
  }, []);

  // Confirm selection
  const handleConfirmSelection = useCallback(async () => {
    if (!selectedAppId) return;
    setIsSelecting(true);
    try {
      await onSelectCandidate(selectedAppId);
      setSuccessAppId(selectedAppId);
      setConfirmOpen(false);
    } catch {
      // Error handling is done by parent via toast
    } finally {
      setIsSelecting(false);
    }
  }, [selectedAppId, onSelectCandidate]);

  const selectedCandidateName = useMemo(() => {
    const c = candidates.find((c) => c.applicationId === selectedAppId);
    return c?.candidateName || '';
  }, [candidates, selectedAppId]);

  // Reset index when filter changes
  const handleFilterChange = useCallback((f: DecisionFilter) => {
    setFilter(f);
    setCurrentIndex(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Render: Filter pills
  // ---------------------------------------------------------------------------

  const filterPills = (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {([
        { key: 'ALL' as DecisionFilter, label: 'Tous' },
        { key: 'SHORTLISTED' as DecisionFilter, label: 'Shortlistes' },
        { key: 'UNDECIDED' as DecisionFilter, label: 'Indecis' },
        { key: 'ELIMINATED' as DecisionFilter, label: 'Ecartes' },
      ]).map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleFilterChange(key)}
          className={`
            flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition
            ${filter === key
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }
          `}
        >
          {label}
          <span className={`
            text-xs px-1.5 py-0.5 rounded-full
            ${filter === key ? 'bg-white/20 text-white' : 'bg-white text-neutral-500'}
          `}>
            {counts[key]}
          </span>
        </button>
      ))}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------

  if (successAppId) {
    const chosen = candidates.find((c) => c.applicationId === successAppId);
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-6"
          style={{ background: nameToGradient(chosen?.candidateName || '') }}
        >
          <Check size={40} />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Candidat selectionne !</h2>
        <p className="text-neutral-500 max-w-md">
          {chosen?.candidateName} a ete selectionne pour <strong>{listingTitle}</strong>.
          Les autres candidats seront automatiquement informes.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (filtered.length === 0) {
    return (
      <div>
        {filterPills}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users size={48} className="text-neutral-300 mb-4" />
          <p className="text-neutral-500">Aucun candidat dans cette categorie.</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Mobile carousel (visible on < md)
  // ---------------------------------------------------------------------------

  const mobileView = (
    <div className="md:hidden">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="p-2 rounded-full hover:bg-neutral-100 disabled:opacity-30 transition"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-sm font-medium text-neutral-600">
          {filtered[currentIndex]?.candidateName}
          <span className="text-neutral-400 ml-2">{currentIndex + 1}/{filtered.length}</span>
        </div>
        <button
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex >= filtered.length - 1}
          className="p-2 rounded-full hover:bg-neutral-100 disabled:opacity-30 transition"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Scroll snap container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {filtered.map((candidate, idx) => (
          <div
            key={candidate.applicationId}
            className="snap-center shrink-0 w-full"
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="bg-neutral-50 rounded-2xl border border-neutral-200 py-6 mx-1">
              <CandidateCard
                candidate={candidate}
                index={idx}
                total={filtered.length}
                onChoose={() => handleChoose(candidate.applicationId)}
                isSelecting={isSelecting}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Dots indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {filtered.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`
              w-2 h-2 rounded-full transition-all
              ${idx === currentIndex ? 'bg-neutral-900 w-4' : 'bg-neutral-300'}
            `}
          />
        ))}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: Desktop table (visible on >= md)
  // ---------------------------------------------------------------------------

  const desktopView = (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className="sticky top-0 bg-white z-10">
            <th className="text-left p-3 text-sm font-medium text-neutral-500 border-b border-neutral-200 min-w-[160px]">
              Critere
            </th>
            {filtered.map((c) => (
              <th key={c.applicationId} className="p-3 border-b border-neutral-200 min-w-[150px]">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: nameToGradient(c.candidateName) }}
                  >
                    {initials(c.candidateName)}
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">{c.candidateName}</span>
                  <span className="text-xs text-neutral-400">{c.visitDate}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Section: Dossier */}
          <tr>
            <td colSpan={filtered.length + 1} className="pt-4 pb-2 px-3">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Dossier</span>
            </td>
          </tr>
          {dossierRows.map((row, rowIdx) => (
            <tr key={row.label} className={rowIdx % 2 === 0 ? 'bg-neutral-50/50' : ''}>
              <td className="p-3 text-sm font-medium text-neutral-600">{row.label}</td>
              {filtered.map((c) => (
                <td key={c.applicationId} className="p-3 text-center">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${row.getClass(c)}`}>
                    {row.getValue(c)}
                  </span>
                </td>
              ))}
            </tr>
          ))}

          {/* Section: Impression visite */}
          {filtered.some((c) => c.scores.length > 0) && (
            <>
              <tr>
                <td colSpan={filtered.length + 1} className="pt-6 pb-2 px-3">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Impression visite</span>
                </td>
              </tr>
              {/* Collect all unique criteria */}
              {(() => {
                const allCriteria = new Map<string, string>();
                filtered.forEach((c) =>
                  c.scores.forEach((s) => allCriteria.set(s.criterion, s.label))
                );
                return Array.from(allCriteria.entries()).map(([criterion, label], rowIdx) => (
                  <tr key={criterion} className={rowIdx % 2 === 0 ? 'bg-neutral-50/50' : ''}>
                    <td className="p-3 text-sm font-medium text-neutral-600">{label}</td>
                    {filtered.map((c) => {
                      const s = c.scores.find((s) => s.criterion === criterion);
                      if (!s) return <td key={c.applicationId} className="p-3 text-center text-xs text-neutral-300">-</td>;
                      return (
                        <td key={c.applicationId} className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${scoreBadgeClass(s.score)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${scoreBadgeDot(s.score)}`} />
                            {s.score === 1 ? 'Bon' : s.score === 2 ? 'Moyen' : 'Faible'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()}
            </>
          )}

          {/* Score + Decision row */}
          <tr className="border-t-2 border-neutral-200">
            <td className="p-3 text-sm font-bold text-neutral-900">Score global</td>
            {filtered.map((c) => (
              <td key={c.applicationId} className="p-3 text-center">
                <span className="text-lg font-bold text-neutral-900">
                  {c.compositeScore.toFixed(1)}
                </span>
                <span className="text-xs text-neutral-400">/10</span>
              </td>
            ))}
          </tr>

          <tr>
            <td className="p-3 text-sm font-medium text-neutral-600">Decision</td>
            {filtered.map((c) => (
              <td key={c.applicationId} className="p-3 text-center">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${decisionColors[c.decision]}`}>
                  {decisionLabels[c.decision]}
                </span>
              </td>
            ))}
          </tr>

          {/* Action row */}
          <tr>
            <td className="p-3" />
            {filtered.map((c) => (
              <td key={c.applicationId} className="p-3 text-center">
                <button
                  onClick={() => handleChoose(c.applicationId)}
                  disabled={isSelecting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-full hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trophy size={14} />
                  Choisir
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Confirmation modal
  // ---------------------------------------------------------------------------

  const confirmModal = (
    <Modal
      isOpen={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      onSubmit={handleConfirmSelection}
      title="Confirmer la selection"
      actionLabel="Confirmer"
      secondaryAction={() => setConfirmOpen(false)}
      secondaryActionLabel="Annuler"
      isLoading={isSelecting}
      body={
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ background: nameToGradient(selectedCandidateName) }}
          >
            {initials(selectedCandidateName)}
          </div>
          <p className="text-neutral-700">
            Etes-vous sur de vouloir selectionner <strong>{selectedCandidateName}</strong> ?
          </p>
          <p className="text-sm text-neutral-500">
            Les autres candidats seront automatiquement declines.
          </p>
        </div>
      }
    />
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {filterPills}
      {mobileView}
      {desktopView}
      {confirmModal}
    </div>
  );
};

export default CandidateComparator;
