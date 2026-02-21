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
};

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

export function useInspection(inspectionId: string | undefined) {
  const [inspection, setInspection] = useState<FullInspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const pendingChangesRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // ─── Persist to sessionStorage on every state change ───

  useEffect(() => {
    if (inspection && inspectionId) {
      saveToSession(inspectionId, inspection);
    }
  }, [inspection, inspectionId]);

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

  // ─── Meters ───

  const updateMeter = useCallback(async (
    type: MeterType,
    data: { meterNumber?: string; indexValue?: string; photoUrl?: string; photoThumbnailUrl?: string; noGas?: boolean }
  ) => {
    if (!inspectionId) return;
    const result = await apiCall(`/api/inspection/${inspectionId}/meters`, {
      method: 'POST',
      body: JSON.stringify({ type, ...data }),
    });

    setInspection(prev => {
      if (!prev) return prev;
      const existing = prev.meters.findIndex(m => m.type === type);
      const meters = [...prev.meters];
      if (existing >= 0) {
        meters[existing] = result;
      } else {
        meters.push(result);
      }
      return { ...prev, meters };
    });

    scheduleAutoSave();
    return result;
  }, [inspectionId, apiCall, scheduleAutoSave]);

  // ─── Keys ───

  const updateKey = useCallback(async (type: string, quantity: number) => {
    if (!inspectionId) return;
    const result = await apiCall(`/api/inspection/${inspectionId}/keys`, {
      method: 'POST',
      body: JSON.stringify({ type, quantity }),
    });

    setInspection(prev => {
      if (!prev) return prev;
      const existing = prev.keys.findIndex(k => k.type === type);
      const keys = [...prev.keys];
      if (existing >= 0) {
        keys[existing] = result;
      } else {
        keys.push(result);
      }
      return { ...prev, keys };
    });

    scheduleAutoSave();
    return result;
  }, [inspectionId, apiCall, scheduleAutoSave]);

  // ─── Rooms ───

  const addRoom = useCallback(async (roomType: InspectionRoomType, name: string) => {
    if (!inspectionId) return;
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
    const result = await apiCall(`/api/inspection/${inspectionId}/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    setInspection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map(r => r.id === roomId ? { ...r, ...result } : r),
      };
    });

    scheduleAutoSave();
    return result;
  }, [inspectionId, apiCall, scheduleAutoSave]);

  // ─── Elements ───

  const addElement = useCallback(async (
    roomId: string,
    data: { category: string; name: string; nature?: string[] }
  ) => {
    if (!inspectionId) return;
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
    }
  ) => {
    if (!inspectionId) return;
    const result = await apiCall(`/api/inspection/${inspectionId}/elements/${elementId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    // Update element in the correct room
    setInspection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map(r => ({
          ...r,
          elements: r.elements.map(e =>
            e.id === elementId ? { ...e, ...result } : e
          ),
        })),
      };
    });

    scheduleAutoSave();
    return result;
  }, [inspectionId, apiCall, scheduleAutoSave]);

  // ─── Photos ───

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
    const result = await apiCall(`/api/inspection/${inspectionId}/photos`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    setInspection(prev => {
      if (!prev) return prev;
      const updated = { ...prev, photos: [...prev.photos, result] };

      // Also add to the correct room/element
      if (data.inspectionRoomId) {
        updated.rooms = updated.rooms.map(r => {
          if (r.id === data.inspectionRoomId) {
            const updatedRoom = { ...r, photos: [...r.photos, result] };
            if (data.inspectionElementId) {
              updatedRoom.elements = updatedRoom.elements.map(e =>
                e.id === data.inspectionElementId
                  ? { ...e, photos: [...e.photos, result] }
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

    scheduleAutoSave();
    return result;
  }, [inspectionId, apiCall, scheduleAutoSave]);

  // ─── Signature ───

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

  // ─── General update ───

  const updateInspection = useCallback(async (data: Partial<Pick<Inspection, 'tenantPresent' | 'representativeName' | 'representativeMandate' | 'generalObservations' | 'tenantReserves'>>) => {
    if (!inspectionId) return;
    const result = await apiCall(`/api/inspection/${inspectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    setInspection(prev => {
      if (!prev) return prev;
      return { ...prev, ...result };
    });

    scheduleAutoSave();
    return result;
  }, [inspectionId, apiCall, scheduleAutoSave]);

  // ─── Generate PDF ───

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
