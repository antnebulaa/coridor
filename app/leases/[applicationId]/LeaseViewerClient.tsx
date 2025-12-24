'use client';

import React from 'react';
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import { LeaseConfig } from '@/services/LeaseService';
import { Button } from '@/components/ui/Button'; // Assuming we have this or similar
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { HiArrowLeft, HiArrowDownTray, HiPrinter, HiPencilSquare } from 'react-icons/hi2';
import LeaseDocument from '@/components/documents/LeaseDocument';

const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFViewer), {
    ssr: false,
    loading: () => <p>Chargement du document...</p>,
});

interface LeaseViewerClientProps {
    leaseConfig: LeaseConfig;
    isOwner: boolean;
}

const LeaseViewerClient: React.FC<LeaseViewerClientProps> = ({ leaseConfig, isOwner }) => {
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);
    const [status, setStatus] = React.useState(leaseConfig.metadata?.status || "DRAFT");

    const handleSign = async () => {
        try {
            setLoading(true);
            await axios.post(`/api/leases/${leaseConfig.application_id}/sign`);
            toast.success("Procédure de signature lancée (Yousign)");
            setStatus("PENDING_SIGNATURE");
        } catch (error) {
            toast.error("Erreur lors de l'envoi");
            console.error(error);
        } finally {
            setLoading(false);
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
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Header SaaS Style */}
                <div className="
                    h-16 
                    bg-white 
                    border-b border-neutral-200 
                    flex items-center justify-between 
                    px-6
                    flex-none
                    z-10
                ">
                    <div className="font-semibold text-lg flex items-center gap-3">
                        {/* Mobile Back Button */}
                        <div onClick={() => router.back()} className="lg:hidden cursor-pointer">
                            <HiArrowLeft />
                        </div>
                        <span>Aperçu du Document</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {isOwner && status === 'DRAFT' && (
                            <button
                                onClick={handleSign}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                            >
                                <HiPencilSquare size={18} />
                                {loading ? 'Envoi Yousign...' : 'Signer le bail'}
                            </button>
                        )}

                        {status === 'PENDING_SIGNATURE' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-lg border border-yellow-200">
                                <span>En cours de signature...</span>
                            </div>
                        )}

                        {status === 'SIGNED' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-sm font-semibold rounded-lg border border-green-200">
                                <span>Document Signé</span>
                            </div>
                        )}

                        <button className="hidden sm:flex text-sm font-medium text-neutral-600 hover:text-black gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition">
                            <HiPrinter size={18} />
                            Imprimer
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition shadow-sm">
                            <HiArrowDownTray size={18} />
                            <span>Télécharger</span>
                        </button>
                    </div>
                </div>

                {/* PDF Area */}
                <div className="flex-1 bg-neutral-100 p-4 sm:p-8 overflow-hidden relative">
                    <div className="w-full h-full shadow-lg rounded-xl overflow-hidden bg-white border border-neutral-200">
                        <PDFViewer width="100%" height="100%" showToolbar={true}>
                            <LeaseDocument data={leaseConfig} />
                        </PDFViewer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaseViewerClient;
