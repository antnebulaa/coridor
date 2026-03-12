'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { Drawer } from 'vaul';
import { Home, ScrollText, Gift, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export type CollectableField = 'acquisition' | 'estimatedValue' | 'loan';

type AcquisitionMode = 'ACHAT' | 'HERITAGE' | 'DONATION';

interface PropertyDataSheetProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  field: CollectableField;
  onComplete: () => void;
}

// ── Acquisition mode config ──────────────────────────────────
const ACQUISITION_MODES: {
  mode: AcquisitionMode;
  label: string;
  icon: typeof Home;
}[] = [
  { mode: 'ACHAT', label: 'Achat', icon: Home },
  { mode: 'HERITAGE', label: 'Héritage / Succession', icon: ScrollText },
  { mode: 'DONATION', label: 'Donation', icon: Gift },
];

const MODE_LABELS: Record<AcquisitionMode, {
  valueLabel: string;
  dateLabel: string;
  helperText: string | null;
}> = {
  ACHAT: {
    valueLabel: "Prix d'achat",
    dateLabel: "Date d'achat",
    helperText: null,
  },
  HERITAGE: {
    valueLabel: 'Valeur déclarée dans la succession',
    dateLabel: 'Date de la succession',
    helperText: "C'est la valeur vénale estimée au jour du décès, inscrite dans l'acte du notaire.",
  },
  DONATION: {
    valueLabel: 'Valeur déclarée dans la donation',
    dateLabel: 'Date de la donation',
    helperText: "C'est la valeur vénale au jour de l'acte de donation.",
  },
};

// ── Property header ──────────────────────────────────────────
const PropertyHeader: React.FC<{ title: string; address: string }> = ({ title, address }) => (
  <div className="mb-5">
    <p className="text-2xl font-medium text-neutral-900 dark:text-white">
      {title}
    </p>
    {address && !title.includes(address) && (
      <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5">
        {address}
      </p>
    )}
  </div>
);

// ── Input field ──────────────────────────────────────────────
const InputField: React.FC<{
  id: string;
  label: string;
  type: 'money' | 'percent' | 'month-year' | 'year' | 'text';
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}> = ({ id, label, type, placeholder, value, onChange, inputRef }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1.5">
      {label}
    </label>
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={type === 'money' || type === 'percent' ? 'decimal' : type === 'year' ? 'numeric' : 'text'}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-base tabular-nums"
      />
      {type === 'money' && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400 pointer-events-none">€</span>
      )}
      {type === 'percent' && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400 pointer-events-none">%</span>
      )}
    </div>
  </div>
);

// ── Acquisition Step 1: Mode selection ──────────────────────
const AcquisitionModeStep: React.FC<{
  propertyTitle: string;
  propertyAddress: string;
  onSelect: (mode: AcquisitionMode) => void;
}> = ({ propertyTitle, propertyAddress, onSelect }) => (
  <div className="px-5 pb-8">
    <PropertyHeader title={propertyTitle} address={propertyAddress} />

    <p className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
      Comment avez-vous acquis ce bien ?
    </p>

    <div className="space-y-2.5">
      {ACQUISITION_MODES.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          onClick={() => onSelect(mode)}
          className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors text-left"
        >
          <Icon className="w-5 h-5 text-neutral-500 dark:text-neutral-400 shrink-0" />
          <span className="text-base font-medium text-neutral-900 dark:text-white">
            {label}
          </span>
        </button>
      ))}
    </div>
  </div>
);

// ── Acquisition Step 2: Value + Date ────────────────────────
const AcquisitionValueStep: React.FC<{
  mode: AcquisitionMode;
  propertyTitle: string;
  propertyAddress: string;
  values: Record<string, string>;
  error: string | null;
  saving: boolean;
  onFieldChange: (key: string, val: string) => void;
  onSave: () => void;
}> = ({ mode, propertyTitle, propertyAddress, values, error, saving, onFieldChange, onSave }) => {
  const labels = MODE_LABELS[mode];

  return (
    <div className="px-5 pb-8">
      <PropertyHeader title={propertyTitle} address={propertyAddress} />

      <div className="space-y-4">
        <InputField
          id="data-sheet-acquisitionValue"
          label={labels.valueLabel}
          type="money"
          placeholder="250 000"
          value={values.acquisitionValue || ''}
          onChange={val => onFieldChange('acquisitionValue', val)}
        />

        {labels.helperText && (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed -mt-2">
            {labels.helperText}
          </p>
        )}

        <InputField
          id="data-sheet-acquisitionDate"
          label={labels.dateLabel}
          type="month-year"
          placeholder="03/2018"
          value={values.acquisitionDate || ''}
          onChange={val => onFieldChange('acquisitionDate', val)}
        />
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full mt-5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold py-3.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 text-base"
      >
        {saving ? 'Enregistrement...' : 'Valider'}
      </button>
    </div>
  );
};

// ── Estimated Value form ─────────────────────────────────────
const EstimatedValueForm: React.FC<{
  propertyTitle: string;
  propertyAddress: string;
  values: Record<string, string>;
  error: string | null;
  saving: boolean;
  onFieldChange: (key: string, val: string) => void;
  onSave: () => void;
}> = ({ propertyTitle, propertyAddress, values, error, saving, onFieldChange, onSave }) => (
  <div className="px-5 pb-8">
    <PropertyHeader title={propertyTitle} address={propertyAddress} />

    <div className="space-y-4">
      <InputField
        id="data-sheet-estimatedValue"
        label="Valeur estimée aujourd'hui"
        type="money"
        placeholder="280 000"
        value={values.estimatedValue || ''}
        onChange={val => onFieldChange('estimatedValue', val)}
      />
      <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed -mt-2">
        Estimation personnelle ou basée sur les prix du quartier.
      </p>
    </div>

    {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

    <button
      onClick={onSave}
      disabled={saving}
      className="w-full mt-5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold py-3.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 text-base"
    >
      {saving ? 'Enregistrement...' : 'Valider'}
    </button>
  </div>
);

// ── Loan form ────────────────────────────────────────────────
const LoanForm: React.FC<{
  propertyTitle: string;
  propertyAddress: string;
  hasLoan: boolean | null;
  setHasLoan: (v: boolean) => void;
  values: Record<string, string>;
  error: string | null;
  saving: boolean;
  onFieldChange: (key: string, val: string) => void;
  onSave: () => void;
  onNoLoan: () => void;
}> = ({ propertyTitle, propertyAddress, hasLoan, setHasLoan, values, error, saving, onFieldChange, onSave, onNoLoan }) => (
  <div className="px-5 pb-8">
    <PropertyHeader title={propertyTitle} address={propertyAddress} />

    <p className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
      Avez-vous un crédit sur ce bien ?
    </p>

    {/* Yes / No toggle */}
    <div className="flex gap-2.5 mb-5">
      <button
        onClick={() => setHasLoan(true)}
        className={`flex-1 py-3 rounded-xl border font-medium text-base transition-colors ${
          hasLoan === true
            ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100'
            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750'
        }`}
      >
        Oui
      </button>
      <button
        onClick={onNoLoan}
        disabled={saving}
        className={`flex-1 py-3 rounded-xl border font-medium text-base transition-colors ${
          hasLoan === false
            ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100'
            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750'
        }`}
      >
        {saving && hasLoan === false ? 'Enregistrement...' : 'Non, pas de crédit'}
      </button>
    </div>

    {/* Loan fields — shown only when hasLoan = true */}
    {hasLoan === true && (
      <>
        <div className="space-y-4">
          <InputField
            id="data-sheet-loanAmount"
            label="Montant emprunté"
            type="money"
            placeholder="200 000"
            value={values.loanAmount || ''}
            onChange={val => onFieldChange('loanAmount', val)}
          />
          <InputField
            id="data-sheet-loanRate"
            label="Taux d'intérêt annuel"
            type="percent"
            placeholder="1.5"
            value={values.loanRate || ''}
            onChange={val => onFieldChange('loanRate', val)}
          />
          <InputField
            id="data-sheet-loanEndYear"
            label="Fin du prêt"
            type="year"
            placeholder="2038"
            value={values.loanEndYear || ''}
            onChange={val => onFieldChange('loanEndYear', val)}
          />
          <InputField
            id="data-sheet-loanBank"
            label="Banque (optionnel)"
            type="text"
            placeholder="Crédit Agricole"
            value={values.loanBank || ''}
            onChange={val => onFieldChange('loanBank', val)}
          />
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full mt-5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold py-3.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 text-base"
        >
          {saving ? 'Enregistrement...' : 'Valider'}
        </button>
      </>
    )}
  </div>
);

// ── Main component ──────────────────────────────────────────
const PropertyDataSheet: React.FC<PropertyDataSheetProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  propertyAddress,
  field,
  onComplete,
}) => {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const overlayRef = useRef<HTMLDivElement>(null);

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Acquisition: 2-step flow
  const [acquisitionMode, setAcquisitionMode] = useState<AcquisitionMode | null>(null);

  // Loan: yes/no toggle
  const [hasLoan, setHasLoan] = useState<boolean | null>(null);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setValues({});
      setError(null);
      setSaving(false);
      setAcquisitionMode(null);
      setHasLoan(null);
    }
  }, [isOpen]);

  // Lock body scroll on desktop modal
  useEffect(() => {
    if (isOpen && isDesktop) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen, isDesktop]);

  const handleChange = useCallback((key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setError(null);
  }, []);

  // ── Validate & parse helpers ─────────────────────────────
  const parseMoney = (raw: string, label: string): number | null => {
    const num = parseInt(raw.replace(/\s/g, ''), 10);
    if (isNaN(num) || num <= 0) {
      setError(`Montant invalide pour ${label.toLowerCase()}`);
      return null;
    }
    return num;
  };

  const parseMonthYear = (raw: string): string | null => {
    const match = raw.match(/^(\d{1,2})\/(\d{4})$/);
    if (!match) {
      setError('Format attendu : MM/AAAA');
      return null;
    }
    const month = parseInt(match[1], 10);
    const yearVal = parseInt(match[2], 10);
    if (month < 1 || month > 12 || yearVal < 1900 || yearVal > 2100) {
      setError('Date invalide');
      return null;
    }
    return `${yearVal}-${String(month).padStart(2, '0')}-01`;
  };

  // ── Save: acquisition ────────────────────────────────────
  const handleSaveAcquisition = useCallback(async () => {
    if (!acquisitionMode) return;
    setSaving(true);
    setError(null);

    try {
      const labels = MODE_LABELS[acquisitionMode];
      const rawValue = values.acquisitionValue?.trim();
      const rawDate = values.acquisitionDate?.trim();

      if (!rawValue) {
        setError(`Veuillez renseigner ${labels.valueLabel.toLowerCase()}`);
        setSaving(false);
        return;
      }
      if (!rawDate) {
        setError(`Veuillez renseigner ${labels.dateLabel.toLowerCase()}`);
        setSaving(false);
        return;
      }

      const purchasePrice = parseMoney(rawValue, labels.valueLabel);
      if (purchasePrice === null) { setSaving(false); return; }

      const purchaseDate = parseMonthYear(rawDate);
      if (purchaseDate === null) { setSaving(false); return; }

      await axios.patch(`/api/properties/${propertyId}/investment`, {
        acquisitionMode,
        purchasePrice,
        purchaseDate,
      });

      setValues({});
      onComplete();
      onClose();
    } catch {
      setError('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [acquisitionMode, values, propertyId, onComplete, onClose]);

  // ── Save: estimated value ────────────────────────────────
  const handleSaveEstimatedValue = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const raw = values.estimatedValue?.trim();
      if (!raw) {
        setError('Veuillez renseigner la valeur estimée');
        setSaving(false);
        return;
      }

      const estimatedCurrentValue = parseMoney(raw, 'Valeur estimée');
      if (estimatedCurrentValue === null) { setSaving(false); return; }

      await axios.patch(`/api/properties/${propertyId}/investment`, {
        estimatedCurrentValue,
        estimatedValueDate: new Date().toISOString(),
      });

      setValues({});
      onComplete();
      onClose();
    } catch {
      setError('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [values, propertyId, onComplete, onClose]);

  // ── Save: loan ───────────────────────────────────────────
  const handleSaveLoan = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const rawAmount = values.loanAmount?.trim();
      const rawRate = values.loanRate?.trim();
      const rawEndYear = values.loanEndYear?.trim();

      if (!rawAmount) {
        setError('Veuillez renseigner le montant emprunté');
        setSaving(false);
        return;
      }

      const loanAmount = parseMoney(rawAmount, 'Montant emprunté');
      if (loanAmount === null) { setSaving(false); return; }

      let loanRate: number | undefined;
      if (rawRate) {
        const num = parseFloat(rawRate.replace(',', '.'));
        if (isNaN(num) || num < 0 || num > 20) {
          setError('Taux invalide (entre 0 et 20%)');
          setSaving(false);
          return;
        }
        loanRate = num;
      }

      let loanEndDate: string | undefined;
      if (rawEndYear) {
        const yearVal = parseInt(rawEndYear, 10);
        if (isNaN(yearVal) || yearVal < 2000 || yearVal > 2100) {
          setError('Année de fin invalide');
          setSaving(false);
          return;
        }
        loanEndDate = `${yearVal}-12-31`;
      }

      const patch: Record<string, unknown> = {
        loanAmount,
        hasNoLoan: false,
      };
      if (loanRate !== undefined) patch.loanRate = loanRate;
      if (loanEndDate) patch.loanEndDate = loanEndDate;
      if (values.loanBank?.trim()) patch.loanBank = values.loanBank.trim();

      await axios.patch(`/api/properties/${propertyId}/investment`, patch);

      setValues({});
      onComplete();
      onClose();
    } catch {
      setError('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [values, propertyId, onComplete, onClose]);

  // ── No loan shortcut ─────────────────────────────────────
  const handleNoLoan = useCallback(async () => {
    setHasLoan(false);
    setSaving(true);
    setError(null);

    try {
      await axios.patch(`/api/properties/${propertyId}/investment`, {
        hasNoLoan: true,
      });

      onComplete();
      onClose();
    } catch {
      setError('Erreur lors de la sauvegarde. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [propertyId, onComplete, onClose]);

  // ── Determine which content to render ────────────────────
  const renderContent = () => {
    if (field === 'acquisition') {
      if (!acquisitionMode) {
        return (
          <AcquisitionModeStep
            propertyTitle={propertyTitle}
            propertyAddress={propertyAddress}
            onSelect={setAcquisitionMode}
          />
        );
      }
      return (
        <AcquisitionValueStep
          mode={acquisitionMode}
          propertyTitle={propertyTitle}
          propertyAddress={propertyAddress}
          values={values}
          error={error}
          saving={saving}
          onFieldChange={handleChange}
          onSave={handleSaveAcquisition}
        />
      );
    }

    if (field === 'estimatedValue') {
      return (
        <EstimatedValueForm
          propertyTitle={propertyTitle}
          propertyAddress={propertyAddress}
          values={values}
          error={error}
          saving={saving}
          onFieldChange={handleChange}
          onSave={handleSaveEstimatedValue}
        />
      );
    }

    // field === 'loan'
    return (
      <LoanForm
        propertyTitle={propertyTitle}
        propertyAddress={propertyAddress}
        hasLoan={hasLoan}
        setHasLoan={setHasLoan}
        values={values}
        error={error}
        saving={saving}
        onFieldChange={handleChange}
        onSave={handleSaveLoan}
        onNoLoan={handleNoLoan}
      />
    );
  };

  // ── Sheet title for a11y ─────────────────────────────────
  const sheetTitle =
    field === 'acquisition'
      ? acquisitionMode
        ? MODE_LABELS[acquisitionMode].valueLabel
        : 'Mode d\'acquisition'
      : field === 'estimatedValue'
        ? 'Valeur estimée'
        : 'Crédit immobilier';

  // ── Desktop: centered modal ──────────────────────────────
  if (isDesktop) {
    if (!isOpen) return null;

    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-10001 flex items-center justify-center bg-black/40"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <div
          className="relative bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-1">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {sheetTitle}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="p-1.5 -mr-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {renderContent()}
        </div>
      </div>
    );
  }

  // ── Mobile: vaul drawer (bottom sheet) ───────────────────
  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-10001" />
        <Drawer.Content
          className="bg-white dark:bg-neutral-900 flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-10001 outline-none max-h-[85dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-neutral-300 mb-2 mt-3" />
          <Drawer.Title className="sr-only">
            {sheetTitle}
          </Drawer.Title>

          <div className="overflow-y-auto">
            <div className="pb-safe">
              {renderContent()}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default PropertyDataSheet;
