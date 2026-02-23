'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { DEFAULT_VETUSTE_GRID } from '@/lib/vetuste';
import {
  ChevronLeft,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GridEntry {
  id: string;
  elementType: string;
  lifespan: number;
  annualDepreciation: number;
  franchiseYears: number;
  installationDate: string | null;
}

export default function VetustePage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const router = useRouter();

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [entries, setEntries] = useState<GridEntry[]>([]);
  const [isDefault, setIsDefault] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Resolve propertyId from listingId
  useEffect(() => {
    async function resolveProperty() {
      try {
        const res = await fetch(`/api/listings/${listingId}`);
        if (!res.ok) throw new Error('Listing not found');
        const listing = await res.json();
        const pid = listing.rentalUnit?.property?.id || listing.rentalUnit?.propertyId;
        if (pid) {
          setPropertyId(pid);
        } else {
          throw new Error('No property linked');
        }
      } catch (err) {
        console.error('Failed to resolve property:', err);
        toast.error('Impossible de charger le bien');
      }
    }
    resolveProperty();
  }, [listingId]);

  // Fetch vétusté grid
  const fetchGrid = useCallback(async () => {
    if (!propertyId) return;
    try {
      const res = await fetch(`/api/properties/${propertyId}/vetuste`);
      if (!res.ok) throw new Error('Failed to load grid');
      const data = await res.json();
      setEntries(data.grid.entries.map((e: GridEntry) => ({
        ...e,
        installationDate: e.installationDate ? new Date(e.installationDate).toISOString().split('T')[0] : null,
      })));
      setIsDefault(data.isDefault);
    } catch (err) {
      console.error('Failed to load vetuste grid:', err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) fetchGrid();
  }, [propertyId, fetchGrid]);

  const handleEntryChange = (index: number, field: keyof GridEntry, value: string | number) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  };

  const handleAddEntry = () => {
    setEntries(prev => [
      ...prev,
      {
        id: `new_${Date.now()}`,
        elementType: '',
        lifespan: 10,
        annualDepreciation: 0.10,
        franchiseYears: 0,
        installationDate: null,
      },
    ]);
    setHasChanges(true);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleResetToDefault = () => {
    setEntries(DEFAULT_VETUSTE_GRID.map((item, i) => ({
      id: `default_${i}`,
      elementType: item.elementType,
      lifespan: item.lifespan,
      annualDepreciation: item.annualDepreciation,
      franchiseYears: item.franchiseYears,
      installationDate: null,
    })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!propertyId) return;

    // Validate
    const invalid = entries.find(e => !e.elementType.trim() || e.lifespan <= 0);
    if (invalid) {
      toast.error('Remplissez tous les champs correctement');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/vetuste`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: entries.map(e => ({
            elementType: e.elementType,
            lifespan: e.lifespan,
            annualDepreciation: e.annualDepreciation,
            franchiseYears: e.franchiseYears,
            installationDate: e.installationDate || null,
          })),
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setIsDefault(false);
      setHasChanges(false);
      toast.success('Grille sauvegardee');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 active:scale-95"
          >
            <ChevronLeft size={22} className="text-gray-700" />
          </button>
          <div className="flex-1">
            <div className="text-[18px] font-bold text-gray-900">
              Grille de vetuste
            </div>
            <div className="text-[13px] text-gray-500">
              {isDefault ? 'Grille par defaut (recommandee)' : 'Grille personnalisee'}
            </div>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[14px] font-bold bg-gray-900 text-white active:scale-95"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Sauver
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Info banner */}
        <div className="flex gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 mb-6">
          <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-[13px] text-gray-600 leading-relaxed">
            La grille de vetuste determine l&apos;abattement applique aux reparations locatives selon l&apos;anciennete des equipements. Elle reduit la part a charge du locataire. Il n&apos;existe pas de grille officielle unique — ces valeurs sont des moyennes defensables issues de la jurisprudence et des accords collectifs.
          </div>
        </div>

        {/* Grid entries */}
        <div className="space-y-3 mb-6">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <input
                  type="text"
                  value={entry.elementType}
                  onChange={e => handleEntryChange(index, 'elementType', e.target.value)}
                  placeholder="Type d'element (ex: Peinture)"
                  className="text-[15px] font-medium text-gray-900 bg-transparent border-none outline-none w-full"
                />
                <button
                  onClick={() => handleRemoveEntry(index)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-medium uppercase">
                    Duree de vie
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={entry.lifespan}
                      onChange={e => handleEntryChange(index, 'lifespan', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 rounded-lg text-[14px] border border-gray-200 text-gray-900"
                    />
                    <span className="text-[12px] text-gray-400">ans</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium uppercase">
                    Abattement/an
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={Math.round(entry.annualDepreciation * 1000) / 10}
                      onChange={e => handleEntryChange(index, 'annualDepreciation', (parseFloat(e.target.value) || 0) / 100)}
                      className="w-full px-2 py-1.5 rounded-lg text-[14px] border border-gray-200 text-gray-900"
                    />
                    <span className="text-[12px] text-gray-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-medium uppercase">
                    Franchise
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={entry.franchiseYears}
                      onChange={e => handleEntryChange(index, 'franchiseYears', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg text-[14px] border border-gray-200 text-gray-900"
                    />
                    <span className="text-[12px] text-gray-400">ans</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add entry */}
        <button
          onClick={handleAddEntry}
          className="w-full py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 text-gray-500 mb-6"
        >
          <Plus size={16} />
          Ajouter un type d&apos;element
        </button>

        {/* Actions */}
        <div className="space-y-3">
          {!isDefault && (
            <button
              onClick={handleResetToDefault}
              className="w-full py-3 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 bg-gray-100 text-gray-600"
            >
              <RotateCcw size={16} />
              Reinitialiser la grille par defaut
            </button>
          )}

          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 rounded-xl text-[16px] font-bold flex items-center justify-center gap-2 bg-gray-900 text-white active:scale-95"
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Sauvegarder les modifications
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
