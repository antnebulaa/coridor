'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import SignatureCanvas from '@/components/inspection/SignatureCanvas';
import { EDL_COLORS } from '@/lib/inspection';
import { Send, CheckCircle2, Clock, Loader2 } from 'lucide-react';

export default function SignLandlordPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection, sign, getSignLink } = useInspection(inspectionId);
  const [landlordSigned, setLandlordSigned] = useState(false);
  const [signLinkUrl, setSignLinkUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

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
    try {
      const url = await getSignLink();
      if (url) {
        setSignLinkUrl(url);
        setLinkSent(true);

        // Try to share via Web Share API
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Signature état des lieux',
              text: 'Signez votre état des lieux sur Coridor',
              url,
            });
          } catch {
            // User cancelled share — that's ok, link is still copied
          }
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(url);
        }
      }
    } catch (err) {
      console.error('Failed to generate sign link:', err);
    } finally {
      setIsSending(false);
    }
  };

  const isAlreadySigned = inspection?.landlordSignature != null;
  const isTenantSigned = inspection?.tenantSignature != null;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: EDL_COLORS.bg }}>
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
                Envoyez le lien de signature au locataire. Il a 24h pour signer depuis son téléphone.
              </div>

              <button
                onClick={handleSendLink}
                disabled={isSending || linkSent}
                className="w-full py-4 rounded-2xl text-[18px] font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{
                  background: linkSent ? `${EDL_COLORS.green}20` : EDL_COLORS.accent,
                  color: linkSent ? EDL_COLORS.green : '#000',
                  border: linkSent ? `1px solid ${EDL_COLORS.green}40` : 'none',
                }}
              >
                {isSending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : linkSent ? (
                  <>
                    <CheckCircle2 size={20} />
                    Lien envoyé
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Envoyer le lien de signature
                  </>
                )}
              </button>

              {linkSent && (
                <div className="flex items-center gap-2 text-[15px]" style={{ color: EDL_COLORS.text3 }}>
                  <Clock size={15} />
                  En attente de la signature du locataire...
                </div>
              )}
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
