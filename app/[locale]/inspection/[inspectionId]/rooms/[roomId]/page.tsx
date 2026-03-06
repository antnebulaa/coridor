'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'react-hot-toast';
import { useInspection, getEntryElement, getEntryRoomPhoto, computeEvolution } from '@/hooks/useInspection';
import type { InspectionRoomWithElements } from '@/hooks/useInspection';
import RoomPills from '@/components/inspection/RoomPills';
import StepPills from '@/components/inspection/StepPills';
import type { StepDef } from '@/components/inspection/StepPills';
import CameraCapture from '@/components/inspection/CameraCapture';
import ConditionChips from '@/components/inspection/ConditionChips';
import NatureSelector from '@/components/inspection/NatureSelector';
import DegradationFlow from '@/components/inspection/DegradationFlow';
import AudioRecorder from '@/components/inspection/AudioRecorder';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import EntryExitComparison from '@/components/inspection/EntryExitComparison';
import {
  DEGRADATION_CONDITIONS,
  SURFACE_ELEMENTS,
  AI_TIPS,
  ROOM_TYPE_CONFIG,
  EVOLUTION_CONFIG,
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
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[15px] font-semibold bg-black/70 text-white"
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

  // EXIT mode detection
  const isExit = inspection?.type === 'EXIT';
  const entryInspection = inspection?.entryInspection;

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

  // Smart phase detection — only reset on room change, skip intro if data exists
  const lastComputedRoomRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastComputedRoomRef.current === roomId) return;
    lastComputedRoomRef.current = roomId;

    if (!currentRoom) {
      setShowIntro(true);
      setPhase('OVERVIEW');
      setCurrentSurfaceIndex(0);
      return;
    }

    const hasOverviewPhotos = currentRoom.photos.length > 0;
    const surfEls = currentRoom.elements.filter((e) => e.category !== 'EQUIPMENT');
    const equipEls = currentRoom.elements.filter((e) => e.category === 'EQUIPMENT');

    if (!hasOverviewPhotos) {
      // Brand new room — show intro
      setShowIntro(true);
      setPhase('OVERVIEW');
      setCurrentSurfaceIndex(0);
      return;
    }

    // Room has data — skip intro, land on first incomplete step
    setShowIntro(false);

    // Check surfaces — EXIT skips SURFACE_PHOTO, goes straight to SURFACE_QUALIFY
    const isExitMode = inspection?.type === 'EXIT';
    for (let i = 0; i < SURFACE_ELEMENTS.length; i++) {
      const el = surfEls[i];
      if (!el?.condition) {
        setPhase(isExitMode ? 'SURFACE_QUALIFY' : (el?.photos?.length ? 'SURFACE_QUALIFY' : 'SURFACE_PHOTO'));
        setCurrentSurfaceIndex(i);
        return;
      }
    }

    // Check equipment
    const allEquipDone = equipEls.every((e) => e.condition || e.isAbsent);
    if (!allEquipDone) {
      setPhase('EQUIP');
      setCurrentSurfaceIndex(0);
      return;
    }

    // Everything done — show overview with thumbnails
    setPhase('OVERVIEW');
    setCurrentSurfaceIndex(0);
  }, [roomId, currentRoom, inspection?.type]);

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

  // Step pills — compute status of each step
  const steps: StepDef[] = useMemo(() => {
    if (!currentRoom) return [];
    const surfEls = currentRoom.elements.filter((e) => e.category !== 'EQUIPMENT');
    const equipEls = currentRoom.elements.filter((e) => e.category === 'EQUIPMENT');

    const overviewDone = currentRoom.photos.length > 0;
    const isOverview = phase === 'OVERVIEW';
    const isSurface = phase === 'SURFACE_PHOTO' || phase === 'SURFACE_QUALIFY';

    const result: StepDef[] = [
      {
        key: 'overview',
        label: 'Ensemble',
        status: isOverview ? 'active' : overviewDone ? 'done' : 'todo',
        completed: overviewDone,
      },
    ];

    SURFACE_ELEMENTS.forEach((s, i) => {
      const el = surfEls[i];
      const isDone = el?.condition != null;
      const isActive = isSurface && currentSurfaceIndex === i;
      result.push({
        key: `surface-${i}`,
        label: s.name,
        status: isActive ? 'active' : isDone ? 'done' : 'todo',
        completed: isDone,
      });
    });

    const allEquipDone = equipEls.every((e) => e.condition || e.isAbsent);
    result.push({
      key: 'equip',
      label: 'Équip.',
      status: phase === 'EQUIP' ? 'active' : allEquipDone ? 'done' : 'todo',
      completed: allEquipDone,
    });

    return result;
  }, [currentRoom, phase, currentSurfaceIndex]);

  // Step pill click handler
  const handleStepSelect = useCallback((stepKey: string) => {
    if (stepKey === 'overview') {
      setPhase('OVERVIEW');
    } else if (stepKey === 'equip') {
      setPhase('EQUIP');
    } else if (stepKey.startsWith('surface-')) {
      const idx = parseInt(stepKey.split('-')[1], 10);
      setCurrentSurfaceIndex(idx);
      setPhase(isExit ? 'SURFACE_QUALIFY' : 'SURFACE_PHOTO');
    }
  }, [isExit]);

  if (!currentRoom) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={`${t.textSecondary} text-[26px] font-semibold animate-pulse`}>Chargement...</div>
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
    // EXIT mode: get entry overview photo
    const entryOverviewPhoto = isExit && currentRoom
      ? getEntryRoomPhoto(currentRoom, 'OVERVIEW', entryInspection)
      : null;

    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} onClose={() => router.push(`/inspection/${inspectionId}/rooms`)} />
        <StepPills steps={steps} onStepSelect={handleStepSelect} />

        {/* EXIT mode: show entry photo as reference above camera */}
        {isExit && entryOverviewPhoto && (
          <div className={`px-4 py-3 ${t.bgPage}`}>
            <div className={`${t.exitEntryLabel} mb-1.5`}>Photo d&apos;entrée — {currentRoom.name}</div>
            <div className={`rounded-xl overflow-hidden h-32 ${t.exitEntryBg}`}>
              <img
                src={entryOverviewPhoto.thumbnailUrl || entryOverviewPhoto.url}
                alt="Photo entrée"
                className="w-full h-full object-cover opacity-80"
              />
            </div>
          </div>
        )}

        <CameraCapture
          title={currentRoom.name}
          label={isExit ? "Prenez la même photo qu'à l'entrée" : "Veuillez cadrer la pièce dans son ensemble"}
          instruction={isExit ? "Reproduisez le même angle" : "Mode paysage recommandé"}
          allowMultiple
          doneLabel="Passer aux surfaces"
          compressionOptions={EDL_OVERVIEW_OPTIONS}
          initialThumbnails={currentRoom.photos.map((p) => p.thumbnailUrl || p.url)}
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
            setPhase(isExit ? 'SURFACE_QUALIFY' : 'SURFACE_PHOTO');
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
        <StepPills steps={steps} onStepSelect={handleStepSelect} />

        <CameraCapture
          label={`Photographiez les ${surface.name.toLowerCase()}`}
          instruction={`${currentRoom.name} — ${surface.name}`}
          allowMultiple
          doneLabel="Noter l'état"
          compressionOptions={EDL_DETAIL_OPTIONS}
          initialThumbnails={currentSurface?.photos?.map((p) => p.thumbnailUrl || p.url) || []}
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

    // EXIT mode: get entry data for comparison
    const entryElement = isExit && currentSurface && currentRoom
      ? getEntryElement(currentSurface, currentRoom, entryInspection)
      : null;
    const entryPhoto = entryElement?.photos?.[entryElement.photos.length - 1];
    const evolution = isExit
      ? computeEvolution(entryElement?.condition, currentSurface?.condition)
      : null;
    const evolutionConfig = evolution ? EVOLUTION_CONFIG[evolution] : null;

    return (
      <div className="h-full flex flex-col">
        <RoomPills rooms={rooms} activeRoomId={roomId} onRoomSelect={handleRoomSwitch} onClose={() => router.push(`/inspection/${inspectionId}/rooms`)} />
        <StepPills steps={steps} onStepSelect={handleStepSelect} />

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* EXIT mode: split-screen photo comparison */}
          {isExit && currentSurface ? (
            <EntryExitComparison
              label={`${surface.name} — ${currentRoom.name}`}
              entryPhoto={entryPhoto}
              exitPhoto={surfacePhoto}
              entryCondition={entryElement?.condition}
              exitCondition={currentSurface?.condition}
              entryNatures={entryElement?.nature as string[] | undefined}
              exitNatures={currentSurface?.nature as string[] | undefined}
              degradationTypes={currentSurface?.degradationTypes as string[] | undefined}
            />
          ) : (
            /* ENTRY mode: regular photo preview */
            surfacePhoto && (
              <PhotoPreview
                src={surfacePhoto.thumbnailUrl || surfacePhoto.url}
                alt={surface.name}
                onRetake={() => setPhase('SURFACE_PHOTO')}
              />
            )
          )}

          {/* EXIT mode: entry condition read-only */}
          {isExit && entryElement?.condition && (
            <div className={`mb-4 px-4 py-3 rounded-xl ${t.exitEntryBg}`}>
              <div className={`text-[13px] mb-1 ${t.textMuted}`}>État à l&apos;entrée</div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: entryElement.condition ? EVOLUTION_CONFIG[computeEvolution(entryElement.condition, entryElement.condition) || 'UNCHANGED']?.color || '#9CA3AF' : '#9CA3AF' }}
                />
                <span className={`text-[15px] font-medium ${t.textSecondary}`}>
                  {entryElement.condition === 'NEW' ? 'Neuf' :
                   entryElement.condition === 'GOOD' ? 'Bon' :
                   entryElement.condition === 'NORMAL_WEAR' ? 'Usure normale' :
                   entryElement.condition === 'DEGRADED' ? 'Dégradé' :
                   entryElement.condition === 'OUT_OF_SERVICE' ? 'H.S.' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Nature selector */}
          <div className="mb-12 pt-4">
            <div className={`text-[22px] font-medium mb-3 ${t.textPrimary}`}>
              Revêtement <span className={`font-medium ${t.textSecondary}`}>{surface.name}</span>
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

          {/* EXIT mode: "Conforme" quick button */}
          {isExit && entryElement?.condition && !currentSurface?.condition && (
            <button
              onClick={async () => {
                if (currentSurface && entryElement?.condition) {
                  await updateElement(currentSurface.id, {
                    condition: entryElement.condition,
                    evolution: 'UNCHANGED',
                    nature: entryElement.nature || undefined,
                  });
                  // Auto-advance to next surface or equipment
                  if (currentSurfaceIndex < SURFACE_ELEMENTS.length - 1) {
                    setCurrentSurfaceIndex(currentSurfaceIndex + 1);
                  } else {
                    setPhase('EQUIP');
                  }
                }
              }}
              className="w-full mb-5 py-4 rounded-2xl text-[17px] font-semibold bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={20} /> Conforme — état identique à l&apos;entrée
            </button>
          )}

          {/* Condition chips */}
          <div className="mb-5">
            <div className={`text-[22px] font-medium mb-3 ${t.textPrimary}`}>
              {isExit ? 'État actuel' : 'État'}
            </div>
            {isExit && entryElement?.condition && !currentSurface?.condition && (
              <div className={`text-[14px] mb-3 ${t.textMuted}`}>
                ou qualifiez un changement ci-dessous
              </div>
            )}
            <ConditionChips
              value={currentSurface?.condition}
              onChange={async (condition: ElementCondition) => {
                if (currentSurface) {
                  // In EXIT mode, auto-compute evolution
                  if (isExit && entryElement?.condition) {
                    const evo = computeEvolution(entryElement.condition, condition);
                    await updateElement(currentSurface.id, { condition, evolution: evo || undefined });
                  } else {
                    await updateElement(currentSurface.id, { condition });
                  }

                  // If degraded/H.S., enter degradation sub-flow
                  if (DEGRADATION_CONDITIONS.includes(condition)) {
                    setCurrentDegradElementId(currentSurface.id);
                    setPhase('DEGRAD_TYPE');
                  }
                }
              }}
            />
          </div>

          {/* Evolution badge (EXIT mode only) */}
          {isExit && evolution && evolutionConfig && (
            <div className="mb-5">
              <span className={`inline-flex px-4 py-2 rounded-full text-[15px] font-medium ${
                evolution === 'UNCHANGED' ? t.evolutionUnchanged :
                evolution === 'NORMAL_WEAR' ? t.evolutionNormalWear :
                evolution === 'DETERIORATION' ? t.evolutionDeterioration :
                t.evolutionImprovement
              }`}>
                {evolutionConfig.label}
              </span>
            </div>
          )}
        </div>

        <InspectionBtn
          onClick={() => {
            // Move to next surface or to EQUIP
            if (currentSurfaceIndex < SURFACE_ELEMENTS.length - 1) {
              setCurrentSurfaceIndex(currentSurfaceIndex + 1);
              setPhase(isExit ? 'SURFACE_QUALIFY' : 'SURFACE_PHOTO');
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
                setPhase(isExit ? 'SURFACE_QUALIFY' : 'SURFACE_PHOTO');
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
        <StepPills steps={steps} onStepSelect={handleStepSelect} />

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className={`text-[28px] font-medium mb-1 tracking-tight ${t.textPrimary}`}>
            Équipements
          </div>
          <div className={`text-[21px] font-medium mb-8 ${t.textSecondary}`}>
            {currentRoom.name}
          </div>
          

          <InspectionAIBubble>{aiTip}</InspectionAIBubble>

          {/* EXIT mode: "Tout conforme" bulk button */}
          {isExit && equipmentElements.some((e) => !e.condition && !e.isAbsent) && (
            <button
              onClick={async () => {
                const unqualified = equipmentElements.filter((e) => !e.condition && !e.isAbsent);
                const withEntry = unqualified.filter((equip) => {
                  const entryEquip = currentRoom ? getEntryElement(equip, currentRoom, entryInspection) : null;
                  return entryEquip?.condition;
                });
                const skipped = unqualified.length - withEntry.length;
                await Promise.all(
                  withEntry.map((equip) => {
                    const entryEquip = getEntryElement(equip, currentRoom!, entryInspection)!;
                    return updateElement(equip.id, {
                      condition: entryEquip.condition || undefined,
                      evolution: 'UNCHANGED',
                    });
                  })
                );
                if (skipped > 0) {
                  toast(`${skipped} équipement${skipped > 1 ? 's' : ''} sans donnée d'entrée — à qualifier manuellement`);
                }
              }}
              className="w-full mb-5 py-4 rounded-2xl text-[17px] font-semibold bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={20} /> Tout conforme
            </button>
          )}

          <div className="space-y-3.5">
            {equipmentElements.map((equip) => {
              const entryEquip = isExit && currentRoom
                ? getEntryElement(equip, currentRoom, entryInspection)
                : null;
              const equipEvolution = isExit
                ? computeEvolution(entryEquip?.condition, equip.condition)
                : null;

              return (
                <div
                  key={equip.id}
                  className={`rounded-2xl p-4 ${t.equipRow}`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`text-[18px] font-bold ${t.textPrimary}`}>
                      {equip.name}
                    </div>
                    {/* EXIT: show entry condition as badge */}
                    {isExit && entryEquip?.condition && (
                      <span className={`text-[12px] px-2 py-0.5 rounded-full ${t.exitEntryBg} ${t.textMuted}`}>
                        Entrée : {entryEquip.condition === 'NEW' ? 'Neuf' :
                          entryEquip.condition === 'GOOD' ? 'Bon' :
                          entryEquip.condition === 'NORMAL_WEAR' ? 'Usure' :
                          entryEquip.condition === 'DEGRADED' ? 'Dégradé' : 'H.S.'}
                      </span>
                    )}
                  </div>
                  <ConditionChips
                    value={equip.condition}
                    onChange={async (condition: ElementCondition) => {
                      if (isExit && entryEquip?.condition) {
                        const evo = computeEvolution(entryEquip.condition, condition);
                        await updateElement(equip.id, { condition, evolution: evo || undefined });
                      } else {
                        await updateElement(equip.id, { condition });
                      }
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
                  {/* Evolution badge */}
                  {isExit && equipEvolution && (
                    <div className="mt-2">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-medium ${
                        equipEvolution === 'UNCHANGED' ? t.evolutionUnchanged :
                        equipEvolution === 'NORMAL_WEAR' ? t.evolutionNormalWear :
                        equipEvolution === 'DETERIORATION' ? t.evolutionDeterioration :
                        t.evolutionImprovement
                      }`}>
                        {EVOLUTION_CONFIG[equipEvolution].label}
                      </span>
                    </div>
                  )}
                  {/* ENTRY mode: installationYear (for vétusté calculation at exit) */}
                  {!isExit && equip.condition && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className={`text-[13px] ${t.textMuted}`}>Année de pose</label>
                      <input
                        type="number"
                        min={1950}
                        max={new Date().getFullYear()}
                        placeholder="—"
                        defaultValue={equip.installationYear || ''}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1950 && val <= new Date().getFullYear()) {
                            updateElement(equip.id, { installationYear: val });
                          } else if (!e.target.value) {
                            updateElement(equip.id, { installationYear: null });
                          }
                        }}
                        className={`w-20 px-2 py-1 rounded-lg text-[14px] text-center border ${t.border} bg-transparent ${t.textSecondary} focus:outline-none focus:ring-1 focus:ring-amber-400`}
                      />
                    </div>
                  )}
                </div>
              );
            })}

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
        <StepPills steps={steps} onStepSelect={handleStepSelect} />

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className={`text-[28px] font-medium mb-1 tracking-tight ${t.textPrimary}`}>
            Observation générale
          </div>
          <div className={`text-[21px] font-medium mb-8 ${t.textSecondary}`}>
            {currentRoom.name}
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
