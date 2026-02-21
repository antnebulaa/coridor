'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import type { InspectionRoomWithElements } from '@/hooks/useInspection';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import { EDL_COLORS, ROOM_TYPE_CONFIG, AI_TIPS } from '@/lib/inspection';
import type { InspectionRoomType } from '@prisma/client';
import {
  Plus, CheckCircle2, ChevronRight,
  DoorOpen, ArrowLeftRight, Sofa, BedDouble, CookingPot, ShowerHead,
  Droplets, WashingMachine, Monitor, Shirt, Flower2, Sun,
  Warehouse, CircleParking, Car, Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ROOM_ICONS: Record<InspectionRoomType, LucideIcon> = {
  ENTRY: DoorOpen,
  HALLWAY: ArrowLeftRight,
  LIVING: Sofa,
  BEDROOM: BedDouble,
  KITCHEN: CookingPot,
  BATHROOM: ShowerHead,
  WC: Droplets,
  LAUNDRY: WashingMachine,
  OFFICE: Monitor,
  DRESSING: Shirt,
  BALCONY: Flower2,
  TERRACE: Sun,
  CELLAR: Warehouse,
  PARKING: CircleParking,
  GARAGE: Car,
  OTHER: Package,
};

const ADD_ROOM_CHIPS: { type: InspectionRoomType; label: string }[] = [
  { type: 'BEDROOM', label: 'Chambre' },
  { type: 'BATHROOM', label: 'Salle de bain' },
  { type: 'WC', label: 'WC' },
  { type: 'OFFICE', label: 'Bureau' },
  { type: 'DRESSING', label: 'Dressing' },
  { type: 'BALCONY', label: 'Balcon' },
  { type: 'TERRACE', label: 'Terrasse' },
  { type: 'CELLAR', label: 'Cave' },
  { type: 'PARKING', label: 'Parking' },
  { type: 'GARAGE', label: 'Garage' },
  { type: 'LAUNDRY', label: 'Buanderie' },
  { type: 'HALLWAY', label: 'Couloir' },
  { type: 'OTHER', label: 'Autre' },
];

export default function RoomsHubPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection, addRoom } = useInspection(inspectionId);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const rooms: InspectionRoomWithElements[] = inspection?.rooms || [];
  const completedCount = rooms.filter((r) => r.isCompleted).length;
  const allCompleted = rooms.length > 0 && completedCount === rooms.length;

  const handleAddRoom = useCallback(async (type: InspectionRoomType) => {
    setIsAdding(true);
    const config = ROOM_TYPE_CONFIG[type];
    const existingOfType = rooms.filter((r) => r.roomType === type).length;
    const name = existingOfType > 0 ? `${config.label} ${existingOfType + 1}` : config.label;

    await addRoom(type, name);
    setIsAdding(false);
    setShowAddRoom(false);
  }, [rooms, addRoom]);

  const handleRoomClick = (roomId: string) => {
    router.push(`/inspection/${inspectionId}/rooms/${roomId}`);
  };

  // Skeleton loading state
  if (!inspection) {
    return (
      <div className="h-full flex flex-col" style={{ background: EDL_COLORS.bg }}>
        <InspectionTopBar title="Pièces" subtitle="Chargement..." onBack={() => router.back()} />
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-full rounded-2xl p-4 flex items-center gap-4 animate-pulse"
                style={{ background: EDL_COLORS.card }}
              >
                <div className="w-[26px] h-[26px] rounded-lg" style={{ background: EDL_COLORS.card2 }} />
                <div className="flex-1">
                  <div className="h-5 w-28 rounded-lg mb-2" style={{ background: EDL_COLORS.card2 }} />
                  <div className="h-3.5 w-40 rounded-lg" style={{ background: EDL_COLORS.card2 }} />
                </div>
                <div className="w-5 h-5 rounded-full" style={{ background: EDL_COLORS.card2 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
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
                  border: `0px solid ${room.isCompleted ? `${EDL_COLORS.green}40` : EDL_COLORS.border}`,
                }}
              >
                <div style={{ color: EDL_COLORS.text2 }}>
                  {React.createElement(ROOM_ICONS[room.roomType] || Package, { size: 26 })}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[18px] font-medium" style={{ color: EDL_COLORS.text }}>
                    {room.name}
                  </div>
                  <div className="text-[14px] mt-0" style={{ color: EDL_COLORS.text3 }}>
                    {room.isCompleted
                      ? `${photoCount} photos · ${qualifiedCount} éléments`
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
            <div className="text-[17px] font-semibold mb-3" style={{ color: EDL_COLORS.text2 }}>
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
                  {React.createElement(ROOM_ICONS[chip.type] || Package, { size: 16 })}
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
            className="w-full mt-4 py-4 rounded-2xl text-[17px] font-medium flex items-center justify-center gap-2"
            style={{
              background: EDL_COLORS.accent,
              color: EDL_COLORS.text,
              border: `0px solid ${EDL_COLORS.border}`,
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
