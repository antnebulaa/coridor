'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Check,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  Wallet,
  Ban,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RentPaymentTracking {
  id: string;
  rentalApplicationId: string;
  periodMonth: number;
  periodYear: number;
  expectedAmountCents: number;
  expectedDate: string;
  detectedAmountCents: number | null;
  detectedDate: string | null;
  transactionId: string | null;
  isPartialPayment: boolean;
  status:
    | 'PENDING'
    | 'PAID'
    | 'LATE'
    | 'REMINDER_SENT'
    | 'OVERDUE'
    | 'CRITICAL'
    | 'MANUALLY_CONFIRMED'
    | 'IGNORED';
  reminderSentAt: string | null;
  overdueNotifiedAt: string | null;
  manuallyConfirmedAt: string | null;
  ignoreReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RentTrackingSectionProps {
  applicationId: string;
  hasBankConnection: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MOIS_FR = [
  'Janv.',
  'Fev.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Aout',
  'Sept.',
  'Oct.',
  'Nov.',
  'Dec.',
];

function formatCents(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function currentYear(): number {
  return new Date().getFullYear();
}

function yearOptions(trackings: RentPaymentTracking[]): number[] {
  const years = new Set<number>();
  trackings.forEach((t) => years.add(t.periodYear));
  years.add(currentYear());
  return Array.from(years).sort((a, b) => b - a);
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
type TrackingStatus = RentPaymentTracking['status'];

const STATUS_CONFIG: Record<
  TrackingStatus,
  { label: string; bg: string; text: string; pulse?: boolean; strikethrough?: boolean }
> = {
  PENDING: {
    label: 'En attente',
    bg: 'bg-neutral-100',
    text: 'text-neutral-500',
  },
  PAID: {
    label: 'Paye',
    bg: 'bg-green-100',
    text: 'text-green-700',
  },
  LATE: {
    label: 'Retard',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
  },
  REMINDER_SENT: {
    label: 'Rappel envoye',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
  },
  OVERDUE: {
    label: 'Impaye',
    bg: 'bg-red-100',
    text: 'text-red-700',
  },
  CRITICAL: {
    label: 'Critique',
    bg: 'bg-red-200',
    text: 'text-red-800 font-bold',
    pulse: true,
  },
  MANUALLY_CONFIRMED: {
    label: 'Confirme',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
  },
  IGNORED: {
    label: 'Ignore',
    bg: 'bg-neutral-100',
    text: 'text-neutral-400',
    strikethrough: true,
  },
};

// ---------------------------------------------------------------------------
// Confirmation Dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
  withInput,
  inputPlaceholder,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
  loading: boolean;
  withInput?: boolean;
  inputPlaceholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
        <p className="text-sm text-neutral-600 mb-4">{message}</p>
        {withInput && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(withInput ? inputValue : undefined)}
            disabled={loading || (withInput && !inputValue.trim())}
            className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: TrackingStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${cfg.bg} ${cfg.text}
        ${cfg.pulse ? 'animate-pulse' : ''}
        ${cfg.strikethrough ? 'line-through' : ''}
      `}
    >
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ActionButtons
// ---------------------------------------------------------------------------
function ActionButtons({
  tracking,
  onConfirm,
  onReminder,
  onIgnore,
  actionLoading,
}: {
  tracking: RentPaymentTracking;
  onConfirm: (id: string) => void;
  onReminder: (id: string) => void;
  onIgnore: (id: string) => void;
  actionLoading: string | null;
}) {
  const { status, id } = tracking;
  const isLoading = actionLoading === id;

  // PAID: optionally show "View transaction" icon
  if (status === 'PAID' && tracking.transactionId) {
    return (
      <div className="flex items-center gap-1">
        <button
          title="Voir la transaction"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
        >
          <Eye size={16} />
        </button>
      </div>
    );
  }

  // MANUALLY_CONFIRMED / IGNORED / PAID without transaction: no actions
  if (
    status === 'MANUALLY_CONFIRMED' ||
    status === 'IGNORED' ||
    status === 'PAID'
  ) {
    return <span className="text-neutral-300 text-xs">--</span>;
  }

  // PENDING: only show "Mark received" if the expected date has passed
  if (status === 'PENDING') {
    const isPastDue = new Date(tracking.expectedDate) <= new Date();
    if (!isPastDue) {
      return <span className="text-neutral-300 text-xs">--</span>;
    }
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onConfirm(id)}
          disabled={isLoading}
          title="Marquer recu"
          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition disabled:opacity-50"
        >
          <Check size={16} />
        </button>
      </div>
    );
  }

  // LATE / REMINDER_SENT / OVERDUE / CRITICAL
  const isReminderSent = status === 'REMINDER_SENT';

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onConfirm(id)}
        disabled={isLoading}
        title="Marquer recu"
        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition disabled:opacity-50"
      >
        <Check size={16} />
      </button>
      <button
        onClick={() => onReminder(id)}
        disabled={isLoading || isReminderSent}
        title={isReminderSent ? 'Rappel deja envoye' : 'Envoyer un rappel'}
        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition disabled:opacity-50 disabled:text-neutral-300"
      >
        <Send size={16} />
      </button>
      <button
        onClick={() => onIgnore(id)}
        disabled={isLoading}
        title="Ignorer ce mois"
        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition disabled:opacity-50"
      >
        <Ban size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const RentTrackingSection: React.FC<RentTrackingSectionProps> = ({
  applicationId,
  hasBankConnection,
}) => {
  const [trackings, setTrackings] = useState<RentPaymentTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirm dialog state
  const [dialog, setDialog] = useState<{
    open: boolean;
    type: 'confirm' | 'reminder' | 'ignore';
    trackingId: string;
  }>({ open: false, type: 'confirm', trackingId: '' });

  // ------ Fetch data ------
  const fetchTrackings = useCallback(async () => {
    try {
      const res = await axios.get(`/api/rent-tracking?applicationId=${applicationId}`);
      setTrackings(res.data);
    } catch (err) {
      console.error('Failed to fetch rent trackings:', err);
      toast.error('Impossible de charger le suivi des loyers');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchTrackings();
  }, [fetchTrackings]);

  // ------ Filtered data ------
  const filtered = trackings.filter((t) => t.periodYear === selectedYear);
  const years = yearOptions(trackings);

  // ------ Actions ------
  const handleConfirmPayment = async () => {
    const id = dialog.trackingId;
    setActionLoading(id);
    // Optimistic update
    setTrackings((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'MANUALLY_CONFIRMED' as const, manuallyConfirmedAt: new Date().toISOString() } : t,
      ),
    );
    setDialog({ open: false, type: 'confirm', trackingId: '' });

    try {
      await axios.patch(`/api/rent-tracking/${id}/confirm`);
      toast.success('Paiement confirme manuellement');
    } catch (err) {
      // Revert optimistic update
      await fetchTrackings();
      toast.error('Erreur lors de la confirmation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async () => {
    const id = dialog.trackingId;
    setActionLoading(id);
    // Optimistic update
    setTrackings((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'REMINDER_SENT' as const, reminderSentAt: new Date().toISOString() } : t,
      ),
    );
    setDialog({ open: false, type: 'confirm', trackingId: '' });

    try {
      await axios.post(`/api/rent-tracking/${id}/send-reminder`);
      toast.success('Rappel envoye au locataire');
    } catch (err) {
      await fetchTrackings();
      toast.error("Erreur lors de l'envoi du rappel");
    } finally {
      setActionLoading(null);
    }
  };

  const handleIgnore = async (reason?: string) => {
    const id = dialog.trackingId;
    if (!reason?.trim()) return;
    setActionLoading(id);
    // Optimistic update
    setTrackings((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'IGNORED' as const, ignoreReason: reason } : t,
      ),
    );
    setDialog({ open: false, type: 'confirm', trackingId: '' });

    try {
      await axios.patch(`/api/rent-tracking/${id}/ignore`, { reason });
      toast.success('Mois ignore');
    } catch (err) {
      await fetchTrackings();
      toast.error("Erreur lors de l'operation");
    } finally {
      setActionLoading(null);
    }
  };

  // ------ Dialog openers ------
  const openConfirm = (id: string) =>
    setDialog({ open: true, type: 'confirm', trackingId: id });
  const openReminder = (id: string) =>
    setDialog({ open: true, type: 'reminder', trackingId: id });
  const openIgnore = (id: string) =>
    setDialog({ open: true, type: 'ignore', trackingId: id });

  // ------ Render ------
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 animate-pulse">
        <div className="h-6 w-48 bg-neutral-100 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-neutral-100 rounded" />
          <div className="h-4 w-3/4 bg-neutral-100 rounded" />
          <div className="h-4 w-5/6 bg-neutral-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-neutral-700" />
            Suivi des loyers
          </h3>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Bank connection banner */}
        {!hasBankConnection && (
          <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Connectez votre banque pour un suivi automatique des paiements
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Les paiements seront detectes et rapproches automatiquement.
                </p>
              </div>
            </div>
            <a
              href="/dashboard/finances"
              className="shrink-0 text-sm font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1 transition"
            >
              Connecter ma banque
              <LinkIcon size={14} />
            </a>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-neutral-400">
            Aucun suivi de loyer pour {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left py-2.5 pr-4 font-medium text-neutral-500 text-xs uppercase tracking-wider">
                    Mois
                  </th>
                  <th className="text-right py-2.5 px-4 font-medium text-neutral-500 text-xs uppercase tracking-wider">
                    Attendu
                  </th>
                  <th className="text-right py-2.5 px-4 font-medium text-neutral-500 text-xs uppercase tracking-wider">
                    Recu
                  </th>
                  <th className="text-left py-2.5 px-4 font-medium text-neutral-500 text-xs uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-right py-2.5 pl-4 font-medium text-neutral-500 text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .sort((a, b) => b.periodMonth - a.periodMonth)
                  .map((tracking) => (
                    <tr
                      key={tracking.id}
                      className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition"
                    >
                      <td className="py-3 pr-4 font-medium text-neutral-800 whitespace-nowrap">
                        {MOIS_FR[tracking.periodMonth - 1]} {tracking.periodYear}
                      </td>
                      <td className="py-3 px-4 text-right text-neutral-600 whitespace-nowrap">
                        {formatCents(tracking.expectedAmountCents)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {tracking.detectedAmountCents !== null ? (
                          <span
                            className={
                              tracking.isPartialPayment
                                ? 'text-orange-600'
                                : 'text-neutral-800'
                            }
                          >
                            {formatCents(tracking.detectedAmountCents)}
                            {tracking.isPartialPayment && (
                              <span className="ml-1 text-xs text-orange-500">(partiel)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-300">--</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={tracking.status} />
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <ActionButtons
                          tracking={tracking}
                          onConfirm={openConfirm}
                          onReminder={openReminder}
                          onIgnore={openIgnore}
                          actionLoading={actionLoading}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={dialog.open && dialog.type === 'confirm'}
        title="Confirmer le paiement"
        message="Marquer ce loyer comme recu manuellement ? Cette action ne peut pas etre annulee."
        confirmLabel="Confirmer"
        onConfirm={handleConfirmPayment}
        onCancel={() => setDialog({ open: false, type: 'confirm', trackingId: '' })}
        loading={actionLoading === dialog.trackingId}
      />

      <ConfirmDialog
        open={dialog.open && dialog.type === 'reminder'}
        title="Envoyer un rappel"
        message="Un rappel amiable sera envoye au locataire par email. Souhaitez-vous continuer ?"
        confirmLabel="Envoyer le rappel"
        onConfirm={handleSendReminder}
        onCancel={() => setDialog({ open: false, type: 'confirm', trackingId: '' })}
        loading={actionLoading === dialog.trackingId}
      />

      <ConfirmDialog
        open={dialog.open && dialog.type === 'ignore'}
        title="Ignorer ce mois"
        message="Veuillez indiquer la raison pour laquelle ce mois est ignore (ex: accord amiable, travaux, etc.)."
        confirmLabel="Ignorer"
        onConfirm={handleIgnore}
        onCancel={() => setDialog({ open: false, type: 'confirm', trackingId: '' })}
        loading={actionLoading === dialog.trackingId}
        withInput
        inputPlaceholder="Motif..."
      />
    </>
  );
};

export default RentTrackingSection;
