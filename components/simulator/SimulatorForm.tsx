'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Home,
  Landmark,
  Key,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InvestmentInput } from '@/services/InvestmentSimulatorService';
import {
  NOTARY_FEES_OLD,
  NOTARY_FEES_NEW,
  TMI_OPTIONS,
  DEFAULT_GLI_RATE,
  DEFAULT_FURNITURE_AMORTIZATION_YEARS,
  GUARANTEE_RATES,
  FAMILY_TAX_SHARES,
} from '@/lib/simulatorDefaults';
import { StoryBar } from './StoryBar';
import { TeasingPreview } from './TeasingPreview';

interface SimulatorFormProps {
  input: InvestmentInput;
  onChange: (input: InvestmentInput) => void;
  onSimulate: () => void;
  isLoading: boolean;
  loanSummary: {
    loanAmount: number;
    monthlyPayment: number;
    totalCreditCost: number;
  };
}

const STEPS = [
  { key: 'property', label: 'Le bien', icon: Home },
  { key: 'financing', label: 'Financement', icon: Landmark },
  { key: 'rental', label: 'Location', icon: Key },
  { key: 'fiscal', label: 'Fiscalité', icon: BarChart3 },
] as const;

const STEP_TITLES = [
  'Quel bien avez-vous repéré ?',
  'Comment financez-vous ?',
  'Combien allez-vous louer ?',
  'Quelle fiscalité appliquer ?',
];

const TMI_BRACKETS = [
  { max: 11_497, rate: 0 },
  { max: 29_315, rate: 0.11 },
  { max: 83_823, rate: 0.30 },
  { max: 180_294, rate: 0.41 },
  { max: Infinity, rate: 0.45 },
];

function computeTMI(annualIncome: number, taxShares: number): number {
  const quotient = annualIncome / Math.max(taxShares, 1);
  for (const bracket of TMI_BRACKETS) {
    if (quotient <= bracket.max) return bracket.rate;
  }
  return 0.45;
}

export default function SimulatorForm({
  input,
  onChange,
  onSimulate,
  isLoading,
  loanSummary,
}: SimulatorFormProps) {
  const [step, setStep] = useState(0);

  /** Update state, syncing V2 → V1 fields for backward compat */
  const update = (partial: Partial<InvestmentInput>) => {
    const merged = { ...input, ...partial };

    if ('monthlyRentHC' in partial) {
      merged.monthlyRent = partial.monthlyRentHC!;
    }
    if ('downPayment' in partial) {
      merged.personalContribution = partial.downPayment!;
    }
    if ('annualPropertyTax' in partial) {
      merged.propertyTaxYearly = partial.annualPropertyTax!;
    }
    if ('annualInsurancePNO' in partial) {
      merged.insuranceYearly = partial.annualInsurancePNO!;
    }
    if ('annualCoproNonRecoverable' in partial) {
      merged.coprYearly = partial.annualCoproNonRecoverable!;
    }
    if ('annualMaintenance' in partial) {
      merged.maintenanceYearly = partial.annualMaintenance!;
    }
    if ('vacancyWeeksPerYear' in partial) {
      merged.vacancyRate = partial.vacancyWeeksPerYear! / 52;
    }
    if ('managementFeeRate' in partial) {
      merged.managementFeesRate = partial.managementFeeRate!;
    }

    onChange(merged);
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const fmt = (n: number) => n.toLocaleString('fr-FR');

  const notaryFees = Math.round(input.purchasePrice * input.notaryFeesRate);
  const apport = input.downPayment ?? input.personalContribution;
  const totalCost = input.purchasePrice + notaryFees + (input.renovationCost ?? 0) + (input.furnitureCost ?? 0);
  const isCashPurchase = apport >= totalCost && totalCost > 0;
  const vacWeeks = input.vacancyWeeksPerYear ?? Math.round(input.vacancyRate * 52);
  const mgmtRate = input.managementFeeRate ?? input.managementFeesRate;

  // StoryBar summaries
  const completedSummaries = useMemo(() => {
    const s: Record<number, string> = {};
    const typeLabel = input.propertyType === 'HOUSE' ? 'Maison' : 'Appart.';
    const surfaceLabel = (input.surface ?? 0) > 0 ? ` ${input.surface}m²` : '';
    const furnishedLabel = input.isFurnished ? 'Meublé' : 'Nu';
    s[0] = `${typeLabel}${surfaceLabel} · ${fmt(input.purchasePrice)}€ · ${furnishedLabel}`;

    const dur = input.loanDurationYears;
    const rate = (input.loanRate * 100).toFixed(1);
    const ap = apport >= 1000 ? `${Math.round(apport / 1000)}k€` : `${apport}€`;
    s[1] = `Prêt ${dur} ans · ${rate}% · Apport ${ap}`;

    const rent = input.monthlyRentHC ?? input.monthlyRent;
    const vacLabel =
      vacWeeks === 0 ? 'Pas de vacance' :
      vacWeeks <= 2 ? `Vacance ${vacWeeks} sem.` :
      vacWeeks <= 4 ? 'Vacance 1 mois' : 'Vacance 2 mois';
    s[2] = `Loyer ${fmt(rent)}€ HC · ${vacLabel}`;

    return s;
  }, [input, apport, vacWeeks, fmt]);

  // Computed TMI from income (V2)
  const computedTMI = useMemo(() => {
    if (input.annualIncomeDeclarant1 == null) return null;
    const totalIncome =
      (input.annualIncomeDeclarant1 ?? 0) + (input.annualIncomeDeclarant2 ?? 0);
    if (totalIncome <= 0) return null;
    const familyStatus = input.familyStatus ?? 'SINGLE';
    const baseParts = FAMILY_TAX_SHARES[familyStatus] ?? 1;
    const kids = input.childrenCount ?? 0;
    const childrenParts = Math.min(kids, 2) * 0.5 + Math.max(0, kids - 2);
    return computeTMI(totalIncome, baseParts + childrenParts);
  }, [
    input.annualIncomeDeclarant1,
    input.annualIncomeDeclarant2,
    input.familyStatus,
    input.childrenCount,
  ]);

  // Guarantee cost estimate
  const estimatedGuaranteeCost = useMemo(() => {
    const type = input.guaranteeType ?? 'NONE';
    const rate = GUARANTEE_RATES[type] ?? 0;
    return Math.round(loanSummary.loanAmount * rate);
  }, [input.guaranteeType, loanSummary.loanAmount]);

  const isCouple = input.familyStatus === 'MARRIED';

  return (
    <div>
      {/* StoryBar stepper */}
      <StoryBar
        currentStep={step}
        steps={[...STEPS]}
        completedSummaries={completedSummaries}
        onStepClick={setStep}
      />

      {/* Form card */}
      <div
        className="bg-(--sim-bg-card) dark:border dark:border-neutral-800 p-6 md:p-8"
        style={{
          borderRadius: 'var(--sim-form-card-radius)',
          boxShadow: 'var(--sim-form-card-shadow)',
        }}
      >
        {/* ============================================================== */}
        {/* Step 0: Le bien                                                 */}
        {/* ============================================================== */}
        {step === 0 && (
          <div className="space-y-6">
            <h2
              className="text-2xl md:text-3xl text-neutral-900 dark:text-white"
              style={{ fontFamily: 'var(--font-serif-sim), serif' }}
            >
              {STEP_TITLES[0]}
            </h2>

            <InputField
              label="Prix d'achat"
              value={input.purchasePrice}
              onChange={(v) => update({ purchasePrice: v })}
              suffix="€"
            />

            {/* 2-col: Ancien/Neuf + Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Ancien / Neuf
                </label>
                <div className="flex gap-2">
                  <ToggleButton
                    active={input.notaryFeesRate === NOTARY_FEES_OLD}
                    onClick={() => update({ notaryFeesRate: NOTARY_FEES_OLD })}
                    label="Ancien (~8%)"
                  />
                  <ToggleButton
                    active={input.notaryFeesRate === NOTARY_FEES_NEW}
                    onClick={() => update({ notaryFeesRate: NOTARY_FEES_NEW })}
                    label="Neuf (~3%)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Type de logement
                </label>
                <div className="flex gap-2">
                  <ToggleButton
                    active={input.propertyType !== 'HOUSE'}
                    onClick={() => update({ propertyType: 'APARTMENT' })}
                    label="Appartement"
                  />
                  <ToggleButton
                    active={input.propertyType === 'HOUSE'}
                    onClick={() => update({ propertyType: 'HOUSE' })}
                    label="Maison"
                  />
                </div>
              </div>
            </div>

            {/* 2-col: Surface + Travaux */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Surface"
                value={input.surface ?? 0}
                onChange={(v) => update({ surface: v })}
                suffix="m²"
              />
              <InputField
                label="Travaux"
                value={input.renovationCost}
                onChange={(v) => update({ renovationCost: v })}
                suffix="€"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Location
              </label>
              <div className="flex gap-2">
                <ToggleButton
                  active={!input.isFurnished}
                  onClick={() =>
                    update({
                      isFurnished: false,
                      taxRegime: 'reel',
                      furnitureCost: 0,
                    })
                  }
                  label="Nu"
                />
                <ToggleButton
                  active={input.isFurnished}
                  onClick={() =>
                    update({
                      isFurnished: true,
                      taxRegime: 'reel_lmnp',
                    })
                  }
                  label="Meublé"
                />
              </div>
            </div>

            {input.isFurnished && (
              <InputField
                label="Ameublement"
                value={input.furnitureCost}
                onChange={(v) => update({ furnitureCost: v })}
                suffix="€"
              />
            )}

            {(input.renovationCost > 0 || input.isFurnished) && (
              <CollapsibleSection label="Options avancées">
                {input.renovationCost > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Type de travaux
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <ToggleButton
                        active={
                          input.renovationType === 'FITOUT' ||
                          !input.renovationType
                        }
                        onClick={() => update({ renovationType: 'FITOUT' })}
                        label="Aménagement"
                      />
                      <ToggleButton
                        active={input.renovationType === 'ENERGY'}
                        onClick={() => update({ renovationType: 'ENERGY' })}
                        label="Énergétique"
                      />
                      <ToggleButton
                        active={input.renovationType === 'STRUCTURAL'}
                        onClick={() => update({ renovationType: 'STRUCTURAL' })}
                        label="Gros œuvre"
                      />
                    </div>
                  </div>
                )}
                {input.isFurnished && (
                  <InputField
                    label="Amortissement mobilier"
                    value={
                      input.furnitureAmortizationYears ??
                      DEFAULT_FURNITURE_AMORTIZATION_YEARS
                    }
                    onChange={(v) =>
                      update({ furnitureAmortizationYears: v })
                    }
                    suffix="ans"
                    min={3}
                    max={15}
                  />
                )}
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* Step 1: Financement                                             */}
        {/* ============================================================== */}
        {step === 1 && (
          <div className="space-y-6">
            <h2
              className="text-2xl md:text-3xl text-neutral-900 dark:text-white"
              style={{ fontFamily: 'var(--font-serif-sim), serif' }}
            >
              {STEP_TITLES[1]}
            </h2>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Apport personnel
              </label>
              <div className="flex gap-2 flex-wrap mb-3">
                <ToggleButton
                  active={apport === 0}
                  onClick={() =>
                    update({ downPayment: 0, personalContribution: 0 })
                  }
                  label="0 €"
                />
                <ToggleButton
                  active={
                    notaryFees > 0 &&
                    Math.abs(apport - notaryFees) < 100
                  }
                  onClick={() =>
                    update({
                      downPayment: notaryFees,
                      personalContribution: notaryFees,
                    })
                  }
                  label={`Notaire (${fmt(notaryFees)} €)`}
                />
                <ToggleButton
                  active={
                    Math.abs(
                      apport - Math.round(input.purchasePrice * 0.1),
                    ) < 100
                  }
                  onClick={() => {
                    const v = Math.round(input.purchasePrice * 0.1);
                    update({ downPayment: v, personalContribution: v });
                  }}
                  label="10 %"
                />
                <ToggleButton
                  active={
                    !isCashPurchase &&
                    Math.abs(
                      apport - Math.round(input.purchasePrice * 0.2),
                    ) < 100
                  }
                  onClick={() => {
                    const v = Math.round(input.purchasePrice * 0.2);
                    update({ downPayment: v, personalContribution: v });
                  }}
                  label="20 %"
                />
                <ToggleButton
                  active={isCashPurchase}
                  onClick={() => {
                    update({ downPayment: totalCost, personalContribution: totalCost });
                  }}
                  label="100 %"
                />
              </div>
              <InputField
                label=""
                value={apport}
                onChange={(v) =>
                  update({ downPayment: v, personalContribution: v })
                }
                suffix="€"
              />
            </div>

            {isCashPurchase ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 text-center">
                <p className="text-base font-medium text-emerald-700 dark:text-emerald-400">
                  Achat comptant — aucun emprunt nécessaire
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Investissement total : {fmt(totalCost)} €
                </p>
              </div>
            ) : (
              <>
                {/* 2-col: Durée + Taux */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Durée du prêt
                    </label>
                    <select
                      value={input.loanDurationYears}
                      onChange={(e) =>
                        update({ loanDurationYears: parseInt(e.target.value) })
                      }
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-(--sim-bg-card) px-4 py-3 text-sm focus:border-(--sim-amber-400) focus:ring-[3px] focus:ring-[#E8A838]/12 focus:outline-none transition"
                    >
                      {[10, 15, 20, 25, 30].map((y) => (
                        <option key={y} value={y}>
                          {y} ans
                        </option>
                      ))}
                    </select>
                  </div>

                  <InputField
                    label="Taux d'intérêt"
                    value={parseFloat((input.loanRate * 100).toFixed(2))}
                    onChange={(v) => update({ loanRate: v / 100 })}
                    suffix="%"
                    step={0.05}
                  />
                </div>

                <InputField
                  label="Assurance emprunteur"
                  value={parseFloat((input.loanInsuranceRate * 100).toFixed(2))}
                  onChange={(v) => update({ loanInsuranceRate: v / 100 })}
                  suffix="%"
                  step={0.01}
                />

                <CollapsibleSection label="Options avancées">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Garantie bancaire
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(
                        [
                          ['NONE', 'Aucune'],
                          ['CREDIT_LOGEMENT', 'Crédit Logement'],
                          ['HYPOTHEQUE', 'Hypothèque'],
                          ['PPD', 'PPD'],
                        ] as const
                      ).map(([key, label]) => (
                        <ToggleButton
                          key={key}
                          active={(input.guaranteeType ?? 'NONE') === key}
                          onClick={() => {
                            const cost =
                              key === 'NONE'
                                ? 0
                                : Math.round(
                                    loanSummary.loanAmount *
                                      (GUARANTEE_RATES[key] ?? 0),
                                  );
                            update({
                              guaranteeType: key,
                              guaranteeCost: cost,
                            });
                          }}
                          label={label}
                        />
                      ))}
                    </div>
                  </div>

                  {(input.guaranteeType ?? 'NONE') !== 'NONE' && (
                    <InputField
                      label="Coût de la garantie"
                      value={input.guaranteeCost ?? estimatedGuaranteeCost}
                      onChange={(v) => update({ guaranteeCost: v })}
                      suffix="€"
                    />
                  )}

                  <InputField
                    label="Frais de dossier"
                    value={input.bankFees}
                    onChange={(v) => update({ bankFees: v })}
                    suffix="€"
                  />
                </CollapsibleSection>

                {/* Loan summary */}
                <div className="bg-(--sim-bg-section) rounded-xl p-4 space-y-2">
                  <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Résumé du crédit
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Montant emprunté</span>
                    <span className="font-semibold tabular-nums">
                      {fmt(loanSummary.loanAmount)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mensualité estimée</span>
                    <span className="font-semibold tabular-nums">
                      {fmt(loanSummary.monthlyPayment)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Coût total du crédit</span>
                    <span className="font-semibold tabular-nums">
                      {fmt(loanSummary.totalCreditCost)} €
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* Step 2: Location                                                */}
        {/* ============================================================== */}
        {step === 2 && (
          <div className="space-y-6">
            <h2
              className="text-2xl md:text-3xl text-neutral-900 dark:text-white"
              style={{ fontFamily: 'var(--font-serif-sim), serif' }}
            >
              {STEP_TITLES[2]}
            </h2>

            {/* 2-col: Loyer HC + Charges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Loyer mensuel hors charges"
                value={input.monthlyRentHC ?? input.monthlyRent}
                onChange={(v) => update({ monthlyRentHC: v })}
                suffix="€/mois"
              />

              <InputField
                label="Provision charges récupérables"
                value={input.monthlyChargesProvision ?? 0}
                onChange={(v) => update({ monthlyChargesProvision: v })}
                suffix="€/mois"
              />
            </div>

            <InputField
              label="Taxe foncière"
              value={input.annualPropertyTax ?? input.propertyTaxYearly}
              onChange={(v) => update({ annualPropertyTax: v })}
              suffix="€/an"
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Vacance locative
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { weeks: 0, label: '0 sem.' },
                  { weeks: 1, label: '1 sem.' },
                  { weeks: 2, label: '2 sem.' },
                  { weeks: 4, label: '1 mois' },
                  { weeks: 8, label: '2 mois' },
                ].map((opt) => (
                  <ToggleButton
                    key={opt.weeks}
                    active={vacWeeks === opt.weeks}
                    onClick={() =>
                      update({
                        vacancyWeeksPerYear: opt.weeks,
                        vacancyRate: opt.weeks / 52,
                      })
                    }
                    label={opt.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Gestion locative
              </label>
              <div className="flex gap-2 flex-wrap">
                <ToggleButton
                  active={mgmtRate === 0}
                  onClick={() =>
                    update({ managementFeeRate: 0, managementFeesRate: 0 })
                  }
                  label="Autogestion (0%)"
                />
                <ToggleButton
                  active={mgmtRate === 0.08}
                  onClick={() =>
                    update({
                      managementFeeRate: 0.08,
                      managementFeesRate: 0.08,
                    })
                  }
                  label="Agence (~8%)"
                />
              </div>
            </div>

            <CollapsibleSection label="Options avancées">
              <InputField
                label="Assurance PNO"
                value={input.annualInsurancePNO ?? input.insuranceYearly}
                onChange={(v) => update({ annualInsurancePNO: v })}
                suffix="€/an"
              />

              <InputField
                label="Charges copropriété (part propriétaire)"
                value={
                  input.annualCoproNonRecoverable ?? input.coprYearly
                }
                onChange={(v) => update({ annualCoproNonRecoverable: v })}
                suffix="€/an"
              />

              <InputField
                label="Provision entretien"
                value={
                  input.annualMaintenance ?? input.maintenanceYearly
                }
                onChange={(v) => update({ annualMaintenance: v })}
                suffix="€/an"
              />

              <InputField
                label="Autres charges annuelles"
                value={input.annualOtherCharges ?? 0}
                onChange={(v) => update({ annualOtherCharges: v })}
                suffix="€/an"
              />

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Garantie loyers impayés (GLI)
                </label>
                <div className="flex gap-2 mb-3">
                  <ToggleButton
                    active={!input.hasGLI}
                    onClick={() => update({ hasGLI: false })}
                    label="Sans GLI"
                  />
                  <ToggleButton
                    active={!!input.hasGLI}
                    onClick={() =>
                      update({
                        hasGLI: true,
                        gliRate: input.gliRate ?? DEFAULT_GLI_RATE,
                      })
                    }
                    label="Avec GLI"
                  />
                </div>
                {input.hasGLI && (
                  <InputField
                    label="Taux GLI"
                    value={parseFloat(
                      ((input.gliRate ?? DEFAULT_GLI_RATE) * 100).toFixed(
                        1,
                      ),
                    )}
                    onChange={(v) => update({ gliRate: v / 100 })}
                    suffix="%"
                    step={0.1}
                  />
                )}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* ============================================================== */}
        {/* Step 3: Fiscalité & Projection                                  */}
        {/* ============================================================== */}
        {step === 3 && (
          <div className="space-y-6">
            <h2
              className="text-2xl md:text-3xl text-neutral-900 dark:text-white"
              style={{ fontFamily: 'var(--font-serif-sim), serif' }}
            >
              {STEP_TITLES[3]}
            </h2>

            {/* TMI toggle (primary, simple) */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Tranche marginale d&apos;imposition (TMI)
              </label>
              <div className="flex gap-2 flex-wrap">
                {TMI_OPTIONS.map((rate) => (
                  <ToggleButton
                    key={rate}
                    active={input.marginalTaxRate === rate}
                    onClick={() => update({ marginalTaxRate: rate })}
                    label={`${Math.round(rate * 100)} %`}
                  />
                ))}
              </div>
            </div>

            {/* Tax regime */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Régime fiscal
              </label>
              <select
                value={input.taxRegime}
                onChange={(e) => update({ taxRegime: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-(--sim-bg-card) px-4 py-3 text-sm focus:border-(--sim-amber-400) focus:ring-[3px] focus:ring-[#E8A838]/12 focus:outline-none transition"
              >
                {!input.isFurnished && (
                  <>
                    <option value="micro_foncier">
                      Micro-foncier (abattement 30 %)
                    </option>
                    <option value="reel">Réel 2044</option>
                  </>
                )}
                {input.isFurnished && (
                  <>
                    <option value="micro_bic">
                      Micro-BIC (abattement 50 %)
                    </option>
                    <option value="reel_lmnp">Réel LMNP</option>
                  </>
                )}
                <option value="auto">
                  Automatique (le plus avantageux)
                </option>
              </select>
            </div>

            <InputField
              label="Horizon de simulation"
              value={input.projectionYears}
              onChange={(v) => update({ projectionYears: v })}
              suffix="ans"
              min={5}
              max={35}
            />

            <CollapsibleSection label="Calcul précis de la TMI">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                Renseignez vos revenus pour un calcul automatique de la TMI
                (barème 2026).
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Situation familiale
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(
                    [
                      ['SINGLE', 'Célibataire'],
                      ['MARRIED', 'Marié(e) / Pacsé(e)'],
                      ['DIVORCED', 'Divorcé(e)'],
                      ['WIDOWED', 'Veuf/ve'],
                    ] as const
                  ).map(([key, label]) => (
                    <ToggleButton
                      key={key}
                      active={(input.familyStatus ?? 'SINGLE') === key}
                      onClick={() => update({ familyStatus: key })}
                      label={label}
                    />
                  ))}
                </div>
              </div>

              <InputField
                label={
                  isCouple
                    ? 'Revenu net imposable — Déclarant 1'
                    : 'Revenu net imposable annuel'
                }
                value={input.annualIncomeDeclarant1 ?? 0}
                onChange={(v) => {
                  const tmi = computeTMI(
                    v + (input.annualIncomeDeclarant2 ?? 0),
                    (FAMILY_TAX_SHARES[input.familyStatus ?? 'SINGLE'] ?? 1) +
                      Math.min(input.childrenCount ?? 0, 2) * 0.5 +
                      Math.max(0, (input.childrenCount ?? 0) - 2),
                  );
                  update({
                    annualIncomeDeclarant1: v,
                    marginalTaxRate: tmi,
                  });
                }}
                suffix="€/an"
              />

              {isCouple && (
                <InputField
                  label="Revenu net imposable — Déclarant 2"
                  value={input.annualIncomeDeclarant2 ?? 0}
                  onChange={(v) => {
                    const tmi = computeTMI(
                      (input.annualIncomeDeclarant1 ?? 0) + v,
                      (FAMILY_TAX_SHARES[input.familyStatus ?? 'SINGLE'] ?? 1) +
                        Math.min(input.childrenCount ?? 0, 2) * 0.5 +
                        Math.max(0, (input.childrenCount ?? 0) - 2),
                    );
                    update({
                      annualIncomeDeclarant2: v,
                      marginalTaxRate: tmi,
                    });
                  }}
                  suffix="€/an"
                />
              )}

              <InputField
                label="Enfants à charge"
                value={input.childrenCount ?? 0}
                onChange={(v) => {
                  const totalIncome =
                    (input.annualIncomeDeclarant1 ?? 0) +
                    (input.annualIncomeDeclarant2 ?? 0);
                  const baseParts =
                    FAMILY_TAX_SHARES[input.familyStatus ?? 'SINGLE'] ?? 1;
                  const childrenParts =
                    Math.min(v, 2) * 0.5 + Math.max(0, v - 2);
                  const tmi =
                    totalIncome > 0
                      ? computeTMI(totalIncome, baseParts + childrenParts)
                      : input.marginalTaxRate;
                  update({
                    childrenCount: v,
                    marginalTaxRate: tmi,
                  });
                }}
                suffix=""
                min={0}
                max={10}
              />

              {computedTMI !== null && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    TMI calculée :
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-sm font-semibold bg-(--sim-amber-400) text-white">
                    {Math.round(computedTMI * 100)} %
                  </span>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection label="Paramètres de projection">
              <InputField
                label="Revalorisation loyer / an"
                value={parseFloat(
                  (input.annualRentIncrease * 100).toFixed(1),
                )}
                onChange={(v) => update({ annualRentIncrease: v / 100 })}
                suffix="%"
                step={0.1}
              />

              <InputField
                label="Valorisation bien / an"
                value={parseFloat(
                  (input.annualPropertyValueIncrease * 100).toFixed(1),
                )}
                onChange={(v) =>
                  update({ annualPropertyValueIncrease: v / 100 })
                }
                suffix="%"
                step={0.1}
              />

              <InputField
                label="Augmentation charges / an"
                value={parseFloat(
                  (input.annualChargesIncrease * 100).toFixed(1),
                )}
                onChange={(v) =>
                  update({ annualChargesIncrease: v / 100 })
                }
                suffix="%"
                step={0.1}
              />
            </CollapsibleSection>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          {step > 0 ? (
            <button
              onClick={prev}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium text-neutral-500 hover:text-(--sim-amber-500) transition"
            >
              <ChevronLeft size={16} />
              Retour
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-medium bg-linear-to-r from-[#E8A838] via-[#D4922A] to-[#B87A1E] text-white shadow-md hover:shadow-lg hover:-translate-y-px transition-all"
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={onSimulate}
              disabled={isLoading}
              className="flex items-center gap-2 px-8 py-3 rounded-full text-base font-medium bg-linear-to-r from-[#E8A838] via-[#D4922A] to-[#B87A1E] text-white shadow-md hover:shadow-lg hover:-translate-y-px transition-all disabled:opacity-50 animate-[sim-pulse-shadow_2.5s_ease-in-out_infinite]"
            >
              {isLoading ? 'Calcul en cours...' : 'Simuler'}
              {!isLoading && <Sparkles size={18} />}
            </button>
          )}
        </div>

        {/* Teasing preview — blurred estimate during form input */}
        <TeasingPreview input={input} currentStep={step} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InputField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [localValue, setLocalValue] = useState<string>(String(value));

  // Sync from parent when value changes externally (e.g. "Appliquer" button)
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="number"
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (!isNaN(parsed)) onChange(parsed);
          }}
          onBlur={() => {
            // On blur, if empty or invalid, reset to 0
            const parsed = parseFloat(localValue);
            if (isNaN(parsed)) {
              setLocalValue('0');
              onChange(0);
            }
          }}
          step={step}
          min={min}
          max={max}
          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-(--sim-bg-card) px-4 py-3 text-sm pr-16 tabular-nums focus:border-(--sim-amber-400) focus:ring-[3px] focus:ring-[#E8A838]/12 focus:outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border-[1.5px] transition-all duration-200 active:scale-[1.02]
        ${
          active
            ? 'bg-(--sim-amber-500) text-white border-transparent shadow-sm'
            : 'bg-transparent text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:border-(--sim-amber-400)'
        }`}
    >
      {label}
    </button>
  );
}

function CollapsibleSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-(--sim-amber-500) transition w-full"
      >
        <Settings2 size={14} />
        {label}
        <span className="ml-auto">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 bg-(--sim-bg-section) rounded-xl p-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
