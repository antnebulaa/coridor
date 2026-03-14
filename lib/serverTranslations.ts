import frMessages from '@/messages/fr.json';
import enMessages from '@/messages/en.json';

type Messages = Record<string, any>;

const messages: Record<string, Messages> = {
    fr: frMessages,
    en: enMessages,
};

/**
 * Get a nested value from a messages object using dot notation.
 * e.g. getNestedValue(messages, 'emails.visit.subject') => "Visite confirmée"
 */
function getNestedValue(obj: Messages, path: string): string | undefined {
    const keys = path.split('.');
    let current: any = obj;
    for (const key of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = current[key];
    }
    return typeof current === 'string' ? current : undefined;
}

/**
 * Server-side translation function for use in API routes, cron jobs, and services.
 * Returns a t() function scoped to a namespace, similar to useTranslations().
 *
 * Usage:
 *   const t = getServerTranslation('emails', 'fr');
 *   const subject = t('visit.reminder.subject', { date: '2026-03-14' });
 */
export function getServerTranslation(namespace: string, locale: string = 'fr') {
    const msgs = messages[locale] || messages.fr;

    return function t(key: string, params?: Record<string, string | number>): string {
        const fullPath = `${namespace}.${key}`;
        let value = getNestedValue(msgs, fullPath);

        if (!value) {
            console.warn(`[i18n] Missing translation: ${fullPath} (locale: ${locale})`);
            // Fallback to French
            if (locale !== 'fr') {
                value = getNestedValue(messages.fr, fullPath);
            }
            if (!value) return key;
        }

        // Replace {param} placeholders
        if (params) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
            }
        }

        return value;
    };
}
