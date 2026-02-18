'use client';

import { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Check, Loader2, Home, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Container from '@/components/Container';
import { SafeUser } from '@/types';

interface PlanFeature {
  key: string;
  label: string;
  category: string;
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  maxProperties: number;
  isPopular: boolean;
  features: PlanFeature[];
}

interface PricingClientProps {
  currentUser?: SafeUser | null;
}

const PricingClient: React.FC<PricingClientProps> = ({ currentUser }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    axios.get('/api/subscription/plans')
      .then((res) => setPlans(res.data))
      .catch(() => toast.error('Erreur lors du chargement des plans'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    if (!currentUser) {
      toast.error('Connectez-vous pour souscrire');
      return;
    }

    if (plan.name === 'FREE') return;

    setCheckoutLoading(plan.id);
    try {
      const res = await axios.post('/api/subscription/checkout', {
        planId: plan.id,
        billingCycle: billingCycle === 'yearly' ? 'YEARLY' : 'MONTHLY',
      });
      window.location.href = res.data.url;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la souscription');
      setCheckoutLoading(null);
    }
  };

  const isCurrentPlan = (planName: string) => {
    if (!currentUser) return false;
    if (currentUser.plan === 'FREE' && planName === 'FREE') return true;
    if (currentUser.plan === 'PLUS' && planName === 'ESSENTIAL') return true;
    if (currentUser.plan === 'PRO' && planName === 'PRO') return true;
    return false;
  };

  const getButtonLabel = (plan: Plan) => {
    if (isCurrentPlan(plan.name)) return 'Plan actuel';
    if (plan.name === 'FREE') return 'Commencer gratuitement';
    if (plan.name === 'PRO') return 'Contacter les ventes';
    return "Commencer l\u0027essai gratuit";
  };

  const getPrice = (plan: Plan) => {
    const cents = billingCycle === 'yearly' ? plan.yearlyPriceCents : plan.monthlyPriceCents;
    return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  };

  const getPropertiesLabel = (plan: Plan) => {
    if (plan.maxProperties === 1) return '1 bien immobilier';
    if (plan.maxProperties >= 999) return 'Biens illimit\u00E9s';
    return `Jusqu\u0027\u00E0 ${plan.maxProperties} biens`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-neutral-400" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white pb-20">
      {/* Header */}
      <div className="pt-8 pb-12 text-center max-w-3xl mx-auto px-4">
        <h1 className="text-4xl md:text-4xl font-semibold text-neutral-900 mb-6 tracking-tight">
          G&eacute;rez votre location <br /> sans stress.
        </h1>
        <p className="text-lg text-neutral-500 mb-10">
          Coridor vous guide pas &agrave; pas pour &eacute;viter les erreurs classiques qui font perdre du temps, de l&apos;argent, ou cr&eacute;ent des situations inconfortables.
          Chaque &eacute;tape est pens&eacute;e pour &ecirc;tre simple, claire et conforme.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center p-1 bg-neutral-100 rounded-full border border-neutral-200 relative mb-12">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${billingCycle === 'monthly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            Annuel
            <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              -20%
            </span>
          </button>
        </div>
      </div>

      <Container>
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-32">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.name);
            const isPro = plan.name === 'PRO';

            return (
              <div
                key={plan.id}
                className={`
                  relative flex flex-col p-6 rounded-3xl border
                  ${isPro ? 'bg-neutral-900 border-neutral-900 text-white shadow-xl' : plan.isPopular ? 'bg-neutral-100 border-neutral-200 shadow-xl' : 'border-neutral-200 bg-white'}
                `}
              >
                <div className="mb-2">
                  <div className="flex items-center gap-3 mb-0">
                    <h3 className={`text-3xl font-semibold ${isPro ? 'text-white' : 'text-neutral-900'}`}>
                      {plan.displayName}
                    </h3>
                    {plan.isPopular && (
                      <div className="bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-lg capitalize tracking-wider">
                        Populaire
                      </div>
                    )}
                  </div>
                  <p className={`text-normal h-10 ${isPro ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8 flex items-baseline gap-1">
                  <span className={`text-5xl font-semibold ${isPro ? 'text-white' : 'text-neutral-900'}`}>
                    {getPrice(plan)}{'\u20AC'}
                  </span>
                  <span className={isPro ? 'text-neutral-400' : 'text-neutral-500'}>par mois</span>
                </div>

                <div className="mb-8">
                  <Button
                    label={checkoutLoading === plan.id ? 'Redirection...' : getButtonLabel(plan)}
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent || checkoutLoading !== null}
                    variant={isCurrent ? undefined : (plan.isPopular ? 'primary' : isPro ? 'outline' : undefined)}
                    className={`rounded-full h-12
                      ${isCurrent ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed border-none' : ''}
                      ${!isCurrent && isPro ? 'bg-white text-black hover:bg-neutral-200 border-none' : ''}
                    `}
                  />
                </div>

                <div className="mb-4">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isPro ? 'text-neutral-400' : 'text-neutral-900'}`}>
                    Fonctionnalit&eacute;s :
                  </p>
                  <ul className="space-y-3">
                    <li className={`flex items-start gap-3 text-normal ${isPro ? 'text-neutral-300' : 'text-neutral-600'}`}>
                      <Home size={18} className={`${isPro ? 'text-white' : 'text-neutral-900'} shrink-0`} />
                      <span>{getPropertiesLabel(plan)}</span>
                    </li>
                    {plan.features.slice(0, 8).map((feature) => (
                      <li key={feature.key} className={`flex items-start gap-3 text-normal ${isPro ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        <Check size={18} className={`${isPro ? 'text-white' : 'text-neutral-900'} shrink-0`} />
                        <span>{feature.label}</span>
                      </li>
                    ))}
                    {plan.features.length > 8 && (
                      <li className={`text-sm ${isPro ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        + {plan.features.length - 8} autres fonctionnalit&eacute;s
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        {plans.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-medium text-neutral-900">Comparatif d&eacute;taill&eacute;</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="py-4 px-6 bg-white sticky left-0 z-10 w-1/3"></th>
                    {plans.map((plan) => {
                      const isCurrent = isCurrentPlan(plan.name);
                      return (
                        <th key={plan.id} className={`py-4 px-4 text-center w-1/5 ${plan.isPopular ? 'bg-neutral-100 rounded-t-xl' : ''}`}>
                          <div className="font-medium text-neutral-900 text-xl">{plan.displayName}</div>
                          <div className="text-normal font-medium text-neutral-700 mt-1">
                            {getPrice(plan)}{'\u20AC'} par mois
                          </div>
                          <div className="mt-4">
                            <Button
                              onClick={() => handleSubscribe(plan)}
                              variant="outline"
                              disabled={isCurrent || checkoutLoading !== null}
                              className={`rounded-full h-8 text-sm w-full px-2 font-normal hover:bg-neutral-100 ${isCurrent ? 'bg-neutral-800 text-white hover:bg-neutral-700 hover:border-neutral-700' : 'bg-white'}`}
                            >
                              {isCurrent ? 'Plan actuel' : (
                                <>
                                  <span className="md:hidden">Obtenir</span>
                                  <span className="hidden md:inline">Passer &agrave; {plan.displayName}</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 border-t border-neutral-100">
                  {/* Properties row */}
                  <tr className="hover:bg-neutral-50/30 transition-colors">
                    <td className="py-4 px-2 text-sm font-medium text-neutral-900 sticky left-0 bg-white z-10">
                      Nombre de biens
                    </td>
                    {plans.map((plan) => (
                      <td key={plan.id} className={`py-4 px-6 text-center text-sm text-neutral-600 ${plan.isPopular ? 'bg-neutral-100' : ''}`}>
                        {getPropertiesLabel(plan)}
                      </td>
                    ))}
                  </tr>

                  {/* Feature rows — get unique features across all plans */}
                  {(() => {
                    const allFeatureKeys = new Set<string>();
                    const featureMap = new Map<string, PlanFeature>();
                    plans.forEach(p => p.features.forEach(f => {
                      allFeatureKeys.add(f.key);
                      featureMap.set(f.key, f);
                    }));

                    return Array.from(allFeatureKeys).map((key) => {
                      const feature = featureMap.get(key)!;
                      return (
                        <tr key={key} className="hover:bg-neutral-50/30 transition-colors">
                          <td className="py-4 px-2 text-sm font-medium text-neutral-900 sticky left-0 bg-white z-10">
                            {feature.label}
                          </td>
                          {plans.map((plan) => {
                            const hasFeature = plan.features.some(f => f.key === key);
                            return (
                              <td key={plan.id} className={`py-4 px-6 text-center text-sm text-neutral-600 ${plan.isPopular ? 'bg-neutral-100' : ''}`}>
                                {hasFeature ? (
                                  <Check size={20} className="text-neutral-900 mx-auto" />
                                ) : (
                                  <div className="w-5 h-0.5 bg-neutral-200 mx-auto rounded-full" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

export default PricingClient;
