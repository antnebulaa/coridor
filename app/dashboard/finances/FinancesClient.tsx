'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Plus, CheckCircle, AlertTriangle, Shield, Lock, Search } from "lucide-react";

interface FinancesClientProps {
    currentUser: any;
    connections: any[];
}

const FinancesClient: React.FC<FinancesClientProps> = ({
    currentUser,
    connections
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);

    // Handle OAuth Code Return
    useEffect(() => {
        const code = searchParams?.get('code');
        const connectionIdParam = searchParams?.get('connection_id'); // Sometimes provided by widget

        if (code) {
            const handleConnect = async () => {
                setIsLoading(true);
                try {
                    await axios.post('/api/powens/connect-landlord', {
                        code,
                        connectionId: connectionIdParam
                    });
                    toast.success("Compte bancaire connecté !");
                    router.push('/dashboard/finances'); // Clear params via replace/push
                    router.refresh(); // Refresh server data
                } catch (error) {
                    toast.error("Échec de la connexion bancaire");
                    console.error(error);
                } finally {
                    setIsLoading(false);
                }
            };
            handleConnect();
        }
    }, [searchParams, router]);

    const onConnect = async () => {
        setIsLoading(true);
        try {
            // Get WebView URL with mode=landlord
            const response = await axios.get('/api/powens/init?mode=landlord');
            window.location.href = response.data.link; // Redirect to Powens
        } catch (error) {
            toast.error("Erreur d'initialisation");
        } finally {
            setIsLoading(false);
        }
    }

    const onSync = async (connectionId: string) => {
        setIsLoading(true); // Ideally specific loading state
        try {
            const res = await axios.post('/api/powens/sync', { connectionId });
            const count = res.data.count;
            const matches = res.data.matches?.length || 0;

            toast.success(`${count} transactions, ${matches} loyers détectés !`);
            router.refresh();
        } catch (error) {
            toast.error("Erreur de synchronisation");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Container>
            <div className="pt-24 pb-10">
                <div className="flex flex-row items-center justify-between mb-8">
                    <Heading
                        title="Finance & Loyers"
                        subtitle="Suivez vos encaissements et connectez votre banque"
                    />
                    {connections.length > 0 && (
                        <Button
                            label="Ajouter un compte"
                            icon={Plus}
                            onClick={onConnect}
                            disabled={isLoading}
                        />
                    )}
                </div>

                {/* Content */}
                {connections.length > 0 ? (
                    <div className="grid gap-6">
                        {connections.map((conn) => (
                            <div key={conn.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Header */}
                                <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                            BK
                                        </div>
                                        <div>
                                            <div className="font-semibold text-neutral-800">Compte Principal</div>
                                            <div className="text-xs text-neutral-500">
                                                Dernière synchro: {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString() : 'Jamais'}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        label="Synchroniser"
                                        small
                                        variant="outline"
                                        icon={RefreshCw}
                                        onClick={() => onSync(conn.id)}
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Transactions Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-neutral-50 text-neutral-500 font-medium">
                                            <tr>
                                                <th className="p-4">Date</th>
                                                <th className="p-4">Libellé</th>
                                                <th className="p-4">Montant</th>
                                                <th className="p-4">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {conn.transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-neutral-500">
                                                        Aucune transaction récente
                                                    </td>
                                                </tr>
                                            ) : (
                                                conn.transactions.map((tx: any) => (
                                                    <tr key={tx.id} className="hover:bg-neutral-50/50">
                                                        <td className="p-4 text-neutral-600">
                                                            {new Date(tx.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-4 font-medium text-neutral-900">
                                                            {tx.label}
                                                        </td>
                                                        <td className={`p-4 font-bold text-right ${tx.amount > 0 ? 'text-green-600' : 'text-neutral-900'}`}>
                                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} €
                                                        </td>
                                                        <td className="p-4">
                                                            {parsedStatus(tx)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto mt-8">
                        {/* Premium Hero Card */}
                        <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-xl relative">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-linear-to-br from-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-50/50 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />

                            <div className="relative z-10 p-8 md:p-12 text-center">
                                <div className="inline-flex items-center gap-2 bg-neutral-100 border border-neutral-200 rounded-full px-3 py-1 mb-8">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Sécurisé & Automatisé</span>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-6 tracking-tight">
                                    Vos loyers, vérifiés <span className="text-green-500">automatiquement</span>.
                                </h2>
                                <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                                    Connectez votre compte bancaire pour permettre à Coridor de détecter vos loyers entrants et de mettre à jour vos quittances en temps réel.
                                </p>

                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-full max-w-sm">
                                        <Button
                                            label="Connecter ma banque en toute sécurité"
                                            onClick={onConnect}
                                            icon={Shield}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <p className="text-xs text-neutral-400">
                                        Connexion chiffrée SSL • Lecture seule uniquement • Partenaire agréé ACPR
                                    </p>
                                </div>
                            </div>

                            {/* Detailed How-it-Works Grid */}
                            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-100 border-t border-neutral-100 bg-neutral-50/50">
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm text-primary">
                                        <Lock size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 mb-1">1. Connexion Sécurisée</h3>
                                        <p className="text-sm text-neutral-500 leading-normal">
                                            Nous connectons votre compte en <strong>lecture seule</strong>. Nous ne voyons que les montants et libellés, sans jamais pouvoir initier de virement.
                                        </p>
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm text-primary">
                                        <Search size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 mb-1">2. Analyse Ciblée</h3>
                                        <p className="text-sm text-neutral-500 leading-normal">
                                            Notre système cherche <strong>uniquement</strong> une correspondance stricte entre le <strong>Nom du locataire</strong>, le <strong>Montant du loyer</strong> et la <strong>Date</strong>.
                                        </p>
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm text-primary">
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-neutral-900 mb-1">3. Validation Simple</h3>
                                        <p className="text-sm text-neutral-500 leading-normal">
                                            Si tout correspond, le statut passe à <strong>"Payé"</strong>. C'est tout. Aucune autre donnée n'est analysée ou conservée.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trust Badge */}
                        <div className="mt-10 flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-full border border-neutral-100 shadow-sm transition-all hover:shadow-md hover:border-neutral-200 cursor-default group">
                                <Shield size={16} className="text-primary group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-neutral-800 tracking-tight">POWENS</span>
                                <span className="text-neutral-300">|</span>
                                <span className="text-xs text-neutral-500 font-medium">Open Banking Secure</span>
                            </div>
                            <p className="text-[10px] text-neutral-400 max-w-md text-center leading-relaxed">
                                Coridor utilise la technologie <strong>Powens</strong>, établissement de paiement agréé par l'<strong>ACPR (Banque de France)</strong> sous le numéro 16928.
                                <br />
                                Vos identifiants bancaires sont chiffrés et ne sont jamais stockés par Coridor.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
}

function parsedStatus(tx: any) {
    if (tx.matchedLeaseId) {
        return (
            <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-medium w-fit">
                <CheckCircle size={12} /> Loyer
            </span>
        );
    }
    if (tx.amount > 0 && tx.amount > 200) {
        return (
            <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-full text-xs font-medium w-fit">
                <AlertTriangle size={12} /> À vérifier
            </span>
        );
    }
    return <span className="text-neutral-400 text-xs">-</span>;
}

export default FinancesClient;
