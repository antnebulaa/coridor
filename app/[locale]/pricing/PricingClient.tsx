'use client';

import { useState, Fragment } from "react";
import {
    Check, X, Info, Home, FileText, MessageSquare, Mail,
    Landmark, Zap, PieChart, Users, Shield, Code, UserCheck,
    TrendingUp, Calculator, Calendar, FileSignature, Scale
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Container from "@/components/Container";
import Heading from "@/components/Heading";

import { SafeUser } from "@/types";

interface PricingClientProps {
    currentUser?: SafeUser | null;
}

const PricingClient: React.FC<PricingClientProps> = ({
    currentUser
}) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

    const isCurrentPlan = (planName: string) => {
        if (!currentUser) return false;
        if (currentUser.plan === 'FREE' && planName === 'Gratuit') return true;
        if (currentUser.plan === 'PLUS' && planName === 'Plus') return true;
        if (currentUser.plan === 'PRO' && planName === 'Pro') return true;
        return false;
    };

    const plans = [
        {
            name: "Gratuit",
            description: "Pour découvrir Coridor",
            monthlyPrice: 0,
            yearlyPrice: 0,
            features: [
                { label: "1 bien immobilier", icon: Home },
                { label: "Candidats vérifiés & Bons payeurs", icon: UserCheck },
                { label: "Messagerie sécurisée", icon: MessageSquare },
                { label: "Support par email", icon: Mail }
            ],
            buttonLabel: "Commencer gratuitement",
            popular: false
        },
        {
            name: "Plus",
            description: "Pour les propriétaires exigeants",
            monthlyPrice: 19,
            yearlyPrice: 14,
            features: [
                { label: "2 à 9 Biens", icon: Home },
                { label: "Suivi des paiements (Powens)", icon: Landmark },
                { label: "Relance auto & Quittances", icon: FileText },
                { label: "Révision des loyers", icon: TrendingUp },
                { label: "Calcul régularisation des charges", icon: Calculator },
                { label: "Gestion visites & Republication auto", icon: Calendar },
                { label: "Génération de baux", icon: FileSignature },
                { label: "Rappels légaux", icon: Scale },
                { label: "Support prioritaire 7j/7", icon: Shield }
            ],
            buttonLabel: "Commencer l'essai gratuit",
            popular: true
        },
        {
            name: "Pro",
            description: "Pour les agences et équipes",
            monthlyPrice: 99,
            yearlyPrice: 69,
            features: [
                { label: "10+ Biens", icon: Home },
                { label: "Tout du plan Plus", icon: Check },
                { label: "Multi-utilisateurs & Équipes", icon: Users },
                { label: "API & Export Comptable", icon: PieChart },
                { label: "Account Manager dédié", icon: UserCheck }
            ],
            buttonLabel: "Contacter les ventes",
            popular: false
        }
    ];

    const comparisonFeatures = [
        {
            category: "Mise en location",
            items: [
                { name: "Candidats vérifiés", gratuit: true, plus: true, pro: true },
                { name: "Accès certifié \"Bons payeurs\"", gratuit: true, plus: true, pro: true },
                { name: "Messagerie sécurisée", gratuit: true, plus: true, pro: true },
                { name: "Gestion automatisée des visites", gratuit: false, plus: true, pro: true },
                { name: "Republication auto (fin de bail)", gratuit: false, plus: true, pro: true },
            ]
        },
        {
            category: "Gestion Locative",
            items: [
                { name: "Nombre de biens", gratuit: "1", plus: "2-9 lots", pro: "10+ lots" },
                { name: "Génération de baux", gratuit: false, plus: true, pro: true },
                { name: "État des lieux numérique", gratuit: false, plus: true, pro: true },
                { name: "Révision loyer (Anniversaire)", gratuit: false, plus: true, pro: true },
                { name: "Rappels légaux & échéances", gratuit: false, plus: true, pro: true },
            ]
        },
        {
            category: "Finance",
            items: [
                { name: "Suivi des paiements", gratuit: false, plus: "Automatisé", pro: "Automatisé" },
                { name: "Quittances automatiques", gratuit: false, plus: true, pro: true },
                { name: "Connexion bancaire (Powens)", gratuit: false, plus: true, pro: true },
                { name: "Relance impayés", gratuit: false, plus: true, pro: true },
                { name: "Calcul régularisation charges", gratuit: false, plus: true, pro: true },
                { name: "Rappels légaux", gratuit: false, plus: true, pro: true },
                { name: "Export comptable", gratuit: false, plus: true, pro: true },
            ]
        },
        {
            category: "Support & Sécurité",
            items: [
                { name: "Support client", gratuit: "Email", plus: "Prioritaire", pro: "Dédié" },
                { name: "Sauvegarde cloud", gratuit: true, plus: true, pro: true },
                { name: "Rôles équipe", gratuit: false, plus: false, pro: true },
            ]
        }
    ];

    return (
        <div className="bg-white pb-20">
            {/* Header Section */}
            <div className="pt-24 pb-12 text-center max-w-3xl mx-auto px-4">
                <h1 className="text-4xl md:text-4xl font-semibold text-neutral-900 mb-6 tracking-tight">
                    Gérez votre location <br />  sans stress.
                </h1>
                <p className="text-lg text-neutral-500 mb-10">
                    Coridor vous guide pas à pas pour éviter les erreurs classiques qui font perdre du temps, de l’argent, ou créent des situations inconfortables.
                    Chaque étape est pensée pour être simple, claire et conforme.
                    Nous avons créé coridor pour vous faire gagner un maximum de temps, simplifier la location au quotidien, et vous aider à trouver le bon locataire, sans stress et sans mauvaises surprises.
                    Le tout avec des tarifs volontairement accessibles — et, dans la majorité des cas, déductibles fiscalement.
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

                        return (
                            <div
                                key={plan.name}
                                className={`
                                relative flex flex-col p-6 rounded-3xl border 
                                ${plan.name === 'Pro' ? 'bg-neutral-900 border-neutral-900 text-white shadow-xl scale-100 z-10' : plan.popular ? 'bg-neutral-100 border-neutral-200 shadow-xl scale-100 z-10' : 'border-neutral-200 bg-white'}
                            `}
                            >
                                <div className="mb-2">
                                    <div className="flex items-center gap-3 mb-0">
                                        <h3 className={`text-3xl font-semibold ${plan.name === 'Pro' ? 'text-white' : 'text-neutral-900'}`}>{plan.name}</h3>
                                        {plan.popular && (
                                            <div className="bg-purple-600 text-white text-xs font-medium px-3 py-1 rounded-lg capitalize tracking-wider">
                                                Populaire
                                            </div>
                                        )}
                                    </div>
                                    <p className={`text-normal h-10 ${plan.name === 'Pro' ? 'text-neutral-400' : 'text-neutral-500'}`}>{plan.description}</p>
                                </div>

                                <div className="mb-8 flex items-baseline gap-1">
                                    <span className={`text-5xl font-semibold ${plan.name === 'Pro' ? 'text-white' : 'text-neutral-900'}`}>
                                        {billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}€
                                    </span>
                                    <span className={`${plan.name === 'Pro' ? 'text-neutral-400' : 'text-neutral-500'}`}>par mois</span>
                                </div>

                                <div className="mb-8">
                                    <Button
                                        label={isCurrent ? "Plan actuel" : plan.buttonLabel}
                                        onClick={() => { }}
                                        disabled={isCurrent}
                                        variant={isCurrent ? undefined : (plan.popular ? 'primary' : plan.name === 'Pro' ? 'outline' : undefined)}
                                        className={`rounded-full h-12 
                                        ${isCurrent ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed border-none' : ''}
                                        ${!isCurrent && plan.name === 'Pro' ? 'bg-white text-black hover:bg-neutral-200 border-none' : ''}
                                    `}
                                    />
                                </div>

                                <div className="mb-4">
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-4 ${plan.name === 'Pro' ? 'text-neutral-400' : 'text-neutral-900'}`}>Fonctionnalités :</p>
                                    <ul className="space-y-3">
                                        {plan.features.map((feature) => (
                                            <li key={feature.label} className={`flex items-start gap-3 text-normal ${plan.name === 'Pro' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                                <feature.icon size={18} className={`${plan.name === 'Pro' ? 'text-white' : 'text-neutral-900'} shrink-0`} />
                                                <span>{feature.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Comparison Table */}
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-medium text-neutral-900">Comparatif détaillé</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-4 px-6 bg-white sticky left-0 z-10 w-1/3"></th>
                                    {plans.map((plan) => {
                                        const isCurrent = isCurrentPlan(plan.name);
                                        return (
                                            <th key={plan.name} className={`py-4 px-4 text-center w-1/5 ${plan.popular ? 'bg-neutral-100 rounded-t-xl' : ''}`}>
                                                <div className="font-medium text-neutral-900 text-xl">{plan.name}</div>
                                                <div className="text-normal font-medium text-neutral-700 mt-1">
                                                    {billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}€ par mois
                                                </div>
                                                <div className="mt-4">
                                                    <Button
                                                        onClick={() => { }}
                                                        variant="outline"
                                                        className={`rounded-full h-8 text-sm w-full px-2 font-normal hover:bg-neutral-100 ${isCurrent ? 'bg-neutral-800 text-white hover:bg-neutral-700 hover:border-neutral-700' : 'bg-white '}`}
                                                    >
                                                        {isCurrent ? "Annuler" : (
                                                            <>
                                                                <span className="md:hidden">Obtenir</span>
                                                                <span className="hidden md:inline">Passer à {plan.name}</span>
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
                                {comparisonFeatures.map((category, catIndex) => (
                                    <Fragment key={category.category}>
                                        <tr className="">
                                            <td className="py-4 px-2 text-lg font-medium text-neutral-800 uppercase tracking-wider sticky left-0 bg-white z-10 border-r border-neutral-100 sm:border-none">
                                                {category.category}
                                            </td>
                                            {plans.map((plan) => (
                                                <td key={`cat-${category.category}-${plan.name}`} className={plan.popular ? 'bg-neutral-100' : ''}></td>
                                            ))}
                                        </tr>
                                        {category.items.map((item: any, itemIndex: number) => {
                                            const isLastRow = catIndex === comparisonFeatures.length - 1 && itemIndex === category.items.length - 1;
                                            return (
                                                <tr key={item.name} className="hover:bg-neutral-50/30 transition-colors">
                                                    <td className="py-4 px-2 text-sm font-medium text-neutral-900 sticky left-0 bg-white z-10 border-r border-neutral-100 sm:border-none">
                                                        {item.name}
                                                    </td>
                                                    {plans.map((plan) => {
                                                        const value = item[plan.name.toLowerCase()];
                                                        return (
                                                            <td key={`${item.name}-${plan.name}`} className={`py-4 px-6 text-center text-sm text-neutral-600 ${plan.popular ? 'bg-neutral-100' : ''} ${isLastRow && plan.popular ? 'rounded-b-xl' : ''}`}>
                                                                {typeof value === 'boolean' ? (
                                                                    value ? (
                                                                        <Check size={20} className="text-neutral-900 mx-auto" />
                                                                    ) : (
                                                                        <div className="w-5 h-0.5 bg-neutral-200 mx-auto rounded-full" />
                                                                    )
                                                                ) : (
                                                                    value
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default PricingClient;
