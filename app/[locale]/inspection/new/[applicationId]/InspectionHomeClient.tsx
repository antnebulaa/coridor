'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import InspectionTopBar from '@/components/inspection/InspectionTopBar';
import InspectionBtn from '@/components/inspection/InspectionBtn';
import InspectionAIBubble from '@/components/inspection/InspectionAIBubble';
import { EDL_COLORS, AI_TIPS } from '@/lib/inspection';
import { User, MapPin, Calendar, Home, CheckCircle2 } from 'lucide-react';

interface InspectionHomeClientProps {
  applicationId: string;
  landlordName: string;
  tenantName: string;
  address: string;
  propertyType: string;
  locale: string;
}

const InspectionHomeClient: React.FC<InspectionHomeClientProps> = ({
  applicationId,
  landlordName,
  tenantName,
  address,
  propertyType,
  locale,
}) => {
  const router = useRouter();
  const [tenantPresent, setTenantPresent] = useState(true);
  const [representativeName, setRepresentativeName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleStart = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          type: 'ENTRY',
        }),
      });

      if (!res.ok) throw new Error('Failed to create inspection');

      const inspection = await res.json();

      // If tenant not present, save representative info
      if (!tenantPresent && representativeName) {
        await fetch(`/api/inspection/${inspection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantPresent: false,
            representativeName,
          }),
        });
      }

      router.push(`/inspection/${inspection.id}/meters`);
    } catch (err) {
      console.error('Failed to create inspection:', err);
      setIsCreating(false);
    }
  };

  const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-center gap-3 py-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: EDL_COLORS.card2 }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[13px] uppercase tracking-wider font-medium" style={{ color: EDL_COLORS.text3 }}>
          {label}
        </div>
        <div className="text-[17px] font-bold" style={{ color: EDL_COLORS.text }}>
          {value}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <InspectionTopBar title="État des lieux d'entrée" />

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* AI Bubble */}
        <InspectionAIBubble>{AI_TIPS.HOME}</InspectionAIBubble>

        {/* Info card */}
        <div
          className="rounded-2xl p-4 mb-5"
          style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
        >
          <InfoRow
            icon={<User size={16} color={EDL_COLORS.text2} />}
            label="Bailleur"
            value={landlordName}
          />
          <InfoRow
            icon={<User size={16} color={EDL_COLORS.text2} />}
            label="Locataire"
            value={tenantName}
          />
          <InfoRow
            icon={<MapPin size={16} color={EDL_COLORS.text2} />}
            label="Adresse"
            value={address}
          />
          <InfoRow
            icon={<Home size={16} color={EDL_COLORS.text2} />}
            label="Type de bien"
            value={propertyType}
          />
          <InfoRow
            icon={<Calendar size={16} color={EDL_COLORS.text2} />}
            label="Date"
            value={today}
          />
        </div>

        {/* Tenant present check */}
        <div
          className="rounded-2xl p-4 mb-5"
          style={{ background: EDL_COLORS.card, border: `1px solid ${EDL_COLORS.border}` }}
        >
          <button
            onClick={() => setTenantPresent(!tenantPresent)}
            className="flex items-center gap-3 w-full"
          >
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: tenantPresent ? EDL_COLORS.accent : 'transparent',
                border: tenantPresent ? 'none' : `2px solid ${EDL_COLORS.border}`,
              }}
            >
              {tenantPresent && <CheckCircle2 size={16} color="#000" />}
            </div>
            <div className="text-[17px] font-bold" style={{ color: EDL_COLORS.text }}>
              Le locataire est présent
            </div>
          </button>

          {/* Representative field if tenant absent */}
          {!tenantPresent && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${EDL_COLORS.border}` }}>
              <div className="text-[15px] font-medium mb-2" style={{ color: EDL_COLORS.text2 }}>
                Nom du mandataire
              </div>
              <input
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="Nom et qualité du mandataire"
                className="w-full p-3.5 rounded-xl text-[17px] outline-none"
                style={{
                  background: EDL_COLORS.card2,
                  color: EDL_COLORS.text,
                  border: `1px solid ${EDL_COLORS.border}`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <InspectionBtn
        onClick={handleStart}
        loading={isCreating}
        disabled={!tenantPresent && !representativeName}
      >
        Commencer l&apos;inspection →
      </InspectionBtn>
    </div>
  );
};

export default InspectionHomeClient;
