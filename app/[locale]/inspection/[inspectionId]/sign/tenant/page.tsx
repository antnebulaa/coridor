'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import SignatureCanvas from '@/components/inspection/SignatureCanvas';
import AudioRecorder from '@/components/inspection/AudioRecorder';
import { EDL_COLORS, ROOM_TYPE_CONFIG, CONDITION_MAP } from '@/lib/inspection';
import type { FullInspection } from '@/hooks/useInspection';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CircleCheck,
  Info,
  X,
  Sofa,
  BedDouble,
  CookingPot,
  ShowerHead,
  DoorOpen,
  Warehouse,
  Home,
} from 'lucide-react';

const ROOM_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  LIVING_ROOM: Sofa,
  BEDROOM: BedDouble,
  KITCHEN: CookingPot,
  BATHROOM: ShowerHead,
  BATHROOM_WC: ShowerHead,
  WC: DoorOpen,
  HALLWAY: DoorOpen,
  GARAGE: Warehouse,
  OTHER: Home,
};

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

  const handleClose = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
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
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle size={48} color={EDL_COLORS.orange} className="mx-auto mb-4" />
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
        <div className="text-center max-w-md mx-auto">
          <CircleCheck size={64} color={EDL_COLORS.green} className="mx-auto mb-4" />
          <div className="text-[24px] font-bold" style={{ color: EDL_COLORS.text }}>
            Signé !
          </div>
          <div className="text-[14px] mt-2" style={{ color: EDL_COLORS.text2 }}>
            Votre état des lieux est maintenant complet. Vous recevrez le PDF par email.
          </div>
          <div className="text-[12px] mt-3" style={{ color: EDL_COLORS.text3 }}>
            Signé le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  const rooms = inspection.rooms || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 py-4 flex items-start justify-between"
        style={{ borderBottom: `1px solid ${EDL_COLORS.border}` }}
      >
        <div className="pt-2">
          <div className="text-[20px] font-bold" style={{ color: EDL_COLORS.text }}>
            État des lieux
          </div>
          <div className="text-[13px] mt-0.5" style={{ color: EDL_COLORS.text2 }}>
            Vérifiez le récapitulatif et signez
          </div>
        </div>
        <button
          onClick={handleClose}
          className="mt-2 p-2 rounded-full active:scale-95"
          style={{ color: EDL_COLORS.text3 }}
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-5">
          {/* Room accordions */}
          <div className="space-y-2 mb-6">
            {rooms.map((room) => {
              const config = ROOM_TYPE_CONFIG[room.roomType];
              const RoomIcon = ROOM_ICONS[room.roomType] || Home;
              const anomalies = room.elements?.filter(
                (e) => e.condition === 'DEGRADED' || e.condition === 'OUT_OF_SERVICE'
              ) || [];
              const isExpanded = expandedRoom === room.id;
              const hasAnomalies = anomalies.length > 0;

              return (
                <div
                  key={room.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: EDL_COLORS.card,
                    border: `1px solid ${hasAnomalies ? `${EDL_COLORS.orange}40` : EDL_COLORS.border}`,
                  }}
                >
                  <button
                    onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                    className="w-full p-3 flex items-center gap-3"
                  >
                    <RoomIcon size={18} color={EDL_COLORS.text2} />
                    <div className="flex-1 text-left">
                      <div className="text-[14px] font-medium" style={{ color: EDL_COLORS.text }}>
                        {room.name}
                      </div>
                    </div>
                    {hasAnomalies ? (
                      <span
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${EDL_COLORS.orange}15`, color: EDL_COLORS.orange }}
                      >
                        <AlertTriangle size={11} />
                        {anomalies.length} dégradation{anomalies.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: EDL_COLORS.green, color: '#fff' }}
                      >
                        Conforme
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronUp size={14} color={EDL_COLORS.text3} />
                      : <ChevronDown size={14} color={EDL_COLORS.text3} />
                    }
                  </button>

                  {isExpanded && (
                    <div
                      className="px-3 pb-3 space-y-1.5"
                      style={{ borderTop: `1px solid ${EDL_COLORS.border}` }}
                    >
                      <div className="pt-2">
                        {room.elements?.filter((e) => !e.isAbsent).map((el) => {
                          const cond = el.condition ? CONDITION_MAP[el.condition] : null;
                          return (
                            <div key={el.id} className="flex items-center gap-2 py-1">
                              <div className="flex-1 text-[13px]" style={{ color: EDL_COLORS.text2 }}>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 10-day legal banner */}
          <div
            className="flex gap-3 p-4 rounded-xl mb-6"
            style={{
              background: `${EDL_COLORS.blue}10`,
              border: `1px solid ${EDL_COLORS.blue}30`,
            }}
          >
            <Info size={20} color={EDL_COLORS.blue} className="flex-shrink-0 mt-0.5" />
            <div className="text-[13px] leading-relaxed" style={{ color: EDL_COLORS.text2 }}>
              Vous disposez de <strong style={{ color: EDL_COLORS.text }}>10 jours</strong> après la remise des clés pour signaler par lettre recommandée tout défaut non visible lors de l&apos;état des lieux (art. 3-2 loi du 6 juillet 1989).
            </div>
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
            />
          </div>

          {/* Signature */}
          <SignatureCanvas onSign={handleSign} label="Votre signature" />
        </div>
      </div>
    </div>
  );
}
