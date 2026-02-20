'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import { EDL_COLORS } from '@/lib/inspection';
import { FileText, Mail, ArrowRight } from 'lucide-react';

export default function DonePage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection, generatePdf } = useInspection(inspectionId);

  // Trigger PDF generation on mount
  useEffect(() => {
    if (inspection && !inspection.pdfUrl && inspection.status === 'SIGNED') {
      generatePdf().catch(console.error);
    }
  }, [inspection, generatePdf]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6" style={{ background: EDL_COLORS.bg }}>
      {/* Success animation */}
      <div className="text-center mb-8">
        <div className="text-[72px] mb-4 animate-bounce">✅</div>
        <h1 className="text-[28px] font-bold tracking-tight" style={{ color: EDL_COLORS.text }}>
          État des lieux terminé !
        </h1>
        <p className="text-[17px] mt-3 max-w-xs" style={{ color: EDL_COLORS.text2 }}>
          Le document sera envoyé par email aux deux parties. Vous pouvez le consulter à tout moment.
        </p>
      </div>

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
          onClick={() => {
            // TODO: trigger email resend
          }}
          className="w-full py-4 rounded-2xl text-[18px] font-bold flex items-center justify-center gap-2"
          style={{
            background: EDL_COLORS.card,
            color: EDL_COLORS.text,
            border: `1px solid ${EDL_COLORS.border}`,
          }}
        >
          <Mail size={20} />
          Renvoyer par email
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
