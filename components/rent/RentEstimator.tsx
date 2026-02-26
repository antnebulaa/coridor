'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from 'lucide-react';

interface RentEstimatorProps {
  estimate: {
    estimatedRentHC: number;
    rangeLowHC: number;
    rangeHighHC: number;
    estimatedRentCC: number;
    rangeLowCC: number;
    rangeHighCC: number;
    estimatedChargesTotal: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    observations: number;
    rSquared: number;
    source: 'commune' | 'commune_all' | 'department' | null;
    adjustments: {
      furnished: number;
      dpe: number;
      floor: number;
      parking: number;
      balcony: number;
      construction: number;
    };
    adjustmentLabels?: {
      furnished?: string;
      dpe?: string;
      floor?: string;
      parking?: string;
      balcony?: string;
      construction?: string;
    };
    attribution: string;
  } | null;
  isLoading: boolean;
  currentPrice?: number | string;
  onApplyEstimate?: (price: number) => void;
  rentControlMaxRent?: number | null;
}

const RentEstimator: React.FC<RentEstimatorProps> = ({
  estimate,
  isLoading,
  currentPrice,
  onApplyEstimate,
  rentControlMaxRent,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const price =
    typeof currentPrice === 'string'
      ? parseFloat(currentPrice)
      : currentPrice;

  if (isLoading) {
    return (
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 animate-pulse">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-3" />
        <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-full mb-2" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
      </div>
    );
  }

  if (!estimate) return null;

  const {
    estimatedRentHC,
    rangeLowHC,
    rangeHighHC,
    estimatedRentCC,
    estimatedChargesTotal,
    confidence,
    observations,
    rSquared,
    source,
    adjustments,
    adjustmentLabels,
    attribution,
  } = estimate;
  const labels = adjustmentLabels || {};

  // Range bar: spans exactly from Q1 (rangeLowHC) to Q3 (rangeHighHC)
  const barTotal = rangeHighHC - rangeLowHC || 1;
  const estimatePct = ((estimatedRentHC - rangeLowHC) / barTotal) * 100;
  const pricePct =
    price && !isNaN(price)
      ? Math.min(Math.max(((price - rangeLowHC) / barTotal) * 100, 0), 100)
      : null;

  // Confidence config
  const confConfig = {
    HIGH: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'Fiable',
    },
    MEDIUM: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Indicatif',
    },
    LOW: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      label: 'Estimatif',
    },
  };
  const conf = confConfig[confidence];

  // Price positioning — 6 levels like La Centrale
  const median = estimatedRentHC;
  const getPriceStatus = () => {
    if (!price || isNaN(price)) return 'none' as const;
    if (rentControlMaxRent && price > rentControlMaxRent) return 'over_legal' as const;
    if (price > rangeHighHC * 1.1) return 'well_above' as const;
    if (price > rangeHighHC) return 'above' as const;
    if (price > median * 1.03) return 'slightly_above' as const;
    if (price >= median * 0.97) return 'fair' as const;
    if (price >= rangeLowHC) return 'good_deal' as const;
    if (price >= rangeLowHC * 0.9) return 'great_deal' as const;
    return 'below' as const;
  };
  const priceStatus = getPriceStatus();

  const statusConfig = {
    over_legal: {
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      text: 'text-rose-800 dark:text-rose-300',
      icon: AlertTriangle,
      label: 'Au-dessus du plafond légal',
      msg: 'Votre loyer dépasse le plafond d\'encadrement. Autorisé uniquement avec un complément de loyer justifié.',
    },
    well_above: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-800 dark:text-red-300',
      icon: TrendingUp,
      label: 'Bien au-dessus du marché',
      msg: 'Risque élevé de vacance locative. Les locataires auront beaucoup d\'alternatives moins chères.',
    },
    above: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-800 dark:text-orange-300',
      icon: TrendingUp,
      label: 'Au-dessus du marché',
      msg: 'Délai de location potentiellement plus long. Envisagez de baisser légèrement pour attirer plus de candidats.',
    },
    slightly_above: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-800 dark:text-amber-300',
      icon: TrendingUp,
      label: 'Légèrement au-dessus',
      msg: 'Prix acceptable si le bien est en très bon état ou bien situé. Vous sélectionnerez parmi moins de candidats.',
    },
    fair: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-800 dark:text-emerald-300',
      icon: CheckCircle,
      label: 'Prix équitable',
      msg: 'Aligné avec le marché. Bon équilibre entre rentabilité et attractivité.',
    },
    good_deal: {
      bg: 'bg-sky-50 dark:bg-sky-900/20',
      text: 'text-sky-800 dark:text-sky-300',
      icon: TrendingDown,
      label: 'Bonne affaire pour le locataire',
      msg: 'En dessous du médian. Vous attirerez plus de candidats et louerez plus vite.',
    },
    great_deal: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-800 dark:text-blue-300',
      icon: TrendingDown,
      label: 'Très bonne affaire',
      msg: 'Nettement en dessous du marché. Vous pourriez augmenter votre loyer sans perdre en attractivité.',
    },
    below: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      text: 'text-indigo-800 dark:text-indigo-300',
      icon: TrendingDown,
      label: 'Bien en dessous du marché',
      msg: 'Loyer très bas par rapport au marché. Vérifiez que ce n\'est pas une erreur.',
    },
    none: null,
  };

  const status = statusConfig[priceStatus];

  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 bg-white">
          <BarChart3 size={18} className="text-neutral-600 dark:text-neutral-400" />
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
            Loyer estimé ({confidence === 'HIGH' ? 'données solides' : confidence === 'MEDIUM' ? 'données limitées' : 'peu fiable'})
          </span>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${conf.bg} ${conf.text}`}
        >
          {conf.label}
        </span>
      </div>

      {/* Main estimate */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-medium text-neutral-900 dark:text-neutral-100">
          {estimatedRentHC} €
        </span>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          HC/mois
        </span>
        
      </div>

      {/* Range bar — green to red gradient, spans Q1 to Q3 */}
      <div className="relative h-3 rounded-full overflow-visible mt-1"
        style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)' }}
      >
        {/* Estimate marker — thin white line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80"
          style={{ left: `${Math.min(Math.max(estimatePct, 0), 100)}%` }}
        />
        {/* Current price marker — clamped to bar edges */}
        {pricePct !== null && (
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white dark:border-neutral-800 shadow-md bg-neutral-900 dark:bg-white"
            style={{
              left: `${pricePct}%`,
              transform: 'translateX(-50%)',
              top: '50%',
              marginTop: '-8px',
            }}
          />
        )}
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 -mt-0.5">
        <span>{rangeLowHC} €</span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
          Médian · {estimatedRentHC} €
        </span>
        <span>{rangeHighHC} €</span>
      </div>

      {/* Charges info */}
      <div className="text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
        Charges estimées : ~{estimatedChargesTotal} €/mois déduites <br/> (données
        ANIL CC)
        
      </div>

      {/* Price positioning verdict */}
      {status && (
        <div
          className={`text-sm p-3 rounded-lg flex items-start gap-2 ${status.bg} ${status.text}`}
        >
          <status.icon size={16} className="mt-0.5 shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold text-[13px]">{status.label}</span>
            <span className="text-xs opacity-80 mt-0.5">{status.msg}</span>
          </div>
        </div>
      )}

      {/* Apply button */}
      {onApplyEstimate && (
        <button
          onClick={() => onApplyEstimate(estimatedRentHC)}
          className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition flex items-center justify-center gap-2"
        >
          <Sparkles size={16} />
          {!price || isNaN(price)
            ? 'Utiliser cette estimation'
            : 'Appliquer comme loyer'}
        </button>
      )}

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
      >
        {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Détails des ajustements
      </button>

      {showDetails && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 flex flex-col gap-1 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          {adjustments.furnished !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.furnished || 'Meublé'}</span>
              <span className="font-medium">
                +{Math.round((adjustments.furnished - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.dpe !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.dpe || 'DPE'}</span>
              <span className="font-medium">
                {adjustments.dpe > 1 ? '+' : ''}
                {Math.round((adjustments.dpe - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.floor !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.floor || 'Étage'}</span>
              <span className="font-medium">
                {adjustments.floor > 1 ? '+' : ''}
                {Math.round((adjustments.floor - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.parking > 0 && (
            <div className="flex justify-between">
              <span>{labels.parking || 'Parking'}</span>
              <span className="font-medium">+{adjustments.parking} €</span>
            </div>
          )}
          {adjustments.balcony !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.balcony || 'Balcon / terrasse'}</span>
              <span className="font-medium">
                +{Math.round((adjustments.balcony - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.construction !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.construction || 'Époque'}</span>
              <span className="font-medium">
                {adjustments.construction > 1 ? '+' : ''}
                {Math.round((adjustments.construction - 1) * 100)}%
              </span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-neutral-100 dark:border-neutral-700">
            <span>Source</span>
            <span className="font-medium">
              {source === 'commune'
                ? 'Commune'
                : source === 'commune_all'
                  ? 'Commune (global)'
                  : source === 'department'
                    ? 'Département'
                    : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Observations</span>
            <span className="font-medium">
              {observations.toLocaleString('fr-FR')}
            </span>
          </div>
          <div className="flex justify-between">
            <span>R² (qualité)</span>
            <span className="font-medium">
              {(rSquared * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
        {attribution}
      </div>
    </div>
  );
};

export default RentEstimator;
