'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useSecurityDeposit } from '@/hooks/useSecurityDeposit';
import { useSession } from 'next-auth/react';
import DepositTimeline from '@/components/deposit/DepositTimeline';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CircleCheck,
  Clock,
  CreditCard,
  FileWarning,
  Scale,
  Download,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  AWAITING_PAYMENT: { label: 'En attente du versement', color: '#f59e0b', bgColor: '#fef3c7' },
  PAID: { label: 'Versé', color: '#16a34a', bgColor: '#dcfce7' },
  HELD: { label: 'Détenu', color: '#3b82f6', bgColor: '#dbeafe' },
  EXIT_INSPECTION: { label: 'EDL de sortie', color: '#f97316', bgColor: '#ffedd5' },
  RETENTIONS_PROPOSED: { label: 'Retenues proposées', color: '#f97316', bgColor: '#ffedd5' },
  PARTIALLY_RELEASED: { label: 'Restitution partielle', color: '#f59e0b', bgColor: '#fef3c7' },
  FULLY_RELEASED: { label: 'Restitué', color: '#16a34a', bgColor: '#dcfce7' },
  DISPUTED: { label: 'Contesté', color: '#ef4444', bgColor: '#fee2e2' },
  RESOLVED: { label: 'Clos', color: '#16a34a', bgColor: '#dcfce7' },
};

export default function DepositPage() {
  const params = useParams();
  const applicationId = params.applicationId as string;
  const router = useRouter();
  const session = useSession();
  const currentUserId = (session.data?.user as { id?: string })?.id;

  const {
    deposit,
    timeline,
    isLoading,
    isOverdue,
    daysUntilDeadline,
    daysOverdue,
    penaltyAmount,
    currentStep,
    progress,
    confirmPayment,
    confirmRefund,
  } = useSecurityDeposit(applicationId);

  const [isConfirming, setIsConfirming] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!deposit) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <Shield size={48} className="text-gray-300 mx-auto mb-3" />
          <div className="text-[16px] font-semibold text-gray-900">Aucun dépôt trouvé</div>
          <div className="text-[13px] text-gray-500 mt-1">
            Le dépôt de garantie sera créé automatiquement à la signature du bail.
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[deposit.status] || STATUS_CONFIG.AWAITING_PAYMENT;
  const isLandlord = currentUserId === deposit.application?.listing?.rentalUnit?.property?.ownerId;
  const isTenant = currentUserId === deposit.application?.candidateScope?.creatorUserId;
  const amount = (deposit.amountCents / 100).toFixed(2);

  // Check if deductions exceed deposit
  const totalDeductions = deposit.depositResolution?.totalDeductionsCents ?? 0;
  const surplusCents = Math.max(0, totalDeductions - deposit.amountCents);
  const hasExcess = surplusCents > 0;

  const handleConfirmPayment = async () => {
    setIsConfirming(true);
    try {
      await confirmPayment();
      toast.success('Versement confirmé');
    } catch {
      toast.error('Erreur lors de la confirmation');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConfirmRefund = async () => {
    setIsConfirming(true);
    try {
      await confirmRefund();
      toast.success('Restitution confirmée');
    } catch {
      toast.error('Erreur lors de la confirmation');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[14px] text-gray-500 mb-3"
          >
            <ArrowLeft size={16} />
            Retour
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="text-[22px] font-bold text-gray-900">
                Dépôt de garantie
              </div>
              <div className="text-[28px] font-bold text-gray-900 mt-0.5">
                {amount}€
              </div>
              {deposit.application?.listing?.rentalUnit?.property?.title && (
                <div className="text-[13px] text-gray-500 mt-1">
                  {deposit.application.listing.rentalUnit.property.title}
                  {deposit.application.listing.rentalUnit.property.city
                    ? ` — ${deposit.application.listing.rentalUnit.property.city}`
                    : ''}
                </div>
              )}
            </div>
            <span
              className="text-[12px] font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-gray-500">{currentStep}</span>
              <span className="text-[12px] text-gray-400">{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: isOverdue ? '#ef4444' : '#E8A838',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-4">
        {/* Overdue alert */}
        {isOverdue && (
          <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-[14px] font-semibold text-red-800">
                Délai légal dépassé — {daysOverdue} jour{daysOverdue > 1 ? 's' : ''}
              </div>
              <div className="text-[13px] text-red-600 mt-1">
                Pénalité en cours : <strong>{penaltyAmount.toFixed(2)}€</strong> (10% du loyer × {deposit.overdueMonths} mois)
              </div>
              {isTenant && !deposit.formalNoticeSentAt && (
                <div className="text-[12px] text-red-500 mt-2">
                  Vous pouvez générer une mise en demeure depuis cette page.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deadline info */}
        {!isOverdue && daysUntilDeadline != null && daysUntilDeadline > 0 && (
          <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[13px] text-amber-800">
              Délai légal de restitution : <strong>{daysUntilDeadline} jour{daysUntilDeadline > 1 ? 's' : ''}</strong> restants
              ({deposit.legalDeadlineMonths === 1 ? '1 mois (EDL conforme)' : '2 mois (EDL avec anomalies)'})
            </div>
          </div>
        )}

        {/* Excess deductions warning */}
        {hasExcess && (
          <div className="flex gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
            <AlertTriangle size={18} className="text-orange-500 shrink-0 mt-0.5" />
            <div className="text-[13px] text-orange-800">
              Les retenues ({(totalDeductions / 100).toFixed(2)}€) dépassent le montant du dépôt ({amount}€).
              Le surplus de <strong>{(surplusCents / 100).toFixed(2)}€</strong> devra être réclamé directement au locataire.
            </div>
          </div>
        )}

        {/* Action blocks */}
        {deposit.status === 'AWAITING_PAYMENT' && isLandlord && (
          <button
            onClick={handleConfirmPayment}
            disabled={isConfirming}
            className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#E8A838' }}
          >
            {isConfirming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CreditCard size={18} />
            )}
            Confirmer le versement du locataire
          </button>
        )}

        {deposit.status === 'RETENTIONS_PROPOSED' && isTenant && (
          <a
            href={`/inspection/${deposit.depositResolution?.inspectionId}/deposit-response`}
            className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Info size={18} />
            Consulter et répondre aux retenues
          </a>
        )}

        {['EXIT_INSPECTION', 'RETENTIONS_PROPOSED', 'PARTIALLY_RELEASED'].includes(deposit.status) &&
          isLandlord && (
            <button
              onClick={handleConfirmRefund}
              disabled={isConfirming}
              className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#16a34a' }}
            >
              {isConfirming ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CircleCheck size={18} />
              )}
              Confirmer la restitution intégrale
            </button>
          )}

        {/* Retentions summary */}
        {deposit.depositResolution && (
          <div className="rounded-xl bg-white border border-gray-200 p-4">
            <div className="text-[14px] font-semibold text-gray-900 mb-3">
              Retenues sur dépôt
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Montant du dépôt</span>
                <span className="font-medium text-gray-900">{amount}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Retenues</span>
                <span className="font-medium text-orange-600">
                  -{(deposit.depositResolution.totalDeductionsCents / 100).toFixed(2)}€
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="text-gray-700 font-semibold">À restituer</span>
                <span className="font-bold text-emerald-600">
                  {(Math.max(0, deposit.depositResolution.refundAmountCents) / 100).toFixed(2)}€
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full p-4 flex items-center justify-between"
          >
            <span className="text-[14px] font-semibold text-gray-900">
              Chronologie ({timeline.length})
            </span>
            {showTimeline ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>
          {showTimeline && (
            <div className="px-4 pb-4">
              <DepositTimeline events={timeline} />
            </div>
          )}
        </div>

        {/* CDC dossier block */}
        {deposit.status === 'DISPUTED' && isTenant && (
          <div className="rounded-xl bg-white border border-blue-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Scale size={18} className="text-blue-600" />
              <div className="text-[14px] font-semibold text-gray-900">
                Saisir la Commission de Conciliation
              </div>
            </div>
            <div className="text-[13px] text-gray-600">
              Coridor génère votre dossier complet pour saisir la CDC (gratuit).
              Il contient toutes les pièces nécessaires :
            </div>
            <div className="text-[12px] text-gray-500 space-y-1">
              {[
                'Lettre de saisine type',
                'Chronologie complète des faits',
                'Détail des retenues et calculs',
                'Historique des échanges',
                'Cadre juridique (art. 22 loi 89-462)',
                'Références EDL entrée / sortie',
                'Copie bail',
                'Mise en demeure (si envoyée)',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CircleCheck size={12} className="text-blue-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            {!deposit.cdcDossierUrl ? (
              <button
                onClick={() => {
                  toast.loading('Génération du dossier CDC...');
                  fetch(`/api/deposit/${applicationId}/cdc-dossier`, { method: 'POST' })
                    .then((r) => r.json())
                    .then((d) => {
                      toast.dismiss();
                      if (d.url) {
                        toast.success('Dossier CDC généré');
                        window.open(d.url, '_blank');
                      } else {
                        toast.error(d.error || 'Erreur');
                      }
                    })
                    .catch(() => { toast.dismiss(); toast.error('Erreur'); });
                }}
                className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 bg-blue-600 text-white"
              >
                <Scale size={16} />
                Générer mon dossier CDC
              </button>
            ) : (
              <a
                href={deposit.cdcDossierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 bg-blue-50 text-blue-600 border border-blue-200"
              >
                <Download size={16} />
                Télécharger le dossier CDC
              </a>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">

          {isOverdue && isTenant && !deposit.formalNoticeUrl && (
            <button
              onClick={() => {
                toast.loading('Génération de la mise en demeure...');
                fetch(`/api/deposit/${applicationId}/formal-notice`, { method: 'POST' })
                  .then((r) => r.json())
                  .then((d) => {
                    toast.dismiss();
                    if (d.url) {
                      toast.success('Mise en demeure générée');
                      window.open(d.url, '_blank');
                    } else {
                      toast.error(d.error || 'Erreur');
                    }
                  })
                  .catch(() => { toast.dismiss(); toast.error('Erreur'); });
              }}
              className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 bg-orange-50 text-orange-600 border border-orange-200"
            >
              <FileWarning size={16} />
              Générer une mise en demeure
            </button>
          )}

          {deposit.formalNoticeUrl && (
            <a
              href={deposit.formalNoticeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 bg-gray-50 text-gray-700 border border-gray-200"
            >
              <Download size={16} />
              Télécharger la mise en demeure
            </a>
          )}

          {deposit.timelineExportUrl && (
            <a
              href={deposit.timelineExportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 bg-gray-50 text-gray-700 border border-gray-200"
            >
              <Download size={16} />
              Timeline exportée (PDF)
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
