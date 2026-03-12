'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import { RentTrackingResult } from '@/app/actions/getRentTracking';
import MonthNav from '@/components/rent-tracking/MonthNav';
import ViewToggle from '@/components/rent-tracking/ViewToggle';
import RentSummaryCard from '@/components/rent-tracking/RentSummaryCard';
import PropertyGroup from '@/components/rent-tracking/PropertyGroup';
import FlatListView from '@/components/rent-tracking/FlatListView';
import RentDetailSheet from '@/components/rent-tracking/RentDetailSheet';
import PowensUpsellCard from '@/components/rent-tracking/PowensUpsellCard';
import { TenantLineData } from '@/components/rent-tracking/TenantLine';
import toast from 'react-hot-toast';

interface RentTrackingClientProps {
  initialData: RentTrackingResult | null;
  initialMonth: number;
  initialYear: number;
}

export default function RentTrackingClient({
  initialData,
  initialMonth,
  initialYear,
}: RentTrackingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [view, setView] = useState<'grouped' | 'list'>('grouped');
  const [selectedTenant, setSelectedTenant] = useState<TenantLineData | null>(null);
  const [fadeKey, setFadeKey] = useState(0);

  // Sync state if search params change externally
  useEffect(() => {
    const m = searchParams.get('month');
    const y = searchParams.get('year');
    if (m && parseInt(m) !== month) setMonth(parseInt(m));
    if (y && parseInt(y) !== year) setYear(parseInt(y));
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMonthChange = useCallback(
    (newMonth: number, newYear: number) => {
      setMonth(newMonth);
      setYear(newYear);
      setFadeKey((k) => k + 1);
      startTransition(() => {
        router.push(`/finances/suivi-loyers?month=${newMonth}&year=${newYear}`);
      });
    },
    [router],
  );

  const handleTenantTap = useCallback((tenant: TenantLineData) => {
    setSelectedTenant(tenant);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedTenant(null);
  }, []);

  const handleAction = useCallback(
    async (action: string, rentTrackingId: string, conversationId?: string | null) => {
      switch (action) {
        case 'mark-paid': {
          try {
            const res = await fetch(`/api/rent-tracking/${rentTrackingId}/confirm`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ confirmedManually: true }),
            });
            if (!res.ok) throw new Error();
            toast.success('Loyer marqué comme payé');
            setSelectedTenant(null);
            startTransition(() => {
              router.push(`/finances/suivi-loyers?month=${month}&year=${year}`);
            });
          } catch {
            toast.error('Erreur lors de la mise à jour');
          }
          break;
        }
        case 'send-reminder': {
          try {
            const res = await fetch(`/api/rent-tracking/${rentTrackingId}/send-reminder`, {
              method: 'POST',
            });
            if (!res.ok) throw new Error();
            toast.success('Rappel envoyé');
            setSelectedTenant(null);
            if (conversationId) {
              router.push(`/inbox/${conversationId}`);
            }
          } catch {
            toast.error("Erreur lors de l'envoi du rappel");
          }
          break;
        }
        case 'send-notice': {
          if (conversationId) {
            router.push(`/inbox/${conversationId}`);
          } else {
            toast.error('Aucune conversation trouvée');
          }
          setSelectedTenant(null);
          break;
        }
        case 'generate-receipt': {
          toast.success('Génération de la quittance en cours...');
          setSelectedTenant(null);
          break;
        }
        case 'view-conversation': {
          if (conversationId) {
            router.push(`/inbox/${conversationId}`);
          }
          setSelectedTenant(null);
          break;
        }
      }
    },
    [router, month, year],
  );

  // Empty state — no leases at all
  if (!initialData || initialData.properties.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 md:pt-8">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/finances"
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors mb-3"
          >
            <ChevronLeft size={14} />
            Finances
          </Link>
          <h1 className="text-[22px] font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Suivi des loyers
          </h1>
        </div>

        <MonthNav month={month} year={year} onChange={handleMonthChange} />

        <div className="mt-8 text-center">
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            Aucun loyer suivi pour cette période.
          </p>
          <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-1">
            Les loyers apparaîtront ici une fois vos baux signés.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 md:pt-8">
      {/* ═══ HEADER ═══ */}
      <div
        className="transition-opacity duration-200"
        style={{ opacity: isPending ? 0.6 : 1 }}
      >
        <div className="mb-4">
          <Link
            href="/finances"
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors mb-3"
          >
            <ChevronLeft size={14} />
            Finances
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
              Suivi des loyers
            </h1>
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        <MonthNav month={month} year={year} onChange={handleMonthChange} />
      </div>

      {/* ═══ CONTENT WITH STAGGER FADE-IN ═══ */}
      <div key={fadeKey}>
        {/* Summary */}
        <div
          className="mt-5 animate-fadeInUp"
          style={{ animationDelay: '50ms', animationFillMode: 'both' }}
        >
          <RentSummaryCard summary={initialData.summary} animated />
        </div>

        {/* Properties / List */}
        <div
          className="mt-5 animate-fadeInUp"
          style={{ animationDelay: '150ms', animationFillMode: 'both' }}
        >
          {view === 'grouped' ? (
            <div className="space-y-3">
              {initialData.properties.map((property) => (
                <PropertyGroup
                  key={property.id}
                  property={property}
                  onTenantTap={handleTenantTap}
                />
              ))}
            </div>
          ) : (
            <FlatListView
              properties={initialData.properties}
              onTenantTap={handleTenantTap}
            />
          )}
        </div>

        {/* Powens Upsell */}
        <div
          className="mt-8 animate-fadeInUp"
          style={{ animationDelay: '250ms', animationFillMode: 'both' }}
        >
          <PowensUpsellCard show={!initialData.hasPowensConnection} />
        </div>
      </div>

      {/* ═══ BOTTOM SHEET ═══ */}
      <RentDetailSheet
        tenant={selectedTenant}
        onClose={handleCloseSheet}
        onAction={handleAction}
      />
    </div>
  );
}
