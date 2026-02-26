'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Scale,
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
      terrace: number;
      airConditioning: number;
      kitchen: number;
      cellar: number;
      garage: number;
      garden: number;
      courtyard: number;
      propertyType: number;
    };
    adjustmentLabels?: {
      furnished?: string;
      dpe?: string;
      floor?: string;
      parking?: string;
      balcony?: string;
      construction?: string;
      terrace?: string;
      airConditioning?: string;
      kitchen?: string;
      cellar?: string;
      garage?: string;
      garden?: string;
      courtyard?: string;
      propertyType?: string;
    };
    attribution: string;
  } | null;
  isLoading: boolean;
  currentPrice?: number | string;
  onApplyEstimate?: (price: number) => void;
  rentControlMaxRent?: number | null;
}

// Generate smooth distribution bars from Q1/median/Q3
function generateDistributionBars(low: number, median: number, high: number, numBars: number = 24) {
  const iqr = high - low || 1;
  const sigma = iqr / 1.35;
  const margin = iqr * 0.25;
  const rangeStart = low - margin;
  const rangeEnd = high + margin;
  const step = (rangeEnd - rangeStart) / numBars;

  const bars: { x: number; height: number }[] = [];
  for (let i = 0; i < numBars; i++) {
    const x = rangeStart + step * (i + 0.5);
    const z = (x - median) / sigma;
    const height = Math.exp(-0.5 * z * z);
    bars.push({ x, height });
  }
  return { bars, rangeStart, rangeEnd };
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

  // Distribution chart data — must be before all early returns (Rules of Hooks)
  const { bars, rangeStart, rangeEnd } = useMemo(
    () => estimate
      ? generateDistributionBars(estimate.rangeLowHC, estimate.estimatedRentHC, estimate.rangeHighHC)
      : { bars: [], rangeStart: 0, rangeEnd: 0 },
    [estimate?.rangeLowHC, estimate?.estimatedRentHC, estimate?.rangeHighHC]
  );

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
    confidence,
    observations,
    source,
    adjustments,
    adjustmentLabels,
    attribution,
  } = estimate;
  const labels = adjustmentLabels || {};
  const chartTotal = rangeEnd - rangeStart || 1;

  // Price position on chart (as percentage)
  const pricePct =
    price && !isNaN(price)
      ? Math.min(Math.max(((price - rangeStart) / chartTotal) * 100, 0), 100)
      : null;

  // Confidence config
  const confConfig = {
    HIGH: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: 'Fiable',
      humanLabel: 'Élevé',
    },
    MEDIUM: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Indicatif',
      humanLabel: 'Modéré',
    },
    LOW: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      label: 'Estimatif',
      humanLabel: 'Faible',
    },
  };
  const conf = confConfig[confidence];

  // Human-readable observation count
  const obsLabel = observations >= 1000
    ? `${Math.round(observations / 1000)} 000+`
    : observations.toLocaleString('fr-FR');

  // Price positioning
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

  // Dynamic overage for over_legal
  const overageAmount = (rentControlMaxRent && price && !isNaN(price))
    ? Math.round(price - rentControlMaxRent)
    : 0;

  const statusConfig = {
    over_legal: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-800 dark:text-orange-300',
      icon: AlertTriangle,
      label: 'Positionnement haut de marché',
      msg: `Ce montant vous situe dans la fourchette haute du quartier, mais attention aux contraintes légales en vigueur.`,
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
      msg: 'Prix acceptable si le bien est en très bon état ou bien situé. Vous attirez moins de candidats.',
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
      msg: 'En dessous du médian. Vous attirerez beaucoup de candidats et louerez plus vite.',
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

  // Max button logic — shared between chart and buttons
  const hasLegalMax = !!(rentControlMaxRent && rentControlMaxRent < rangeHighHC);
  const maxValue = hasLegalMax ? Math.round(rentControlMaxRent!) : rangeHighHC;
  const medianExceedsLegal = hasLegalMax && estimatedRentHC > rentControlMaxRent!;

  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-neutral-600 dark:text-neutral-400" />
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
            Estimation du loyer HC
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

      {/* Distribution chart — Airbnb-style histogram */}
      <div className="relative mt-1">
        {/* Bars */}
        <div className="flex items-end gap-px h-12">
          {bars.map((bar, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-neutral-200 dark:bg-neutral-700 transition-colors"
              style={{ height: `${Math.max(bar.height * 100, 4)}%` }}
            />
          ))}
        </div>

        {/* Current price marker — animated vertical line */}
        {pricePct !== null && (
          <motion.div
            className="absolute top-0 bottom-0 flex flex-col items-center"
            animate={{ left: `${pricePct}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            style={{ transform: 'translateX(-50%)' }}
          >
            <div className="w-0.5 h-full bg-neutral-900 dark:bg-white" />
            <div className="absolute -bottom-1 w-3 h-3 rounded-full bg-neutral-900 dark:bg-white border-2 border-white dark:border-neutral-800 shadow-sm" />
          </motion.div>
        )}
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 -mt-1">
        <span>{rangeLowHC} €</span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
          Médian · {estimatedRentHC} €
        </span>
        <span>{rangeHighHC} €</span>
      </div>

      {/* Price positioning verdict */}
      {status && (
        <div
          className={`text-sm p-3 rounded-lg flex items-start gap-2 ${status.bg} ${status.text}`}
        >
          
          <div className="flex flex-col">
            <span className="font-semibold text-[15px]">{status.label}</span>
            <span className="text-sm opacity-80 mt-0.5">{status.msg}</span>
          </div>
        </div>
      )}

      {/* Apply buttons — trading-style: Minimum / Médian / Maximum */}
      {onApplyEstimate && (() => {
        const buttons = [
          { label: 'Minimum', value: rangeLowHC, isLegal: false, warn: false },
          {
            label: 'Médian',
            value: estimatedRentHC,
            isLegal: false,
            warn: medianExceedsLegal,
          },
          {
            label: hasLegalMax ? 'Max légal' : 'Maximum',
            value: maxValue,
            isLegal: hasLegalMax,
            warn: false,
          },
        ];
        return (
          <div className="grid grid-cols-3 gap-2">
            {buttons.map((btn) => {
              const isActive = price && !isNaN(price) && Math.abs(price - btn.value) < 2;
              return (
                <button
                  key={btn.label}
                  onClick={() => onApplyEstimate(Math.round(btn.value))}
                  className={`py-2.5 px-2 rounded-2xl text-center border transition-all flex flex-col items-center gap-0.5 relative
                    ${isActive
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-2 border-neutral-900 dark:border-white'
                      : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
                    }`}
                >
                  <span className="text-[13px] font-medium flex items-center gap-1">
                    {btn.isLegal && <Scale size={12} />}
                    {btn.label}
                  </span>
                  <span className="text-xl font-medium">{Math.round(btn.value)} €</span>
                  {btn.warn && (
                    <span className="text-[9px] text-rose-500 dark:text-rose-400 font-medium flex items-center gap-0.5 mt-0.5">
                      <AlertTriangle size={9} />
                      &gt; plafond
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

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
          {adjustments.terrace !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.terrace || 'Terrasse / Loggia'}</span>
              <span className="font-medium">
                +{Math.round((adjustments.terrace - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.airConditioning !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.airConditioning || 'Climatisation'}</span>
              <span className="font-medium">
                +{Math.round((adjustments.airConditioning - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.kitchen !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.kitchen || 'Cuisine équipée'}</span>
              <span className="font-medium">
                +{Math.round((adjustments.kitchen - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.cellar > 0 && (
            <div className="flex justify-between">
              <span>{labels.cellar || 'Cave'}</span>
              <span className="font-medium">+{adjustments.cellar} €</span>
            </div>
          )}
          {adjustments.garden !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.garden || 'Jardin'}</span>
              <span className="font-medium">
                +{Math.round((adjustments.garden - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.courtyard !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.courtyard || 'Cour privative'}</span>
              <span className="font-medium">
                +{Math.round((adjustments.courtyard - 1) * 100)}%
              </span>
            </div>
          )}
          {adjustments.propertyType !== 1.0 && (
            <div className="flex justify-between">
              <span>{labels.propertyType || 'Type de bien'}</span>
              <span className="font-medium">
                {adjustments.propertyType > 1 ? '+' : ''}
                {Math.round((adjustments.propertyType - 1) * 100)}%
              </span>
            </div>
          )}
          {/* Confidence indicator — human-readable */}
          <div className="flex justify-between pt-1 border-t border-neutral-100 dark:border-neutral-700">
            <span>Indice de confiance</span>
            <span className="font-medium">
              {conf.humanLabel} ({obsLabel} annonces)
            </span>
          </div>
          <div className="flex justify-between">
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
