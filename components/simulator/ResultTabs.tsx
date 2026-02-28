'use client';

import { Wallet, BarChart3, Receipt, Landmark, Home } from 'lucide-react';
import type { InvestmentResult, InvestmentInput } from '@/services/InvestmentSimulatorService';
import { ScrollSpyNav } from './ScrollSpyNav';
import { ScrollReveal } from './ScrollReveal';
import { CostTab } from './CostTab';
import { ProfitabilityTab } from './ProfitabilityTab';
import { FiscalImpactTab } from './FiscalImpactTab';
import { LoanTab } from './LoanTab';
import { ResaleTab } from './ResaleTab';

interface ResultTabsProps {
  result: InvestmentResult;
  input: InvestmentInput;
}

const SECTIONS = [
  { id: 'section-cost', label: 'Coût', icon: Wallet },
  { id: 'section-profitability', label: 'Rentabilité', icon: BarChart3 },
  { id: 'section-fiscal', label: 'Fiscalité', icon: Receipt },
  { id: 'section-loan', label: 'Emprunt', icon: Landmark },
  { id: 'section-resale', label: 'Revente', icon: Home },
] as const;

export function ResultTabs({ result, input }: ResultTabsProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <ScrollSpyNav sections={[...SECTIONS]} />

      {/* All sections rendered sequentially */}
      <div id="section-cost" className="pt-10 md:pt-14">
        <ScrollReveal>
          <CostTab result={result} startYear={currentYear} />
        </ScrollReveal>
      </div>

      <div
        id="section-profitability"
        className="border-t border-neutral-200 dark:border-neutral-800 mt-12 pt-10 md:pt-14"
      >
        <ScrollReveal>
          <ProfitabilityTab result={result} projectionYears={input.projectionYears} />
        </ScrollReveal>
      </div>

      <div
        id="section-fiscal"
        className="border-t border-neutral-200 dark:border-neutral-800 mt-12 pt-10 md:pt-14"
      >
        <ScrollReveal>
          <FiscalImpactTab result={result} startYear={currentYear} />
        </ScrollReveal>
      </div>

      <div
        id="section-loan"
        className="border-t border-neutral-200 dark:border-neutral-800 mt-12 pt-10 md:pt-14"
      >
        <ScrollReveal>
          <LoanTab result={result} input={input} />
        </ScrollReveal>
      </div>

      <div
        id="section-resale"
        className="border-t border-neutral-200 dark:border-neutral-800 mt-12 pt-10 md:pt-14"
      >
        <ScrollReveal>
          <ResaleTab
            result={result}
            startYear={currentYear}
            purchasePrice={input.purchasePrice}
            notaryFeesRate={input.notaryFeesRate}
            renovationCost={input.renovationCost}
            downPayment={input.downPayment ?? input.personalContribution}
          />
        </ScrollReveal>
      </div>
    </div>
  );
}
