'use client';

import React from 'react';
import InspectionTopBar from './InspectionTopBar';
import CameraCapture from './CameraCapture';

interface WizardPhotoProps {
  title: string;
  label: string;
  instruction?: string;
  onNext: (url: string, thumbnailUrl: string, sha256: string) => void;
  onBack: () => void;
  step: number;
  total: number;
}

const WizardPhoto: React.FC<WizardPhotoProps> = ({
  title,
  label,
  instruction,
  onNext,
  onBack,
  step,
  total,
}) => {
  return (
    <div className="flex flex-col h-full" style={{ background: '#0A0A0A' }}>
      <InspectionTopBar
        title={title}
        onBack={onBack}
        step={{ current: step, total }}
      />
      <CameraCapture
        label={label}
        instruction={instruction}
        onCapture={(url, thumbnailUrl, sha256) => onNext(url, thumbnailUrl, sha256)}
      />
    </div>
  );
};

export default WizardPhoto;
