'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RentTrackingSummary {
  currentMonthLate: number;
  totalTracked: number;
  totalPaid: number;
  recoveryRate: number;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const RentCollectionWidget = () => {
  const [summary, setSummary] = useState<RentTrackingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await axios.get('/api/rent-tracking/summary');
        setSummary(res.data);
      } catch (err) {
        console.error('Failed to fetch rent tracking summary:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white p-5 rounded-xl border border-neutral-200 animate-pulse">
        <div className="h-6 w-36 bg-neutral-100 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-neutral-100 rounded" />
          <div className="h-4 w-2/3 bg-neutral-100 rounded" />
        </div>
      </div>
    );
  }

  // Error / no data state
  if (error || !summary) {
    return (
      <div className="bg-white p-5 rounded-xl border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-neutral-800 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Paiements
          </h3>
          <Link
            href="/dashboard/finances"
            className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition"
          >
            Voir
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="flex items-center gap-2 text-neutral-400 py-2">
          <span className="text-sm">Aucune donnee disponible</span>
        </div>
      </div>
    );
  }

  const hasLatePayments = summary.currentMonthLate > 0;
  const allUpToDate = summary.currentMonthLate === 0;

  return (
    <div
      className={`bg-white p-5 rounded-xl border ${
        hasLatePayments ? 'border-red-300' : 'border-neutral-200'
      } transition`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-neutral-800 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Paiements
        </h3>
        <Link
          href="/dashboard/finances"
          className="text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition"
        >
          Voir le detail
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Content */}
      {allUpToDate ? (
        <>
          <div className="flex items-center gap-2 text-green-600 py-2">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Tous les loyers sont a jour</span>
          </div>
          {summary.totalTracked > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
              <TrendingUp size={14} />
              Taux de recouvrement : {summary.recoveryRate}%
            </div>
          )}
        </>
      ) : (
        <>
          {/* Late payments alert */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm text-neutral-800">
                {summary.currentMonthLate} loyer{summary.currentMonthLate > 1 ? 's' : ''} en
                retard ce mois
              </span>
            </div>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {summary.currentMonthLate}
            </span>
          </div>

          {/* Recovery rate */}
          {summary.totalTracked > 0 && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <TrendingUp size={14} />
              <span>Taux de recouvrement : {summary.recoveryRate}%</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RentCollectionWidget;
