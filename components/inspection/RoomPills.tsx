'use client';

import React, { useRef, useEffect } from 'react';
import {
  X, Check, DoorOpen, Sofa, BedDouble, CookingPot, ShowerHead,
  Droplets, WashingMachine, Monitor, Shirt, Flower2, Sun,
  Warehouse, CircleParking, Car, Package, ArrowLeftRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EDL_COLORS } from '@/lib/inspection';
import type { InspectionRoomType } from '@prisma/client';

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

interface RoomPillData {
  id: string;
  name: string;
  roomType: InspectionRoomType;
  isCompleted: boolean;
}

interface RoomPillsProps {
  rooms: RoomPillData[];
  activeRoomId: string;
  onRoomSelect: (roomId: string) => void;
  onClose?: () => void;
}

const RoomPills: React.FC<RoomPillsProps> = ({ rooms, activeRoomId, onRoomSelect, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to center the active pill
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const pill = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const pillRect = pill.getBoundingClientRect();
      const scrollLeft =
        pill.offsetLeft - container.offsetLeft - containerRect.width / 2 + pillRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeRoomId]);

  return (
    <div
      className="flex items-center gap-2 flex-shrink-0"
      style={{ background: EDL_COLORS.bg }}
    >
      <div
        ref={scrollRef}
        className="flex-1 flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar"
      >
      {rooms.map((room) => {
        const isActive = room.id === activeRoomId;
        const isDone = room.isCompleted;

        let bg = EDL_COLORS.card2;
        let textColor = EDL_COLORS.text3;

        if (isActive) {
          bg = EDL_COLORS.accent;
          textColor = '#fff';
        } else if (isDone) {
          bg = `${EDL_COLORS.green}20`;
          textColor = EDL_COLORS.green;
        }

        return (
          <button
            key={room.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onRoomSelect(room.id)}
            className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-[13px] font-medium whitespace-nowrap"
            style={{ background: bg, color: textColor }}
          >
            {React.createElement(ROOM_ICONS[room.roomType] || Package, { size: 22 })}
            <span className="flex items-center gap-1">{room.name}{isDone && !isActive && <Check size={12} />}</span>
          </button>
        );
      })}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mr-3 active:scale-95"
          style={{ background: EDL_COLORS.card2 }}
        >
          <X size={18} color={EDL_COLORS.text3} />
        </button>
      )}
    </div>
  );
};

export default RoomPills;
