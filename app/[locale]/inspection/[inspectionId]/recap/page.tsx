'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import { EDL_COLORS, ROOM_TYPE_CONFIG, CONDITION_MAP, ANTI_FORGET_CHECKLIST, AI_TIPS } from '@/lib/inspection';
import { CheckCircle2, AlertTriangle, Camera, ChevronDown, ChevronUp } from 'lucide-react';

export default function RecapPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection } = useInspection(inspectionId);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const rooms = inspection?.rooms || [];
  const totalPhotos = inspection?.photos?.length || 0;

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <InspectionTopBar
        title="Récapitulatif"
        subtitle={`${rooms.length} pièces · ${totalPhotos} photos`}
        onBack={() => router.back()}
      />

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <InspectionAIBubble>{AI_TIPS.RECAP}</InspectionAIBubble>

        {/* Room summaries */}
        <div className="space-y-2 mb-6">
          {rooms.map((room) => {
            const config = ROOM_TYPE_CONFIG[room.roomType];
            const photoCount = room.photos?.length || 0;
            const degradedCount = room.elements?.filter(
              (e) => e.condition === 'DEGRADED' || e.condition === 'OUT_OF_SERVICE'
            ).length || 0;
            const isExpanded = expandedRoom === room.id;

            return (
              <div key={room.id}>
                <button
                  onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                  className="w-full rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
                >
                  <span className="text-[24px]">{config?.icon || '📦'}</span>
                  <div className="flex-1 text-left">
                    <div className="text-[17px] font-bold" style={{ color: EDL_COLORS.text }}>
                      {room.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-[14px]" style={{ color: EDL_COLORS.text3 }}>
                        <Camera size={13} /> {photoCount}
                      </span>
                      {degradedCount > 0 && (
                        <span className="flex items-center gap-1 text-[14px]" style={{ color: EDL_COLORS.orange }}>
                          <AlertTriangle size={13} /> {degradedCount} anomalie{degradedCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 size={20} color={room.isCompleted ? EDL_COLORS.green : EDL_COLORS.text3} />
                  {isExpanded ? (
                    <ChevronUp size={18} color={EDL_COLORS.text3} />
                  ) : (
                    <ChevronDown size={18} color={EDL_COLORS.text3} />
                  )}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    className="mt-1 rounded-2xl p-4 space-y-2"
                    style={{ background: EDL_COLORS.card2, border: `1px solid ${EDL_COLORS.border}` }}
                  >
                    {room.elements?.map((el) => {
                      if (el.isAbsent) return null;
                      const cond = el.condition ? CONDITION_MAP[el.condition] : null;
                      return (
                        <div key={el.id} className="flex items-center gap-2 py-0.5">
                          <div className="flex-1 text-[15px]" style={{ color: EDL_COLORS.text2 }}>
                            {el.name}
                            {el.nature && (
                              <span style={{ color: EDL_COLORS.text3 }}> ({el.nature})</span>
                            )}
                          </div>
                          {cond && (
                            <span
                              className="text-[13px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: `${cond.color}20`, color: cond.color }}
                            >
                              {cond.shortLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {room.observations && (
                      <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${EDL_COLORS.border}` }}>
                        <div className="text-[13px] font-medium" style={{ color: EDL_COLORS.text3 }}>Observation :</div>
                        <div className="text-[15px] italic" style={{ color: EDL_COLORS.text2 }}>
                          {room.observations}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Anti-forget checklist */}
        <div className="mb-5">
          <div className="text-[18px] font-bold mb-3" style={{ color: EDL_COLORS.text }}>
            Checklist anti-oubli
          </div>
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
          >
            {ANTI_FORGET_CHECKLIST.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className="flex items-center gap-3 w-full py-1"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: checkedItems.has(item.id) ? EDL_COLORS.green : 'transparent',
                    border: checkedItems.has(item.id) ? 'none' : `2px solid ${EDL_COLORS.border}`,
                  }}
                >
                  {checkedItems.has(item.id) && <span className="text-[12px] font-bold">✓</span>}
                </div>
                <span className="text-[16px]">{item.icon}</span>
                <span className="text-[16px] font-medium" style={{ color: EDL_COLORS.text2 }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Hand-off instruction */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: `${EDL_COLORS.accent}10`, border: `1px solid ${EDL_COLORS.accent}30` }}
        >
          <div className="text-[36px] mb-2">📱</div>
          <div className="text-[18px] font-bold" style={{ color: EDL_COLORS.text }}>
            Tendez le téléphone au locataire
          </div>
          <div className="text-[15px] mt-1.5" style={{ color: EDL_COLORS.text2 }}>
            Le locataire pourra revoir le récapitulatif et ajouter des réserves avant de signer.
          </div>
        </div>
      </div>

      <InspectionBtn onClick={() => router.push(`/inspection/${inspectionId}/sign`)}>
        Passer à la signature →
      </InspectionBtn>
    </div>
  );
}
