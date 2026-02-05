'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSession } from "next-auth/react";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushNotificationManager() {
    const { data: session } = useSession();
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);

    useEffect(() => {
        // Safety check for browser environment and Secure Context (HTTPS or localhost)
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {

            // Only attempt registration if secure or localhost
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const isSecure = window.location.protocol === 'https:';

            if (isLocalhost || isSecure) {
                setIsSupported(true);
                registerServiceWorker().catch(e => console.error("SW Registration blocked (likely non-secure):", e));
            }
        }
    }, []);

    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            });
            console.log('SW registered:', registration);

            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('SW registration failed:', error);
        }
    }

    async function subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                ),
            });
            setSubscription(sub);

            // Save to DB
            await fetch('/api/web-push/subscribe', {
                method: 'POST',
                body: JSON.stringify(sub),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            toast.success("Notifications activées !");
        } catch (error) {
            console.error('Failed to subscribe:', error);
            toast.error("Impossible d'activer les notifications");
        }
    }

    async function sendTestNotification() {
        if (!session?.user) return;
        toast.loading("Envoi en cours...");
        try {
            await fetch('/api/web-push/send', {
                method: 'POST',
                body: JSON.stringify({
                    userId: (session.user as any).id,
                    title: "🔔 Test Coridor",
                    message: "Si vous lisez ça, le PWA fonctionne !",
                    url: "/dashboard"
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            toast.dismiss();
            toast.success("Notification envoyée !");
        } catch (error) {
            console.error(error);
            toast.dismiss();
            toast.error("Erreur d'envoi");
        }
    }

    if (!isSupported) {
        return null; // Don't show anything if not supported
    }

    if (subscription) {
        return (
            <div className="fixed bottom-4 left-4 right-4 md:right-auto md:w-96 p-4 bg-white/80 backdrop-blur-md shadow-xl rounded-2xl border border-green-200 z-50 animate-in slide-in-from-bottom flex items-center justify-between gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-sm text-green-700">Notifications Actives ✅</h3>
                    <p className="text-xs text-neutral-500">Prêt à recevoir des alertes.</p>
                </div>
                <button
                    onClick={sendTestNotification}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                >
                    Tester
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:right-auto md:w-96 p-4 bg-white shadow-xl rounded-2xl border border-neutral-200 z-50 animate-in slide-in-from-bottom flex items-center justify-between gap-4">
            <div className="flex-1">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-neutral-500">Recevez les alertes en temps réel sur votre mobile.</p>
            </div>
            <button
                onClick={subscribeToPush}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium whitespace-nowrap"
            >
                Activer
            </button>
        </div>
    );
}
