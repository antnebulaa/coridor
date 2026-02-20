'use client';

import React, { useRef, useEffect } from 'react';
import { EDL_COLORS, ROOM_TYPE_CONFIG } from '@/lib/inspection';
import type { InspectionRoomType } from '@prisma/client';

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
}

const RoomPills: React.FC<RoomPillsProps> = ({ rooms, activeRoomId, onRoomSelect }) => {
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
      ref={scrollRef}
      className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar flex-shrink-0"
      style={{ background: EDL_COLORS.bg, borderBottom: `1px solid ${EDL_COLORS.border}` }}
    >
      {rooms.map((room) => {
        const isActive = room.id === activeRoomId;
        const isDone = room.isCompleted;
        const config = ROOM_TYPE_CONFIG[room.roomType];

        let bg = EDL_COLORS.card2;
        let textColor = EDL_COLORS.text3;
        let borderColor = EDL_COLORS.border;

        if (isActive) {
          bg = EDL_COLORS.accent;
          textColor = '#000';
          borderColor = EDL_COLORS.accent;
        } else if (isDone) {
          bg = `${EDL_COLORS.green}20`;
          textColor = EDL_COLORS.green;
          borderColor = `${EDL_COLORS.green}40`;
        }

        return (
          <button
            key={room.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onRoomSelect(room.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[15px] font-bold whitespace-nowrap"
            style={{ background: bg, color: textColor, border: `1px solid ${borderColor}` }}
          >
            <span>{config?.icon || '📦'}</span>
            <span>{room.name}</span>
            {isDone && !isActive && <span>✓</span>}
          </button>
        );
      })}
    </div>
  );
};

export default RoomPills;
