'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import { EDL_COLORS } from '@/lib/inspection';
import { FileText, Mail, ArrowRight, CircleCheck, CheckCircle2, Info, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface Amendment {
  id: string;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  requestedBy: string;
  responseNote: string | null;
  createdAt: string;
  respondedAt: string | null;
}

export default function DonePage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const session = useSession();
  const { inspection, generatePdf } = useInspection(inspectionId);
  const [emailSent, setEmailSent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Amendments
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [amendmentText, setAmendmentText] = useState('');
  const [isSubmittingAmendment, setIsSubmittingAmendment] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const currentUserId = (session.data?.user as { id?: string })?.id;
  const isTenant = currentUserId === inspection?.tenantId;
  const isLandlord = currentUserId === inspection?.landlordId;

  // Check if within 10-day window
  const isWithin10Days = (() => {
    if (!inspection?.tenantSignedAt) return false;
    const deadline = new Date(inspection.tenantSignedAt as string);
    deadline.setDate(deadline.getDate() + 10);
    return new Date() <= deadline;
  })();

  // Days remaining
  const daysRemaining = (() => {
    if (!inspection?.tenantSignedAt) return 0;
    const deadline = new Date(inspection.tenantSignedAt as string);
    deadline.setDate(deadline.getDate() + 10);
    const diff = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  })();

  // Fetch amendments
  const fetchAmendments = useCallback(async () => {
    try {
      const res = await fetch(`/api/inspection/${inspectionId}/amendments`);
      if (res.ok) {
        const data = await res.json();
        setAmendments(data);
      }
    } catch { /* silent */ }
  }, [inspectionId]);

  useEffect(() => {
    if (inspection?.status === 'SIGNED') {
      fetchAmendments();
    }
  }, [inspection?.status, fetchAmendments]);

  // Trigger PDF generation on mount
  useEffect(() => {
    if (inspection && !inspection.pdfUrl && inspection.status === 'SIGNED') {
      generatePdf().catch(console.error);
    }
  }, [inspection, generatePdf]);

  const handleResendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/inspection/${inspectionId}/send-email`, {
        method: 'POST',
      });
      if (res.ok) {
        setEmailSent(true);
      }
    } catch (err) {
      console.error('Failed to resend email:', err);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSubmitAmendment = async () => {
    if (!amendmentText.trim()) return;
    setIsSubmittingAmendment(true);
    try {
      const res = await fetch(`/api/inspection/${inspectionId}/amendments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: amendmentText.trim() }),
      });
      if (res.ok) {
        toast.success('Demande envoyée au propriétaire');
        setAmendmentText('');
        setShowAmendmentForm(false);
        fetchAmendments();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setIsSubmittingAmendment(false);
    }
  };

  const handleRespondAmendment = async (amendmentId: string, status: 'ACCEPTED' | 'REJECTED') => {
    setRespondingId(amendmentId);
    try {
      const res = await fetch(`/api/inspection/${inspectionId}/amendments/${amendmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === 'ACCEPTED' ? 'Rectification acceptée' : 'Rectification refusée');
        fetchAmendments();
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setRespondingId(null);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const landlordSignedDate = formatDate(inspection?.landlordSignedAt as string | null);
  const tenantSignedDate = formatDate(inspection?.tenantSignedAt as string | null);

  return (
    <div className="h-full flex flex-col items-center overflow-y-auto px-6 py-12">
      {/* Success animation */}
      <div className="text-center mb-6">
        <CircleCheck size={72} color={EDL_COLORS.green} className="mx-auto mb-4 animate-bounce" />
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: EDL_COLORS.text }}>
          État des lieux terminé !
        </h1>
        <p className="text-[17px] mt-3 max-w-xs" style={{ color: EDL_COLORS.text2 }}>
          Le document a été envoyé par email aux deux parties.
        </p>
      </div>

      {/* Signature recap */}
      {(landlordSignedDate || tenantSignedDate) && (
        <div
          className="w-full max-w-sm rounded-2xl p-4 mb-4 space-y-2"
          style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
        >
          {landlordSignedDate && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} color={EDL_COLORS.green} />
              <span className="text-[14px]" style={{ color: EDL_COLORS.text2 }}>
                Bailleur signé le {landlordSignedDate}
              </span>
            </div>
          )}
          {tenantSignedDate && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} color={EDL_COLORS.green} />
              <span className="text-[14px]" style={{ color: EDL_COLORS.text2 }}>
                Locataire signé le {tenantSignedDate}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 10-day legal banner */}
      <div
        className="w-full max-w-sm flex gap-3 p-4 rounded-xl mb-4"
        style={{
          background: `${EDL_COLORS.blue}10`,
          border: `1px solid ${EDL_COLORS.blue}30`,
        }}
      >
        <Info size={18} color={EDL_COLORS.blue} className="shrink-0 mt-0.5" />
        <div className="text-[12px] leading-relaxed" style={{ color: EDL_COLORS.text2 }}>
          {isWithin10Days ? (
            <>Le locataire dispose de <strong style={{ color: EDL_COLORS.text }}>{daysRemaining} jour{daysRemaining > 1 ? 's' : ''}</strong> pour signaler tout défaut non visible (art. 3-2 loi du 6 juillet 1989).</>
          ) : (
            <>Le délai de 10 jours pour signaler des défauts est expiré.</>
          )}
        </div>
      </div>

      {/* Amendments section */}
      {inspection?.status === 'SIGNED' && (
        <div className="w-full max-w-sm mb-6">
          {/* Tenant: request amendment button */}
          {isTenant && isWithin10Days && !showAmendmentForm && (
            <button
              onClick={() => setShowAmendmentForm(true)}
              className="w-full py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 mb-3"
              style={{
                background: `${EDL_COLORS.blue}10`,
                color: EDL_COLORS.blue,
                border: `1px solid ${EDL_COLORS.blue}30`,
              }}
            >
              <AlertTriangle size={16} />
              Signaler un défaut
            </button>
          )}

          {/* Amendment form */}
          {showAmendmentForm && (
            <div
              className="rounded-xl p-4 mb-3 space-y-3"
              style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
            >
              <p className="text-[13px] font-medium" style={{ color: EDL_COLORS.text }}>
                Décrivez le défaut constaté
              </p>
              <textarea
                value={amendmentText}
                onChange={(e) => setAmendmentText(e.target.value)}
                placeholder="Ex: Fissure non visible derrière le meuble de la chambre..."
                rows={3}
                maxLength={500}
                className="w-full text-[14px] border rounded-lg p-3 resize-none focus:outline-none focus:ring-2"
                style={{
                  borderColor: EDL_COLORS.border,
                  color: EDL_COLORS.text,
                  background: 'transparent',
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitAmendment}
                  disabled={isSubmittingAmendment || !amendmentText.trim()}
                  className="flex-1 py-2.5 rounded-lg text-[14px] font-semibold text-white disabled:opacity-50"
                  style={{ background: EDL_COLORS.blue }}
                >
                  {isSubmittingAmendment ? 'Envoi...' : 'Envoyer'}
                </button>
                <button
                  onClick={() => { setShowAmendmentForm(false); setAmendmentText(''); }}
                  className="px-4 py-2.5 rounded-lg text-[14px]"
                  style={{ color: EDL_COLORS.text3 }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Amendments list */}
          {amendments.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium mb-2" style={{ color: EDL_COLORS.text2 }}>
                Demandes de rectification ({amendments.length})
              </p>
              {amendments.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl p-3 space-y-2"
                  style={{
                    background: a.status === 'PENDING' ? `${EDL_COLORS.blue}08` : EDL_COLORS.card,
                    border: `1px solid ${
                      a.status === 'ACCEPTED' ? `${EDL_COLORS.green}40`
                      : a.status === 'REJECTED' ? '#ef444440'
                      : EDL_COLORS.border
                    }`,
                  }}
                >
                  <p className="text-[13px]" style={{ color: EDL_COLORS.text }}>
                    {a.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: a.status === 'ACCEPTED' ? `${EDL_COLORS.green}20`
                          : a.status === 'REJECTED' ? '#ef444420'
                          : `${EDL_COLORS.blue}15`,
                        color: a.status === 'ACCEPTED' ? EDL_COLORS.green
                          : a.status === 'REJECTED' ? '#ef4444'
                          : EDL_COLORS.blue,
                      }}
                    >
                      {a.status === 'PENDING' ? 'En attente' : a.status === 'ACCEPTED' ? 'Acceptée' : 'Refusée'}
                    </span>
                    <span className="text-[11px]" style={{ color: EDL_COLORS.text3 }}>
                      {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {a.responseNote && (
                    <p className="text-[12px] italic" style={{ color: EDL_COLORS.text3 }}>
                      Réponse : {a.responseNote}
                    </p>
                  )}
                  {/* Landlord: respond buttons */}
                  {isLandlord && a.status === 'PENDING' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleRespondAmendment(a.id, 'ACCEPTED')}
                        disabled={respondingId === a.id}
                        className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white flex items-center justify-center gap-1"
                        style={{ background: EDL_COLORS.green }}
                      >
                        <Check size={14} /> Accepter
                      </button>
                      <button
                        onClick={() => handleRespondAmendment(a.id, 'REJECTED')}
                        disabled={respondingId === a.id}
                        className="flex-1 py-2 rounded-lg text-[13px] font-medium text-white flex items-center justify-center gap-1 bg-red-500"
                      >
                        <X size={14} /> Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="w-full max-w-sm space-y-3">
        {inspection?.pdfUrl && (
          <a
            href={inspection.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl text-[18px] font-bold flex items-center justify-center gap-2"
            style={{ background: EDL_COLORS.accent, color: '#000' }}
          >
            <FileText size={20} />
            Voir le PDF
          </a>
        )}

        <button
          onClick={handleResendEmail}
          disabled={isSendingEmail || emailSent}
          className="w-full py-4 rounded-2xl text-[18px] font-bold flex items-center justify-center gap-2"
          style={{
            background: emailSent ? `${EDL_COLORS.green}20` : EDL_COLORS.card,
            color: emailSent ? EDL_COLORS.green : EDL_COLORS.text,
            border: `1px solid ${emailSent ? `${EDL_COLORS.green}40` : EDL_COLORS.border}`,
          }}
        >
          {isSendingEmail ? (
            <Loader2 size={20} className="animate-spin" />
          ) : emailSent ? (
            <>
              <CheckCircle2 size={20} />
              Email envoyé
            </>
          ) : (
            <>
              <Mail size={20} />
              Renvoyer par email
            </>
          )}
        </button>

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full py-4 rounded-2xl text-[17px] font-bold flex items-center justify-center gap-2"
          style={{ color: EDL_COLORS.text3 }}
        >
          Retour au tableau de bord
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
