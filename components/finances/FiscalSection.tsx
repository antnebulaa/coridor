'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Download, Landmark } from 'lucide-react';

interface Declaration2044Line {
  ligne: string;
  description: string;
  montant: number;
  type: 'revenu' | 'charge' | 'total' | 'resultat';
  autoCategories: boolean;
}

interface FiscalSectionProps {
  declaration: Declaration2044Line[];
  year: number;
  hasPowens: boolean;
  properties: { id: string; title: string; address: string }[];
}

const fmtEuro = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);

const typeColorMap: Record<string, string> = {
  revenu: 'text-emerald-600 dark:text-emerald-400',
  charge: 'text-red-500 dark:text-red-400',
  total: 'text-neutral-900 dark:text-neutral-100 font-semibold',
  resultat: 'text-neutral-900 dark:text-neutral-100 font-bold',
};

const FiscalSection: React.FC<FiscalSectionProps> = ({
  declaration,
  year,
  hasPowens,
  properties,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');

  const resultatLine = declaration.find(l => l.type === 'resultat');
  const resultDisplay = resultatLine ? fmtEuro(resultatLine.montant) : '—';

  const handleExportPdf = () => {
    window.open(`/api/accounting/export?format=pdf&year=${year}${selectedPropertyId !== 'all' ? `&propertyId=${selectedPropertyId}` : ''}`, '_blank');
  };

  const handleExportCsv = () => {
    window.open(`/api/accounting/export?format=csv&year=${year}${selectedPropertyId !== 'all' ? `&propertyId=${selectedPropertyId}` : ''}`, '_blank');
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
          <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Déclaration 2044 — {year}
            </p>
            {hasPowens && (
              <span className="text-sm font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                Auto Powens
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 tabular-nums">
            Résultat foncier : {resultDisplay}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handleExportPdf();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                handleExportPdf();
              }
            }}
            className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            title="Exporter en PDF"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-neutral-100 dark:border-neutral-800">
          {/* Property filter */}
          {properties.length > 1 && (
            <div className="px-4 pt-3">
              <select
                value={selectedPropertyId}
                onChange={e => setSelectedPropertyId(e.target.value)}
                className="w-full text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Tous les biens</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.address}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Declaration table */}
          <div className="px-4 py-3">
            <div className="space-y-0">
              {declaration.map((line, i) => {
                const isSeparator = line.type === 'total' || line.type === 'resultat';
                return (
                  <div key={`${line.ligne}-${i}`}>
                    {isSeparator && (
                      <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                    )}
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm text-neutral-300 dark:text-neutral-600 font-mono w-8 flex-shrink-0 tabular-nums">
                          {line.ligne}
                        </span>
                        <span
                          className={`text-sm truncate ${
                            isSeparator
                              ? 'font-semibold text-neutral-900 dark:text-neutral-100'
                              : 'text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          {line.description}
                        </span>
                        {line.autoCategories && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" title="Auto-catégorisé" />
                        )}
                      </div>
                      <span
                        className={`text-sm tabular-nums flex-shrink-0 ml-3 ${
                          typeColorMap[line.type] || 'text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        {fmtEuro(line.montant)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              {hasPowens
                ? 'Dépenses catégorisées automatiquement via Powens'
                : 'Dépenses saisies manuellement'}
            </p>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalSection;
