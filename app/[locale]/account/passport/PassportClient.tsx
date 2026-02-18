'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
    Eye,
    EyeOff,
    Plus,
    Pencil,
    Trash2,
    CheckCircle,
    Clock,
    FileText,
    Download,
    ShieldCheck,
    Loader2,
    ChevronDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/modals/Modal";
import { Button } from "@/components/ui/Button";
import { SafeUser } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────

interface RentalHistoryEntry {
    id: string;
    source: 'CORIDOR' | 'MANUAL';
    city: string;
    zipCode: string | null;
    propertyType: string;
    rentAmountCents: number | null;
    startDate: string;
    endDate: string | null;
    landlordName: string | null;
    isVerified: boolean;
    isHidden: boolean;
    landlordReview: LandlordReview | null;
}

interface LandlordReview {
    id: string;
    compositeScore: number;
    tenantConsented: boolean;
    submittedAt: string;
    scores: ReviewScore[];
}

interface ReviewScore {
    id: string;
    criterion: string;
    rating: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

interface PassportSettings {
    isEnabled: boolean;
    showPaymentBadge: boolean;
    showRentalHistory: boolean;
    showLandlordReviews: boolean;
    showFinancialSummary: boolean;
    showVerifiedMonths: boolean;
}

interface PassportScore {
    globalScore: number;
    badgeScore: number;
    tenureScore: number;
    reviewScore: number;
    completenessScore: number;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PassportData {
    settings: PassportSettings;
    rentalHistory: RentalHistoryEntry[];
    score: PassportScore;
}

interface HistoryFormData {
    city: string;
    zipCode: string;
    propertyType: string;
    startDate: string;
    endDate: string;
    rentAmountCents: string;
    landlordName: string;
}

const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'STUDIO', 'COLOCATION_ROOM', 'OTHER'] as const;

const CRITERIA_ORDER = [
    'PAYMENT_REGULARITY',
    'PROPERTY_CONDITION',
    'COMMUNICATION',
    'WOULD_RECOMMEND',
] as const;

// ── Helper Components ──────────────────────────────────────────────────────

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (s: number) => {
        if (s >= 80) return '#22c55e';
        if (s >= 60) return '#eab308';
        if (s >= 40) return '#f97316';
        return '#ef4444';
    };

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={8}
                    className="text-neutral-200 dark:text-neutral-700"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={getColor(score)}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
        </div>
    );
}

function SubScoreBar({ label, score, weight, color }: { label: string; score: number; weight: string; color: string }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">{label}</span>
                <span className="text-muted-foreground text-xs">{score}/100 ({weight})</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${score}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

function ConfidenceBadge({ level, t }: { level: 'LOW' | 'MEDIUM' | 'HIGH'; t: ReturnType<typeof useTranslations> }) {
    const styles = {
        HIGH: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        LOW: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${styles[level]}`}>
            <ShieldCheck size={14} />
            {t(`confidence.${level}`)}
        </span>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`
                relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
                ${checked ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-600'}
            `}
        >
            <span className={`
                absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-neutral-900 shadow transition-transform duration-200
                ${checked ? 'translate-x-5' : 'translate-x-0'}
            `} />
        </button>
    );
}

function RatingDot({ rating }: { rating: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }) {
    const colors = {
        POSITIVE: 'bg-green-500',
        NEUTRAL: 'bg-yellow-500',
        NEGATIVE: 'bg-red-500',
    };
    return <div className={`w-3 h-3 rounded-full ${colors[rating]}`} />;
}

// ── Main Component ─────────────────────────────────────────────────────────

interface PassportClientProps {
    currentUser: SafeUser;
}

export default function PassportClient({ currentUser }: PassportClientProps) {
    const t = useTranslations('account.passport');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PassportData | null>(null);
    const [showHistoryForm, setShowHistoryForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<RentalHistoryEntry | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    const fetchPassport = useCallback(async () => {
        try {
            const [passportRes, scoreRes] = await Promise.all([
                fetch('/api/passport'),
                fetch('/api/passport/score'),
            ]);

            if (!passportRes.ok || !scoreRes.ok) {
                // If 404, means no passport data yet — use defaults
                setData({
                    settings: {
                        isEnabled: false,
                        showPaymentBadge: true,
                        showRentalHistory: true,
                        showLandlordReviews: false,
                        showFinancialSummary: false,
                        showVerifiedMonths: true,
                    },
                    rentalHistory: [],
                    score: {
                        globalScore: 0,
                        badgeScore: 0,
                        tenureScore: 0,
                        reviewScore: 0,
                        completenessScore: 0,
                        confidence: 'LOW',
                    },
                });
                return;
            }

            const passportData = await passportRes.json();
            const scoreData = await scoreRes.json();

            setData({
                settings: passportData.settings || {
                    isEnabled: false,
                    showPaymentBadge: true,
                    showRentalHistory: true,
                    showLandlordReviews: false,
                    showFinancialSummary: false,
                    showVerifiedMonths: true,
                },
                rentalHistory: passportData.rentalHistory || [],
                score: scoreData,
            });
        } catch {
            toast.error(t('toasts.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchPassport();
    }, [fetchPassport]);

    // ── Settings handlers ──────────────────────────────────────────────────

    const updateSettings = async (updates: Partial<PassportSettings>) => {
        if (!data) return;
        const newSettings = { ...data.settings, ...updates };
        setData({ ...data, settings: newSettings });
        setSavingSettings(true);

        try {
            const res = await fetch('/api/passport/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
            });
            if (!res.ok) throw new Error();
            toast.success(t('toasts.settingsUpdated'));
        } catch {
            toast.error(t('toasts.error'));
            // revert
            setData({ ...data });
        } finally {
            setSavingSettings(false);
        }
    };

    // ── History handlers ───────────────────────────────────────────────────

    const toggleVisibility = async (entryId: string, currentlyHidden: boolean) => {
        try {
            const res = await fetch(`/api/passport/history/${entryId}/visibility`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isHidden: !currentlyHidden }),
            });
            if (!res.ok) throw new Error();
            toast.success(t('toasts.visibilityUpdated'));
            fetchPassport();
        } catch {
            toast.error(t('toasts.error'));
        }
    };

    const deleteEntry = async (entryId: string) => {
        if (!confirm(t('history.deleteConfirm'))) return;
        try {
            const res = await fetch(`/api/passport/history/${entryId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error();
            toast.success(t('toasts.historyDeleted'));
            fetchPassport();
        } catch {
            toast.error(t('toasts.error'));
        }
    };

    // ── Review consent handler ─────────────────────────────────────────────

    const toggleReviewConsent = async (reviewId: string, currentConsent: boolean) => {
        try {
            const res = await fetch(`/api/passport/review/${reviewId}/consent`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantConsented: !currentConsent }),
            });
            if (!res.ok) throw new Error();
            toast.success(t('toasts.consentUpdated'));
            fetchPassport();
        } catch {
            toast.error(t('toasts.error'));
        }
    };

    // ── Export handlers ────────────────────────────────────────────────────

    const handleExport = async (format: 'pdf' | 'json') => {
        toast.success(t('toasts.exportStarted'));
        try {
            const res = await fetch(`/api/passport/export?format=${format}`);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `passport-locatif.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            toast.error(t('toasts.error'));
        }
    };

    // ── Duration helper ────────────────────────────────────────────────────

    const computeMonths = (startDate: string, endDate: string | null) => {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        return Math.max(0,
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth())
        );
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    };

    // ── Loading state ──────────────────────────────────────────────────────

    if (loading) {
        return (
            <Container>
                <div className="max-w-2xl mx-auto pb-10">
                    <PageHeader title={t('title')} subtitle={t('subtitle')} />
                    <div className="mt-10 flex flex-col gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                        ))}
                    </div>
                </div>
            </Container>
        );
    }

    if (!data) return null;

    const { settings, rentalHistory, score } = data;
    const evaluations = rentalHistory
        .filter(rh => rh.landlordReview)
        .map(rh => ({ historyEntry: rh, review: rh.landlordReview! }));

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <Container>
            <div className="max-w-2xl mx-auto pb-10">
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                />

                <div className="mt-10 flex flex-col gap-8">

                    {/* ─── Score Overview Card ─────────────────────────────── */}
                    <div className="flex flex-col gap-6 p-6 border border-border rounded-xl bg-card">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-lg font-semibold">{t('score.title')}</h3>
                            <ConfidenceBadge level={score.confidence} t={t} />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-8">
                            <ScoreGauge score={score.globalScore} />
                            <div className="flex-1 w-full flex flex-col gap-3">
                                <SubScoreBar
                                    label={t('score.badge')}
                                    score={score.badgeScore}
                                    weight="40%"
                                    color="#3b82f6"
                                />
                                <SubScoreBar
                                    label={t('score.tenure')}
                                    score={score.tenureScore}
                                    weight="20%"
                                    color="#8b5cf6"
                                />
                                <SubScoreBar
                                    label={t('score.reviews')}
                                    score={score.reviewScore}
                                    weight="25%"
                                    color="#f59e0b"
                                />
                                <SubScoreBar
                                    label={t('score.completeness')}
                                    score={score.completenessScore}
                                    weight="15%"
                                    color="#10b981"
                                />
                            </div>
                        </div>

                        {/* Private score notice */}
                        <p className="text-xs text-muted-foreground mt-2 px-1">
                            {t('score.privateNotice')}
                        </p>

                        {/* Enable toggle */}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">
                                    {t('enable.label')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t('enable.description')}
                                </span>
                            </div>
                            <Toggle
                                checked={settings.isEnabled}
                                onChange={() => updateSettings({ isEnabled: !settings.isEnabled })}
                            />
                        </div>
                    </div>

                    {/* ─── Rental History Section ──────────────────────────── */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <h3 className="text-lg font-semibold">{t('history.title')}</h3>

                        {rentalHistory.length === 0 ? (
                            <div className="flex flex-col gap-2 py-4">
                                <p className="text-sm text-muted-foreground">{t('history.empty')}</p>
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    {t('history.addAdvice')}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {rentalHistory
                                    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                                    .map((entry, index) => (
                                        <div
                                            key={entry.id}
                                            className={`flex items-start gap-4 py-4 ${index > 0 ? 'border-t border-border' : ''}`}
                                        >
                                            {/* Timeline dot */}
                                            <div className="flex flex-col items-center pt-1">
                                                <div className={`w-3 h-3 rounded-full shrink-0 ${
                                                    entry.isVerified
                                                        ? 'bg-green-500'
                                                        : 'bg-neutral-400 dark:bg-neutral-500'
                                                }`} />
                                                {index < rentalHistory.length - 1 && (
                                                    <div className="w-0.5 flex-1 bg-neutral-200 dark:bg-neutral-700 mt-1" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-foreground">
                                                        {entry.city}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {t(`history.propertyTypes.${entry.propertyType}`)}
                                                    </span>
                                                    {entry.isVerified && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            <CheckCircle size={12} />
                                                            {t('history.verified')}
                                                        </span>
                                                    )}
                                                    {!entry.isVerified && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                                            {t('history.manual')}
                                                        </span>
                                                    )}
                                                    {entry.isHidden && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500">
                                                            <EyeOff size={12} />
                                                            {t('history.hidden')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {formatDate(entry.startDate)} — {entry.endDate ? formatDate(entry.endDate) : t('history.current')}
                                                    {' · '}
                                                    {t('history.months', { count: computeMonths(entry.startDate, entry.endDate) })}
                                                </div>
                                                {entry.rentAmountCents && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {(entry.rentAmountCents / 100).toLocaleString('fr-FR')} EUR/mois
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => toggleVisibility(entry.id, entry.isHidden)}
                                                    className="p-1.5 rounded-lg hover:bg-secondary transition"
                                                    title={entry.isHidden ? t('history.visible') : t('history.hidden')}
                                                >
                                                    {entry.isHidden ? <EyeOff size={16} className="text-muted-foreground" /> : <Eye size={16} className="text-muted-foreground" />}
                                                </button>
                                                {entry.source === 'MANUAL' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditingEntry(entry);
                                                                setShowHistoryForm(true);
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-secondary transition"
                                                        >
                                                            <Pencil size={16} className="text-muted-foreground" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteEntry(entry.id)}
                                                            className="p-1.5 rounded-lg hover:bg-secondary transition"
                                                        >
                                                            <Trash2 size={16} className="text-red-500" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setEditingEntry(null);
                                setShowHistoryForm(true);
                            }}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:opacity-80 transition w-full"
                        >
                            <Plus size={16} />
                            {t('history.addEntry')}
                        </button>
                    </div>

                    {/* ─── History Form Modal ──────────────────────────────── */}
                    {showHistoryForm && (
                        <HistoryFormModal
                            entry={editingEntry}
                            t={t}
                            onClose={() => {
                                setShowHistoryForm(false);
                                setEditingEntry(null);
                            }}
                            onSaved={() => {
                                setShowHistoryForm(false);
                                setEditingEntry(null);
                                fetchPassport();
                            }}
                        />
                    )}

                    {/* ─── Evaluations Section ────────────────────────────── */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <h3 className="text-lg font-semibold">{t('evaluations.title')}</h3>

                        {evaluations.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">{t('evaluations.empty')}</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {evaluations.map(({ historyEntry, review }) => (
                                    <div
                                        key={review.id}
                                        className="flex flex-col gap-3 p-4 bg-secondary/50 rounded-xl"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground">
                                                    {historyEntry.city} — {formatDate(historyEntry.startDate)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {t('evaluations.composite')}: {review.compositeScore.toFixed(2)} / 3.00
                                                </span>
                                            </div>
                                            <Toggle
                                                checked={review.tenantConsented}
                                                onChange={() => toggleReviewConsent(review.id, review.tenantConsented)}
                                            />
                                        </div>

                                        <div className="text-xs text-muted-foreground">
                                            {review.tenantConsented ? t('evaluations.share') : t('evaluations.unshare')}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {CRITERIA_ORDER.map((criterion) => {
                                                const scoreEntry = review.scores.find(s => s.criterion === criterion);
                                                if (!scoreEntry) return null;
                                                return (
                                                    <div
                                                        key={criterion}
                                                        className="flex items-center gap-2 text-sm"
                                                    >
                                                        <RatingDot rating={scoreEntry.rating} />
                                                        <span className="text-foreground">
                                                            {t(`evaluations.criteria.${criterion}`)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ─── Sharing Settings Section ───────────────────────── */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-semibold">{t('sharing.title')}</h3>
                            <p className="text-muted-foreground text-sm">{t('sharing.description')}</p>
                        </div>

                        <div className="flex flex-col divide-y divide-border">
                            {([
                                'showPaymentBadge',
                                'showRentalHistory',
                                'showLandlordReviews',
                                'showFinancialSummary',
                                'showVerifiedMonths',
                            ] as const).map((key) => (
                                <div key={key} className="flex items-center justify-between py-4 first:pt-2 last:pb-0">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground">
                                            {t(`sharing.${key}.label`)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {t(`sharing.${key}.description`)}
                                        </span>
                                    </div>
                                    <Toggle
                                        checked={settings[key]}
                                        onChange={() => updateSettings({ [key]: !settings[key] })}
                                    />
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-muted-foreground pt-2">
                            {t('sharing.rgpdNotice')}
                        </p>

                        <ExportDropdown t={t} onExport={handleExport} />
                    </div>

                </div>
            </div>
        </Container>
    );
}

// ── Export Dropdown ───────────────────────────────────────────────────────

function ExportDropdown({ t, onExport }: { t: ReturnType<typeof useTranslations>; onExport: (format: 'pdf' | 'json') => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative pt-2" ref={ref}>
            <Button
                variant="outline"
                icon={Download}
                label={t('sharing.export')}
                onClick={() => setOpen(!open)}
                className="w-full"
            >
                <ChevronDown size={16} className={`ml-1 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </Button>
            <div
                className={`
                    absolute left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-10
                    transition-all duration-200 ease-out origin-top
                    ${open
                        ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
                    }
                `}
            >
                <button
                    onClick={() => { onExport('pdf'); setOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-foreground hover:bg-secondary transition-colors rounded-t-xl"
                >
                    <Download size={16} className="text-muted-foreground" />
                    PDF
                </button>
                <button
                    onClick={() => { onExport('json'); setOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-foreground hover:bg-secondary transition-colors border-t border-border rounded-b-xl"
                >
                    <FileText size={16} className="text-muted-foreground" />
                    JSON
                </button>
            </div>
        </div>
    );
}

// ── History Form Modal ─────────────────────────────────────────────────────

function HistoryFormModal({
    entry,
    t,
    onClose,
    onSaved,
}: {
    entry: RentalHistoryEntry | null;
    t: ReturnType<typeof useTranslations>;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!entry;
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<HistoryFormData>({
        city: entry?.city || '',
        zipCode: entry?.zipCode || '',
        propertyType: entry?.propertyType || 'APARTMENT',
        startDate: entry?.startDate ? entry.startDate.substring(0, 10) : '',
        endDate: entry?.endDate ? entry.endDate.substring(0, 10) : '',
        rentAmountCents: entry?.rentAmountCents ? String(entry.rentAmountCents / 100) : '',
        landlordName: entry?.landlordName || '',
    });

    const handleSubmit = async () => {
        setSaving(true);

        const body = {
            city: form.city,
            zipCode: form.zipCode || null,
            propertyType: form.propertyType,
            startDate: form.startDate,
            endDate: form.endDate || null,
            rentAmountCents: form.rentAmountCents ? Math.round(parseFloat(form.rentAmountCents) * 100) : null,
            landlordName: form.landlordName || null,
        };

        try {
            const url = isEdit ? `/api/passport/history/${entry!.id}` : '/api/passport/history';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error();

            toast.success(isEdit ? t('toasts.historyUpdated') : t('toasts.historyAdded'));
            onSaved();
        } catch {
            toast.error(t('toasts.error'));
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full min-w-0 p-3 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white";

    const bodyContent = (
        <div className="flex flex-col gap-4 overflow-hidden">
            <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                    {t('history.form.city')} *
                </label>
                <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={inputClass}
                />
            </div>

            <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                    {t('history.form.zipCode')}
                </label>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className={inputClass}
                />
            </div>

            <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                    {t('history.form.propertyType')} *
                </label>
                <select
                    required
                    value={form.propertyType}
                    onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                    className={inputClass}
                >
                    {PROPERTY_TYPES.map(pt => (
                        <option key={pt} value={pt}>
                            {t(`history.propertyTypes.${pt}`)}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                    {t('history.form.startDate')} *
                </label>
                <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className={inputClass}
                />
            </div>

            <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                    {t('history.form.endDate')}
                </label>
                <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className={inputClass}
                />
            </div>

            <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                    {t('history.form.rentAmount')}
                </label>
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={form.rentAmountCents}
                    onChange={(e) => setForm({ ...form, rentAmountCents: e.target.value })}
                    className={inputClass}
                />
            </div>

            <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                    {t('history.form.landlordName')}
                </label>
                <input
                    type="text"
                    value={form.landlordName}
                    onChange={(e) => setForm({ ...form, landlordName: e.target.value })}
                    className={inputClass}
                />
            </div>
        </div>
    );

    return (
        <Modal
            isOpen
            onClose={onClose}
            onSubmit={handleSubmit}
            title={isEdit ? t('history.form.editTitle') : t('history.form.title')}
            body={bodyContent}
            actionLabel={saving ? t('history.form.saving') : t('history.form.save')}
            secondaryAction={onClose}
            secondaryActionLabel={t('history.form.cancel')}
            disabled={!form.city || !form.startDate || !form.propertyType}
            isLoading={saving}
        />
    );
}
