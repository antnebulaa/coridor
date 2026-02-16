'use client';

import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart3,
  Volume2,
  Shield,
  Bus,
  ShoppingCart,
  GraduationCap,
  Car,
  TreePine,
  Users,
} from "lucide-react";

interface PollResultsProps {
  city: string | null;
  zipCode: string | null;
}

interface PollResultData {
  poll: {
    title: string;
    category: string;
    option1: string;
    option2: string;
    option3: string;
  };
  option1Count: number;
  option2Count: number;
  option3Count: number;
  totalResponses: number;
  zone: 'zipCode' | 'city';
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  NOISE_LEVEL: { label: 'Bruit', icon: Volume2, color: 'text-purple-500' },
  SAFETY: { label: 'Securite', icon: Shield, color: 'text-red-500' },
  TRANSPORT: { label: 'Transports', icon: Bus, color: 'text-blue-500' },
  SHOPPING: { label: 'Commerces', icon: ShoppingCart, color: 'text-orange-500' },
  SCHOOLS: { label: 'Ecoles', icon: GraduationCap, color: 'text-green-500' },
  PARKING: { label: 'Stationnement', icon: Car, color: 'text-slate-500' },
  GREEN_SPACES: { label: 'Espaces verts', icon: TreePine, color: 'text-emerald-500' },
  COMMUNITY_SPIRIT: { label: 'Vie de quartier', icon: Users, color: 'text-amber-500' },
};

const PollResults: React.FC<PollResultsProps> = ({ city, zipCode }) => {
  const [data, setData] = useState<PollResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city && !zipCode) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        const params = new URLSearchParams();
        if (city) params.set('city', city);
        if (zipCode) params.set('zipCode', zipCode);

        const { data: result } = await axios.get<PollResultData>(
          `/api/polls/results?${params.toString()}`
        );

        setData(result);
      } catch {
        // No results or error - silently ignore
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [city, zipCode]);

  if (loading) {
    return <div className="animate-pulse h-24 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />;
  }

  if (!data || data.totalResponses < 10) {
    return null;
  }

  const { poll, option1Count, option2Count, option3Count, totalResponses } = data;

  const counts = [option1Count, option2Count, option3Count];
  const labels = [poll.option1, poll.option2, poll.option3];
  const percentages = counts.map(c => Math.round((c / totalResponses) * 100));

  // Find the winning option
  const maxCount = Math.max(...counts);
  const winnerIndex = counts.indexOf(maxCount);
  const winnerLabel = labels[winnerIndex];
  const winnerPct = percentages[winnerIndex];

  const categoryConfig = CATEGORY_CONFIG[poll.category] || {
    label: poll.category,
    icon: BarChart3,
    color: 'text-blue-500',
  };

  const CategoryIcon = categoryConfig.icon;

  // Build color classes for the bar based on category
  const barColorClass = categoryConfig.color.replace('text-', 'bg-');

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <CategoryIcon className={`w-5 h-5 ${categoryConfig.color}`} />
        <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          Avis du quartier
        </h3>
        <span className="ml-auto text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full">
          {categoryConfig.label}
        </span>
      </div>

      {/* Winning option summary */}
      <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
        <span className="font-semibold">{winnerPct}%</span> des habitants trouvent le quartier{' '}
        <span className="font-semibold lowercase">{winnerLabel}</span>
        {' '}({totalResponses} avis)
      </p>

      {/* Bar chart for all 3 options */}
      <div className="space-y-2.5">
        {labels.map((label, i) => {
          const pct = percentages[i];
          const isWinner = i === winnerIndex;

          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm ${isWinner ? 'font-semibold text-neutral-800 dark:text-neutral-200' : 'text-neutral-600 dark:text-neutral-400'}`}>
                  {label}
                </span>
                <span className={`text-sm ${isWinner ? 'font-semibold text-neutral-800 dark:text-neutral-200' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {pct}%
                </span>
              </div>
              <div className="bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div
                  className={`rounded-full h-2 transition-all duration-500 ${isWinner ? barColorClass : 'bg-neutral-300 dark:bg-neutral-600'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PollResults;
