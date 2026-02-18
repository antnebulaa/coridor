import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEATURES = [
  { key: 'VERIFIED_CANDIDATES', label: 'Candidats vérifiés & Bons payeurs', category: 'LOCATION' },
  { key: 'SECURE_MESSAGING', label: 'Messagerie sécurisée', category: 'LOCATION' },
  { key: 'CLOUD_BACKUP', label: 'Sauvegarde cloud', category: 'SUPPORT' },
  { key: 'VISIT_MANAGEMENT', label: 'Gestion automatisée des visites', category: 'LOCATION' },
  { key: 'AUTO_REPUBLISH', label: 'Republication auto (fin de bail)', category: 'LOCATION' },
  { key: 'LEASE_GENERATION', label: 'Génération de baux', category: 'GESTION' },
  { key: 'DIGITAL_INSPECTION', label: 'État des lieux numérique', category: 'GESTION' },
  { key: 'RENT_REVISION', label: 'Révision des loyers', category: 'FINANCE' },
  { key: 'LEGAL_REMINDERS', label: 'Rappels légaux & échéances', category: 'GESTION' },
  { key: 'RENT_TRACKING', label: 'Suivi des paiements automatisé', category: 'FINANCE' },
  { key: 'AUTO_RECEIPTS', label: 'Quittances automatiques', category: 'FINANCE' },
  { key: 'BANK_CONNECTION', label: 'Connexion bancaire (Powens)', category: 'FINANCE' },
  { key: 'LATE_PAYMENT_REMINDER', label: 'Relance impayés', category: 'FINANCE' },
  { key: 'CHARGE_REGULARIZATION', label: 'Calcul régularisation charges', category: 'FINANCE' },
  { key: 'ACCOUNTING_EXPORT', label: 'Export comptable', category: 'FINANCE' },
  { key: 'MULTI_USERS', label: 'Multi-utilisateurs & Équipes', category: 'SUPPORT' },
  { key: 'API_ACCESS', label: 'API & Export Comptable', category: 'SUPPORT' },
  { key: 'DEDICATED_MANAGER', label: 'Account Manager dédié', category: 'SUPPORT' },
  { key: 'TEAM_ROLES', label: 'Rôles équipe', category: 'SUPPORT' },
  { key: 'PRIORITY_SUPPORT', label: 'Support prioritaire 7j/7', category: 'SUPPORT' },
  { key: 'FISCAL_RECAP', label: 'Récapitulatif fiscal', category: 'FINANCE' },
  { key: 'TAX_SIMULATOR', label: 'Simulateur fiscal', category: 'FINANCE' },
];

const PLANS = [
  {
    name: 'FREE',
    displayName: 'Gratuit',
    description: 'Pour découvrir Coridor',
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    maxProperties: 1,
    sortOrder: 0,
    isPopular: false,
    features: ['VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP'],
  },
  {
    name: 'ESSENTIAL',
    displayName: 'Essentiel',
    description: 'Pour les propriétaires exigeants',
    monthlyPriceCents: 990,
    yearlyPriceCents: 790,
    maxProperties: 5,
    sortOrder: 1,
    isPopular: true,
    features: [
      'VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP',
      'VISIT_MANAGEMENT', 'AUTO_REPUBLISH', 'LEASE_GENERATION',
      'DIGITAL_INSPECTION', 'RENT_REVISION', 'LEGAL_REMINDERS',
      'RENT_TRACKING', 'AUTO_RECEIPTS', 'BANK_CONNECTION',
      'LATE_PAYMENT_REMINDER', 'CHARGE_REGULARIZATION', 'ACCOUNTING_EXPORT',
      'PRIORITY_SUPPORT', 'FISCAL_RECAP', 'TAX_SIMULATOR',
    ],
  },
  {
    name: 'PRO',
    displayName: 'Pro',
    description: 'Pour les agences et équipes',
    monthlyPriceCents: 2990,
    yearlyPriceCents: 2490,
    maxProperties: 999,
    sortOrder: 2,
    isPopular: false,
    features: [
      'VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP',
      'VISIT_MANAGEMENT', 'AUTO_REPUBLISH', 'LEASE_GENERATION',
      'DIGITAL_INSPECTION', 'RENT_REVISION', 'LEGAL_REMINDERS',
      'RENT_TRACKING', 'AUTO_RECEIPTS', 'BANK_CONNECTION',
      'LATE_PAYMENT_REMINDER', 'CHARGE_REGULARIZATION', 'ACCOUNTING_EXPORT',
      'PRIORITY_SUPPORT', 'FISCAL_RECAP', 'TAX_SIMULATOR',
      'MULTI_USERS', 'API_ACCESS', 'DEDICATED_MANAGER', 'TEAM_ROLES',
    ],
  },
];

async function main() {
  console.log('🌱 Seeding features...');
  
  for (const feat of FEATURES) {
    await prisma.feature.upsert({
      where: { key: feat.key },
      update: { label: feat.label, category: feat.category },
      create: feat,
    });
  }
  console.log(`✅ ${FEATURES.length} features seeded`);

  console.log('🌱 Seeding plans...');
  
  for (const plan of PLANS) {
    const { features, ...planData } = plan;
    
    const dbPlan = await prisma.subscriptionPlan.upsert({
      where: { name: planData.name },
      update: {
        displayName: planData.displayName,
        description: planData.description,
        monthlyPriceCents: planData.monthlyPriceCents,
        yearlyPriceCents: planData.yearlyPriceCents,
        maxProperties: planData.maxProperties,
        sortOrder: planData.sortOrder,
        isPopular: planData.isPopular,
      },
      create: planData,
    });

    // Upsert plan-feature associations
    for (const featureKey of features) {
      const feature = await prisma.feature.findUnique({ where: { key: featureKey } });
      if (feature) {
        await prisma.planFeature.upsert({
          where: { planId_featureId: { planId: dbPlan.id, featureId: feature.id } },
          update: {},
          create: { planId: dbPlan.id, featureId: feature.id },
        });
      }
    }
    
    console.log(`✅ Plan "${plan.displayName}" seeded with ${features.length} features`);
  }

  console.log('🎉 Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
