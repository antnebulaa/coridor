'use client';

import { useMemo } from 'react';
import { Wallet, BarChart3, Receipt, Landmark, Home, Save, FileDown } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InvestmentResult, InvestmentInput } from '@/services/InvestmentSimulatorService';
import type { User } from '@prisma/client';
import useLoginModal from '@/hooks/useLoginModal';
import { Band } from './Band';
import { VerdictBadge } from './VerdictBadge';
import { EssentialSummary } from './EssentialSummary';
import { ScrollSpyNav } from './ScrollSpyNav';
import { ScrollReveal } from './ScrollReveal';
import { CostTab } from './CostTab';
import { ProfitabilityTab } from './ProfitabilityTab';
import { FiscalImpactTab } from './FiscalImpactTab';
import { LoanTab } from './LoanTab';
import { ResaleTab } from './ResaleTab';
import { ExpertSection } from './ExpertSection';
import { SignupBanner } from './SignupBanner';

interface SimulatorResultsProps {
  result: InvestmentResult;
  input: InvestmentInput;
  onSave: () => void;
  user?: User | null;
}

export default function SimulatorResults({
  result,
  input,
  onSave,
  user,
}: SimulatorResultsProps) {
  const loginModal = useLoginModal();
  const currentYear = new Date().getFullYear();
  const hasLoan = result.loanAmount > 0;

  const sections = useMemo(() => {
    const base = [
      { id: 'section-cost', label: 'Coût', icon: Wallet },
      { id: 'section-profitability', label: 'Rentabilité', icon: BarChart3 },
      { id: 'section-fiscal', label: 'Fiscalité', icon: Receipt },
    ];
    if (hasLoan) {
      base.push({ id: 'section-loan', label: 'Emprunt', icon: Landmark });
    }
    base.push({ id: 'section-resale', label: 'Revente', icon: Home });
    return base;
  }, [hasLoan]);

  return (
    <>
      {/* Hero — Verdict */}
      <Band bg="hero" py="py-8 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <VerdictBadge result={result} input={input} />
        </motion.div>
      </Band>

      {/* Essential summary cards */}
      <Band bg="white" py="py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        >
          <EssentialSummary result={result} />
        </motion.div>
      </Band>

      {/* Sticky nav */}
      <ScrollSpyNav sections={sections} />

      {/* Coût */}
      <Band id="section-cost" bg="offwhite">
        <ScrollReveal>
          <CostTab result={result} startYear={currentYear} />
        </ScrollReveal>
      </Band>

      {/* Rentabilité */}
      <Band id="section-profitability" bg="white">
        <ScrollReveal>
          <ProfitabilityTab result={result} projectionYears={input.projectionYears} />
        </ScrollReveal>
      </Band>

      {/* Fiscalité — fond sombre */}
      <Band id="section-fiscal" bg="dark">
        <ScrollReveal>
          <FiscalImpactTab result={result} startYear={currentYear} />
        </ScrollReveal>
      </Band>

      {/* Emprunt — only shown if there's a loan */}
      {hasLoan && (
        <Band id="section-loan" bg="offwhite">
          <ScrollReveal>
            <LoanTab result={result} input={input} />
          </ScrollReveal>
        </Band>
      )}

      {/* Revente */}
      <Band id="section-resale" bg="white">
        <ScrollReveal>
          <ResaleTab
            result={result}
            startYear={currentYear}
            purchasePrice={input.purchasePrice}
            notaryFeesRate={input.notaryFeesRate}
            renovationCost={input.renovationCost}
            downPayment={input.downPayment ?? input.personalContribution}
            isDonation={!!input.isDonation}
          />
        </ScrollReveal>
      </Band>

      {/* Action buttons — always visible */}
      <Band bg="offwhite" py="py-6 md:py-8">
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium bg-linear-to-r from-[#D4703D] via-[#B9592D] to-[#9A4724] text-white shadow-md hover:shadow-lg transition-all"
          >
            <Save size={15} />
            Sauvegarder
          </button>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                loginModal.onOpen();
                return;
              }
              fetch('/api/simulator/export-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inputs: input }),
              })
                .then((res) => res.blob())
                .then((blob) => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'rapport-investissement-coridor.pdf';
                  a.click();
                  URL.revokeObjectURL(a.href);
                });
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <FileDown size={15} />
            Exporter PDF
          </button>
        </div>
      </Band>

      {/* Expert section */}
      <Band bg="offwhite">
        <ExpertSection result={result} input={input} onSave={onSave} user={user ?? null} />
      </Band>

      {/* Signup CTA for non-authenticated users */}
      {!user && (
        <Band bg="cta">
          <SignupBanner />
        </Band>
      )}

      {/* Disclaimer */}
      <Band bg="white" py="py-6 md:py-8">
        <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed">
          Simulation indicative. Les résultats ne constituent pas un conseil en
          investissement ni un conseil fiscal. Les calculs reposent sur des
          hypothèses de projection (revalorisation, charges, valorisation) qui
          peuvent différer de la réalité. Consultez un professionnel pour valider
          votre projet.
        </p>
      </Band>
    </>
  );
}
