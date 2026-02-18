import prisma from '@/libs/prismadb';

/**
 * Check if a user has access to a specific feature based on their subscription plan.
 * Falls back to checking the legacy Plan enum if no UserSubscription exists.
 */
export async function hasFeature(userId: string, featureKey: string): Promise<boolean> {
  // 1. Check UserSubscription (new system)
  const userSub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
    include: {
      plan: {
        include: {
          planFeatures: {
            include: { feature: true },
          },
        },
      },
    },
  });

  if (userSub) {
    return userSub.plan.planFeatures.some((pf) => pf.feature.key === featureKey);
  }

  // 2. Fallback: Check legacy Plan enum on User
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) return false;

  // Map legacy plan to feature access
  const legacyFeatureMap: Record<string, string[]> = {
    FREE: ['VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP'],
    PLUS: [
      'VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP',
      'VISIT_MANAGEMENT', 'AUTO_REPUBLISH', 'LEASE_GENERATION',
      'DIGITAL_INSPECTION', 'RENT_REVISION', 'LEGAL_REMINDERS',
      'RENT_TRACKING', 'AUTO_RECEIPTS', 'BANK_CONNECTION',
      'LATE_PAYMENT_REMINDER', 'CHARGE_REGULARIZATION', 'ACCOUNTING_EXPORT',
      'PRIORITY_SUPPORT', 'FISCAL_RECAP', 'TAX_SIMULATOR',
    ],
    PRO: [
      'VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP',
      'VISIT_MANAGEMENT', 'AUTO_REPUBLISH', 'LEASE_GENERATION',
      'DIGITAL_INSPECTION', 'RENT_REVISION', 'LEGAL_REMINDERS',
      'RENT_TRACKING', 'AUTO_RECEIPTS', 'BANK_CONNECTION',
      'LATE_PAYMENT_REMINDER', 'CHARGE_REGULARIZATION', 'ACCOUNTING_EXPORT',
      'PRIORITY_SUPPORT', 'FISCAL_RECAP',
      'MULTI_USERS', 'API_ACCESS', 'DEDICATED_MANAGER', 'TEAM_ROLES',
    ],
  };

  const allowedFeatures = legacyFeatureMap[user.plan] || legacyFeatureMap.FREE;
  return allowedFeatures.includes(featureKey);
}

/**
 * Get the max properties allowed for a user.
 */
export async function getMaxProperties(userId: string): Promise<number> {
  const userSub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
    include: { plan: true },
  });

  if (userSub) {
    return userSub.plan.maxProperties;
  }

  // Fallback legacy
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const legacyLimits: Record<string, number> = { FREE: 1, PLUS: 9, PRO: 999 };
  return legacyLimits[user?.plan || 'FREE'] || 1;
}

/**
 * Get all features for a user (for UI display).
 */
export async function getUserFeatures(userId: string): Promise<{
  planName: string;
  planDisplayName: string;
  maxProperties: number;
  features: Array<{ key: string; label: string; category: string; included: boolean }>;
}> {
  // Get all features
  const allFeatures = await prisma.feature.findMany({
    where: { isActive: true },
    orderBy: { category: 'asc' },
  });

  // Check user subscription
  const userSub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'TRIALING'] } },
    include: {
      plan: {
        include: {
          planFeatures: {
            include: { feature: true },
          },
        },
      },
    },
  });

  if (userSub) {
    const includedKeys = new Set(userSub.plan.planFeatures.map((pf) => pf.feature.key));
    return {
      planName: userSub.plan.name,
      planDisplayName: userSub.plan.displayName,
      maxProperties: userSub.plan.maxProperties,
      features: allFeatures.map((f) => ({
        key: f.key,
        label: f.label,
        category: f.category,
        included: includedKeys.has(f.key),
      })),
    };
  }

  // Fallback legacy
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const plan = user?.plan || 'FREE';

  const legacyFeatureMap: Record<string, string[]> = {
    FREE: ['VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP'],
    PLUS: [
      'VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP',
      'VISIT_MANAGEMENT', 'AUTO_REPUBLISH', 'LEASE_GENERATION',
      'DIGITAL_INSPECTION', 'RENT_REVISION', 'LEGAL_REMINDERS',
      'RENT_TRACKING', 'AUTO_RECEIPTS', 'BANK_CONNECTION',
      'LATE_PAYMENT_REMINDER', 'CHARGE_REGULARIZATION', 'ACCOUNTING_EXPORT',
      'PRIORITY_SUPPORT', 'FISCAL_RECAP', 'TAX_SIMULATOR',
    ],
    PRO: [
      'VERIFIED_CANDIDATES', 'SECURE_MESSAGING', 'CLOUD_BACKUP',
      'VISIT_MANAGEMENT', 'AUTO_REPUBLISH', 'LEASE_GENERATION',
      'DIGITAL_INSPECTION', 'RENT_REVISION', 'LEGAL_REMINDERS',
      'RENT_TRACKING', 'AUTO_RECEIPTS', 'BANK_CONNECTION',
      'LATE_PAYMENT_REMINDER', 'CHARGE_REGULARIZATION', 'ACCOUNTING_EXPORT',
      'PRIORITY_SUPPORT', 'FISCAL_RECAP',
      'MULTI_USERS', 'API_ACCESS', 'DEDICATED_MANAGER', 'TEAM_ROLES',
    ],
  };
  const allowedKeys = new Set(legacyFeatureMap[plan] || legacyFeatureMap.FREE);
  const legacyLimits: Record<string, number> = { FREE: 1, PLUS: 9, PRO: 999 };

  return {
    planName: plan,
    planDisplayName: plan === 'PLUS' ? 'Plus' : plan === 'PRO' ? 'Pro' : 'Gratuit',
    maxProperties: legacyLimits[plan] || 1,
    features: allFeatures.map((f) => ({
      key: f.key,
      label: f.label,
      category: f.category,
      included: allowedKeys.has(f.key),
    })),
  };
}
