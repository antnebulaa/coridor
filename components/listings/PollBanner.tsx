'use client';

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { BarChart3, X, MapPin } from "lucide-react";
import Link from "next/link";

interface PollBannerProps {
  currentUser?: { id: string; city?: string | null; zipCode?: string | null } | null;
}

interface PollData {
  id: string;
  title: string;
  category: string;
  option1: string;
  option2: string;
  option3: string;
}

interface ResultsData {
  option1Count: number;
  option2Count: number;
  option3Count: number;
  totalResponses: number;
  userVote: number;
}

interface ActivePollResponse {
  poll?: PollData;
  needsAddress?: boolean;
  totalResponses?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  NOISE_LEVEL: 'Bruit',
  SAFETY: 'Securite',
  TRANSPORT: 'Transports',
  SHOPPING: 'Commerces',
  SCHOOLS: 'Ecoles',
  PARKING: 'Stationnement',
  GREEN_SPACES: 'Espaces verts',
  COMMUNITY_SPIRIT: 'Vie de quartier',
};

const PollBanner: React.FC<PollBannerProps> = ({ currentUser }) => {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [needsAddress, setNeedsAddress] = useState(false);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get<ActivePollResponse>('/api/polls/active');

        if (data?.needsAddress) {
          setNeedsAddress(true);
          setShouldRender(true);
          // Trigger animation on next frame
          requestAnimationFrame(() => setIsVisible(true));
        } else if (data?.poll) {
          setPoll(data.poll);
          setShouldRender(true);
          requestAnimationFrame(() => setIsVisible(true));
        }
      } catch {
        // No active poll or error - silently ignore
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after voting (5 seconds after results show)
  useEffect(() => {
    if (results) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [results]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // Wait for slide-down animation to finish before unmounting
    setTimeout(() => {
      setIsDismissed(true);
      setShouldRender(false);
    }, 300);
  }, []);

  const handleVote = useCallback(async (selectedOption: number) => {
    if (!currentUser) {
      toast.error("Connectez-vous pour voter");
      return;
    }

    if (!poll) return;

    setIsVoting(true);
    try {
      const { data } = await axios.post(`/api/polls/${poll.id}/respond`, {
        selectedOption,
      });
      setResults(data);
    } catch {
      toast.error("Erreur lors du vote");
    } finally {
      setIsVoting(false);
    }
  }, [currentUser, poll]);

  if (isDismissed || !shouldRender) {
    return null;
  }

  // "Needs address" banner
  if (needsAddress) {
    return (
      <div
        className={`
          fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-[400px] z-[1000]
          transition-all duration-300 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        `}
      >
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl shadow-2xl mb-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-base font-medium text-neutral-600 dark:text-neutral-200">
                  Complétez votre adresse pour participer aux sondages de quartier
                </p>
                <Link
                  href="/account/personal-info"
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline mt-1 inline-block"
                >
                  Modifier mon profil
                </Link>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!poll) return null;

  const categoryLabel = CATEGORY_LABELS[poll.category] || poll.category;
  const options = [
    { key: 1, label: poll.option1 },
    { key: 2, label: poll.option2 },
    { key: 3, label: poll.option3 },
  ];

  // Results view (after voting)
  if (results) {
    const total = results.totalResponses || 1;
    const counts = [results.option1Count, results.option2Count, results.option3Count];
    const percentages = counts.map(c => Math.round((c / total) * 100));

    return (
      <div
        className={`
          fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-[400px] z-[1000]
          transition-all duration-300 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        `}
      >
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                Avis du quartier
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                {categoryLabel}
              </span>
              <button
                onClick={handleDismiss}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{poll.title}</p>

          <div className="space-y-2.5">
            {options.map((opt, i) => {
              const pct = percentages[i];
              const isUserChoice = results.userVote === opt.key;

              return (
                <div key={opt.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${isUserChoice ? 'font-normal text-blue-700 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {opt.label}
                    </span>
                    <span className={`text-sm ${isUserChoice ? 'font-normal text-blue-700 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="bg-blue-200/50 dark:bg-blue-900/30 rounded-full h-2">
                    <div
                      className={`rounded-full h-2 transition-all duration-500 ${isUserChoice ? 'bg-blue-600' : 'bg-blue-400 dark:bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {results.totalResponses} avis
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Merci pour votre avis !
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Voting view
  return (
    <div
      className={`
        fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-[400px] z-[1000]
        transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-0">
          <div className="flex items-center gap-2">
            
            <h3 className="text-base font-medium text-neutral-800 dark:text-neutral-200">
              Avis du quartier
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-200 font-light mb-4">{poll.title}</p>

        <div className="flex items-center gap-2">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleVote(opt.key)}
              disabled={isVoting}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300
                hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-400 dark:hover:border-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PollBanner;
