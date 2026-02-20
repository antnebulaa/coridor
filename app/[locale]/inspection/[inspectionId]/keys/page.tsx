'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import CameraCapture from '@/components/inspection/CameraCapture';
import { EDL_COLORS, DEFAULT_KEY_TYPES, AI_TIPS } from '@/lib/inspection';
import { Plus, Minus } from 'lucide-react';

type Phase = 'PHOTO' | 'KEYS';

export default function KeysPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection, updateKey, addPhoto } = useInspection(inspectionId);
  const [phase, setPhase] = useState<Phase>('PHOTO');
  const [keyPhoto, setKeyPhoto] = useState<string | null>(null);
  const [keyCounts, setKeyCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEFAULT_KEY_TYPES.forEach((k) => (initial[k.type] = 0));
    return initial;
  });
  const [customType, setCustomType] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const handlePhotoCapture = useCallback(async (url: string, thumbnailUrl: string, sha256: string) => {
    setKeyPhoto(url);
    await addPhoto({
      type: 'KEY',
      url,
      thumbnailUrl,
      sha256,
      deviceInfo: navigator.userAgent,
    });
    setPhase('KEYS');
  }, [addPhoto]);

  const updateCount = (type: string, delta: number) => {
    setKeyCounts((prev) => ({
      ...prev,
      [type]: Math.max(0, (prev[type] || 0) + delta),
    }));
  };

  const addCustomType = () => {
    if (customType.trim()) {
      setKeyCounts((prev) => ({ ...prev, [customType.trim()]: 0 }));
      setCustomType('');
      setShowAddCustom(false);
    }
  };

  const handleFinish = async () => {
    // Save all key counts
    for (const [type, quantity] of Object.entries(keyCounts)) {
      if (quantity > 0) {
        await updateKey(type, quantity);
      }
    }
    router.push(`/inspection/${inspectionId}/rooms`);
  };

  // Phase PHOTO — Take photo of keys
  if (phase === 'PHOTO') {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: EDL_COLORS.bg }}>
        <InspectionTopBar title="Clés & accès" onBack={() => router.back()} />
        <CameraCapture
          label="Photographiez les clés"
          instruction="Posez toutes les clés séparées sur une surface claire"
          onCapture={handlePhotoCapture}
          onCancel={() => setPhase('KEYS')}
        />
      </div>
    );
  }

  // Phase KEYS — Count keys by type
  const allTypes = Object.keys(keyCounts);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: EDL_COLORS.bg }}>
      <InspectionTopBar title="Clés & accès" onBack={() => setPhase('PHOTO')} />

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <InspectionAIBubble>{AI_TIPS.KEYS}</InspectionAIBubble>

        {/* Key photo preview */}
        {keyPhoto && (
          <div className="mb-4 rounded-xl overflow-hidden">
            <img src={keyPhoto} alt="Clés" className="w-full h-32 object-cover" />
          </div>
        )}

        {/* Key type steppers */}
        <div className="space-y-2.5">
          {allTypes.map((type) => {
            const defaultKey = DEFAULT_KEY_TYPES.find((k) => k.type === type);
            return (
              <div
                key={type}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
              >
                <div className="text-[22px]">{defaultKey?.icon || '🔑'}</div>
                <div className="flex-1 text-[17px] font-bold" style={{ color: EDL_COLORS.text }}>
                  {type}
                </div>
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => updateCount(type, -1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: EDL_COLORS.card2, border: `1px solid ${EDL_COLORS.border}` }}
                  >
                    <Minus size={18} color={EDL_COLORS.text3} />
                  </button>
                  <span
                    className="w-8 text-center text-[20px] font-bold"
                    style={{ color: keyCounts[type] > 0 ? EDL_COLORS.text : EDL_COLORS.text3 }}
                  >
                    {keyCounts[type]}
                  </span>
                  <button
                    onClick={() => updateCount(type, 1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: EDL_COLORS.accent, color: '#000' }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add custom type */}
        {showAddCustom ? (
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomType()}
              placeholder="Nom du type de clé"
              className="flex-1 p-3.5 rounded-xl text-[17px] outline-none"
              style={{
                background: EDL_COLORS.card,
                color: EDL_COLORS.text,
                border: `1px solid ${EDL_COLORS.border}`,
              }}
              autoFocus
            />
            <button
              onClick={addCustomType}
              className="px-5 rounded-xl text-[17px] font-bold"
              style={{ background: EDL_COLORS.accent, color: '#000' }}
            >
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            className="w-full mt-4 py-3.5 rounded-xl text-[17px] font-bold flex items-center justify-center gap-2"
            style={{ background: EDL_COLORS.card2, color: EDL_COLORS.text2, border: `1px solid ${EDL_COLORS.border}` }}
          >
            <Plus size={18} />
            Ajouter un type
          </button>
        )}
      </div>

      <InspectionBtn onClick={handleFinish}>Pièces →</InspectionBtn>
    </div>
  );
}
