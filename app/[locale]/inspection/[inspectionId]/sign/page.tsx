'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useInspection } from '@/hooks/useInspection';
import { useEdlSync } from '@/hooks/useEdlSync';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import SignatureCanvas from '@/components/inspection/SignatureCanvas';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import { Send, CheckCircle2, Clock, Loader2, Share2, LayoutDashboard, Wifi } from 'lucide-react';

export default function SignLandlordPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection, sign } = useInspection(inspectionId);
  const { isSynced, photoStats, pendingMutations } = useEdlSync(inspectionId);
  const syncT = useTranslations('inspection.sync');
  const [landlordSigned, setLandlordSigned] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [signLinkUrl, setSignLinkUrl] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLandlordSign = async (signatureData: {
    svg: string;
    timestamp: string;
    ip?: string;
    userAgent: string;
    geoloc?: { lat: number; lng: number };
  }) => {
    await sign({ role: 'landlord', signature: signatureData });
    setLandlordSigned(true);
  };

  const handleSendLink = async () => {
    setIsSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/inspection/${inspectionId}/send-sign-link`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.sent) {
        setLinkSent(true);
        setSignLinkUrl(data.url);
      } else {
        setSendError(data.error || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      console.error('Failed to send sign link:', err);
      setSendError('Erreur réseau — vérifiez votre connexion');
    } finally {
      setIsSending(false);
    }
  };

  const handleShareLink = async () => {
    // If we don't have the link yet, generate it (without notifying)
    let url = signLinkUrl;
    if (!url) {
      try {
        const res = await fetch(`/api/inspection/${inspectionId}/sign-link`);
        const data = await res.json();
        if (res.ok && data.url) {
          url = data.url;
          setSignLinkUrl(data.url);
        } else {
          setSendError(data.error || 'Impossible de générer le lien');
          return;
        }
      } catch {
        setSendError('Erreur réseau');
        return;
      }
    }

    // Now share or copy
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Signature état des lieux',
          text: 'Signez votre état des lieux sur Coridor',
          url: url || undefined,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }

    // Copy to clipboard with fallback
    if (url) {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
        } else {
          // Fallback for HTTP / older browsers
          const textarea = document.createElement('textarea');
          textarea.value = url;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setSendError('Impossible de copier le lien');
      }
    }
  };

  const isAlreadySigned = inspection?.landlordSignature != null;
  const isTenantSigned = inspection?.tenantSignature != null;

  return (
    <div className="h-full flex flex-col">
      <InspectionTopBar title="Signature" onBack={() => router.back()} />

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Landlord signature */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] font-bold"
              style={{
                background: isAlreadySigned || landlordSigned ? t.green : t.accent,
                color: '#000',
              }}
            >
              1
            </div>
            <div className={`text-[20px] font-bold ${t.textPrimary}`}>
              Signature du bailleur
            </div>
            {(isAlreadySigned || landlordSigned) && (
              <CheckCircle2 size={22} color={t.green} />
            )}
          </div>

          {isAlreadySigned || landlordSigned ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: `${t.green}10`, border: `1px solid ${t.green}30` }}
            >
              <CheckCircle2 size={40} color={t.green} className="mx-auto mb-2" />
              <div className="text-[18px] font-bold" style={{ color: t.green }}>
                Signé
              </div>
            </div>
          ) : !isSynced ? (
            <div className="rounded-2xl p-5 border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={18} className="text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {syncT('signatureBlocked')}
                </p>
              </div>
              <div className="space-y-1">
                {(photoStats.pending + photoStats.uploading > 0) && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {syncT('photoPending', { count: photoStats.pending + photoStats.uploading })}
                  </p>
                )}
                {pendingMutations > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {syncT('mutationPending', { count: pendingMutations })}
                  </p>
                )}
              </div>
              <p className="text-sm text-amber-500 dark:text-amber-500 mt-2">
                {syncT('signatureBlockedDetail')}
              </p>
            </div>
          ) : (
            <SignatureCanvas onSign={handleLandlordSign} label="Signez ci-dessous" />
          )}
        </div>

        {/* Tenant signature link */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[16px] font-bold ${
                isTenantSigned ? '' : `bg-gray-100 ${t.textMuted}`
              }`}
              style={isTenantSigned ? { background: t.green, color: '#000' } : undefined}
            >
              2
            </div>
            <div className={`text-[20px] font-bold ${t.textPrimary}`}>
              Signature du locataire
            </div>
            {isTenantSigned && <CheckCircle2 size={22} color={t.green} />}
          </div>

          {isTenantSigned ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: `${t.green}10`, border: `1px solid ${t.green}30` }}
            >
              <CheckCircle2 size={40} color={t.green} className="mx-auto mb-2" />
              <div className="text-[18px] font-bold" style={{ color: t.green }}>
                Signé
              </div>
            </div>
          ) : (isAlreadySigned || landlordSigned) ? (
            <div className="space-y-4">
              <div className={`text-[16px] ${t.textSecondary}`}>
                {linkSent
                  ? 'Le locataire a été notifié. Il a 24h pour signer depuis son téléphone.'
                  : 'Envoyez une notification au locataire pour qu\'il signe l\'état des lieux.'}
              </div>

              {/* Send notification button */}
              <button
                onClick={handleSendLink}
                disabled={isSending || linkSent}
                className="w-full py-4 rounded-2xl text-[18px] font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{
                  background: linkSent ? `${t.green}20` : t.accent,
                  color: linkSent ? t.green : '#fff',
                  border: linkSent ? `1px solid ${t.green}40` : 'none',
                }}
              >
                {isSending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : linkSent ? (
                  <>
                    <CheckCircle2 size={20} />
                    Notification envoyée
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Envoyer la notification au locataire
                  </>
                )}
              </button>

              {/* Error message */}
              {sendError && (
                <div className="rounded-xl p-3 text-[14px] text-center bg-red-50 text-red-500 border border-red-200">
                  {sendError}
                </div>
              )}

              {/* Share link button — always visible after landlord signed */}
              <button
                onClick={handleShareLink}
                className={`w-full py-3.5 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] bg-gray-100 ${t.textSecondary} border ${t.border}`}
              >
                <Share2 size={18} />
                {copied ? 'Lien copié !' : 'Partager le lien'}
              </button>

              {linkSent && (
                <div className={`flex items-center gap-2 text-[15px] ${t.textMuted}`}>
                  <Clock size={15} />
                  En attente de la signature du locataire...
                </div>
              )}

              {/* Back to dashboard button */}
              <button
                  onClick={() => router.push('/dashboard')}
                  className={`w-full py-3.5 rounded-2xl text-[16px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] mt-2 ${t.textMuted} border ${t.border}`}
                >
                  <LayoutDashboard size={18} />
                  Retour au tableau de bord
                </button>
            </div>
          ) : (
            <div className={`rounded-2xl p-5 text-center ${t.bgCard} border ${t.border}`}>
              <div className={`text-[16px] font-medium ${t.textMuted}`}>
                Le bailleur doit signer en premier
              </div>
            </div>
          )}
        </div>
      </div>

      {(isAlreadySigned || landlordSigned) && isTenantSigned && (
        <InspectionBtn onClick={() => router.push(`/inspection/${inspectionId}/done`)}>
          Terminer →
        </InspectionBtn>
      )}
    </div>
  );
}
