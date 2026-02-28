'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SimulatorResults from '@/components/simulator/SimulatorResults';
import type {
  InvestmentInput,
  InvestmentResult,
} from '@/services/InvestmentSimulatorService';

export default function SharedSimulatorClient() {
  const params = useParams();
  const shareToken = params?.shareToken as string;

  const [data, setData] = useState<{
    name: string;
    inputs: InvestmentInput;
    results: InvestmentResult;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareToken) return;

    fetch(`/api/simulator/shared/${shareToken}`)
      .then((res) => {
        if (!res.ok) throw new Error('Simulation introuvable');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-neutral-500">
        Chargement de la simulation...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-neutral-500">
          {error || 'Simulation introuvable ou non partagée.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white">
          {data.name}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Simulation partagée via Coridor
        </p>
      </div>

      <SimulatorResults
        result={data.results}
        input={data.inputs}
        onSave={() => {}}
      />
    </div>
  );
}
