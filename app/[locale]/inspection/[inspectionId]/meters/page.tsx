'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useInspection } from '@/hooks/useInspection';
import WizardInput from '@/components/inspection/WizardInput';
import WizardPhoto from '@/components/inspection/WizardPhoto';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import { EDL_COLORS, METER_WIZARD_STEPS, METER_TYPE_LABELS, AI_TIPS } from '@/lib/inspection';
import { CheckCircle2 } from 'lucide-react';

// 7 steps: elec number, elec index, elec photo, water number, water index, water photo, summary
const TOTAL_STEPS = 7;

export default function MetersPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const router = useRouter();
  const { inspection, updateMeter } = useInspection(inspectionId);
  const [currentStep, setCurrentStep] = useState(0);
  const [noGas, setNoGas] = useState(false);

  // Local state for wizard values
  const [values, setValues] = useState({
    elecNumber: '',
    elecIndex: '',
    elecPhotoUrl: '',
    elecPhotoThumb: '',
    elecPhotoSha: '',
    waterNumber: '',
    waterIndex: '',
    waterPhotoUrl: '',
    waterPhotoThumb: '',
    waterPhotoSha: '',
  });

  const saveAndNext = useCallback(async (step: number, value: string | { url: string; thumb: string; sha: string }) => {
    const newValues = { ...values };

    switch (step) {
      case 0: // Elec number
        newValues.elecNumber = value as string;
        await updateMeter('ELECTRICITY', { meterNumber: value as string });
        break;
      case 1: // Elec index
        newValues.elecIndex = value as string;
        await updateMeter('ELECTRICITY', { indexValue: value as string });
        break;
      case 2: { // Elec photo
        const photo = value as { url: string; thumb: string; sha: string };
        newValues.elecPhotoUrl = photo.url;
        newValues.elecPhotoThumb = photo.thumb;
        newValues.elecPhotoSha = photo.sha;
        await updateMeter('ELECTRICITY', { photoUrl: photo.url, photoThumbnailUrl: photo.thumb });
        break;
      }
      case 3: // Water number
        newValues.waterNumber = value as string;
        await updateMeter('WATER', { meterNumber: value as string });
        break;
      case 4: // Water index
        newValues.waterIndex = value as string;
        await updateMeter('WATER', { indexValue: value as string });
        break;
      case 5: { // Water photo
        const photo = value as { url: string; thumb: string; sha: string };
        newValues.waterPhotoUrl = photo.url;
        newValues.waterPhotoThumb = photo.thumb;
        newValues.waterPhotoSha = photo.sha;
        await updateMeter('WATER', { photoUrl: photo.url, photoThumbnailUrl: photo.thumb });
        break;
      }
    }

    setValues(newValues);
    setCurrentStep(step + 1);
  }, [values, updateMeter]);

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else router.back();
  };

  const handleFinish = async () => {
    if (noGas) {
      await updateMeter('GAS', { noGas: true });
    }
    router.push(`/inspection/${inspectionId}/keys`);
  };

  // Summary screen (step 6)
  if (currentStep === 6) {
    const MeterCard = ({ icon, label, number, index, hasPhoto }: {
      icon: string; label: string; number: string; index: string; hasPhoto: boolean;
    }) => (
      <div
        className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
      >
        <div className="text-[28px]">{icon}</div>
        <div className="flex-1">
          <div className="text-[18px] font-bold" style={{ color: EDL_COLORS.text }}>{label}</div>
          <div className="text-[15px] mt-0.5" style={{ color: EDL_COLORS.text2 }}>
            N° {number || '—'} · {index || '—'} {label === 'Électricité' ? 'kWh' : 'm³'}
          </div>
        </div>
        {hasPhoto && <CheckCircle2 size={22} color={EDL_COLORS.green} />}
      </div>
    );

    return (
      <div className="h-full flex flex-col">
        <InspectionTopBar
          title="Compteurs"
          subtitle="Récapitulatif"
          onBack={handleBack}
          step={{ current: 7, total: TOTAL_STEPS }}
        />
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          <InspectionAIBubble>{AI_TIPS.METERS}</InspectionAIBubble>

          <MeterCard
            icon="⚡"
            label="Électricité"
            number={values.elecNumber}
            index={values.elecIndex}
            hasPhoto={!!values.elecPhotoUrl}
          />
          <MeterCard
            icon="💧"
            label="Eau"
            number={values.waterNumber}
            index={values.waterIndex}
            hasPhoto={!!values.waterPhotoUrl}
          />

          {/* No gas toggle */}
          <button
            onClick={() => setNoGas(!noGas)}
            className="flex items-center gap-4 w-full rounded-2xl p-4"
            style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
          >
            <div className="text-[28px]">🔥</div>
            <div className="flex-1 text-left">
              <div className="text-[18px] font-bold" style={{ color: EDL_COLORS.text }}>
                Gaz
              </div>
              <div className="text-[15px]" style={{ color: EDL_COLORS.text2 }}>
                {noGas ? 'Pas de gaz dans ce logement' : 'Touchez pour indiquer "pas de gaz"'}
              </div>
            </div>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: noGas ? EDL_COLORS.text3 : 'transparent',
                border: noGas ? 'none' : `2px solid ${EDL_COLORS.border}`,
              }}
            >
              {noGas && <span className="text-white text-[14px] font-bold">✓</span>}
            </div>
          </button>
        </div>

        <InspectionBtn onClick={handleFinish}>Clés & accès →</InspectionBtn>
      </div>
    );
  }

  // Wizard steps 0-5
  const wizardConfig = METER_WIZARD_STEPS[currentStep];
  if (!wizardConfig) return null;

  if (wizardConfig.field === 'photo') {
    return (
      <div className="h-full flex flex-col">
        <WizardPhoto
          title="Compteurs"
          label={wizardConfig.label}
          instruction="Cadrez les chiffres lisiblement"
          onNext={(url, thumb, sha) => saveAndNext(currentStep, { url, thumb, sha })}
          onBack={handleBack}
          step={currentStep + 1}
          total={TOTAL_STEPS}
        />
      </div>
    );
  }

  const currentValue = currentStep === 0 ? values.elecNumber
    : currentStep === 1 ? values.elecIndex
    : currentStep === 3 ? values.waterNumber
    : currentStep === 4 ? values.waterIndex
    : '';

  return (
    <div className="h-full flex flex-col">
      <WizardInput
        title="Compteurs"
        icon={wizardConfig.icon}
        label={wizardConfig.label}
        hint={wizardConfig.hint}
        inputMode={wizardConfig.inputMode}
        value={currentValue}
        onNext={(val) => saveAndNext(currentStep, val)}
        onBack={handleBack}
        step={currentStep + 1}
        total={TOTAL_STEPS}
      />
    </div>
  );
}
