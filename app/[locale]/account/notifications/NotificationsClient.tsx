'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { MessageSquare, CalendarCheck, FileText, Heart, Scale, Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { SafeUser } from "@/types";

interface NotificationSettings {
    enableMessages: boolean;
    enableVisits: boolean;
    enableApplications: boolean;
    enableLikes: boolean;
    enableLegalReminders: boolean;
    legalReminderLeadDays: number;
    dndStartHour: number | null;
    dndEndHour: number | null;
}

export default function NotificationsClient({ currentUser }: { currentUser: SafeUser }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<NotificationSettings>({
        enableMessages: true,
        enableVisits: true,
        enableApplications: true,
        enableLikes: false,
        enableLegalReminders: true,
        legalReminderLeadDays: 30,
        dndStartHour: null,
        dndEndHour: null,
    });
    const t = useTranslations('account.notifications');

    useEffect(() => {
        fetch('/api/settings/notifications')
            .then((res) => res.json())
            .then((data) => {
                setSettings({
                    enableMessages: data.enableMessages ?? true,
                    enableVisits: data.enableVisits ?? true,
                    enableApplications: data.enableApplications ?? true,
                    enableLikes: data.enableLikes ?? false,
                    enableLegalReminders: data.enableLegalReminders ?? true,
                    legalReminderLeadDays: data.legalReminderLeadDays ?? 30,
                    dndStartHour: data.dndStartHour ?? null,
                    dndEndHour: data.dndEndHour ?? null,
                });
            })
            .catch(() => {
                toast.error(t('toasts.loadError'));
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleSetting = (key: keyof NotificationSettings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                toast.success(t('toasts.success'));
            } else {
                toast.error(t('toasts.error'));
            }
        } catch {
            toast.error(t('toasts.error'));
        } finally {
            setSaving(false);
        }
    };

    const isLandlord = currentUser.userMode === 'LANDLORD';
    const dndEnabled = settings.dndStartHour !== null && settings.dndEndHour !== null;

    if (loading) {
        return (
            <Container>
                <div className="max-w-2xl mx-auto pb-10">
                    <PageHeader title={t('title')} subtitle={t('subtitle')} />
                    <div className="mt-10 flex flex-col gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                        ))}
                    </div>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <div className="max-w-2xl mx-auto pb-10">
                <PageHeader
                    title={t('title')}
                    subtitle={t('subtitle')}
                />

                <div className="mt-10 flex flex-col gap-8">
                    {/* Notification Types */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-semibold">{t('types.title')}</h3>
                            <p className="text-muted-foreground text-sm">{t('description')}</p>
                        </div>

                        <div className="flex flex-col divide-y divide-border">
                            <NotificationToggle
                                icon={<MessageSquare size={18} />}
                                label={t('types.messages.label')}
                                description={t('types.messages.description')}
                                checked={settings.enableMessages}
                                onChange={() => toggleSetting('enableMessages')}
                            />
                            <NotificationToggle
                                icon={<CalendarCheck size={18} />}
                                label={t('types.visits.label')}
                                description={t('types.visits.description')}
                                checked={settings.enableVisits}
                                onChange={() => toggleSetting('enableVisits')}
                            />
                            <NotificationToggle
                                icon={<FileText size={18} />}
                                label={t('types.applications.label')}
                                description={t('types.applications.description')}
                                checked={settings.enableApplications}
                                onChange={() => toggleSetting('enableApplications')}
                            />
                            <NotificationToggle
                                icon={<Heart size={18} />}
                                label={t('types.likes.label')}
                                description={t('types.likes.description')}
                                checked={settings.enableLikes}
                                onChange={() => toggleSetting('enableLikes')}
                            />
                            {isLandlord && (
                                <NotificationToggle
                                    icon={<Scale size={18} />}
                                    label={t('types.legalReminders.label')}
                                    description={t('types.legalReminders.description')}
                                    checked={settings.enableLegalReminders}
                                    onChange={() => toggleSetting('enableLegalReminders')}
                                />
                            )}
                        </div>
                    </div>

                    {/* Do Not Disturb */}
                    <div className="flex flex-col gap-4 p-6 border border-border rounded-xl bg-card">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                    <Moon size={18} className="text-foreground" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-lg font-semibold">{t('dnd.title')}</h3>
                                    <p className="text-muted-foreground text-sm">{t('dnd.description')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (dndEnabled) {
                                        setSettings((p) => ({ ...p, dndStartHour: null, dndEndHour: null }));
                                    } else {
                                        setSettings((p) => ({ ...p, dndStartHour: 22, dndEndHour: 7 }));
                                    }
                                }}
                                className={`
                                    relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
                                    ${dndEnabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-600'}
                                `}
                            >
                                <span className={`
                                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-neutral-900 shadow transition-transform duration-200
                                    ${dndEnabled ? 'translate-x-5' : 'translate-x-0'}
                                `} />
                            </button>
                        </div>

                        {dndEnabled && (
                            <div className="flex flex-col gap-4 mt-2">
                                <div className="flex flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="text-sm text-muted-foreground mb-1 block">{t('dnd.start')}</label>
                                        <select
                                            value={settings.dndStartHour ?? 22}
                                            onChange={(e) => setSettings((p) => ({ ...p, dndStartHour: parseInt(e.target.value) }))}
                                            className="w-full p-3 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                                        >
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-sm text-muted-foreground mb-1 block">{t('dnd.end')}</label>
                                        <select
                                            value={settings.dndEndHour ?? 7}
                                            onChange={(e) => setSettings((p) => ({ ...p, dndEndHour: parseInt(e.target.value) }))}
                                            className="w-full p-3 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
                                        >
                                            {Array.from({ length: 24 }, (_, i) => (
                                                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t('dnd.active', {
                                        start: String(settings.dndStartHour ?? 22).padStart(2, '0'),
                                        end: String(settings.dndEndHour ?? 7).padStart(2, '0')
                                    })}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button
                            label={saving ? t('saving') : t('save')}
                            onClick={saveSettings}
                            disabled={saving}
                        />
                    </div>
                </div>
            </div>
        </Container>
    );
}

function NotificationToggle({
    icon,
    label,
    description,
    checked,
    onChange,
}: {
    icon: React.ReactNode;
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <div className="flex items-center justify-between py-4 first:pt-2 last:pb-0">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-foreground">{icon}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                </div>
            </div>
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
        </div>
    );
}
