'use client';

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Shield, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DepositAlert {
  applicationId: string;
  propertyTitle: string;
  type: 'action_required' | 'overdue' | 'deadline_approaching' | 'info';
  message: string;
  urgency: 'high' | 'medium' | 'low';
}

export default function DepositAlertWidget() {
  const { data: alerts } = useSWR<DepositAlert[]>('/api/deposit/alerts', fetcher, {
    refreshInterval: 60_000,
  });

  if (!alerts || !Array.isArray(alerts) || alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Shield size={16} className="text-[#E8A838]" />
        <span className="text-[14px] font-semibold text-gray-900">Dépôts de garantie</span>
      </div>
      <div className="divide-y divide-gray-50">
        {alerts.slice(0, 3).map((alert, i) => (
          <Link
            key={i}
            href={`/deposit/${alert.applicationId}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
          >
            <div className="shrink-0">
              {alert.urgency === 'high' ? (
                <AlertTriangle size={16} className="text-red-500" />
              ) : alert.urgency === 'medium' ? (
                <Clock size={16} className="text-amber-500" />
              ) : (
                <Shield size={16} className="text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-gray-900 truncate">{alert.message}</div>
              <div className="text-[12px] text-gray-500 truncate">{alert.propertyTitle}</div>
            </div>
            <ArrowRight size={14} className="text-gray-300 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
