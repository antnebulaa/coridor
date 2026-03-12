'use client';

import BottomSheet from '@/components/ui/BottomSheet';
import StatusPill from './StatusPill';
import { TenantLineData } from './TenantLine';

interface RentDetailSheetProps {
  tenant: TenantLineData | null;
  onClose: () => void;
  onAction: (action: string, rentTrackingId: string, conversationId?: string | null) => void;
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function RentDetailSheet({ tenant, onClose, onAction }: RentDetailSheetProps) {
  if (!tenant) return null;

  return (
    <BottomSheet isOpen={!!tenant} onClose={onClose} title={`Détail loyer — ${tenant.name}`}>
      <div className="px-5 pb-8 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {tenant.name}
            </p>
            <p className="text-sm text-neutral-400 mt-0.5">
              {tenant.propertyName || ''}
              {tenant.propertyAddress ? ` · ${tenant.propertyAddress}` : ''}
            </p>
          </div>
          <StatusPill status={tenant.status} daysLate={tenant.daysLate} />
        </div>

        {/* Amount cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3.5">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Attendu</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tabular-nums mt-0.5">
              {formatAmount(tenant.expected)} €
            </p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3.5">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Reçu</p>
            <p
              className={`text-lg font-bold tabular-nums mt-0.5 ${
                tenant.received > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-neutral-300 dark:text-neutral-600'
              }`}
            >
              {tenant.received > 0 ? `${formatAmount(tenant.received)} €` : '—'}
            </p>
          </div>
        </div>

        {/* Context cards */}
        {tenant.status === 'PARTIAL' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              Reste dû : {formatAmount(tenant.remaining)} €
            </p>
          </div>
        )}

        {tenant.status === 'OVERDUE' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              {tenant.daysLate
                ? `${tenant.daysLate} jours de retard`
                : 'En retard'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {(tenant.status === 'OVERDUE' || tenant.status === 'PARTIAL') && (
            <>
              <button
                onClick={() => onAction('send-reminder', tenant.rentTrackingId, tenant.conversationId)}
                className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold py-3 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Envoyer un rappel
              </button>
              <button
                onClick={() => onAction('mark-paid', tenant.rentTrackingId)}
                className="w-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold py-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
              >
                Marquer comme payé
              </button>
              {tenant.conversationId && (
                <button
                  onClick={() => onAction('view-conversation', tenant.rentTrackingId, tenant.conversationId)}
                  className="w-full text-neutral-400 text-sm font-medium py-2 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  Voir la conversation
                </button>
              )}
            </>
          )}
          {tenant.status === 'PAID' && (
            <>
              <button
                onClick={() => onAction('generate-receipt', tenant.rentTrackingId)}
                className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold py-3 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Générer la quittance
              </button>
              {tenant.conversationId && (
                <button
                  onClick={() => onAction('view-conversation', tenant.rentTrackingId, tenant.conversationId)}
                  className="w-full text-neutral-400 text-sm font-medium py-2 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  Voir la conversation
                </button>
              )}
            </>
          )}
          {tenant.status === 'PENDING' && (
            <>
              <button
                onClick={() => onAction('mark-paid', tenant.rentTrackingId)}
                className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold py-3 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Marquer comme payé
              </button>
              <button
                onClick={() => onAction('send-notice', tenant.rentTrackingId, tenant.conversationId)}
                className="w-full text-neutral-400 text-sm font-medium py-2 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              >
                Envoyer un avis d&apos;échéance
              </button>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
