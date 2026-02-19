'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { LeaseConfig } from '@/services/LeaseService';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { HiArrowLeft, HiArrowDownTray, HiPrinter, HiPencilSquare, HiArrowPath, HiCheckCircle, HiExclamationTriangle } from 'react-icons/hi2';
import { HiOutlineArrowsExpand } from 'react-icons/hi';
import LeaseDocument from '@/components/documents/LeaseDocument';
import dynamic from 'next/dynamic';

// Dynamically import the PDF pages renderer (needs browser APIs)
const PdfPagesRenderer = dynamic(() => import('./PdfPagesRenderer'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-neutral-500">Chargement du viewer...</p>
            </div>
        </div>
    ),
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
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [status, setStatus] = useState(leaseConfig.metadata?.status || "DRAFT");
    const [signedUrl, setSignedUrl] = useState<string | null>(leaseConfig.metadata?.signedLeaseUrl || null);
    const [signers, setSigners] = useState<Signer[]>([]);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [pdfLoading, setPdfLoading] = useState(true);

    // Validate required data for signature (phone + email for all parties)
    const missingFields = useMemo(() => {
        const issues: string[] = [];

        // Landlord checks
        if (!leaseConfig.landlord.phone) {
            issues.push(`Bailleur (${leaseConfig.landlord.name}) : numéro de téléphone manquant`);
        }
        if (!leaseConfig.landlord.email) {
            issues.push(`Bailleur (${leaseConfig.landlord.name}) : adresse email manquante`);
        }

        // Tenant checks
        for (const tenant of leaseConfig.tenants) {
            if (!tenant.phone) {
                issues.push(`Locataire (${tenant.name}) : numéro de téléphone manquant`);
            }
            if (!tenant.email) {
                issues.push(`Locataire (${tenant.name}) : adresse email manquante`);
            }
        }

        return issues;
    }, [leaseConfig]);

    const canSign = missingFields.length === 0;

    // Generate PDF blob on mount
    useEffect(() => {
        let cancelled = false;

        async function generatePdf() {
            try {
                const { pdf } = await import('@react-pdf/renderer');
                const blob = await pdf(<LeaseDocument data={leaseConfig} />).toBlob();
                if (!cancelled) setPdfBlob(blob);
            } catch (err) {
                console.error('PDF generation error:', err);
            } finally {
                if (!cancelled) setPdfLoading(false);
            }
        }

        generatePdf();
        return () => { cancelled = true; };
    }, [leaseConfig]);

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
            if (res.data.status) setStatus(res.data.status);
            if (res.data.signedUrl) setSignedUrl(res.data.signedUrl);
            if (res.data.signers) setSigners(res.data.signers);
            toast.success("Statut mis à jour");
        } catch (error) {
            toast.error("Erreur lors de la mise à jour");
            console.error(error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleDownload = useCallback(() => {
        if (!pdfBlob) return;
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Bail_Location.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [pdfBlob]);

    const handleDownloadSigned = () => {
        if (!signedUrl) return;
        if (signedUrl.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = signedUrl;
            link.download = 'Bail_Signe.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            window.open(signedUrl, '_blank');
        }
    };

    const handlePrint = useCallback(() => {
        if (!pdfBlob) return;
        const url = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
            printWindow.addEventListener('load', () => {
                printWindow.print();
            });
        }
    }, [pdfBlob]);

    const handleOpenFullscreen = useCallback(() => {
        if (!pdfBlob) return;
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
    }, [pdfBlob]);

    return (
        <div className="flex h-screen w-full bg-[#F3F4F6] text-neutral-800 font-sans">
            {/* Sidebar - Desktop only */}
            <div className="hidden lg:flex flex-col w-[300px] border-r border-neutral-200 bg-white p-6 gap-6 shrink-0">
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

                {/* Missing data warning - sidebar (desktop) */}
                {isOwner && status === 'DRAFT' && missingFields.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                        <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                            <HiExclamationTriangle size={16} />
                            Signature impossible
                        </h3>
                        <p className="text-sm text-red-700 mb-2">
                            Informations manquantes pour la signature électronique (OTP SMS) :
                        </p>
                        <ul className="text-sm text-red-600 space-y-1">
                            {missingFields.map((field, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                    <span className="mt-0.5 shrink-0">•</span>
                                    <span>{field}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {missingFields.length === 0 && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-1">Dernière étape</h3>
                        <p className="text-sm text-blue-700">
                            Vérifiez les clauses générées automatiquement avant d&apos;envoyer le bail pour signature.
                        </p>
                    </div>
                )}

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
                            {isOwner && status === 'DRAFT' && (
                                <button
                                    onClick={canSign ? handleSign : undefined}
                                    disabled={loading || !canSign}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition shadow-sm disabled:opacity-50 ${
                                        canSign
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                                    }`}
                                    title={!canSign ? 'Informations manquantes — voir le bandeau ci-dessous' : undefined}
                                >
                                    {!canSign ? <HiExclamationTriangle size={16} /> : <HiPencilSquare size={16} />}
                                    <span className="hidden sm:inline">{loading ? 'Envoi Yousign...' : 'Envoyer pour signature'}</span>
                                    <span className="sm:hidden">{loading ? 'Envoi...' : 'Signer'}</span>
                                </button>
                            )}

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

                            <button
                                onClick={handleOpenFullscreen}
                                disabled={pdfLoading}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-black rounded-lg hover:bg-neutral-100 transition disabled:opacity-50"
                                title="Ouvrir en plein écran"
                            >
                                <HiOutlineArrowsExpand size={16} />
                                <span className="hidden sm:inline">Plein écran</span>
                            </button>

                            <button
                                onClick={handlePrint}
                                disabled={pdfLoading}
                                className="hidden sm:flex text-sm font-medium text-neutral-600 hover:text-black gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition disabled:opacity-50"
                            >
                                <HiPrinter size={16} />
                                Imprimer
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={pdfLoading}
                                className="flex items-center gap-2 px-3 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-neutral-800 transition shadow-sm disabled:opacity-50"
                            >
                                <HiArrowDownTray size={16} />
                                <span className="hidden sm:inline">Télécharger</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Missing data warning - mobile banner */}
                {isOwner && status === 'DRAFT' && missingFields.length > 0 && (
                    <div className="lg:hidden bg-red-50 border-b border-red-200 px-4 py-3">
                        <div className="flex items-start gap-2">
                            <HiExclamationTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-800">Signature impossible</p>
                                <ul className="text-xs text-red-600 mt-1 space-y-0.5">
                                    {missingFields.map((field, i) => (
                                        <li key={i}>• {field}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* PDF Area - Canvas-based, fits to width, no horizontal scroll */}
                <div className="flex-1 overflow-hidden relative">
                    {pdfLoading ? (
                        <div className="flex items-center justify-center h-full bg-neutral-100">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm text-neutral-500">Génération du document...</p>
                            </div>
                        </div>
                    ) : pdfBlob ? (
                        <PdfPagesRenderer blob={pdfBlob} />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-neutral-100">
                            <p className="text-sm text-neutral-500">Erreur lors de la génération du document.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LeaseViewerClient;
