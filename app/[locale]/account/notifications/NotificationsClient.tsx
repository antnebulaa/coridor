'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PageHeader from "@/components/PageHeader";

import { SafeUser } from "@/types";

interface NotificationSettings {
    enableMessages: boolean;
    enableVisits: boolean;
    enableApplications: boolean;
    enableLikes: boolean;
    dndStartHour: number | null;
    dndEndHour: number | null;
}

export default function NotificationsClient({ }: { currentUser: SafeUser | null }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<NotificationSettings>({
        enableMessages: true,
        enableVisits: true,
        enableApplications: true,
        enableLikes: false,
        dndStartHour: null,
        dndEndHour: null,
    });
    const t = useTranslations('account.notifications');

    async function fetchSettings() {
        try {
            const res = await fetch('/api/settings/notifications');
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            toast.error(t('toasts.loadError'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function saveSettings() {
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
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error(t('toasts.error'));
        } finally {
            setSaving(false);
        }
    }

    const toggleSetting = (key: keyof NotificationSettings) => {
        setSettings((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <PageHeader
                title={t('title')}
                subtitle={t('subtitle')}
            />

            {/* Notification Types */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
                <h2 className="text-lg font-semibold mb-4">{t('types.title')}</h2>

                <div className="space-y-4">
                    <NotificationToggle
                        icon={<Bell className="w-5 h-5" />}
                        label={t('types.messages.label')}
                        description={t('types.messages.description')}
                        checked={settings.enableMessages}
                        onChange={() => toggleSetting('enableMessages')}
                    />

                    <NotificationToggle
                        icon={<Bell className="w-5 h-5" />}
                        label={t('types.visits.label')}
                        description={t('types.visits.description')}
                        checked={settings.enableVisits}
                        onChange={() => toggleSetting('enableVisits')}
                    />

                    <NotificationToggle
                        icon={<Bell className="w-5 h-5" />}
                        label={t('types.applications.label')}
                        description={t('types.applications.description')}
                        checked={settings.enableApplications}
                        onChange={() => toggleSetting('enableApplications')}
                    />

                    <NotificationToggle
                        icon={<Bell className="w-5 h-5" />}
                        label={t('types.likes.label')}
                        description={t('types.likes.description')}
                        checked={settings.enableLikes}
                        onChange={() => toggleSetting('enableLikes')}
                    />
                </div>
            </div>

            {/* Do Not Disturb */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">{t('dnd.title')}</h2>
                </div>

                <p className="text-sm text-neutral-600 mb-4">
                    {t('dnd.description')}
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            {t('dnd.start')}
                        </label>
                        <select
                            value={settings.dndStartHour ?? ''}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    dndStartHour: e.target.value ? parseInt(e.target.value) : null,
                                })
                            }
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        >
                            <option value="">{t('dnd.disabled')}</option>
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                    {i.toString().padStart(2, '0')}:00
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            {t('dnd.end')}
                        </label>
                        <select
                            value={settings.dndEndHour ?? ''}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    dndEndHour: e.target.value ? parseInt(e.target.value) : null,
                                })
                            }
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        >
                            <option value="">{t('dnd.disabled')}</option>
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                    {i.toString().padStart(2, '0')}:00
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {settings.dndStartHour !== null && settings.dndEndHour !== null && (
                    <p className="text-sm text-neutral-500 mt-2">
                        {t('dnd.active', { start: settings.dndStartHour, end: settings.dndEndHour })}
                    </p>
                )}
            </div>

            {/* Save Button */}
            <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full px-6 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                {saving ? t('saving') : t('save')}
            </button>
        </div>
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
        <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
            <div className="flex items-start gap-3 flex-1">
                <div className="text-neutral-600 mt-0.5">{icon}</div>
                <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-neutral-500">{description}</div>
                </div>
            </div>
            <button
                onClick={onChange}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-neutral-300'
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}
