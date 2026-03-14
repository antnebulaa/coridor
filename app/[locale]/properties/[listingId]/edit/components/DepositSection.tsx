'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SafeListing } from '@/types';
import Heading from '@/components/Heading';
import { Shield, ArrowRight, Loader2, AlertTriangle, Clock, CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DepositData {
  applicationId: string;
  amountCents: number;
  status: string;
  isOverdue: boolean;
  overdueMonths: number;
  penaltyAmountCents: number;
  legalDeadline: string | null;
  events: { createdAt: string; type: string; description: string }[];
}

interface DepositSectionProps {
  listing: SafeListing;
}

const DepositSection: React.FC<DepositSectionProps> = ({ listing }) => {
  const t = useTranslations('properties.edit.deposit');
  const [deposits, setDeposits] = useState<DepositData[]>([]);
  const [loading, setLoading] = useState(true);

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    AWAITING_PAYMENT: { label: t('status.awaitingPayment'), color: 'text-amber-700', bg: 'bg-amber-50' },
    PAID: { label: t('status.paid'), color: 'text-green-700', bg: 'bg-green-50' },
    HELD: { label: t('status.held'), color: 'text-blue-700', bg: 'bg-blue-50' },
    EXIT_INSPECTION: { label: t('status.exitInspection'), color: 'text-orange-700', bg: 'bg-orange-50' },
    RETENTIONS_PROPOSED: { label: t('status.retentionsProposed'), color: 'text-orange-700', bg: 'bg-orange-50' },
    PARTIALLY_RELEASED: { label: t('status.partiallyReleased'), color: 'text-amber-700', bg: 'bg-amber-50' },
    FULLY_RELEASED: { label: t('status.fullyReleased'), color: 'text-green-700', bg: 'bg-green-50' },
    DISPUTED: { label: t('status.disputed'), color: 'text-red-700', bg: 'bg-red-50' },
    RESOLVED: { label: t('status.resolved'), color: 'text-green-700', bg: 'bg-green-50' },
  };

  useEffect(() => {
    // Find active applications for this listing to fetch their deposits
    fetch(`/api/listings/${listing.id}/deposits`)
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        if (Array.isArray(data)) setDeposits(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listing.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div>
        <Heading title={t('title')} subtitle={t('subtitle')} />
        <div className="mt-6 text-center py-8">
          <Shield size={40} className="text-gray-300 mx-auto mb-3" />
          <div className="text-[14px] text-gray-500">
            {t('empty')}
          </div>
          <div className="text-[12px] text-gray-400 mt-1">
            {t('emptyDescription')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Heading title={t('title')} subtitle={t('subtitle')} />

      <div className="mt-6 space-y-4">
        {deposits.map((deposit) => {
          const statusCfg = STATUS_CONFIG[deposit.status] || STATUS_CONFIG.AWAITING_PAYMENT;
          const lastEvents = deposit.events.slice(-3);

          return (
            <div
              key={deposit.applicationId}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-[#E8A838]" />
                  <div>
                    <div className="text-[15px] font-semibold text-gray-900">
                      {(deposit.amountCents / 100).toFixed(0)}€
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}
                >
                  {statusCfg.label}
                </span>
              </div>

              {/* Overdue alert */}
              {deposit.isOverdue && (
                <div className="mx-4 mb-3 flex gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="text-[12px] text-red-700">
                    {t('overdue', { months: deposit.overdueMonths, penalty: (deposit.penaltyAmountCents / 100).toFixed(0) })}
                  </div>
                </div>
              )}

              {/* Deadline */}
              {!deposit.isOverdue && deposit.legalDeadline && (
                (() => {
                  const daysLeft = Math.ceil(
                    (new Date(deposit.legalDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  if (daysLeft > 0 && daysLeft <= 30) {
                    return (
                      <div className="mx-4 mb-3 flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <Clock size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-[12px] text-amber-700">
                          {t('daysToReturn', { days: daysLeft })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Mini-timeline: 3 derniers événements */}
              {lastEvents.length > 0 && (
                <div className="px-4 pb-3 space-y-1.5">
                  {lastEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CircleCheck size={12} className="text-gray-300 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-gray-600 truncate">
                          {event.description}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(event.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Link to full page */}
              <Link
                href={`/deposit/${deposit.applicationId}`}
                className="flex items-center justify-between px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition"
              >
                <span className="text-[13px] font-medium text-blue-600">
                  {t('viewFullTracking')}
                </span>
                <ArrowRight size={14} className="text-blue-400" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DepositSection;
