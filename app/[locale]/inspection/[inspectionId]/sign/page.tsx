'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import SignatureCanvas from '@/components/inspection/SignatureCanvas';
import { EDL_COLORS } from '@/lib/inspection';
import { Send, CheckCircle2, Clock, Loader2, Share2, LayoutDashboard } from 'lucide-react';

export default function SignLandlordPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection, sign } = useInspection(inspectionId);
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
                background: isAlreadySigned || landlordSigned ? EDL_COLORS.green : EDL_COLORS.accent,
                color: '#000',
              }}
            >
              1
            </div>
            <div className="text-[20px] font-bold" style={{ color: EDL_COLORS.text }}>
              Signature du bailleur
            </div>
            {(isAlreadySigned || landlordSigned) && (
              <CheckCircle2 size={22} color={EDL_COLORS.green} />
            )}
          </div>

          {isAlreadySigned || landlordSigned ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: `${EDL_COLORS.green}10`, border: `1px solid ${EDL_COLORS.green}30` }}
            >
              <CheckCircle2 size={40} color={EDL_COLORS.green} className="mx-auto mb-2" />
              <div className="text-[18px] font-bold" style={{ color: EDL_COLORS.green }}>
                Signé
              </div>
            </div>
          ) : (
            <SignatureCanvas onSign={handleLandlordSign} label="Signez ci-dessous" />
          )}
        </div>

        {/* Tenant signature link */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] font-bold"
              style={{
                background: isTenantSigned ? EDL_COLORS.green : EDL_COLORS.card2,
                color: isTenantSigned ? '#000' : EDL_COLORS.text3,
              }}
            >
              2
            </div>
            <div className="text-[20px] font-bold" style={{ color: EDL_COLORS.text }}>
              Signature du locataire
            </div>
            {isTenantSigned && <CheckCircle2 size={22} color={EDL_COLORS.green} />}
          </div>

          {isTenantSigned ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: `${EDL_COLORS.green}10`, border: `1px solid ${EDL_COLORS.green}30` }}
            >
              <CheckCircle2 size={40} color={EDL_COLORS.green} className="mx-auto mb-2" />
              <div className="text-[18px] font-bold" style={{ color: EDL_COLORS.green }}>
                Signé
              </div>
            </div>
          ) : (isAlreadySigned || landlordSigned) ? (
            <div className="space-y-4">
              <div className="text-[16px]" style={{ color: EDL_COLORS.text2 }}>
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
                  background: linkSent ? `${EDL_COLORS.green}20` : EDL_COLORS.accent,
                  color: linkSent ? EDL_COLORS.green : '#fff',
                  border: linkSent ? `1px solid ${EDL_COLORS.green}40` : 'none',
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
                <div
                  className="rounded-xl p-3 text-[14px] text-center"
                  style={{ background: '#ff4d4f15', color: '#ff4d4f', border: '1px solid #ff4d4f30' }}
                >
                  {sendError}
                </div>
              )}

              {/* Share link button — always visible after landlord signed */}
              <button
                onClick={handleShareLink}
                className="w-full py-3.5 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{
                  background: EDL_COLORS.card2,
                  color: EDL_COLORS.text2,
                  border: `1px solid ${EDL_COLORS.border}`,
                }}
              >
                <Share2 size={18} />
                {copied ? 'Lien copié !' : 'Partager le lien'}
              </button>

              {linkSent && (
                <div className="flex items-center gap-2 text-[15px]" style={{ color: EDL_COLORS.text3 }}>
                  <Clock size={15} />
                  En attente de la signature du locataire...
                </div>
              )}

              {/* Back to dashboard button */}
              <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3.5 rounded-2xl text-[16px] font-medium flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
                  style={{
                    background: 'transparent',
                    color: EDL_COLORS.text3,
                    border: `1px solid ${EDL_COLORS.border}`,
                  }}
                >
                  <LayoutDashboard size={18} />
                  Retour au tableau de bord
                </button>
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
            >
              <div className="text-[16px] font-medium" style={{ color: EDL_COLORS.text3 }}>
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
