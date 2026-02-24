'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import type { InspectionRoomWithElements } from '@/hooks/useInspection';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import BottomSheet from '@/components/ui/BottomSheet';
import { ROOM_TYPE_CONFIG, AI_TIPS } from '@/lib/inspection';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import type { InspectionRoomType } from '@prisma/client';
import {
  Plus, Check, ChevronRight, LogOut, Trash2, X,
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
  BATHROOM_WC: ShowerHead,
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
  { type: 'BATHROOM_WC', label: 'SdB + WC' },
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
  const { inspection, addRoom, deleteRoom } = useInspection(inspectionId);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [collapsingRoomId, setCollapsingRoomId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      <div className="h-full flex flex-col">
        <InspectionTopBar title="Pièces" subtitle="Chargement..." onBack={() => router.back()} />
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-full rounded-2xl p-4 flex items-center gap-4 animate-pulse ${t.bgCard}`}
              >
                <div className="w-[26px] h-[26px] rounded-lg bg-gray-100" />
                <div className="flex-1">
                  <div className="h-5 w-28 rounded-lg mb-2 bg-gray-100" />
                  <div className="h-3.5 w-40 rounded-lg bg-gray-100" />
                </div>
                <div className="w-5 h-5 rounded-full bg-gray-100" />
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
        onBack={() => { if (editMode) setEditMode(false); else router.back(); }}
        onClose={() => router.push('/dashboard')}
        right={
          <button
            onClick={() => setEditMode(!editMode)}
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-colors ${editMode ? 'bg-red-100' : 'bg-gray-100'}`}
          >
            <Trash2 size={16} className={editMode ? 'text-red-500' : t.textMuted} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <InspectionAIBubble>{AI_TIPS.ROOMS_HUB}</InspectionAIBubble>

        {/* Room cards */}
        <div>
          {rooms.map((room) => {
            const photoCount = room.photos?.length || 0;
            const elementCount = room.elements?.length || 0;
            const qualifiedCount = room.elements?.filter((e) => e.condition || e.isAbsent).length || 0;

            const isDeleting = deletingRoomId === room.id;
            const isCollapsing = collapsingRoomId === room.id;

            return (
              <div
                key={room.id}
                ref={(el) => { cardRefs.current[room.id] = el; }}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={isCollapsing ? { maxHeight: 0, marginBottom: 0, opacity: 0 } : { maxHeight: cardRefs.current[room.id]?.scrollHeight ?? 200, marginBottom: 12 }}
              >
                <button
                  onClick={() => editMode ? setRoomToDelete(room.id) : handleRoomClick(room.id)}
                  className={`w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 active:scale-[0.98] ${room.isCompleted ? t.roomCardCompleted : t.roomCardDefault} ${isDeleting ? 'scale-90 opacity-0 -translate-x-8' : 'scale-100 opacity-100 translate-x-0'}`}
                >
                  <div className="flex-1 text-left">
                    <div className={`text-[18px] font-medium ${t.textPrimary}`}>
                      {room.name}
                    </div>
                    <div className={`text-[14px] mt-0 ${t.textMuted}`}>
                      {room.isCompleted
                        ? `${photoCount} photos · ${qualifiedCount} éléments`
                        : elementCount > 0
                        ? `${qualifiedCount}/${elementCount} éléments qualifiés`
                        : 'Non commencée'}
                    </div>
                  </div>
                  {editMode ? (
                    <span className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <X size={16} className="text-red-500" />
                    </span>
                  ) : room.isCompleted ? (
                    <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check size={14} strokeWidth={3} className="text-white" />
                    </span>
                  ) : (
                    <ChevronRight size={20} className={t.textMuted} />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add room section */}
        {showAddRoom ? (
          <div className="mt-4">
            <div className={`text-[17px] font-semibold mb-3 ${t.textSecondary}`}>
              Choisir un type de pièce
            </div>
            <div className="flex flex-wrap gap-2.5">
              {ADD_ROOM_CHIPS.map((chip) => (
                <button
                  key={chip.type}
                  onClick={() => handleAddRoom(chip.type)}
                  disabled={isAdding}
                  className={`px-4 py-2.5 rounded-2xl text-[15px] font-bold flex items-center gap-2 active:scale-95 bg-gray-100 ${t.textSecondary} border ${t.border}`}
                >
                  {React.createElement(ROOM_ICONS[chip.type] || Package, { size: 16 })}
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddRoom(false)}
              className={`mt-3 text-[15px] font-medium ${t.textMuted}`}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddRoom(true)}
            className={`w-full mt-4 py-4 rounded-2xl text-[17px] font-medium flex items-center justify-center gap-2 ${t.accentBg} text-white`}
          >
            <Plus size={18} />
            Ajouter une pièce
          </button>
        )}

        {/* Save and exit */}
        <button
          onClick={() => router.push('/dashboard')}
          className={`w-full mt-6 mb-4 py-3 flex items-center justify-center gap-2 text-[15px] font-medium rounded-xl active:scale-[0.97] transition ${t.textMuted}`}
        >
          <LogOut size={16} />
          Reprendre plus tard
        </button>
      </div>

      <InspectionBtn onClick={() => router.push(`/inspection/${inspectionId}/recap`)} disabled={!allCompleted}>
        {allCompleted ? 'Récapitulatif →' : `${rooms.length - completedCount} pièce(s) restante(s)`}
      </InspectionBtn>

      {/* Delete bottom sheet */}
      <BottomSheet
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        title="Supprimer la pièce"
      >
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => {
              const id = roomToDelete!;
              setRoomToDelete(null);
              // Phase 1: slide + fade (300ms)
              setDeletingRoomId(id);
              setTimeout(() => {
                // Phase 2: collapse height (300ms)
                setCollapsingRoomId(id);
                setTimeout(async () => {
                  await deleteRoom(id);
                  setDeletingRoomId(null);
                  setCollapsingRoomId(null);
                }, 300);
              }, 300);
            }}
            className="w-full py-3.5 rounded-xl text-[16px] font-semibold text-red-600 bg-red-50 active:scale-[0.98] transition"
          >
            Supprimer la pièce
          </button>
          <button
            onClick={() => setRoomToDelete(null)}
            className={`w-full py-3.5 rounded-xl text-[16px] font-medium ${t.btnSecondary} active:scale-[0.98] transition`}
          >
            Annuler
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
