'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  CreditCard, Check, X, Save, Loader2, ChevronDown, ChevronUp,
  Users, Settings, Zap, RefreshCw
} from 'lucide-react';

interface Feature {
  id: string;
  key: string;
  label: string;
  category: string;
  isActive: boolean;
}

interface PlanFeatureJoin {
  id: string;
  featureId: string;
  feature: Feature;
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  maxProperties: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  planFeatures: PlanFeatureJoin[];
  _count: { userSubscriptions: number; totalSubscribers: number };
}

export default function PlanManagementClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editForm, setEditForm] = useState<{
    displayName: string;
    description: string;
    monthlyPriceCents: number;
    yearlyPriceCents: number;
    maxProperties: number;
    stripePriceIdMonthly: string;
    stripePriceIdYearly: string;
    isPopular: boolean;
    isActive: boolean;
    featureIds: string[];
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, featuresRes] = await Promise.all([
        axios.get('/api/admin/plans'),
        axios.get('/api/admin/plans/features'),
      ]);
      setPlans(plansRes.data);
      setFeatures(featuresRes.data);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExpand = (plan: Plan) => {
    if (expandedPlanId === plan.id) {
      setExpandedPlanId(null);
      setEditForm(null);
      return;
    }

    setExpandedPlanId(plan.id);
    setEditForm({
      displayName: plan.displayName,
      description: plan.description || '',
      monthlyPriceCents: plan.monthlyPriceCents,
      yearlyPriceCents: plan.yearlyPriceCents,
      maxProperties: plan.maxProperties,
      stripePriceIdMonthly: plan.stripePriceIdMonthly || '',
      stripePriceIdYearly: plan.stripePriceIdYearly || '',
      isPopular: plan.isPopular,
      isActive: plan.isActive,
      featureIds: plan.planFeatures.map((pf) => pf.feature.id),
    });
  };

  const handleSave = async (planId: string) => {
    if (!editForm) return;
    setSaving(true);
    try {
      await axios.patch('/api/admin/plans', {
        id: planId,
        ...editForm,
      });
      toast.success('Plan mis à jour');
      fetchData();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    if (!editForm) return;
    const current = editForm.featureIds;
    if (current.includes(featureId)) {
      setEditForm({ ...editForm, featureIds: current.filter((id) => id !== featureId) });
    } else {
      setEditForm({ ...editForm, featureIds: [...current, featureId] });
    }
  };

  // Group features by category
  const featuresByCategory = features.reduce<Record<string, Feature[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-neutral-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Plans & Features</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Gérez les plans d&apos;abonnement et les fonctionnalités associées.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition"
        >
          <RefreshCw size={16} />
          Actualiser
        </button>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          <div className="col-span-2">Plan</div>
          <div>Prix mensuel</div>
          <div>Prix annuel</div>
          <div>Max biens</div>
          <div>Abonnés</div>
          <div>Statut</div>
        </div>

        {plans.map((plan) => (
          <div key={plan.id}>
            {/* Plan Row */}
            <div
              onClick={() => handleExpand(plan)}
              className="grid grid-cols-7 gap-4 px-6 py-4 items-center cursor-pointer hover:bg-neutral-50 transition border-b border-neutral-100"
            >
              <div className="col-span-2 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.name === 'FREE' ? 'bg-neutral-100' : plan.name === 'ESSENTIAL' ? 'bg-purple-100' : 'bg-neutral-800'}`}>
                  <CreditCard size={16} className={plan.name === 'PRO' ? 'text-white' : 'text-neutral-700'} />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900">{plan.displayName}</div>
                  <div className="text-xs text-neutral-500">{plan.name}</div>
                </div>
                {plan.isPopular && (
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    POPULAIRE
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-700">
                {plan.monthlyPriceCents === 0 ? 'Gratuit' : `${(plan.monthlyPriceCents / 100).toFixed(2)}€`}
              </div>
              <div className="text-sm text-neutral-700">
                {plan.yearlyPriceCents === 0 ? 'Gratuit' : `${(plan.yearlyPriceCents / 100).toFixed(2)}€`}
              </div>
              <div className="text-sm text-neutral-700">
                {plan.maxProperties >= 999 ? 'Illimité' : plan.maxProperties}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-neutral-700">
                <Users size={14} />
                {plan._count.totalSubscribers}
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {plan.isActive ? 'Actif' : 'Inactif'}
                </span>
                {expandedPlanId === plan.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Expanded Edit Panel */}
            {expandedPlanId === plan.id && editForm && (
              <div className="px-6 py-6 bg-neutral-50 border-b border-neutral-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Plan details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                      <Settings size={16} />
                      Paramètres du plan
                    </h3>

                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Nom affiché</label>
                      <input
                        type="text"
                        value={editForm.displayName}
                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Description</label>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Prix mensuel (centimes)</label>
                        <input
                          type="number"
                          value={editForm.monthlyPriceCents}
                          onChange={(e) => setEditForm({ ...editForm, monthlyPriceCents: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Prix annuel (centimes)</label>
                        <input
                          type="number"
                          value={editForm.yearlyPriceCents}
                          onChange={(e) => setEditForm({ ...editForm, yearlyPriceCents: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">Max biens</label>
                      <input
                        type="number"
                        value={editForm.maxProperties}
                        onChange={(e) => setEditForm({ ...editForm, maxProperties: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Stripe Price ID (mensuel)</label>
                        <input
                          type="text"
                          value={editForm.stripePriceIdMonthly}
                          onChange={(e) => setEditForm({ ...editForm, stripePriceIdMonthly: e.target.value })}
                          placeholder="price_..."
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Stripe Price ID (annuel)</label>
                        <input
                          type="text"
                          value={editForm.stripePriceIdYearly}
                          onChange={(e) => setEditForm({ ...editForm, stripePriceIdYearly: e.target.value })}
                          placeholder="price_..."
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.isPopular}
                          onChange={(e) => setEditForm({ ...editForm, isPopular: e.target.checked })}
                          className="w-4 h-4 rounded border-neutral-300"
                        />
                        <span className="text-sm text-neutral-700">Populaire</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                          className="w-4 h-4 rounded border-neutral-300"
                        />
                        <span className="text-sm text-neutral-700">Actif</span>
                      </label>
                    </div>
                  </div>

                  {/* Right: Features */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                      <Zap size={16} />
                      Fonctionnalités ({editForm.featureIds.length})
                    </h3>

                    <div className="max-h-[400px] overflow-y-auto space-y-4">
                      {Object.entries(featuresByCategory).map(([category, catFeatures]) => (
                        <div key={category}>
                          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                            {category}
                          </div>
                          <div className="space-y-1">
                            {catFeatures.map((feature) => {
                              const isChecked = editForm.featureIds.includes(feature.id);
                              return (
                                <label
                                  key={feature.id}
                                  className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white cursor-pointer transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleFeature(feature.id)}
                                    className="w-4 h-4 rounded border-neutral-300"
                                  />
                                  <span className={`text-sm ${isChecked ? 'text-neutral-900 font-medium' : 'text-neutral-600'}`}>
                                    {feature.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-6 pt-4 border-t border-neutral-200">
                  <button
                    onClick={() => handleSave(plan.id)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl border border-neutral-200 p-6">
            <div className="text-sm text-neutral-500">{plan.displayName}</div>
            <div className="text-3xl font-bold text-neutral-900 mt-1">
              {plan._count.totalSubscribers}
            </div>
            <div className="text-xs text-neutral-400 mt-1">abonnés actifs</div>
          </div>
        ))}
      </div>
    </div>
  );
}
