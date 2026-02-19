'use client';

import React from 'react';
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { LeaseConfig } from '@/services/LeaseService';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { HiArrowLeft, HiArrowDownTray, HiPrinter, HiPencilSquare, HiArrowPath, HiCheckCircle } from 'react-icons/hi2';
import LeaseDocument from '@/components/documents/LeaseDocument';

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFViewer), {
    ssr: false,
    loading: () => <p>Chargement du document...</p>,
});

interface LeaseViewerClientProps {
    leaseConfig: LeaseConfig;
    isOwner: boolean;
}

interface Signer {
    name: string;
    email: string;
    status: string;
}

const LeaseViewerClient: React.FC<LeaseViewerClientProps> = ({ leaseConfig, isOwner }) => {
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);
    const [refreshing, setRefreshing] = React.useState(false);
    const [status, setStatus] = React.useState(leaseConfig.metadata?.status || "DRAFT");
    const [signedUrl, setSignedUrl] = React.useState<string | null>(leaseConfig.metadata?.signedLeaseUrl || null);
    const [signers, setSigners] = React.useState<Signer[]>([]);

    const handleSign = async () => {
        try {
            setLoading(true);
            await axios.post(`/api/leases/${leaseConfig.application_id}/sign`);
            toast.success("Procédure de signature lancée (Yousign)");
            setStatus("PENDING_SIGNATURE");
        } catch (error: any) {
            const message = error?.response?.data?.error || "Erreur lors de l'envoi";
            toast.error(message);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshStatus = async () => {
        try {
            setRefreshing(true);
            const res = await axios.get(`/api/leases/${leaseConfig.application_id}/status`);

            if (res.data.status) {
                setStatus(res.data.status);
            }
            if (res.data.signedUrl) {
                setSignedUrl(res.data.signedUrl);
            }
            if (res.data.signers) {
                setSigners(res.data.signers);
            }

            toast.success("Statut mis à jour");
        } catch (error) {
            toast.error("Erreur lors de la mise à jour");
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleDownloadSigned = () => {
        if (!signedUrl) return;

        // If it's a data URL (base64), create download
        if (signedUrl.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = signedUrl;
            link.download = 'Bail_Signe.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // External URL - open in new tab
            window.open(signedUrl, '_blank');
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#F3F4F6] text-neutral-800 font-sans">
            {/* Sidebar / Left Panel (Context) - Optional or just Back button area */}
            <div className="hidden lg:flex flex-col w-[300px] border-r border-neutral-200 bg-white p-6 gap-6">
                <div
                    onClick={() => router.back()}
                    className="flex items-center gap-2 cursor-pointer text-neutral-500 hover:text-black transition mb-4"
                >
                    <HiArrowLeft />
                    <span className="font-medium">Retour</span>
                </div>

                <div>
                    <h2 className="text-xl font-bold mb-2">Bail de location</h2>
                    <div className="text-sm text-neutral-500">
                        {leaseConfig.lease_template_id.replace(/_/g, ' ')}
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h3 className="font-bold text-blue-900 mb-1">Dernière étape</h3>
                    <p className="text-sm text-blue-700">
                        Vérifiez les clauses générées automatiquement avant d'envoyer le bail pour signature.
                    </p>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <h3 className="font-bold text-amber-900 mb-1">Notice d&apos;information</h3>
                    <p className="text-sm text-amber-700 mb-3">
                        La notice d&apos;information relative aux droits et obligations des locataires et des bailleurs doit être remise au locataire lors de la signature du bail.
                    </p>
                    <a
                        href="/documents/notice-information-locataire.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-lg transition"
                    >
                        <HiArrowDownTray size={16} />
                        Télécharger la notice
                    </a>
                </div>

                {/* Signers Progress */}
                {status === 'PENDING_SIGNATURE' && signers.length > 0 && (
                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                        <h3 className="font-semibold text-neutral-800 mb-3">Statut des signatures</h3>
                        <div className="space-y-2">
                            {signers.map((signer, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                    {signer.status === 'signed' ? (
                                        <HiCheckCircle className="text-green-500" size={16} />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />
                                    )}
                                    <span className={signer.status === 'signed' ? 'text-green-700' : 'text-neutral-600'}>
                                        {signer.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-auto">
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase text-neutral-400">Statut</div>
                        <div className={`text-sm font-bold ${status === 'SIGNED' ? 'text-green-600' :
                            status === 'PENDING_SIGNATURE' ? 'text-yellow-600' : 'text-neutral-600'
                            }`}>
                            {status === 'SIGNED' ? 'Signé' :
                                status === 'PENDING_SIGNATURE' ? 'En attente de signatures' : 'Brouillon'}
                        </div>
                    </div>
                    <div className="text-xs text-neutral-400 mt-4">
                        ID: {leaseConfig.application_id.slice(0, 8)}...
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-neutral-200 flex-none z-10 px-4 sm:px-6 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-lg flex items-center gap-3 shrink-0">
                            <div onClick={() => router.back()} className="lg:hidden cursor-pointer">
                                <HiArrowLeft />
                            </div>
                            <span className="hidden sm:inline">Aperçu du Document</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            {/* Sign Button - Only for owner when DRAFT */}
                            {isOwner && status === 'DRAFT' && (
                                <button
                                    onClick={handleSign}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                                >
                                    <HiPencilSquare size={16} />
                                    <span className="hidden sm:inline">{loading ? 'Envoi Yousign...' : 'Envoyer pour signature'}</span>
                                    <span className="sm:hidden">{loading ? 'Envoi...' : 'Signer'}</span>
                                </button>
                            )}

                            {/* Pending Status with Refresh */}
                            {status === 'PENDING_SIGNATURE' && (
                                <>
                                    <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-lg border border-yellow-200">
                                        <span>En cours de signature...</span>
                                    </div>
                                    <button
                                        onClick={handleRefreshStatus}
                                        disabled={refreshing}
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-black rounded-lg hover:bg-neutral-100 transition disabled:opacity-50"
                                    >
                                        <HiArrowPath size={16} className={refreshing ? 'animate-spin' : ''} />
                                        <span className="hidden sm:inline">{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
                                    </button>
                                </>
                            )}

                            {/* Signed Status with Download */}
                            {status === 'SIGNED' && (
                                <>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 text-sm font-semibold rounded-lg border border-green-200">
                                        <HiCheckCircle size={16} />
                                        <span>Document Signé</span>
                                    </div>
                                    {signedUrl && (
                                        <button
                                            onClick={handleDownloadSigned}
                                            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition shadow-sm"
                                        >
                                            <HiArrowDownTray size={16} />
                                            <span className="hidden sm:inline">Télécharger le bail signé</span>
                                            <span className="sm:hidden">Télécharger</span>
                                        </button>
                                    )}
                                </>
                            )}

                            <button className="hidden sm:flex text-sm font-medium text-neutral-600 hover:text-black gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition">
                                <HiPrinter size={16} />
                                Imprimer
                            </button>
                            <button className="flex items-center gap-2 px-3 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition shadow-sm">
                                <HiArrowDownTray size={16} />
                                <span className="hidden sm:inline">Télécharger</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* PDF Area */}
                <div className="flex-1 bg-neutral-100 p-2 sm:p-8 overflow-auto relative">
                    <div className="w-full h-full shadow-lg sm:rounded-xl overflow-hidden bg-white border border-neutral-200 min-h-[70vh]">
                        <PDFViewer width="100%" height="100%" showToolbar={false}>
                            <LeaseDocument data={leaseConfig} />
                        </PDFViewer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaseViewerClient;
