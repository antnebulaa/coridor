'use client';

import { motion } from 'framer-motion';
import type { InvestmentResult, InvestmentInput } from '@/services/InvestmentSimulatorService';
import type { User } from '@prisma/client';
import { VerdictBadge } from './VerdictBadge';
import { EssentialSummary } from './EssentialSummary';
import { ResultTabs } from './ResultTabs';
import { ExpertSection } from './ExpertSection';
import { SignupBanner } from './SignupBanner';

interface SimulatorResultsProps {
  result: InvestmentResult;
  input: InvestmentInput;
  onSave: () => void;
  user: User | null;
}

export default function SimulatorResults({
  result,
  input,
  onSave,
  user,
}: SimulatorResultsProps) {
  return (
    <div className="space-y-8">
      {/* Verdict first — emotional headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <VerdictBadge result={result} input={input} />
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
      >
        <EssentialSummary result={result} projectionYears={input.projectionYears} />
      </motion.div>

      {/* Detailed sections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
      >
        <ResultTabs result={result} input={input} />
      </motion.div>

      <ExpertSection result={result} input={input} onSave={onSave} user={user} />

      {/* Signup CTA for non-authenticated users */}
      {!user && <SignupBanner />}

      {/* Disclaimer */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6 mt-12">
        <p className="text-[13px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
          Simulation indicative. Les résultats ne constituent pas un conseil en
          investissement ni un conseil fiscal. Les calculs reposent sur des
          hypothèses de projection (revalorisation, charges, valorisation) qui
          peuvent différer de la réalité. Consultez un professionnel pour valider
          votre projet.
        </p>
      </div>
    </div>
  );
}
