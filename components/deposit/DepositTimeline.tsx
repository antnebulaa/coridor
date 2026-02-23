'use client';

import React from 'react';
import type { DepositEvent } from '@prisma/client';
import {
  FileSignature,
  CreditCard,
  Shield,
  ClipboardCheck,
  FileText,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Clock,
  CircleCheck,
  Bell,
  Scale,
  FileWarning,
  Send,
  Download,
} from 'lucide-react';

const EVENT_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }
> = {
  LEASE_SIGNED: { icon: FileSignature, color: '#3b82f6' },
  PAYMENT_DETECTED: { icon: CreditCard, color: '#f59e0b' },
  PAYMENT_CONFIRMED: { icon: CreditCard, color: '#16a34a' },
  ENTRY_INSPECTION_DONE: { icon: ClipboardCheck, color: '#3b82f6' },
  EXIT_INSPECTION_STARTED: { icon: ClipboardCheck, color: '#f59e0b' },
  EXIT_INSPECTION_SIGNED: { icon: ClipboardCheck, color: '#16a34a' },
  RETENTIONS_PROPOSED: { icon: FileText, color: '#f97316' },
  TENANT_AGREED: { icon: ThumbsUp, color: '#16a34a' },
  TENANT_PARTIAL_AGREED: { icon: ThumbsUp, color: '#f59e0b' },
  TENANT_DISPUTED: { icon: ThumbsDown, color: '#ef4444' },
  PARTIAL_RELEASE: { icon: CreditCard, color: '#f59e0b' },
  FULL_RELEASE: { icon: CircleCheck, color: '#16a34a' },
  DEADLINE_WARNING: { icon: Bell, color: '#f59e0b' },
  DEADLINE_OVERDUE: { icon: AlertTriangle, color: '#ef4444' },
  PENALTY_UPDATED: { icon: AlertTriangle, color: '#ef4444' },
  FORMAL_NOTICE_GENERATED: { icon: FileWarning, color: '#f97316' },
  FORMAL_NOTICE_SENT: { icon: Send, color: '#f97316' },
  CDC_DOSSIER_GENERATED: { icon: Scale, color: '#3b82f6' },
  TIMELINE_EXPORTED: { icon: Download, color: '#6b7280' },
  RESOLVED: { icon: CircleCheck, color: '#16a34a' },
  SECOND_REMINDER: { icon: Bell, color: '#ef4444' },
  DEDUCTION_EXCEEDS_DEPOSIT: { icon: AlertTriangle, color: '#f97316' },
};

const DEFAULT_CONFIG = { icon: Clock, color: '#6b7280' };

interface DepositTimelineProps {
  events: DepositEvent[];
  maxItems?: number;
}

export default function DepositTimeline({ events, maxItems }: DepositTimelineProps) {
  const displayEvents = maxItems ? events.slice(-maxItems) : events;

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-6 text-[13px] text-gray-400">
        Aucun événement pour le moment
      </div>
    );
  }

  return (
    <div className="relative">
      {displayEvents.map((event, i) => {
        const config = EVENT_CONFIG[event.type] || DEFAULT_CONFIG;
        const Icon = config.icon;
        const isLast = i === displayEvents.length - 1;
        const date = new Date(event.createdAt);

        return (
          <div key={event.id} className="flex gap-3 relative">
            {/* Vertical line */}
            {!isLast && (
              <div
                className="absolute left-[15px] top-[30px] bottom-0 w-[2px]"
                style={{ backgroundColor: '#e5e7eb' }}
              />
            )}

            {/* Circle */}
            <div className="relative z-10 shrink-0">
              <div
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: isLast ? config.color : `${config.color}15`,
                  border: isLast ? 'none' : `2px solid ${config.color}40`,
                }}
              >
                <Icon
                  size={14}
                  className={isLast ? 'text-white' : ''}
                  style={isLast ? undefined : { color: config.color }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 pb-5 min-w-0">
              <div
                className={`text-[13px] leading-snug ${isLast ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
              >
                {event.description}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {date.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {' à '}
                {date.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
