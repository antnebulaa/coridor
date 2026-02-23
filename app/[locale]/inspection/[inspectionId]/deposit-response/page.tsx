'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import type { DepositDeduction, DepositResolution } from '@prisma/client';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Info,
  ThumbsUp,
  ThumbsDown,
  Scale,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type DeductionWithElement = DepositDeduction & {
  element?: {
    id: string;
    name: string;
    category: string;
    nature: string[];
  } | null;
};

export default function DepositResponsePage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;

  const [deductions, setDeductions] = useState<DeductionWithElement[]>([]);
  const [resolution, setResolution] = useState<DepositResolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Response state
  const [action, setAction] = useState<'agree' | 'partial_agree' | 'dispute' | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [partialAmount, setPartialAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [deductionsRes, resolutionRes] = await Promise.all([
        fetch(`/api/inspection/${inspectionId}/deductions`),
        fetch(`/api/inspection/${inspectionId}/deposit-resolution`),
      ]);

      if (!deductionsRes.ok || !resolutionRes.ok) {
        throw new Error('Failed to load data');
      }

      const deductionsData = await deductionsRes.json();
      const resolutionData = await resolutionRes.json();

      setDeductions(deductionsData);
      setResolution(resolutionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCents = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' \u20ac';

  const handleSubmit = async () => {
    if (!action) return;

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = { action };

      if (action === 'dispute' && disputeReason.trim()) {
        body.disputeReason = disputeReason.trim();
      }

      if (action === 'partial_agree') {
        const amount = Math.round(parseFloat(partialAmount.replace(',', '.')) * 100);
        if (isNaN(amount) || amount <= 0) {
          toast.error('Indiquez le montant que vous acceptez');
          setIsSubmitting(false);
          return;
        }
        body.partialAgreedAmount = amount;
      }

      const res = await fetch(`/api/inspection/${inspectionId}/deposit-resolution`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur');
      }

      const updated = await res.json();
      setResolution(updated);
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !resolution) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle size={48} color={t.orange} className="mx-auto mb-4" />
          <div className={`text-[16px] font-semibold ${t.textPrimary}`}>
            Lien invalide ou expir&eacute;
          </div>
          <div className={`text-[13px] mt-2 ${t.textSecondary}`}>
            Demandez au propri&eacute;taire de vous renvoyer le lien.
          </div>
        </div>
      </div>
    );
  }

  // Already responded
  if (submitted || resolution.status !== 'PROPOSED') {
    const statusConfig = {
      AGREED: { icon: CheckCircle2, color: t.green, title: 'Retenues accept\u00e9es', msg: 'Le d\u00e9p\u00f4t sera restitu\u00e9 selon les retenues convenues.' },
      PARTIAL_AGREED: { icon: Scale, color: t.blue, title: 'Accord partiel', msg: `Vous avez accept\u00e9 ${formatCents(resolution.partialAgreedAmount || 0)} de retenues. Le propri\u00e9taire a 14 jours pour contester le reste.` },
      DISPUTED: { icon: AlertTriangle, color: t.red, title: 'Retenues contest\u00e9es', msg: 'Votre contestation a \u00e9t\u00e9 transmise. Vous pouvez saisir la commission de conciliation.' },
      RESOLVED: { icon: CheckCircle2, color: t.green, title: 'D\u00e9p\u00f4t restitu\u00e9', msg: 'Le d\u00e9p\u00f4t de garantie a \u00e9t\u00e9 restitu\u00e9.' },
      PROPOSED: { icon: Loader2, color: t.blue, title: 'En attente', msg: '' },
      PENDING: { icon: Loader2, color: t.blue, title: 'En attente', msg: '' },
    };

    const cfg = statusConfig[resolution.status] || statusConfig.PROPOSED;
    const StatusIcon = cfg.icon;

    return (
      <div className="h-full flex flex-col">
        <div className={`shrink-0 px-5 py-4 flex items-center justify-between border-b ${t.border}`}>
          <div className={`text-[20px] font-bold ${t.textPrimary}`}>D\u00e9p\u00f4t de garantie</div>
          <button onClick={handleClose} className={`p-2 rounded-full ${t.textMuted}`}>
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md mx-auto">
            <StatusIcon size={64} color={cfg.color} className="mx-auto mb-4" />
            <div className={`text-[24px] font-bold ${t.textPrimary}`}>{cfg.title}</div>
            <div className={`text-[15px] mt-3 ${t.textSecondary}`}>{cfg.msg}</div>
          </div>
        </div>
      </div>
    );
  }

  // Main response view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`shrink-0 px-5 py-4 flex items-start justify-between border-b ${t.border}`}>
        <div className="pt-2">
          <div className={`text-[20px] font-bold ${t.textPrimary}`}>
            Retenues sur d\u00e9p\u00f4t
          </div>
          <div className={`text-[13px] mt-0.5 ${t.textSecondary}`}>
            V\u00e9rifiez et r\u00e9pondez
          </div>
        </div>
        <button onClick={handleClose} className={`mt-2 p-2 rounded-full active:scale-95 ${t.textMuted}`}>
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-5">
          {/* Summary cards */}
          <div className="space-y-3 mb-6">
            <div className={`p-4 ${t.deductionCard}`}>
              <div className="flex justify-between items-center">
                <span className={`text-[14px] ${t.textSecondary}`}>D\u00e9p\u00f4t de garantie</span>
                <span className={`text-[18px] font-bold ${t.textPrimary}`}>
                  {formatCents(resolution.depositAmountCents)}
                </span>
              </div>
            </div>
            <div className={`p-4 ${t.deductionTotal}`}>
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-gray-300">Total retenues</span>
                <span className="text-[18px] font-bold">- {formatCents(resolution.totalDeductionsCents)}</span>
              </div>
            </div>
            <div className={`p-4 ${t.deductionRefund}`}>
              <div className="flex justify-between items-center">
                <span className="text-[14px]">\u00c0 vous restituer</span>
                <span className="text-[18px] font-bold">{formatCents(resolution.refundAmountCents)}</span>
              </div>
            </div>
          </div>

          {/* Deductions detail */}
          <div className="mb-6">
            <div className={`text-[17px] font-bold mb-3 ${t.textPrimary}`}>
              D\u00e9tail des retenues ({deductions.length})
            </div>
            <div className="space-y-3">
              {deductions.map(d => (
                <div key={d.id} className={`p-4 ${t.deductionCard}`}>
                  {/* Photos side by side */}
                  {(d.entryPhotoUrl || d.photoUrl) && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {d.entryPhotoUrl ? (
                        <div>
                          <div className={`mb-1 ${t.exitEntryLabel}`}>Entr\u00e9e</div>
                          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={d.entryPhotoUrl}
                              alt="Photo entr\u00e9e"
                              width={200}
                              height={150}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className={`mb-1 ${t.exitEntryLabel}`}>Entr\u00e9e</div>
                          <div className={`aspect-[4/3] rounded-lg flex items-center justify-center ${t.exitNoPhoto}`}>
                            <span className="text-[12px]">Pas de photo</span>
                          </div>
                        </div>
                      )}
                      {d.photoUrl ? (
                        <div>
                          <div className={`mb-1 ${t.exitExitLabel}`}>Sortie</div>
                          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={d.photoUrl}
                              alt="Photo sortie"
                              width={200}
                              height={150}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className={`mb-1 ${t.exitExitLabel}`}>Sortie</div>
                          <div className={`aspect-[4/3] rounded-lg flex items-center justify-center ${t.exitNoPhoto}`}>
                            <span className="text-[12px]">Pas de photo</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[15px] font-medium ${t.textPrimary}`}>{d.description}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className={`text-[13px] ${t.textSecondary}`}>
                      Co\u00fbt : {formatCents(d.repairCostCents)} | V\u00e9tust\u00e9 : {Math.round(d.vetustePct * 100)}%
                    </div>
                    <div className={`text-[15px] font-bold ${t.textPrimary}`}>
                      {formatCents(d.tenantShareCents)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal info */}
          <div className={`flex gap-3 p-4 rounded-xl mb-6 ${t.legalBannerBg}`}>
            <Info size={18} color={t.blue} className="shrink-0 mt-0.5" />
            <div className={`text-[12px] leading-relaxed ${t.textSecondary}`}>
              Le d\u00e9p\u00f4t doit \u00eatre restitu\u00e9 sous 2 mois avec retenues (art. 22 loi du 6 juillet 1989). La v\u00e9tust\u00e9 r\u00e9duit la part \u00e0 votre charge. En cas de d\u00e9saccord, saisissez la commission d\u00e9partementale de conciliation (CDC).
            </div>
          </div>

          {/* Response section */}
          <div className="mb-8">
            <div className={`text-[17px] font-bold mb-4 ${t.textPrimary}`}>
              Votre r\u00e9ponse
            </div>

            {/* Three option buttons */}
            <div className="space-y-3 mb-4">
              <button
                onClick={() => setAction('agree')}
                className={`w-full p-4 rounded-xl text-left flex items-center gap-3 border-2 transition-colors ${
                  action === 'agree' ? 'border-emerald-500 bg-emerald-50' : `border-gray-200 ${t.bgCard}`
                }`}
              >
                <ThumbsUp size={20} color={action === 'agree' ? t.green : undefined} className={action === 'agree' ? '' : t.textMuted} />
                <div>
                  <div className={`text-[15px] font-medium ${t.textPrimary}`}>J&apos;accepte</div>
                  <div className={`text-[13px] ${t.textSecondary}`}>Les retenues sont justifi\u00e9es</div>
                </div>
              </button>

              <button
                onClick={() => setAction('partial_agree')}
                className={`w-full p-4 rounded-xl text-left flex items-center gap-3 border-2 transition-colors ${
                  action === 'partial_agree' ? 'border-blue-500 bg-blue-50' : `border-gray-200 ${t.bgCard}`
                }`}
              >
                <Scale size={20} color={action === 'partial_agree' ? t.blue : undefined} className={action === 'partial_agree' ? '' : t.textMuted} />
                <div>
                  <div className={`text-[15px] font-medium ${t.textPrimary}`}>Accord partiel</div>
                  <div className={`text-[13px] ${t.textSecondary}`}>J&apos;accepte une partie des retenues</div>
                </div>
              </button>

              <button
                onClick={() => setAction('dispute')}
                className={`w-full p-4 rounded-xl text-left flex items-center gap-3 border-2 transition-colors ${
                  action === 'dispute' ? 'border-red-500 bg-red-50' : `border-gray-200 ${t.bgCard}`
                }`}
              >
                <ThumbsDown size={20} color={action === 'dispute' ? t.red : undefined} className={action === 'dispute' ? '' : t.textMuted} />
                <div>
                  <div className={`text-[15px] font-medium ${t.textPrimary}`}>Je conteste</div>
                  <div className={`text-[13px] ${t.textSecondary}`}>Les retenues ne sont pas justifi\u00e9es</div>
                </div>
              </button>
            </div>

            {/* Partial agree: amount input */}
            {action === 'partial_agree' && (
              <div className={`p-4 rounded-xl border ${t.border} ${t.bgCard} mb-4`}>
                <label className={`text-[13px] font-medium ${t.textSecondary}`}>
                  Montant des retenues que vous acceptez (\u20ac)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={partialAmount}
                  onChange={e => setPartialAmount(e.target.value)}
                  placeholder={`Max : ${(resolution.totalDeductionsCents / 100).toFixed(2)}`}
                  className={`w-full mt-2 px-3 py-3 rounded-lg text-[16px] border ${t.border} ${t.textPrimary} bg-transparent`}
                />
              </div>
            )}

            {/* Dispute: reason input */}
            {action === 'dispute' && (
              <div className={`p-4 rounded-xl border ${t.border} ${t.bgCard} mb-4`}>
                <label className={`text-[13px] font-medium ${t.textSecondary}`}>
                  Motif de contestation (optionnel)
                </label>
                <textarea
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Expliquez pourquoi vous contestez les retenues..."
                  rows={3}
                  maxLength={1000}
                  className={`w-full mt-2 px-3 py-3 rounded-lg text-[15px] border ${t.border} ${t.textPrimary} bg-transparent resize-none`}
                />
              </div>
            )}

            {/* Submit button */}
            {action && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl text-[18px] font-bold flex items-center justify-center gap-2 ${t.btnPrimary}`}
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    {action === 'agree' && 'Confirmer l\u2019accord'}
                    {action === 'partial_agree' && 'Confirmer l\u2019accord partiel'}
                    {action === 'dispute' && 'Envoyer la contestation'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
