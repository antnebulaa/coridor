'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  DEGRADATION_CONDITIONS,
  SURFACE_ELEMENTS,
  AI_TIPS,
  ROOM_TYPE_CONFIG,
} from '@/lib/inspection';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import { EDL_OVERVIEW_OPTIONS, EDL_DETAIL_OPTIONS } from '@/lib/imageCompression';
import type { RoomPhase } from '@/lib/inspection';
import type { ElementCondition } from '@prisma/client';
import { RotateCcw, Check, CircleCheck, Plus } from 'lucide-react';

function PhotoPreview({ src, alt, onRetake }: { src: string; alt: string; onRetake: () => void }) {
  const [loaded, setLoaded] = useState(false);
  // Generate a tiny blurred placeholder from Cloudinary
  const blurSrc = src.replace('/upload/', '/upload/w_40,e_blur:800,q_10/');
  return (
    <div className={`relative mb-5 rounded-2xl overflow-hidden h-48 ${t.bgCard}`}>
      {/* Blurred placeholder — loads instantly (< 1KB) */}
      {!loaded && (
        <img
          src={blurSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
      )}
      {/* Actual image with fade-in */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`relative w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {loaded && (
        <button
          onClick={onRetake}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[15px] font-bold bg-black/70 text-white"
        >
          <RotateCcw size={16} />
          Reprendre
        </button>
      )}
    </div>
  );
}

export default function RoomInspectionPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const roomId = params.roomId as string;
  const router = useRouter();
  const { inspection, addPhoto, addElement, updateElement, updateRoom } = useInspection(inspectionId);

  const [phase, setPhase] = useState<RoomPhase>('OVERVIEW');
  const [currentSurfaceIndex, setCurrentSurfaceIndex] = useState(0); // 0=Sols, 1=Murs, 2=Plafond
  const [currentDegradElementId, setCurrentDegradElementId] = useState<string | null>(null);
  const [showAddEquip, setShowAddEquip] = useState(false);
  const [newEquipName, setNewEquipName] = useState('');
  const [pendingNatures, setPendingNatures] = useState<Record<string, string[]>>({});
  const natureDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showIntro, setShowIntro] = useState(true);

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

  const handleAddEquipment = useCallback(async (name: string) => {
    if (!name.trim()) return;
    await addElement(roomId, { category: 'EQUIPMENT', name: name.trim() });
    setNewEquipName('');
    setShowAddEquip(false);
  }, [addElement, roomId]);

  // Prefetch next room + hub for instant navigation
  useEffect(() => {
    if (currentRoomIndex >= 0 && currentRoomIndex < rooms.length - 1) {
      router.prefetch(`/inspection/${inspectionId}/rooms/${rooms[currentRoomIndex + 1].id}`);
    }
    router.prefetch(`/inspection/${inspectionId}/rooms`);
  }, [currentRoomIndex, rooms, inspectionId, router]);

  // Room intro animation — reset on room change
  useEffect(() => {
    setShowIntro(true);
    setPhase('OVERVIEW');
    setCurrentSurfaceIndex(0);
  }, [roomId]);

  // Auto-dismiss intro after 1s once room data is available
  useEffect(() => {
    if (showIntro && currentRoom) {
      const timer = setTimeout(() => setShowIntro(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [showIntro, currentRoom]);

  // Debounced nature change — instant UI feedback, single API call after 600ms
  const handleNatureChange = useCallback((elementId: string, natures: string[]) => {
    setPendingNatures(prev => ({ ...prev, [elementId]: natures }));
    if (natureDebounceRef.current) clearTimeout(natureDebounceRef.current);
    natureDebounceRef.current = setTimeout(() => {
      updateElement(elementId, { nature: natures });
      setPendingNatures(prev => { const next = { ...prev }; delete next[elementId]; return next; });
    }, 600);
  }, [updateElement]);

  if (!currentRoom) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={t.textSecondary}>Chargement...</div>
      </div>
    );
  }

  const roomConfig = ROOM_TYPE_CONFIG[currentRoom.roomType];
  const aiTip = AI_TIPS[currentRoom.roomType] || AI_TIPS.ROOMS_HUB;

  // ─── INTRO ANIMATION ───
  if (showIntro) {
    return (
      <div className={`h-full flex items-center justify-center ${t.bgPage}`}>
        <div className="text-center">
          <div className="text-[80px] mb-2 animate-room-icon">{roomConfig?.icon || '📦'}</div>
          <div className={`text-[36px] font-semibold tracking-tight animate-room-name ${t.textPrimary}`}>
            {currentRoom.name}
          </div>
        </div>
      </div>
    );
  }

  // ─── PHASE: OVERVIEW (plan large) ───
  if (phase === 'OVERVIEW') {
    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} onClose={() => router.push(`/inspection/${inspectionId}/rooms`)} />
        <CameraCapture
          title={currentRoom.name}
          label="Veuillez cadrer la pièce dans son ensemble"
          instruction="Mode paysage recommandé"
          allowMultiple
          doneLabel="Noter les surfaces"
          compressionOptions={EDL_OVERVIEW_OPTIONS}
          onCapture={async (url, thumbnailUrl, sha256) => {
            await addPhoto({
              type: 'OVERVIEW',
              url,
              thumbnailUrl,
              sha256,
              inspectionRoomId: roomId,
              deviceInfo: navigator.userAgent,
            });
          }}
          onDone={() => {
            setPhase('SURFACE_PHOTO');
            setCurrentSurfaceIndex(0);
          }}
          onCancel={() => router.push(`/inspection/${inspectionId}/rooms`)}
          onExit={() => router.push('/dashboard')}
        />
      </div>
    );
  }

  // ─── PHASE: SURFACE_PHOTO ───
  if (phase === 'SURFACE_PHOTO') {
    const surface = SURFACE_ELEMENTS[currentSurfaceIndex];
    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} onClose={() => router.push(`/inspection/${inspectionId}/rooms`)} />

        {/* Surface tabs */}
        <div className={`flex px-4 pt-0 pb-4 gap-2.5 ${t.bgPage}`}>
          {SURFACE_ELEMENTS.map((s, i) => {
            const el = surfaceElements[i];
            const isDone = el?.condition != null;
            const isActive = i === currentSurfaceIndex;
            const tabClass = isActive ? t.tabActive : isDone ? t.tabCompleted : t.tabDefault;
            return (
              <button
                key={s.category}
                onClick={() => { setCurrentSurfaceIndex(i); }}
                className={`flex-1 py-2 rounded-2xl text-[16px] font-medium text-center ${tabClass}`}
              >
                {s.name} {isDone && !isActive ? <Check size={14} className="inline" /> : ''}
              </button>
            );
          })}
        </div>

        <CameraCapture
          label={`Photographiez les ${surface.name.toLowerCase()}`}
          instruction={`${currentRoom.name} — ${surface.name}`}
          allowMultiple
          doneLabel="Noter l'état"
          compressionOptions={EDL_DETAIL_OPTIONS}
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
          }}
          onDone={() => setPhase('SURFACE_QUALIFY')}
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
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} onClose={() => router.push(`/inspection/${inspectionId}/rooms`)} />

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Photo preview */}
          {surfacePhoto && (
            <PhotoPreview
              src={surfacePhoto.thumbnailUrl || surfacePhoto.url}
              alt={surface.name}
              onRetake={() => setPhase('SURFACE_PHOTO')}
            />
          )}

          {/* Nature selector */}
          <div className="mb-5">
            <div className={`text-[20px] font-bold mb-3 ${t.textPrimary}`}>
              Revêtement — {surface.name}
            </div>
            <NatureSelector
              category={surface.category as 'FLOOR' | 'WALL' | 'CEILING'}
              value={currentSurface ? (pendingNatures[currentSurface.id] ?? (currentSurface.nature as unknown as string[]) ?? []) : []}
              onChange={(natures) => {
                if (currentSurface) {
                  handleNatureChange(currentSurface.id, natures);
                }
              }}
            />
          </div>

          {/* Condition chips */}
          <div className="mb-5">
            <div className={`text-[20px] font-bold mb-3 ${t.textPrimary}`}>
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
          disabled={!currentSurface?.condition || !currentSurface?.nature?.length}
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
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} onClose={() => router.push(`/inspection/${inspectionId}/rooms`)} />

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className={`text-[26px] font-bold mb-1 tracking-tight ${t.textPrimary}`}>
            Équipements
          </div>
          <div className={`text-[17px] mb-4 ${t.textSecondary}`}>
            {currentRoom.name} — Qualifiez chaque équipement
          </div>

          <InspectionAIBubble>{aiTip}</InspectionAIBubble>

          <div className="space-y-3.5">
            {equipmentElements.map((equip) => (
              <div
                key={equip.id}
                className={`rounded-2xl p-4 ${t.equipRow}`}
              >
                <div className={`text-[18px] font-bold mb-2.5 ${t.textPrimary}`}>
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

            {/* + Ajouter un équipement */}
            {showAddEquip ? (
              <div
                className={`rounded-2xl p-4 ${t.bgCard}`}
                style={{ border: `1px solid ${t.accent}40` }}
              >
                <input
                  autoFocus
                  value={newEquipName}
                  onChange={(e) => setNewEquipName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newEquipName.trim()) handleAddEquipment(newEquipName); }}
                  placeholder="Nom de l'équipement..."
                  className={`w-full bg-transparent text-[17px] font-medium outline-none mb-3 pb-2 ${t.textPrimary}`}
                  style={{ borderBottom: `2px solid ${t.accent}` }}
                />
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Détecteur de fumée', 'Sèche-serviettes', 'Climatisation', 'Store', 'Prise TV', 'Thermostat', 'Meuble vasque', 'Porte-serviettes', 'Tableau électrique'].map((sugg) => (
                    <button
                      key={sugg}
                      onClick={() => { setNewEquipName(sugg); }}
                      className={`px-3 py-1.5 rounded-xl text-[13px] border ${
                        newEquipName === sugg
                          ? 'bg-amber-100 text-amber-600 border-amber-500'
                          : `bg-gray-100 ${t.textSecondary} ${t.border}`
                      }`}
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAddEquip(false); setNewEquipName(''); }}
                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-medium ${t.textMuted}`}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleAddEquipment(newEquipName)}
                    disabled={!newEquipName.trim()}
                    className={`flex-1 py-2.5 rounded-xl text-[15px] font-bold ${
                      newEquipName.trim() ? `${t.accentBg} text-white` : `bg-gray-100 ${t.textMuted}`
                    }`}
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddEquip(true)}
                className={`w-full py-3.5 rounded-2xl text-[16px] font-medium flex items-center justify-center gap-2 bg-gray-100 ${t.textSecondary} border-dashed border ${t.border}`}
              >
                <Plus size={16} /> Ajouter un équipement
              </button>
            )}
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
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} onClose={() => router.push(`/inspection/${inspectionId}/rooms`)} />

        <div className="flex-1 px-5 py-6">
          <div className={`text-[26px] font-bold mb-1 tracking-tight ${t.textPrimary}`}>
            Observation générale
          </div>
          <div className={`text-[17px] mb-5 ${t.textSecondary}`}>
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
          <Check size={18} className="inline mr-1" /> Valider {currentRoom.name}
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
          <CircleCheck size={64} color={t.green} className="mx-auto mb-4" />
          <div className="text-[28px] font-bold" style={{ color: t.green }}>
            {currentRoom.name} validée
          </div>
          {nextRoom && (
            <div className={`text-[18px] mt-3 ${t.textSecondary}`}>
              → {nextRoom.name}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
