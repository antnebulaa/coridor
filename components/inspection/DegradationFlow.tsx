'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DEGRADATION_TYPES } from '@/lib/inspection';
import { EDL_THEME as t } from '@/lib/inspection-theme';
import CameraCapture from './CameraCapture';
import AudioRecorder from './AudioRecorder';
import InspectionBtn from './InspectionBtn';

type DegradPhase = 'TYPE' | 'CLOSEUP' | 'AUDIO';

interface DegradationFlowProps {
  onComplete: (data: {
    degradationTypes: string[];
    photoUrl?: string;
    photoThumbnailUrl?: string;
    photoSha256?: string;
    observations?: string;
  }) => void;
  onCancel: () => void;
  elementName: string;
}

const DegradationFlow: React.FC<DegradationFlowProps> = ({
  onComplete,
  onCancel,
  elementName,
}) => {
  const [phase, setPhase] = useState<DegradPhase>('TYPE');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [photoThumbnailUrl, setPhotoThumbnailUrl] = useState<string>();
  const [photoSha256, setPhotoSha256] = useState<string>();
  const [observations, setObservations] = useState('');

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Phase TYPE — Select degradation types
  if (phase === 'TYPE') {
    return (
      <div className={`flex flex-col h-full ${t.bgPage}`}>
        <div className="flex-1 px-5 pt-6 overflow-y-auto">
          <button
            onClick={onCancel}
            className={`flex items-center gap-1.5 mb-4 text-[15px] font-medium ${t.btnBack}`}
          >
            <ArrowLeft size={18} />
            Retour
          </button>
          <div className={`text-[28px] font-medium mb-1 tracking-tight ${t.textPrimary}`}>
            Type de dégradation
          </div>
          <div className={`text-[22px] font-medium mb-2 ${t.textSecondary}`}>
            {elementName}
          </div>
          <div className={`text-[17px] mb-8 ${t.textSecondary}`}>
            Sélectionnez un ou plusieurs types
          </div>

          <div className="flex flex-wrap gap-3">
            {DEGRADATION_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-5 py-3 rounded-2xl text-[17px] font-medium active:scale-95 ${
                    isSelected ? t.degradChipSelected : t.degradChipDefault
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <InspectionBtn
          onClick={() => setPhase('CLOSEUP')}
          disabled={selectedTypes.length === 0}
        >
          Prendre la photo →
        </InspectionBtn>
      </div>
    );
  }

  // Phase CLOSEUP — Take close-up photo
  if (phase === 'CLOSEUP') {
    return (
      <div className={`flex flex-col h-full ${t.cameraBg}`}>
        <CameraCapture
          label="Plan serré"
          instruction="Zoomez sur la dégradation"
          onCapture={(url, thumb, sha) => {
            setPhotoUrl(url);
            setPhotoThumbnailUrl(thumb);
            setPhotoSha256(sha);
            setPhase('AUDIO');
          }}
          onCancel={() => setPhase('TYPE')}
          accentColor={t.orange}
        />
      </div>
    );
  }

  // Phase AUDIO — Dictate or type observation
  if (phase === 'AUDIO') {
    return (
      <div className={`flex flex-col h-full ${t.bgPage}`}>
        <div className="flex-1 px-5 pt-6 overflow-y-auto">
          <div className={`text-[28px] font-medium mb-1 tracking-tight ${t.textPrimary}`}>
            Observation
          </div>
          <div className={`text-[22px] font-medium mb-2 ${t.textSecondary}`}>
            {elementName} 
          </div>
          <div className={`text-[17px] mb-8 ${t.textSecondary}`}>
            {selectedTypes.join(', ')}
          </div>

          <AudioRecorder
            value={observations}
            onChange={setObservations}
            placeholder="Dicter"
          />
        </div>

        <InspectionBtn
          onClick={() =>
            onComplete({
              degradationTypes: selectedTypes,
              photoUrl,
              photoThumbnailUrl,
              photoSha256,
              observations,
            })
          }
        >
          Enregistrer →
        </InspectionBtn>
      </div>
    );
  }

  return null;
};

export default DegradationFlow;
