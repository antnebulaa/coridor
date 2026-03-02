'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import CustomToast from '@/components/ui/CustomToast';
import {
  Plus,
  Trash2,
  Share2,
  TrendingUp,
  DollarSign,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface SimulationSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  shareToken: string | null;
  kpis: {
    grossYield: number;
    netNetYield: number;
    monthlyCashflow: number;
    tri: number;
  } | null;
}

export default function SimulationsClient() {
  const router = useRouter();
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSimulations = useCallback(async () => {
    try {
      const res = await fetch('/api/simulator/save');
      if (!res.ok) return;
      const data = await res.json();
      setSimulations(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/simulator/save/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSimulations((prev) => prev.filter((s) => s.id !== id));
        toast.custom((t) => (
          <CustomToast t={t} message="Simulation supprimée" type="success" />
        ));
      }
    } catch {
      toast.custom((t) => (
        <CustomToast t={t} message="Erreur" type="error" />
      ));
    }
  };

  const handleShare = async (id: string) => {
    try {
      const res = await fetch(`/api/simulator/save/${id}/share`, {
        method: 'POST',
      });
      if (!res.ok) return;
      const data = await res.json();
      const url = `${window.location.origin}${data.shareUrl}`;
      await navigator.clipboard.writeText(url);
      toast.custom((t) => (
        <CustomToast
          t={t}
          message="Lien copié dans le presse-papiers !"
          type="success"
        />
      ));
      fetchSimulations();
    } catch {
      toast.custom((t) => (
        <CustomToast t={t} message="Erreur" type="error" />
      ));
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  const fmtPct = (n: number) =>
    n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-neutral-500">
        Chargement...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Mes simulations</h1>
        <button
          onClick={() => router.push('/simulateur')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition"
        >
          <Plus size={16} />
          Nouvelle
        </button>
      </div>

      {simulations.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp
            size={48}
            className="mx-auto text-neutral-300 dark:text-neutral-600 mb-4"
          />
          <p className="text-neutral-500">Aucune simulation sauvegardée</p>
          <button
            onClick={() => router.push('/simulateur')}
            className="mt-4 text-sm text-[#B9592D] hover:underline"
          >
            Créer ma première simulation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {simulations.map((sim) => (
            <div
              key={sim.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{sim.name}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(sim.updatedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleShare(sim.id)}
                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-neutral-500"
                    title="Partager"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(sim.id)}
                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-neutral-500 hover:text-red-500"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {sim.kpis && (
                <div className="grid grid-cols-4 gap-3 mt-3">
                  <div>
                    <div className="text-xs text-neutral-400">Rendement</div>
                    <div className="text-sm font-semibold">
                      {fmtPct(sim.kpis.netNetYield)} %
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-400">Cash-flow</div>
                    <div className="text-sm font-semibold">
                      {sim.kpis.monthlyCashflow >= 0 ? '+' : ''}
                      {fmt(sim.kpis.monthlyCashflow)} €
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-400">TRI</div>
                    <div className="text-sm font-semibold">
                      {fmtPct(sim.kpis.tri)} %
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-400">Brut</div>
                    <div className="text-sm font-semibold">
                      {fmtPct(sim.kpis.grossYield)} %
                    </div>
                  </div>
                </div>
              )}

              {sim.isPublic && sim.shareToken && (
                <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                  <ExternalLink size={12} />
                  <span>Partagée</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/simulateur/shared/${sim.shareToken}`,
                      );
                      toast.custom((t) => (
                        <CustomToast
                          t={t}
                          message="Lien copié"
                          type="success"
                        />
                      ));
                    }}
                    className="hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
