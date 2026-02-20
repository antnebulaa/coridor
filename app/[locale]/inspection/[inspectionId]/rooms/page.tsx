'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import { EDL_COLORS, ROOM_TYPE_CONFIG, AI_TIPS } from '@/lib/inspection';
import type { InspectionRoomType } from '@prisma/client';
import { Plus, CheckCircle2, ChevronRight } from 'lucide-react';

const ADD_ROOM_CHIPS: { type: InspectionRoomType; label: string; icon: string }[] = [
  { type: 'BEDROOM', label: 'Chambre', icon: '🛏️' },
  { type: 'BATHROOM', label: 'Salle de bain', icon: '🚿' },
  { type: 'WC', label: 'WC', icon: '🚽' },
  { type: 'OFFICE', label: 'Bureau', icon: '💻' },
  { type: 'DRESSING', label: 'Dressing', icon: '👔' },
  { type: 'BALCONY', label: 'Balcon', icon: '🌿' },
  { type: 'TERRACE', label: 'Terrasse', icon: '☀️' },
  { type: 'CELLAR', label: 'Cave', icon: '🏚️' },
  { type: 'PARKING', label: 'Parking', icon: '🅿️' },
  { type: 'GARAGE', label: 'Garage', icon: '🚗' },
  { type: 'LAUNDRY', label: 'Buanderie', icon: '🧺' },
  { type: 'HALLWAY', label: 'Couloir', icon: '🚶' },
  { type: 'OTHER', label: 'Autre', icon: '📦' },
];

export default function RoomsHubPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection, addRoom } = useInspection(inspectionId);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const rooms = inspection?.rooms || [];
  const completedCount = rooms.filter((r) => r.isCompleted).length;
  const allCompleted = rooms.length > 0 && completedCount === rooms.length;

  const handleAddRoom = useCallback(async (type: InspectionRoomType) => {
    setIsAdding(true);
    const config = ROOM_TYPE_CONFIG[type];
    // Count existing rooms of this type for naming
    const existingOfType = rooms.filter((r) => r.roomType === type).length;
    const name = existingOfType > 0 ? `${config.label} ${existingOfType + 1}` : config.label;

    await addRoom(type, name);
    setIsAdding(false);
    setShowAddRoom(false);
  }, [rooms, addRoom]);

  const handleRoomClick = (roomId: string) => {
    router.push(`/inspection/${inspectionId}/rooms/${roomId}`);
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: EDL_COLORS.bg }}>
      <InspectionTopBar
        title="Pièces"
        subtitle={`${completedCount}/${rooms.length} complétées`}
        onBack={() => router.back()}
      />

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <InspectionAIBubble>{AI_TIPS.ROOMS_HUB}</InspectionAIBubble>

        {/* Room cards */}
        <div className="space-y-3">
          {rooms.map((room) => {
            const config = ROOM_TYPE_CONFIG[room.roomType];
            const photoCount = room.photos?.length || 0;
            const elementCount = room.elements?.length || 0;
            const qualifiedCount = room.elements?.filter((e) => e.condition || e.isAbsent).length || 0;

            return (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
                style={{
                  background: EDL_COLORS.card,
                  border: `1px solid ${room.isCompleted ? `${EDL_COLORS.green}40` : EDL_COLORS.border}`,
                }}
              >
                <div className="text-[32px]">{config?.icon || '📦'}</div>
                <div className="flex-1 text-left">
                  <div className="text-[18px] font-bold" style={{ color: EDL_COLORS.text }}>
                    {room.name}
                  </div>
                  <div className="text-[14px] mt-0.5" style={{ color: EDL_COLORS.text3 }}>
                    {room.isCompleted
                      ? `✓ ${photoCount} photos · ${qualifiedCount} éléments`
                      : elementCount > 0
                      ? `${qualifiedCount}/${elementCount} éléments qualifiés`
                      : 'Non commencée'}
                  </div>
                </div>
                {room.isCompleted ? (
                  <CheckCircle2 size={22} color={EDL_COLORS.green} />
                ) : (
                  <ChevronRight size={20} color={EDL_COLORS.text3} />
                )}
              </button>
            );
          })}
        </div>

        {/* Add room section */}
        {showAddRoom ? (
          <div className="mt-4">
            <div className="text-[17px] font-bold mb-3" style={{ color: EDL_COLORS.text2 }}>
              Choisir un type de pièce
            </div>
            <div className="flex flex-wrap gap-2.5">
              {ADD_ROOM_CHIPS.map((chip) => (
                <button
                  key={chip.type}
                  onClick={() => handleAddRoom(chip.type)}
                  disabled={isAdding}
                  className="px-4 py-2.5 rounded-2xl text-[15px] font-bold flex items-center gap-2 active:scale-95"
                  style={{
                    background: EDL_COLORS.card2,
                    color: EDL_COLORS.text2,
                    border: `1px solid ${EDL_COLORS.border}`,
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddRoom(false)}
              className="mt-3 text-[15px] font-medium"
              style={{ color: EDL_COLORS.text3 }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddRoom(true)}
            className="w-full mt-4 py-4 rounded-2xl text-[17px] font-bold flex items-center justify-center gap-2"
            style={{
              background: EDL_COLORS.card2,
              color: EDL_COLORS.text2,
              border: `1px dashed ${EDL_COLORS.border}`,
            }}
          >
            <Plus size={18} />
            Ajouter une pièce
          </button>
        )}
      </div>

      <InspectionBtn onClick={() => router.push(`/inspection/${inspectionId}/recap`)} disabled={!allCompleted}>
        {allCompleted ? 'Récapitulatif →' : `${rooms.length - completedCount} pièce(s) restante(s)`}
      </InspectionBtn>
    </div>
  );
}
