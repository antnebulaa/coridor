'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import type { InspectionRoomWithElements } from '@/hooks/useInspection';
import RoomPills from '@/components/inspection/RoomPills';
import CameraCapture from '@/components/inspection/CameraCapture';
import ConditionChips from '@/components/inspection/ConditionChips';
import NatureSelector from '@/components/inspection/NatureSelector';
import DegradationFlow from '@/components/inspection/DegradationFlow';
import AudioRecorder from '@/components/inspection/AudioRecorder';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import {
  EDL_COLORS,
  DEGRADATION_CONDITIONS,
  SURFACE_ELEMENTS,
  AI_TIPS,
  ROOM_TYPE_CONFIG,
} from '@/lib/inspection';
import type { RoomPhase } from '@/lib/inspection';
import type { ElementCondition } from '@prisma/client';
import { RotateCcw } from 'lucide-react';

export default function RoomInspectionPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const roomId = params.roomId as string;
  const router = useRouter();
  const { inspection, addPhoto, updateElement, updateRoom } = useInspection(inspectionId);

  const [phase, setPhase] = useState<RoomPhase>('OVERVIEW');
  const [currentSurfaceIndex, setCurrentSurfaceIndex] = useState(0); // 0=Sols, 1=Murs, 2=Plafond
  const [currentDegradElementId, setCurrentDegradElementId] = useState<string | null>(null);

  const rooms = inspection?.rooms || [];
  const currentRoom = rooms.find((r) => r.id === roomId);
  const currentRoomIndex = rooms.findIndex((r) => r.id === roomId);

  // Separate surface elements and equipment elements
  const surfaceElements = useMemo(
    () => currentRoom?.elements.filter((e) => e.category !== 'EQUIPMENT') || [],
    [currentRoom]
  );
  const equipmentElements = useMemo(
    () => currentRoom?.elements.filter((e) => e.category === 'EQUIPMENT') || [],
    [currentRoom]
  );

  const currentSurface = surfaceElements[currentSurfaceIndex];

  // Navigate to another room
  const handleRoomSwitch = useCallback((targetRoomId: string) => {
    router.replace(`/inspection/${inspectionId}/rooms/${targetRoomId}`);
  }, [router, inspectionId]);

  // Navigate to next room or back to hub
  const goToNextRoom = useCallback(() => {
    if (currentRoomIndex < rooms.length - 1) {
      const nextRoom = rooms[currentRoomIndex + 1];
      router.replace(`/inspection/${inspectionId}/rooms/${nextRoom.id}`);
    } else {
      router.push(`/inspection/${inspectionId}/rooms`);
    }
  }, [currentRoomIndex, rooms, router, inspectionId]);

  const completeRoom = useCallback(async () => {
    await updateRoom(roomId, { isCompleted: true });
    // Auto-advance to next room after a brief delay
    setTimeout(goToNextRoom, 500);
  }, [updateRoom, roomId, goToNextRoom]);

  if (!currentRoom) {
    return (
      <div className="h-full flex items-center justify-center">
        <div style={{ color: EDL_COLORS.text2 }}>Chargement...</div>
      </div>
    );
  }

  const roomConfig = ROOM_TYPE_CONFIG[currentRoom.roomType];
  const aiTip = AI_TIPS[currentRoom.roomType] || AI_TIPS.ROOMS_HUB;

  // ─── PHASE: OVERVIEW (plan large) ───
  if (phase === 'OVERVIEW') {
    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} />
        <CameraCapture
          label={`${currentRoom.name} — Vue d'ensemble`}
          instruction="Cadrez la pièce en entier · Mode paysage recommandé"
          onCapture={async (url, thumbnailUrl, sha256) => {
            await addPhoto({
              type: 'OVERVIEW',
              url,
              thumbnailUrl,
              sha256,
              inspectionRoomId: roomId,
              deviceInfo: navigator.userAgent,
            });
            setPhase('SURFACE_PHOTO');
            setCurrentSurfaceIndex(0);
          }}
          onCancel={() => router.push(`/inspection/${inspectionId}/rooms`)}
        />
      </div>
    );
  }

  // ─── PHASE: SURFACE_PHOTO ───
  if (phase === 'SURFACE_PHOTO') {
    const surface = SURFACE_ELEMENTS[currentSurfaceIndex];
    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} />

        {/* Surface tabs */}
        <div className="flex px-4 pt-2 gap-2.5" style={{ background: EDL_COLORS.bg }}>
          {SURFACE_ELEMENTS.map((s, i) => {
            const el = surfaceElements[i];
            const isDone = el?.condition != null;
            const isActive = i === currentSurfaceIndex;
            return (
              <button
                key={s.category}
                onClick={() => { setCurrentSurfaceIndex(i); }}
                className="flex-1 py-3 rounded-xl text-[16px] font-bold text-center"
                style={{
                  background: isActive ? EDL_COLORS.accent : isDone ? `${EDL_COLORS.green}20` : EDL_COLORS.card2,
                  color: isActive ? '#000' : isDone ? EDL_COLORS.green : EDL_COLORS.text3,
                  border: `2px solid ${isActive ? EDL_COLORS.accent : isDone ? `${EDL_COLORS.green}40` : EDL_COLORS.border}`,
                }}
              >
                {s.name} {isDone && !isActive ? '✓' : ''}
              </button>
            );
          })}
        </div>

        <CameraCapture
          label={`Photographiez les ${surface.name.toLowerCase()}`}
          instruction={`${currentRoom.name} — ${surface.name}`}
          onCapture={async (url, thumbnailUrl, sha256) => {
            if (currentSurface) {
              await addPhoto({
                type: 'SURFACE',
                url,
                thumbnailUrl,
                sha256,
                inspectionRoomId: roomId,
                inspectionElementId: currentSurface.id,
                deviceInfo: navigator.userAgent,
              });
            }
            setPhase('SURFACE_QUALIFY');
          }}
        />
      </div>
    );
  }

  // ─── PHASE: SURFACE_QUALIFY ───
  if (phase === 'SURFACE_QUALIFY') {
    const surface = SURFACE_ELEMENTS[currentSurfaceIndex];
    const surfacePhoto = currentSurface?.photos?.[currentSurface.photos.length - 1];

    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} />

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Photo preview */}
          {surfacePhoto && (
            <div className="relative mb-5 rounded-2xl overflow-hidden">
              <img src={surfacePhoto.url} alt={surface.name} className="w-full h-48 object-cover" />
              <button
                onClick={() => setPhase('SURFACE_PHOTO')}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[15px] font-bold"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
              >
                <RotateCcw size={16} />
                Reprendre
              </button>
            </div>
          )}

          {/* Nature selector */}
          <div className="mb-5">
            <div className="text-[20px] font-bold mb-3" style={{ color: EDL_COLORS.text }}>
              Revêtement — {surface.name}
            </div>
            <NatureSelector
              category={surface.category as 'FLOOR' | 'WALL' | 'CEILING'}
              value={currentSurface?.nature}
              onChange={async (nature) => {
                if (currentSurface) {
                  await updateElement(currentSurface.id, { nature });
                }
              }}
            />
          </div>

          {/* Condition chips */}
          <div className="mb-5">
            <div className="text-[20px] font-bold mb-3" style={{ color: EDL_COLORS.text }}>
              État
            </div>
            <ConditionChips
              value={currentSurface?.condition}
              onChange={async (condition: ElementCondition) => {
                if (currentSurface) {
                  await updateElement(currentSurface.id, { condition });

                  // If degraded/H.S., enter degradation sub-flow
                  if (DEGRADATION_CONDITIONS.includes(condition)) {
                    setCurrentDegradElementId(currentSurface.id);
                    setPhase('DEGRAD_TYPE');
                  }
                }
              }}
            />
          </div>
        </div>

        <InspectionBtn
          onClick={() => {
            // Move to next surface or to EQUIP
            if (currentSurfaceIndex < SURFACE_ELEMENTS.length - 1) {
              setCurrentSurfaceIndex(currentSurfaceIndex + 1);
              setPhase('SURFACE_PHOTO');
            } else {
              setPhase('EQUIP');
            }
          }}
          disabled={!currentSurface?.condition || !currentSurface?.nature}
        >
          {currentSurfaceIndex < SURFACE_ELEMENTS.length - 1
            ? `${SURFACE_ELEMENTS[currentSurfaceIndex + 1].name} →`
            : 'Équipements →'}
        </InspectionBtn>
      </div>
    );
  }

  // ─── PHASE: DEGRAD_TYPE / DEGRAD_CLOSEUP / DEGRAD_AUDIO ───
  if (phase === 'DEGRAD_TYPE' || phase === 'DEGRAD_CLOSEUP' || phase === 'DEGRAD_AUDIO') {
    const degradElement = currentRoom.elements.find((e) => e.id === currentDegradElementId);
    return (
      <div className="h-full flex flex-col">
        <DegradationFlow
          elementName={degradElement?.name || 'Élément'}
          onComplete={async (data) => {
            if (currentDegradElementId) {
              await updateElement(currentDegradElementId, {
                degradationTypes: data.degradationTypes,
                observations: data.observations,
              });
              if (data.photoUrl) {
                await addPhoto({
                  type: 'DETAIL',
                  url: data.photoUrl,
                  thumbnailUrl: data.photoThumbnailUrl,
                  sha256: data.photoSha256,
                  inspectionRoomId: roomId,
                  inspectionElementId: currentDegradElementId,
                  deviceInfo: navigator.userAgent,
                });
              }
            }
            setCurrentDegradElementId(null);

            // Return to where we were
            if (surfaceElements.find((e) => e.id === currentDegradElementId)) {
              // Was in surface qualify
              if (currentSurfaceIndex < SURFACE_ELEMENTS.length - 1) {
                setCurrentSurfaceIndex(currentSurfaceIndex + 1);
                setPhase('SURFACE_PHOTO');
              } else {
                setPhase('EQUIP');
              }
            } else {
              // Was in equipment
              setPhase('EQUIP');
            }
          }}
          onCancel={() => {
            setCurrentDegradElementId(null);
            if (surfaceElements.find((e) => e.id === currentDegradElementId)) {
              setPhase('SURFACE_QUALIFY');
            } else {
              setPhase('EQUIP');
            }
          }}
        />
      </div>
    );
  }

  // ─── PHASE: EQUIP ───
  if (phase === 'EQUIP') {
    const allQualified = equipmentElements.every((e) => e.condition || e.isAbsent);

    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} />

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[26px] font-bold mb-1 tracking-tight" style={{ color: EDL_COLORS.text }}>
            Équipements
          </div>
          <div className="text-[17px] mb-4" style={{ color: EDL_COLORS.text2 }}>
            {currentRoom.name} — Qualifiez chaque équipement
          </div>

          <InspectionAIBubble>{aiTip}</InspectionAIBubble>

          <div className="space-y-3.5">
            {equipmentElements.map((equip) => (
              <div
                key={equip.id}
                className="rounded-2xl p-4"
                style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
              >
                <div className="text-[18px] font-bold mb-2.5" style={{ color: EDL_COLORS.text }}>
                  {equip.name}
                </div>
                <ConditionChips
                  value={equip.condition}
                  onChange={async (condition: ElementCondition) => {
                    await updateElement(equip.id, { condition });
                    if (DEGRADATION_CONDITIONS.includes(condition)) {
                      setCurrentDegradElementId(equip.id);
                      setPhase('DEGRAD_TYPE');
                    }
                  }}
                  showAbsent
                  isAbsent={equip.isAbsent}
                  onAbsentToggle={async () => {
                    await updateElement(equip.id, {
                      isAbsent: !equip.isAbsent,
                      condition: undefined,
                    });
                  }}
                  compact
                />
              </div>
            ))}
          </div>
        </div>

        <InspectionBtn onClick={() => setPhase('OBS')} disabled={!allQualified}>
          {allQualified ? 'Observation générale →' : `${equipmentElements.filter((e) => !e.condition && !e.isAbsent).length} restant(s)`}
        </InspectionBtn>
      </div>
    );
  }

  // ─── PHASE: OBS ───
  if (phase === 'OBS') {
    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} />

        <div className="flex-1 px-5 py-6">
          <div className="text-[26px] font-bold mb-1 tracking-tight" style={{ color: EDL_COLORS.text }}>
            Observation générale
          </div>
          <div className="text-[17px] mb-5" style={{ color: EDL_COLORS.text2 }}>
            {currentRoom.name} — Commentaire libre
          </div>

          <AudioRecorder
            value={currentRoom.observations || ''}
            onChange={async (text) => {
              await updateRoom(roomId, { observations: text });
            }}
            placeholder="Dicter"
          />
        </div>

        <InspectionBtn onClick={() => { setPhase('DONE'); completeRoom(); }}>
          ✓ Valider {currentRoom.name}
        </InspectionBtn>
      </div>
    );
  }

  // ─── PHASE: DONE (brief transition) ───
  if (phase === 'DONE') {
    const nextRoom = currentRoomIndex < rooms.length - 1 ? rooms[currentRoomIndex + 1] : null;
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="text-[64px] mb-4">✓</div>
          <div className="text-[28px] font-bold" style={{ color: EDL_COLORS.green }}>
            {currentRoom.name} validée
          </div>
          {nextRoom && (
            <div className="text-[18px] mt-3" style={{ color: EDL_COLORS.text2 }}>
              → {nextRoom.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
