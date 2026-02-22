'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import { ROOM_TYPE_CONFIG, CONDITION_MAP, ANTI_FORGET_CHECKLIST, AI_TIPS } from '@/lib/inspection';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import { Check, CheckCircle2, AlertTriangle, Camera, ChevronDown, ChevronUp } from 'lucide-react';

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
                  className={`w-full rounded-2xl p-4 flex items-center gap-3 ${t.bgCard} border ${t.border}`}
                >
                  <span className="text-[24px]">{config?.icon || '📦'}</span>
                  <div className="flex-1 text-left">
                    <div className={`text-[17px] font-bold ${t.textPrimary}`}>
                      {room.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`flex items-center gap-1 text-[14px] ${t.textMuted}`}>
                        <Camera size={13} /> {photoCount}
                      </span>
                      {degradedCount > 0 && (
                        <span className="flex items-center gap-1 text-[14px]" style={{ color: t.orange }}>
                          <AlertTriangle size={13} /> {degradedCount} anomalie{degradedCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 size={20} color={room.isCompleted ? t.green : undefined} className={room.isCompleted ? '' : t.textMuted} />
                  {isExpanded ? (
                    <ChevronUp size={18} className={t.textMuted} />
                  ) : (
                    <ChevronDown size={18} className={t.textMuted} />
                  )}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    className={`mt-1 rounded-2xl p-4 space-y-2 bg-gray-50 border ${t.border}`}
                  >
                    {room.elements?.map((el) => {
                      if (el.isAbsent) return null;
                      const cond = el.condition ? CONDITION_MAP[el.condition] : null;
                      return (
                        <div key={el.id} className="flex items-center gap-2 py-0.5">
                          <div className={`flex-1 text-[15px] ${t.textSecondary}`}>
                            {el.name}
                            {el.nature && (
                              <span className={t.textMuted}> ({el.nature})</span>
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
                      <div className={`pt-2 mt-2 border-t ${t.border}`}>
                        <div className={`text-[13px] font-medium ${t.textMuted}`}>Observation :</div>
                        <div className={`text-[15px] italic ${t.textSecondary}`}>
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
          <div className={`text-[18px] font-bold mb-3 ${t.textPrimary}`}>
            Checklist anti-oubli
          </div>
          <div className={`rounded-2xl p-4 space-y-3 ${t.bgCard} border ${t.border}`}>
            {ANTI_FORGET_CHECKLIST.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className="flex items-center gap-3 w-full py-1"
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    checkedItems.has(item.id) ? '' : `border-2 ${t.border}`
                  }`}
                  style={checkedItems.has(item.id) ? { background: t.green } : undefined}
                >
                  {checkedItems.has(item.id) && <Check size={14} color="#fff" strokeWidth={3} />}
                </div>
                <span className="text-[16px]">{item.icon}</span>
                <span className={`text-[16px] font-medium ${t.textSecondary}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Hand-off instruction */}
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: `${t.accent}10`, border: `1px solid ${t.accent}30` }}
        >
          <div className="text-[36px] mb-2">📱</div>
          <div className={`text-[18px] font-bold ${t.textPrimary}`}>
            Tendez le téléphone au locataire
          </div>
          <div className={`text-[15px] mt-1.5 ${t.textSecondary}`}>
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
