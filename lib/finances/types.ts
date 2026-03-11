export interface FinancialReport {
  year: number;

  // Net result
  totalRevenue: number;       // cents - loyers + charges encaisses
  totalExpenses: number;      // cents - all expenses
  netResult: number;          // cents - totalRevenue - totalExpenses
  noi: number;                // cents - revenue - operating expenses (exclude financing)
  noiTrend: number | null;    // % change vs previous year

  // Yield
  netYield: number | null;    // % - netResult / totalPurchasePrice * 100
  netYieldTrend: number | null;
  livretARate: number;        // constant 3.0
  scpiRate: number;           // constant 4.5

  // Patrimoine (all nullable - only if purchasePrice is set)
  estimatedValue: number | null;     // cents - for now = purchasePrice (no estimation model)
  totalPurchasePrice: number | null; // cents
  grossCapitalGain: number | null;
  netCapitalGain: number | null;

  // No loan model exists, so these are always null for now
  totalDebt: number | null;
  debtDetails: string | null;
  netEquity: number | null;
  equityTrend: number | null;

  // Occupation
  occupancyRate: number;      // 0-100
  occupiedMonths: number;
  totalMonths: number;

  // Monthly cashflow for sparkline
  monthlyCashflow: { month: string; revenue: number; expense: number; net: number }[];

  // Properties occupation
  properties: PropertyOccupation[];

  // Declaration 2044
  declaration2044: Declaration2044Line[];
  hasPowensConnection: boolean;

  // Available years for selector
  availableYears: number[];
}

export interface PropertyMonthData {
  month: number;        // 1-12
  revenue: number;      // cents - rent received this month (0 if vacant)
  cost: number;         // cents - total cost if vacant (lostRent + fixedCosts)
  lostRent: number;     // cents - rent that should have been received
  fixedCosts: number;   // cents - ongoing costs (insurance, tax, copro)
}

export interface PropertyOccupation {
  id: string;
  listingId: string | null;
  title: string;
  address: string;
  tenantName: string | null;
  monthlyRent: number | null;     // cents
  occupiedMonths: number;
  totalMonths: number;
  leaseEndDate: string | null;
  leaseMonthsRemaining: number | null;
  isVacant: boolean;
  annualResult: number;           // cents - total revenue - total cost over the year
  monthlyTimeline: PropertyMonthData[]; // 12 entries
}

export interface Declaration2044Line {
  ligne: string;
  description: string;
  montant: number;  // euros (not cents)
  type: 'revenu' | 'charge' | 'total' | 'resultat';
  autoCategories: boolean;
}

export interface FinancialInsight {
  id: string;
  priority: number;
  color: 'red' | 'amber' | 'purple' | 'blue' | 'emerald';
  doodleName: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}
