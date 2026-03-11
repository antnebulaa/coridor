import { FinancialReport, FinancialInsight } from './types';

const fmt = (cents: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(cents / 100));

export function generateInsights(report: FinancialReport): FinancialInsight[] {
  const insights: FinancialInsight[] = [];

  // 1. Vacant properties
  const vacantCount = report.properties.filter(p => p.isVacant).length;
  if (vacantCount > 0) {
    const occupiedWithRent = report.properties.filter(p => p.monthlyRent);
    const avgRent = occupiedWithRent.length > 0
      ? occupiedWithRent.reduce((s, p) => s + (p.monthlyRent || 0), 0) / occupiedWithRent.length
      : 0;

    insights.push({
      id: 'vacant',
      priority: 1,
      color: 'red',
      doodleName: 'sitting',
      title: `${vacantCount} bien${vacantCount > 1 ? 's' : ''} sans locataire`,
      description: avgRent > 0
        ? `Votre taux d'occupation global est de ${report.occupancyRate}%. Chaque mois de vacance vous coûte environ ${fmt(avgRent)} € de manque à gagner.`
        : `Votre taux d'occupation global est de ${report.occupancyRate}%. Publiez une annonce pour commencer à générer des revenus.`,
      actionLabel: 'Publier une annonce',
      actionHref: '/properties',
    });
  }

  // 2. Lease ending soon
  const endingSoon = report.properties.filter(
    p => p.leaseMonthsRemaining !== null && p.leaseMonthsRemaining <= 6 && !p.isVacant
  );
  if (endingSoon.length > 0) {
    const first = endingSoon[0];
    insights.push({
      id: 'lease-ending',
      priority: 2,
      color: 'amber',
      doodleName: 'strolling',
      title: `Bail se termine dans ${first.leaseMonthsRemaining} mois`,
      description: `Le bail de ${first.tenantName || 'votre locataire'} (${first.title}) se termine bientôt. Pensez au renouvellement ou à la remise en location.`,
      actionLabel: 'Voir le bail',
      actionHref: first.listingId ? `/properties/${first.listingId}/edit` : '/properties',
    });
  }

  // 3. Fiscal optimization
  if (report.totalRevenue > 0) {
    const revenueEuros = Math.round(report.totalRevenue / 100);
    const microAbatement = revenueEuros * 0.3; // 30% micro-foncier
    const realCharges = Math.round(report.totalExpenses / 100);
    const savings = realCharges > microAbatement ? Math.round(realCharges - microAbatement) : 0;

    if (revenueEuros <= 15000 && savings > 0) {
      insights.push({
        id: 'fiscal',
        priority: 3,
        color: 'purple',
        doodleName: 'reading',
        title: `Déclaration ${report.year} : micro-foncier ou réel ?`,
        description: `Avec ${new Intl.NumberFormat('fr-FR').format(revenueEuros)} € de revenus fonciers, le régime réel vous ferait économiser environ ${new Intl.NumberFormat('fr-FR').format(savings)} € par rapport au micro-foncier.`,
        actionLabel: 'Simuler mes impôts',
        actionHref: '/account/tax-simulator',
      });
    } else if (revenueEuros > 15000) {
      insights.push({
        id: 'fiscal',
        priority: 3,
        color: 'purple',
        doodleName: 'reading',
        title: `Déclaration ${report.year} : optimisez votre fiscalité`,
        description: `Avec ${new Intl.NumberFormat('fr-FR').format(revenueEuros)} € de revenus fonciers (> 15 000 €), vous êtes au régime réel. Vérifiez que toutes vos charges sont bien déduites.`,
        actionLabel: 'Voir le récap fiscal',
        actionHref: '/account/fiscal',
      });
    }
  }

  // 4. Cash forecast
  if (report.totalExpenses > 0) {
    const recurringExpensesEuros = Math.round(report.totalExpenses / 100);
    insights.push({
      id: 'forecast',
      priority: 4,
      color: 'blue',
      doodleName: 'float',
      title: 'Trésorerie prévisionnelle',
      description: `Sur ${report.year}, vos dépenses s'élèvent à ${new Intl.NumberFormat('fr-FR').format(recurringExpensesEuros)} €. Anticipez les prochaines échéances pour éviter les surprises.`,
      actionLabel: 'Voir le détail',
      actionHref: '/finances',
    });
  }

  // 5. Investment simulator (always shown)
  insights.push({
    id: 'invest',
    priority: 5,
    color: 'emerald',
    doodleName: 'plant',
    title: 'Votre prochain achat est-il rentable ?',
    description: 'Simulez le rendement, le cashflow mensuel et la plus-value à la revente avant d\'investir.',
    actionLabel: 'Lancer une simulation',
    actionHref: '/simulateur',
  });

  // 6. Capital gain (if purchase price known)
  if (report.totalPurchasePrice && report.grossCapitalGain && report.grossCapitalGain > 0) {
    const gainPercent = Math.round((report.grossCapitalGain / report.totalPurchasePrice) * 100);
    insights.push({
      id: 'capital-gain',
      priority: 6,
      color: 'amber',
      doodleName: 'meditating',
      title: `Plus-value estimée : +${fmt(report.grossCapitalGain)} €`,
      description: `Votre patrimoine a pris ${gainPercent}% de valeur. Après impôts et prélèvements, votre plus-value nette serait d'environ ${fmt(report.netCapitalGain || 0)} €.`,
      actionLabel: 'Détail par bien',
      actionHref: '/properties',
    });
  }

  // 7. Yield beats Livret A
  if (report.netYield && report.netYield > report.livretARate) {
    insights.push({
      id: 'yield-good',
      priority: 7,
      color: 'emerald',
      doodleName: 'jumping',
      title: 'Votre rendement bat le Livret A',
      description: `Avec un rendement net de ${report.netYield}%, votre investissement surperforme le Livret A (${report.livretARate}%) et se rapproche des SCPI (${report.scpiRate}%).`,
      actionLabel: 'Comparer en détail',
      actionHref: '/simulateur',
    });
  }

  // Sort by priority
  return insights.sort((a, b) => a.priority - b.priority);
}
