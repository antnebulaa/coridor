'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import { useDepositDeductions } from '@/hooks/useDepositDeductions';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import EntryExitComparison from '@/components/inspection/EntryExitComparison';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import { EVOLUTION_CONFIG } from '@/lib/inspection';
import { getEntryElement } from '@/hooks/useInspection';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  Euro,
  Percent,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ElementEvolution } from '@prisma/client';

export default function DeductionsPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection } = useInspection(inspectionId);
  const {
    deductions,
    resolution,
    isLoading,
    totalDeductionsCents,
    addDeduction,
    updateDeduction,
    removeDeduction,
    createProposal,
  } = useDepositDeductions(inspectionId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newCostEuros, setNewCostEuros] = useState('');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editCostId, setEditCostId] = useState<string | null>(null);
  const [editCostValue, setEditCostValue] = useState('');

  // Get all elements with DETERIORATION evolution
  const deterioratedElements = useMemo(() => {
    if (!inspection || inspection.type !== 'EXIT' || !inspection.entryInspection) return [];

    const results: {
      element: NonNullable<typeof inspection.rooms>[number]['elements'][number];
      room: NonNullable<typeof inspection.rooms>[number];
      entryElement: NonNullable<typeof inspection.rooms>[number]['elements'][number] | null;
    }[] = [];

    for (const room of inspection.rooms) {
      for (const element of room.elements) {
        if (element.evolution === 'DETERIORATION') {
          const entry = getEntryElement(element, room, inspection.entryInspection);
          results.push({ element, room, entryElement: entry });
        }
      }
    }

    return results;
  }, [inspection]);

  // Deposit amount from listing
  const depositAmountCents = useMemo(() => {
    if (!inspection) return 0;
    const listing = (inspection as Record<string, unknown>).application as Record<string, unknown> | undefined;
    if (!listing) return 0;
    const listingData = listing.listing as Record<string, unknown> | undefined;
    if (!listingData) return 0;
    const deposit = listingData.securityDeposit as number | null;
    if (deposit) return deposit * 100;
    // Fallback: 1x rent (unfurnished), 2x (furnished)
    const price = listingData.price as number || 0;
    const leaseType = listingData.leaseType as string || '';
    const isFurnished = leaseType === 'SHORT_TERM' || leaseType === 'STUDENT';
    return price * (isFurnished ? 2 : 1) * 100;
  }, [inspection]);

  const refundAmountCents = Math.max(0, depositAmountCents - totalDeductionsCents);

  const formatCents = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' \u20ac';

  const handleAddDeduction = async () => {
    const costCents = Math.round(parseFloat(newCostEuros.replace(',', '.')) * 100);
    if (!newDescription.trim() || isNaN(costCents) || costCents <= 0) {
      toast.error('Remplissez la description et le montant');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find photo URLs for the selected element
      let photoUrl: string | undefined;
      let entryPhotoUrl: string | undefined;
      if (selectedElementId) {
        const item = deterioratedElements.find(d => d.element.id === selectedElementId);
        if (item) {
          const exitPhoto = item.element.photos?.[0];
          const entryPhoto = item.entryElement?.photos?.[0];
          photoUrl = exitPhoto?.url;
          entryPhotoUrl = entryPhoto?.url;
        }
      }

      await addDeduction({
        elementId: selectedElementId || undefined,
        description: newDescription.trim(),
        repairCostCents: costCents,
        photoUrl,
        entryPhotoUrl,
      });

      setNewDescription('');
      setNewCostEuros('');
      setSelectedElementId(null);
      setShowAddForm(false);
      toast.success('Retenue ajoutee');
    } catch {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDeduction = async (deductionId: string) => {
    await removeDeduction(deductionId);
    toast.success('Retenue supprimee');
  };

  const handleUpdateCost = async (deductionId: string) => {
    const costCents = Math.round(parseFloat(editCostValue.replace(',', '.')) * 100);
    if (isNaN(costCents) || costCents <= 0) return;
    await updateDeduction(deductionId, { repairCostCents: costCents });
    setEditCostId(null);
    setEditCostValue('');
  };

  const handleSendProposal = async () => {
    if (deductions.length === 0) {
      toast.error('Ajoutez au moins une retenue');
      return;
    }

    setIsSendingProposal(true);
    try {
      await createProposal();
      toast.success('Proposition envoyee au locataire');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSendingProposal(false);
    }
  };

  const getEvolutionBadgeClass = (evo: ElementEvolution): string => {
    switch (evo) {
      case 'UNCHANGED': return t.evolutionUnchanged;
      case 'NORMAL_WEAR': return t.evolutionNormalWear;
      case 'DETERIORATION': return t.evolutionDeterioration;
      case 'IMPROVEMENT': return t.evolutionImprovement;
      default: return '';
    }
  };

  if (isLoading || !inspection) {
    return (
      <div className="h-full flex flex-col">
        <InspectionTopBar title="Retenues" onBack={() => router.back()} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  // If already proposed
  if (resolution && resolution.status !== 'PENDING') {
    return (
      <div className="h-full flex flex-col">
        <InspectionTopBar title="Retenues sur depot" onBack={() => router.back()} />
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {/* Status banner */}
          <div
            className="rounded-2xl p-5 text-center mb-6"
            style={{
              background: resolution.status === 'AGREED' || resolution.status === 'RESOLVED'
                ? `${t.green}10`
                : resolution.status === 'DISPUTED'
                ? '#ef444410'
                : `${t.blue}10`,
              border: `1px solid ${
                resolution.status === 'AGREED' || resolution.status === 'RESOLVED'
                  ? `${t.green}30`
                  : resolution.status === 'DISPUTED'
                  ? '#ef444430'
                  : `${t.blue}30`
              }`,
            }}
          >
            <CheckCircle2
              size={40}
              color={
                resolution.status === 'AGREED' || resolution.status === 'RESOLVED'
                  ? t.green
                  : resolution.status === 'DISPUTED'
                  ? t.red
                  : t.blue
              }
              className="mx-auto mb-2"
            />
            <div className="text-[18px] font-bold" style={{
              color: resolution.status === 'AGREED' || resolution.status === 'RESOLVED'
                ? t.green
                : resolution.status === 'DISPUTED'
                ? t.red
                : t.blue,
            }}>
              {resolution.status === 'PROPOSED' && 'Proposition envoyee'}
              {resolution.status === 'AGREED' && 'Retenues acceptees'}
              {resolution.status === 'PARTIAL_AGREED' && 'Accord partiel'}
              {resolution.status === 'DISPUTED' && 'Retenues contestees'}
              {resolution.status === 'RESOLVED' && 'Depot restitue'}
            </div>
            <div className={`text-[15px] mt-2 ${t.textSecondary}`}>
              {resolution.status === 'PROPOSED' && 'En attente de la reponse du locataire.'}
              {resolution.status === 'AGREED' && 'Le locataire a accepte les retenues.'}
              {resolution.status === 'PARTIAL_AGREED' && `Accord partiel — ${formatCents(resolution.partialAgreedAmount || 0)} accepte. Delai de 14 jours pour le reste.`}
              {resolution.status === 'DISPUTED' && (resolution.disputeReason || 'Le locataire conteste les retenues.')}
              {resolution.status === 'RESOLVED' && 'Le depot de garantie a ete restitue.'}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-3">
            <div className={`p-4 ${t.deductionCard}`}>
              <div className={`text-[14px] ${t.textSecondary}`}>Depot de garantie</div>
              <div className={`text-[22px] font-bold ${t.textPrimary}`}>{formatCents(resolution.depositAmountCents)}</div>
            </div>
            <div className={`p-4 ${t.deductionTotal}`}>
              <div className="text-[14px] text-gray-300">Total retenues</div>
              <div className="text-[22px] font-bold">{formatCents(resolution.totalDeductionsCents)}</div>
            </div>
            <div className={`p-4 ${t.deductionRefund}`}>
              <div className="text-[14px]">Montant a restituer</div>
              <div className="text-[22px] font-bold">{formatCents(resolution.refundAmountCents)}</div>
            </div>
          </div>

          {/* Deductions list */}
          <div className="mt-6 space-y-3">
            <div className={`text-[17px] font-bold ${t.textPrimary}`}>
              Detail des retenues ({deductions.length})
            </div>
            {deductions.map(d => (
              <div key={d.id} className={`p-4 ${t.deductionCard}`}>
                <div className={`text-[15px] font-medium ${t.textPrimary}`}>{d.description}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className={`text-[13px] ${t.textSecondary}`}>
                    Cout : {formatCents(d.repairCostCents)} | Vetuste : {Math.round(d.vetustePct * 100)}%
                  </div>
                  <div className={`text-[15px] font-bold ${t.textPrimary}`}>{formatCents(d.tenantShareCents)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Back button */}
          <button
            onClick={() => router.push('/dashboard')}
            className={`w-full mt-8 py-4 rounded-2xl text-[17px] font-bold ${t.textMuted}`}
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // Main editing view (no resolution yet or PENDING)
  return (
    <div className="h-full flex flex-col">
      <InspectionTopBar
        title="Retenues sur depot"
        subtitle={`${deterioratedElements.length} degradation${deterioratedElements.length > 1 ? 's' : ''} constatee${deterioratedElements.length > 1 ? 's' : ''}`}
        onBack={() => router.back()}
      />

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Deterioration summary */}
        {deterioratedElements.length > 0 && (
          <div className="mb-6">
            <div className={`text-[17px] font-bold mb-3 ${t.textPrimary}`}>
              Degradations constatees
            </div>
            <div className="space-y-4">
              {deterioratedElements.map(({ element, room, entryElement }) => {
                const hasDeduction = deductions.some(d => d.elementId === element.id);
                const exitPhoto = element.photos?.[0] || null;
                const entryPhoto = entryElement?.photos?.[0] || null;
                const evoConfig = element.evolution ? EVOLUTION_CONFIG[element.evolution] : null;

                return (
                  <div
                    key={element.id}
                    className={`rounded-xl overflow-hidden border ${hasDeduction ? 'border-gray-200 opacity-60' : 'border-orange-200 bg-orange-50/30'}`}
                  >
                    <EntryExitComparison
                      label={`${element.name} — ${room.name}`}
                      entryPhoto={entryPhoto}
                      exitPhoto={exitPhoto}
                      entryCondition={entryElement?.condition}
                      exitCondition={element.condition}
                      degradationTypes={element.degradationTypes}
                      compact
                    />

                    {evoConfig && (
                      <div className="px-4 pb-3">
                        <span className={`px-3 py-1 rounded-full text-[12px] font-medium ${getEvolutionBadgeClass(element.evolution!)}`}>
                          {evoConfig.label}
                        </span>
                      </div>
                    )}

                    {!hasDeduction && (
                      <div className="px-4 pb-3">
                        <button
                          onClick={() => {
                            setSelectedElementId(element.id);
                            setNewDescription(`${element.name} — ${room.name} (${element.degradationTypes?.join(', ') || 'degradation'})`);
                            setShowAddForm(true);
                          }}
                          className="flex items-center gap-1.5 text-[13px] font-medium"
                          style={{ color: t.accent }}
                        >
                          <Plus size={14} />
                          Ajouter une retenue
                        </button>
                      </div>
                    )}

                    {hasDeduction && (
                      <div className="px-4 pb-3">
                        <span className="text-[12px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Retenue ajoutee
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {deterioratedElements.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 size={48} color={t.green} className="mx-auto mb-3" />
            <div className={`text-[18px] font-bold ${t.textPrimary}`}>
              Aucune degradation
            </div>
            <div className={`text-[15px] mt-2 ${t.textSecondary}`}>
              Le logement est en bon etat. Le depot de garantie sera integralement restitue.
            </div>
          </div>
        )}

        {/* Deductions list */}
        {deductions.length > 0 && (
          <div className="mb-6">
            <div className={`text-[17px] font-bold mb-3 ${t.textPrimary}`}>
              Retenues ({deductions.length})
            </div>
            <div className="space-y-3">
              {deductions.map(d => {
                const isExpanded = expandedId === d.id;
                const isEditingCost = editCostId === d.id;

                return (
                  <div key={d.id} className={`${t.deductionCard} p-4`}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      className="w-full flex items-start justify-between"
                    >
                      <div className="text-left">
                        <div className={`text-[15px] font-medium ${t.textPrimary}`}>{d.description}</div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`text-[13px] ${t.textSecondary}`}>
                            <Percent size={12} className="inline mr-0.5" />
                            Vetuste {Math.round(d.vetustePct * 100)}%
                          </span>
                          <span className={`text-[15px] font-bold ${t.textPrimary}`}>
                            {formatCents(d.tenantShareCents)}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className={t.textMuted} /> : <ChevronDown size={18} className={t.textMuted} />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                        <div className="flex justify-between text-[14px]">
                          <span className={t.textSecondary}>Cout reparation</span>
                          {isEditingCost ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                value={editCostValue}
                                onChange={e => setEditCostValue(e.target.value)}
                                className={`w-24 text-right text-[14px] border rounded-lg px-2 py-1 ${t.border} ${t.textPrimary}`}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleUpdateCost(d.id); }}
                              />
                              <button
                                onClick={() => handleUpdateCost(d.id)}
                                className="text-[13px] font-medium"
                                style={{ color: t.accent }}
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditCostId(d.id); setEditCostValue((d.repairCostCents / 100).toString()); }}
                              className={`font-medium ${t.textPrimary}`}
                            >
                              {formatCents(d.repairCostCents)}
                            </button>
                          )}
                        </div>
                        <div className="flex justify-between text-[14px]">
                          <span className={t.textSecondary}>Vetuste</span>
                          <span className={t.textPrimary}>{Math.round(d.vetustePct * 100)}%</span>
                        </div>
                        <div className="flex justify-between text-[14px]">
                          <span className={t.textSecondary}>Part locataire</span>
                          <span className={`font-bold ${t.textPrimary}`}>{formatCents(d.tenantShareCents)}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveDeduction(d.id)}
                          className="flex items-center gap-1.5 text-[13px] text-red-500 font-medium pt-1"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add deduction form */}
        {showAddForm && (
          <div className={`mb-6 p-4 rounded-xl border ${t.border} ${t.bgCard}`}>
            <div className={`text-[16px] font-bold mb-3 ${t.textPrimary}`}>
              Nouvelle retenue
            </div>
            <div className="space-y-3">
              <div>
                <label className={`text-[13px] font-medium ${t.textSecondary}`}>Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Ex: Trou dans le mur du salon"
                  className={`w-full mt-1 px-3 py-2.5 rounded-lg text-[15px] border ${t.border} ${t.textPrimary} bg-transparent`}
                />
              </div>
              <div>
                <label className={`text-[13px] font-medium ${t.textSecondary}`}>
                  <Euro size={12} className="inline mr-1" />
                  Cout de reparation (euros)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newCostEuros}
                  onChange={e => setNewCostEuros(e.target.value)}
                  placeholder="150,00"
                  className={`w-full mt-1 px-3 py-2.5 rounded-lg text-[15px] border ${t.border} ${t.textPrimary} bg-transparent`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddDeduction}
                  disabled={isSubmitting}
                  className={`flex-1 py-3 rounded-xl text-[15px] font-bold ${t.btnPrimary}`}
                >
                  {isSubmitting ? 'Ajout...' : 'Ajouter'}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewDescription(''); setNewCostEuros(''); setSelectedElementId(null); }}
                  className={`px-4 py-3 rounded-xl text-[15px] ${t.textMuted}`}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual add button */}
        {!showAddForm && (
          <button
            onClick={() => { setShowAddForm(true); setSelectedElementId(null); }}
            className={`w-full py-3 rounded-xl text-[15px] font-medium flex items-center justify-center gap-2 mb-6 ${t.btnAdd}`}
          >
            <Plus size={16} />
            Ajouter une retenue manuellement
          </button>
        )}

        {/* Summary bar */}
        <div className="mb-6 space-y-3">
          <div className={`p-4 ${t.deductionCard}`}>
            <div className="flex justify-between items-center">
              <span className={`text-[14px] ${t.textSecondary}`}>Depot de garantie</span>
              <span className={`text-[18px] font-bold ${t.textPrimary}`}>{formatCents(depositAmountCents)}</span>
            </div>
          </div>
          {deductions.length > 0 && (
            <>
              <div className={`p-4 ${t.deductionTotal}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[14px] text-gray-300">Total retenues</span>
                  <span className="text-[18px] font-bold">- {formatCents(totalDeductionsCents)}</span>
                </div>
              </div>
              <div className={`p-4 ${t.deductionRefund}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[14px]">A restituer au locataire</span>
                  <span className="text-[18px] font-bold">{formatCents(refundAmountCents)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Legal notice */}
        <div className={`flex gap-3 p-4 rounded-xl mb-4 ${t.legalBannerBg}`}>
          <AlertTriangle size={18} color={t.blue} className="shrink-0 mt-0.5" />
          <div className={`text-[12px] leading-relaxed ${t.textSecondary}`}>
            Le depot de garantie doit etre restitue dans un delai d&apos;un mois (sans retenue) ou deux mois (avec retenues) apres la remise des cles (art. 22 loi du 6 juillet 1989). La vetuste est appliquee automatiquement selon la grille en vigueur.
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      {deductions.length > 0 && !resolution && (
        <InspectionBtn
          onClick={handleSendProposal}
          loading={isSendingProposal}
        >
          <span className="flex items-center gap-2">
            <Send size={18} />
            Envoyer la proposition au locataire
          </span>
        </InspectionBtn>
      )}
    </div>
  );
}
