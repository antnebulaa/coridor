'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import SignatureCanvas from '@/components/inspection/SignatureCanvas';
import AudioRecorder from '@/components/inspection/AudioRecorder';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import { EDL_COLORS, ROOM_TYPE_CONFIG, CONDITION_MAP } from '@/lib/inspection';
import type { FullInspection } from '@/hooks/useInspection';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TenantSignPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [inspection, setInspection] = useState<FullInspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserves, setReserves] = useState('');
  const [signed, setSigned] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);

  // Fetch inspection data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/inspection/${inspectionId}`);
        if (!res.ok) throw new Error('Failed to load inspection');
        const data = await res.json();
        setInspection(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [inspectionId]);

  const handleSign = async (signatureData: {
    svg: string;
    timestamp: string;
    ip?: string;
    userAgent: string;
    geoloc?: { lat: number; lng: number };
  }) => {
    try {
      const res = await fetch(`/api/inspection/${inspectionId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'tenant',
          signature: signatureData,
          reserves: reserves || undefined,
          token,
        }),
      });

      if (!res.ok) throw new Error('Failed to sign');
      setSigned(true);
    } catch (err) {
      console.error('Sign failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[14px]" style={{ color: EDL_COLORS.text2 }}>Chargement...</div>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-[48px] mb-4">⚠️</div>
          <div className="text-[16px] font-semibold" style={{ color: EDL_COLORS.text }}>
            Lien invalide ou expiré
          </div>
          <div className="text-[13px] mt-2" style={{ color: EDL_COLORS.text2 }}>
            Demandez au propriétaire de vous renvoyer un nouveau lien de signature.
          </div>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-[64px] mb-4">✅</div>
          <div className="text-[24px] font-bold" style={{ color: EDL_COLORS.text }}>
            Signé !
          </div>
          <div className="text-[14px] mt-2" style={{ color: EDL_COLORS.text2 }}>
            Votre état des lieux est maintenant complet. Vous recevrez le PDF par email.
          </div>
        </div>
      </div>
    );
  }

  const rooms = inspection.rooms || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pt-safe px-5 py-4" style={{ borderBottom: `1px solid ${EDL_COLORS.border}` }}>
        <div className="text-[20px] font-bold" style={{ color: EDL_COLORS.text }}>
          État des lieux
        </div>
        <div className="text-[13px] mt-0.5" style={{ color: EDL_COLORS.text2 }}>
          Vérifiez le récapitulatif et signez
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Room accordions — only anomalies visible by default */}
        <div className="space-y-2 mb-6">
          {rooms.map((room) => {
            const config = ROOM_TYPE_CONFIG[room.roomType];
            const anomalies = room.elements?.filter(
              (e) => e.condition === 'DEGRADED' || e.condition === 'OUT_OF_SERVICE'
            ) || [];
            const isExpanded = expandedRoom === room.id;
            const hasAnomalies = anomalies.length > 0;

            return (
              <div key={room.id}>
                <button
                  onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                  className="w-full rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: EDL_COLORS.card,
                    border: `1px solid ${hasAnomalies ? `${EDL_COLORS.orange}40` : EDL_COLORS.border}`,
                  }}
                >
                  <span className="text-[18px]">{config?.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="text-[14px] font-medium" style={{ color: EDL_COLORS.text }}>
                      {room.name}
                    </div>
                  </div>
                  {hasAnomalies ? (
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: EDL_COLORS.orange }}>
                      <AlertTriangle size={12} /> {anomalies.length}
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: EDL_COLORS.green }}>Conforme</span>
                  )}
                  {isExpanded ? <ChevronUp size={14} color={EDL_COLORS.text3} /> : <ChevronDown size={14} color={EDL_COLORS.text3} />}
                </button>

                {isExpanded && (
                  <div
                    className="mt-1 rounded-xl p-3 space-y-1.5"
                    style={{ background: EDL_COLORS.card2 }}
                  >
                    {room.elements?.filter((e) => !e.isAbsent).map((el) => {
                      const cond = el.condition ? CONDITION_MAP[el.condition] : null;
                      return (
                        <div key={el.id} className="flex items-center gap-2 py-0.5">
                          <div className="flex-1 text-[12px]" style={{ color: EDL_COLORS.text2 }}>
                            {el.name}
                          </div>
                          {cond && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: `${cond.color}20`, color: cond.color }}
                            >
                              {cond.shortLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reserves */}
        <div className="mb-6">
          <div className="text-[14px] font-semibold mb-2" style={{ color: EDL_COLORS.text }}>
            Réserves (optionnel)
          </div>
          <AudioRecorder
            value={reserves}
            onChange={setReserves}
            placeholder="Maintenez pour dicter vos réserves"
            label="Ajoutez vos réserves"
          />
        </div>

        {/* Signature */}
        <SignatureCanvas onSign={handleSign} label="Votre signature" />
      </div>
    </div>
  );
}
