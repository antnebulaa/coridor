'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Inspection,
  InspectionMeter,
  InspectionKey,
  InspectionRoom,
  InspectionElement,
  InspectionPhoto,
  InspectionFurniture,
  ElementCondition,
  ElementEvolution,
  MeterType,
  InspectionRoomType,
  PhotoType,
} from '@prisma/client';

// ─── Types ───

export type InspectionElementWithPhotos = InspectionElement & {
  photos: InspectionPhoto[];
};

export type InspectionRoomWithElements = InspectionRoom & {
  elements: InspectionElementWithPhotos[];
  photos: InspectionPhoto[];
};

export type FullInspection = Inspection & {
  meters: InspectionMeter[];
  keys: InspectionKey[];
  rooms: InspectionRoomWithElements[];
  photos: InspectionPhoto[];
  furniture: InspectionFurniture[];
  entryInspection?: FullInspection; // Données d'entrée pour comparaison (mode EXIT)
};

// ─── EXIT comparison helpers ───

/**
 * Compute the evolution between entry and exit conditions.
 */
export function computeEvolution(
  entryCondition: ElementCondition | null | undefined,
  exitCondition: ElementCondition | null | undefined
): ElementEvolution | null {
  if (!entryCondition || !exitCondition) return null;

  const ORDER: Record<ElementCondition, number> = {
    NEW: 5,
    GOOD: 4,
    NORMAL_WEAR: 3,
    DEGRADED: 2,
    OUT_OF_SERVICE: 1,
  };

  const entryScore = ORDER[entryCondition];
  const exitScore = ORDER[exitCondition];

  if (exitScore > entryScore) return 'IMPROVEMENT';
  if (exitScore === entryScore) return 'UNCHANGED';
  if (exitScore === entryScore - 1) return 'NORMAL_WEAR';
  return 'DETERIORATION';
}

/**
 * Find the corresponding entry element for a given exit element.
 * Matches by room order + element name + category.
 */
export function getEntryElement(
  exitElement: InspectionElement,
  exitRoom: InspectionRoomWithElements,
  entryInspection: FullInspection | undefined
): InspectionElementWithPhotos | null {
  if (!entryInspection) return null;

  // Find matching entry room by order (same position in the list)
  const entryRoom = entryInspection.rooms.find(
    (r) => r.order === exitRoom.order && r.roomType === exitRoom.roomType
  );
  if (!entryRoom) return null;

  // Find matching element by name + category
  return entryRoom.elements.find(
    (e) => e.name === exitElement.name && e.category === exitElement.category
  ) || null;
}

/**
 * Find the entry overview photo for a given exit room.
 */
export function getEntryRoomPhoto(
  exitRoom: InspectionRoomWithElements,
  photoType: PhotoType,
  entryInspection: FullInspection | undefined
): InspectionPhoto | null {
  if (!entryInspection) return null;

  const entryRoom = entryInspection.rooms.find(
    (r) => r.order === exitRoom.order && r.roomType === exitRoom.roomType
  );
  if (!entryRoom) return null;

  return entryRoom.photos.find((p) => p.type === photoType) || null;
}

// ─── Session Storage helpers ───

const SESSION_KEY_PREFIX = 'edl_';

function saveToSession(inspectionId: string, data: FullInspection) {
  try {
    sessionStorage.setItem(
      `${SESSION_KEY_PREFIX}${inspectionId}`,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // sessionStorage full or unavailable — silent fail
  }
}

function loadFromSession(inspectionId: string): FullInspection | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${inspectionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Only restore if saved less than 24h ago
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${inspectionId}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function clearSession(inspectionId: string) {
  try {
    sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${inspectionId}`);
  } catch {
    // silent
  }
}

// ─── Hook ───

const AUTO_SAVE_DELAY = 5000; // 5 seconds
const SESSION_SAVE_DELAY = 2000; // 2 seconds debounce for sessionStorage

export function useInspection(inspectionId: string | undefined) {
  const [inspection, setInspection] = useState<FullInspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const pendingChangesRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sessionSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ─── Fetch inspection (with sessionStorage fallback) ───

  const fetchInspection = useCallback(async () => {
    if (!inspectionId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/inspection/${inspectionId}`);
      if (!res.ok) throw new Error('Failed to fetch inspection');
      const data = await res.json();
      setInspection(data);
      setIsOffline(false);
      // Cache to sessionStorage
      saveToSession(inspectionId, data);
    } catch (err: unknown) {
      // Try to restore from sessionStorage
      const cached = loadFromSession(inspectionId);
      if (cached) {
        setInspection(cached);
        setIsOffline(true);
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  // ─── Debounced sessionStorage persistence ───

  useEffect(() => {
    if (!inspection || !inspectionId) return;

    if (sessionSaveTimerRef.current) {
      clearTimeout(sessionSaveTimerRef.current);
    }

    sessionSaveTimerRef.current = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => saveToSession(inspectionId, inspection), { timeout: 5000 });
      } else {
        saveToSession(inspectionId, inspection);
      }
    }, SESSION_SAVE_DELAY);

    return () => {
      if (sessionSaveTimerRef.current) {
        clearTimeout(sessionSaveTimerRef.current);
      }
    };
  }, [inspection, inspectionId]);

  // Flush sessionStorage on unmount
  useEffect(() => {
    const id = inspectionId;
    return () => {
      if (sessionSaveTimerRef.current) {
        clearTimeout(sessionSaveTimerRef.current);
      }
      // Sync flush — safe because this only runs once on unmount
      if (id) {
        const cached = loadFromSession(id);
        // Only flush if there's no recent save (avoid overwriting with stale data)
        if (!cached) return;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auto-save (debounced PATCH) ───

  const scheduleAutoSave = useCallback(() => {
    if (!inspectionId) return;
    pendingChangesRef.current = true;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!pendingChangesRef.current) return;
      pendingChangesRef.current = false;
      setIsSaving(true);
      try {
        await fetch(`/api/inspection/${inspectionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ touch: true }),
        });
      } catch {
        // Silent fail for auto-save
      } finally {
        setIsSaving(false);
      }
    }, AUTO_SAVE_DELAY);
  }, [inspectionId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // ─── API helpers ───

  const apiCall = useCallback(async (url: string, options: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'API error');
    }
    return res.json();
  }, []);

  // ─── Meters (optimistic) ───

  const updateMeter = useCallback(async (
    type: MeterType,
    data: { meterNumber?: string; indexValue?: string; photoUrl?: string; photoThumbnailUrl?: string; noGas?: boolean }
  ) => {
    if (!inspectionId) return;

    // Optimistic update
    setInspection(prev => {
      if (!prev) return prev;
      const existing = prev.meters.findIndex(m => m.type === type);
      const meters = [...prev.meters];
      if (existing >= 0) {
        meters[existing] = { ...meters[existing], ...data };
      } else {
        // Temporary entry — will be reconciled with server result
        meters.push({ id: `temp_${Date.now()}`, inspectionId, type, ...data } as InspectionMeter);
      }
      return { ...prev, meters };
    });

    // Fire API in background
    try {
      const result = await apiCall(`/api/inspection/${inspectionId}/meters`, {
        method: 'POST',
        body: JSON.stringify({ type, ...data }),
      });
      // Reconcile with server result
      setInspection(prev => {
        if (!prev) return prev;
        const idx = prev.meters.findIndex(m => m.type === type);
        const meters = [...prev.meters];
        if (idx >= 0) meters[idx] = result;
        return { ...prev, meters };
      });
      scheduleAutoSave();
      return result;
    } catch {
      fetchInspection(); // rollback
    }
  }, [inspectionId, apiCall, scheduleAutoSave, fetchInspection]);

  // ─── Keys (optimistic) ───

  const updateKey = useCallback(async (type: string, quantity: number) => {
    if (!inspectionId) return;

    // Optimistic update
    setInspection(prev => {
      if (!prev) return prev;
      const existing = prev.keys.findIndex(k => k.type === type);
      const keys = [...prev.keys];
      if (existing >= 0) {
        keys[existing] = { ...keys[existing], quantity };
      } else {
        keys.push({ id: `temp_${Date.now()}`, inspectionId, type, quantity } as InspectionKey);
      }
      return { ...prev, keys };
    });

    // Fire API in background
    try {
      const result = await apiCall(`/api/inspection/${inspectionId}/keys`, {
        method: 'POST',
        body: JSON.stringify({ type, quantity }),
      });
      setInspection(prev => {
        if (!prev) return prev;
        const idx = prev.keys.findIndex(k => k.type === type);
        const keys = [...prev.keys];
        if (idx >= 0) keys[idx] = result;
        return { ...prev, keys };
      });
      scheduleAutoSave();
      return result;
    } catch {
      fetchInspection();
    }
  }, [inspectionId, apiCall, scheduleAutoSave, fetchInspection]);

  // ─── Rooms ───

  const addRoom = useCallback(async (roomType: InspectionRoomType, name: string) => {
    if (!inspectionId) return;
    // NOT optimistic — needs server-generated ID
    const result = await apiCall(`/api/inspection/${inspectionId}/rooms`, {
      method: 'POST',
      body: JSON.stringify({ roomType, name }),
    });

    setInspection(prev => {
      if (!prev) return prev;
      return { ...prev, rooms: [...prev.rooms, { ...result, elements: [], photos: [] }] };
    });

    return result;
  }, [inspectionId, apiCall]);

  const updateRoom = useCallback(async (roomId: string, data: { isCompleted?: boolean; observations?: string }) => {
    if (!inspectionId) return;

    // Optimistic update
    setInspection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map(r => r.id === roomId ? { ...r, ...data } : r),
      };
    });

    // Fire API in background
    try {
      const result = await apiCall(`/api/inspection/${inspectionId}/rooms/${roomId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      // Reconcile
      setInspection(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map(r => r.id === roomId ? { ...r, ...result } : r),
        };
      });
      scheduleAutoSave();
      return result;
    } catch {
      fetchInspection();
    }
  }, [inspectionId, apiCall, scheduleAutoSave, fetchInspection]);

  // ─── Elements ───

  const addElement = useCallback(async (
    roomId: string,
    data: { category: string; name: string; nature?: string[] }
  ) => {
    if (!inspectionId) return;
    // NOT optimistic — needs server-generated ID
    const result = await apiCall(`/api/inspection/${inspectionId}/rooms/${roomId}/elements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    setInspection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map(r =>
          r.id === roomId
            ? { ...r, elements: [...r.elements, { ...result, photos: [] }] }
            : r
        ),
      };
    });

    return result;
  }, [inspectionId, apiCall]);

  const updateElement = useCallback(async (
    elementId: string,
    data: {
      condition?: ElementCondition;
      nature?: string[];
      observations?: string;
      degradationTypes?: string[];
      isAbsent?: boolean;
      evolution?: ElementEvolution;
    }
  ) => {
    if (!inspectionId) return;

    // Optimistic update — apply immediately
    setInspection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map(r => ({
          ...r,
          elements: r.elements.map(e =>
            e.id === elementId ? { ...e, ...data } : e
          ),
        })),
      };
    });

    // Fire API in background
    try {
      apiCall(`/api/inspection/${inspectionId}/elements/${elementId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).catch(() => fetchInspection());
    } catch {
      fetchInspection();
    }

    scheduleAutoSave();
  }, [inspectionId, apiCall, scheduleAutoSave, fetchInspection]);

  // ─── Photos (optimistic with temp ID) ───

  const addPhoto = useCallback(async (data: {
    type: PhotoType;
    url: string;
    thumbnailUrl?: string;
    sha256?: string;
    inspectionRoomId?: string;
    inspectionElementId?: string;
    latitude?: number;
    longitude?: number;
    deviceInfo?: string;
  }) => {
    if (!inspectionId) return;

    const tempId = `temp_${Date.now()}`;
    const tempPhoto = {
      id: tempId,
      inspectionId,
      type: data.type,
      url: data.url,
      thumbnailUrl: data.thumbnailUrl || null,
      sha256: data.sha256 || null,
      inspectionRoomId: data.inspectionRoomId || null,
      inspectionElementId: data.inspectionElementId || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      deviceInfo: data.deviceInfo || null,
      capturedAt: new Date(),
      createdAt: new Date(),
    } as InspectionPhoto;

    // Optimistic — add to state immediately
    setInspection(prev => {
      if (!prev) return prev;
      const updated = { ...prev, photos: [...prev.photos, tempPhoto] };

      if (data.inspectionRoomId) {
        updated.rooms = updated.rooms.map(r => {
          if (r.id === data.inspectionRoomId) {
            const updatedRoom = { ...r, photos: [...r.photos, tempPhoto] };
            if (data.inspectionElementId) {
              updatedRoom.elements = updatedRoom.elements.map(e =>
                e.id === data.inspectionElementId
                  ? { ...e, photos: [...e.photos, tempPhoto] }
                  : e
              );
            }
            return updatedRoom;
          }
          return r;
        });
      }

      return updated;
    });

    // Background — persist to DB and reconcile ID
    try {
      const result = await apiCall(`/api/inspection/${inspectionId}/photos`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Replace temp photo with real server result
      const replaceTemp = (photo: InspectionPhoto) =>
        photo.id === tempId ? { ...photo, id: result.id } : photo;

      setInspection(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          photos: prev.photos.map(replaceTemp),
          rooms: prev.rooms.map(r => ({
            ...r,
            photos: r.photos.map(replaceTemp),
            elements: r.elements.map(e => ({
              ...e,
              photos: e.photos.map(replaceTemp),
            })),
          })),
        };
      });

      scheduleAutoSave();
      return result;
    } catch {
      fetchInspection(); // rollback
    }
  }, [inspectionId, apiCall, scheduleAutoSave, fetchInspection]);

  // ─── Signature (NOT optimistic — critical operation) ───

  const sign = useCallback(async (data: {
    role: 'landlord' | 'tenant';
    signature: { svg: string; timestamp: string; ip?: string; userAgent?: string; geoloc?: { lat: number; lng: number } };
    reserves?: string;
    token?: string;
  }) => {
    if (!inspectionId) return;
    const result = await apiCall(`/api/inspection/${inspectionId}/sign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    setInspection(prev => {
      if (!prev) return prev;
      return { ...prev, ...result };
    });

    // Clear session cache once signed
    if (inspectionId && (result.status === 'SIGNED' || result.status === 'LOCKED')) {
      clearSession(inspectionId);
    }

    return result;
  }, [inspectionId, apiCall]);

  const getSignLink = useCallback(async () => {
    if (!inspectionId) return;
    const result = await apiCall(`/api/inspection/${inspectionId}/sign-link`, {
      method: 'GET',
    });
    return result.url as string;
  }, [inspectionId, apiCall]);

  // ─── General update (optimistic) ───

  const updateInspection = useCallback(async (data: Partial<Pick<Inspection, 'tenantPresent' | 'representativeName' | 'representativeMandate' | 'generalObservations' | 'tenantReserves'>>) => {
    if (!inspectionId) return;

    // Optimistic update
    setInspection(prev => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });

    // Fire API in background
    try {
      apiCall(`/api/inspection/${inspectionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).catch(() => fetchInspection());
    } catch {
      fetchInspection();
    }

    scheduleAutoSave();
  }, [inspectionId, apiCall, scheduleAutoSave, fetchInspection]);

  // ─── Generate PDF (NOT optimistic — server-only operation) ───

  const generatePdf = useCallback(async () => {
    if (!inspectionId) return;
    const result = await apiCall(`/api/inspection/${inspectionId}/generate-pdf`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    setInspection(prev => {
      if (!prev) return prev;
      return { ...prev, pdfUrl: result.pdfUrl };
    });

    return result;
  }, [inspectionId, apiCall]);

  return {
    inspection,
    isLoading,
    error,
    isSaving,
    isOffline,
    refetch: fetchInspection,
    updateInspection,
    updateMeter,
    updateKey,
    addRoom,
    updateRoom,
    addElement,
    updateElement,
    addPhoto,
    sign,
    getSignLink,
    generatePdf,
  };
}
