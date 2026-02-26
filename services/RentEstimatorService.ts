import prisma from '@/libs/prismadb';
import {
  CHARGES_PER_SQM,
  FURNISHED_PREMIUM,
  DPE_ADJUSTMENT,
  FLOOR_ADJUSTMENT,
  PARKING_PREMIUM_EUR,
  BALCONY_PREMIUM,
  CONSTRUCTION_PERIOD_ADJUSTMENT,
  CONFIDENCE,
  type ConfidenceLevel,
  ANIL_ATTRIBUTION,
} from '@/lib/rentEstimatorConstants';

// ── Types ──────────────────────────────────────────────────────────

export interface RentEstimateParams {
  communeCode?: string | null;
  zipCode?: string;
  surface: number;
  roomCount: number;
  category: string; // "Appartement" | "Maison" | etc.
  isFurnished: boolean;
  dpe?: string | null;
  floor?: number | null;
  hasElevator?: boolean;
  hasParking?: boolean;
  hasBalcony?: boolean;
  constructionPeriod?: string | null;
}

export interface RentAdjustments {
  furnished: number;
  dpe: number;
  floor: number;
  parking: number;
  balcony: number;
  construction: number;
}

export interface AdjustmentLabels {
  furnished?: string;
  dpe?: string;
  floor?: string;
  parking?: string;
  balcony?: string;
  construction?: string;
}

export interface RentEstimateResult {
  estimatedRentHC: number;
  rangeLowHC: number;
  rangeHighHC: number;
  estimatedRentCC: number;
  rangeLowCC: number;
  rangeHighCC: number;
  medianPerSqmHC: number;
  medianPerSqmCC: number;
  estimatedChargesPerSqm: number;
  estimatedChargesTotal: number;
  adjustments: RentAdjustments;
  adjustmentLabels: AdjustmentLabels;
  confidence: ConfidenceLevel;
  observations: number;
  rSquared: number;
  source: 'commune' | 'commune_all' | 'department' | null;
  communeName: string | null;
  attribution: string;
}

// ── Service ────────────────────────────────────────────────────────

export class RentEstimatorService {
  /**
   * Main estimation method.
   * Fallback chain: exact commune+typology → commune "all" → department avg → null
   */
  static async estimate(
    params: RentEstimateParams
  ): Promise<RentEstimateResult | null> {
    const {
      communeCode,
      zipCode,
      surface,
      roomCount,
      category,
      isFurnished,
      dpe,
      floor,
      hasElevator,
      hasParking,
      hasBalcony,
      constructionPeriod,
    } = params;

    if (!surface || surface <= 0) return null;
    if (!communeCode && !zipCode) return null;

    const propertyType = this.mapCategory(category);
    const typology = this.mapTypology(roomCount);
    const departmentCode = communeCode
      ? this.extractDepartment(communeCode)
      : zipCode
        ? this.extractDepartmentFromZip(zipCode)
        : null;

    // ── Fallback chain ──

    interface MarketDataLike {
      medianRentPerSqm: number;
      q1RentPerSqm: number;
      q3RentPerSqm: number;
      observations: number;
      rSquared: number;
      communeName: string | null;
    }

    let marketData: MarketDataLike | null = null;
    let source: 'commune' | 'commune_all' | 'department' | null = null;

    // 1. Exact commune + typology
    if (communeCode) {
      const row = await prisma.rentMarketData.findFirst({
        where: { communeCode, propertyType, typology },
        orderBy: { dataYear: 'desc' },
      });
      if (row) {
        marketData = row;
        source = 'commune';
      }
    }

    // 2. Commune "all" typology
    if (!marketData && communeCode) {
      const row = await prisma.rentMarketData.findFirst({
        where: { communeCode, propertyType, typology: 'all' },
        orderBy: { dataYear: 'desc' },
      });
      if (row) {
        marketData = row;
        source = 'commune_all';
      }
    }

    // 3. Department average (raw SQL for aggregation)
    if (!marketData && departmentCode) {
      const deptData = await prisma.$queryRaw<
        Array<{
          avg_median: number;
          avg_q1: number;
          avg_q3: number;
          total_obs: bigint;
          avg_r2: number;
        }>
      >`
        SELECT
          AVG("medianRentPerSqm") as avg_median,
          AVG("q1RentPerSqm") as avg_q1,
          AVG("q3RentPerSqm") as avg_q3,
          SUM("observations") as total_obs,
          AVG("rSquared") as avg_r2
        FROM "RentMarketData"
        WHERE "departmentCode" = ${departmentCode}
          AND "propertyType" = ${propertyType}
          AND "typology" = ${typology}
      `;

      if (deptData[0]?.avg_median) {
        marketData = {
          medianRentPerSqm: Number(deptData[0].avg_median),
          q1RentPerSqm: Number(deptData[0].avg_q1),
          q3RentPerSqm: Number(deptData[0].avg_q3),
          observations: Number(deptData[0].total_obs),
          rSquared: Number(deptData[0].avg_r2),
          communeName: null,
        };
        source = 'department';
      }
    }

    if (!marketData) return null;

    // ── Charges deduction (CC → HC) ──
    const chargesPerSqm =
      propertyType === 'apartment'
        ? CHARGES_PER_SQM.apartment
        : CHARGES_PER_SQM.house;

    const medianHC = Math.max(0, marketData.medianRentPerSqm - chargesPerSqm);
    const q1HC = Math.max(0, marketData.q1RentPerSqm - chargesPerSqm);
    const q3HC = Math.max(0, marketData.q3RentPerSqm - chargesPerSqm);

    // ── Apply adjustments ──
    const furnishedMult = isFurnished ? 1 + FURNISHED_PREMIUM : 1.0;
    const dpeMult = 1 + (DPE_ADJUSTMENT[dpe || 'D'] ?? 0);

    let floorMult = 1.0;
    if (floor != null) {
      if (floor === 0) {
        floorMult = 1 + FLOOR_ADJUSTMENT.ground;
      } else if (floor >= 4) {
        floorMult =
          1 +
          (hasElevator
            ? FLOOR_ADJUSTMENT.highWithElevator
            : FLOOR_ADJUSTMENT.highNoElevator);
      }
    }

    const balconyMult = hasBalcony ? 1 + BALCONY_PREMIUM : 1.0;
    const constructionMult =
      1 + (CONSTRUCTION_PERIOD_ADJUSTMENT[constructionPeriod || ''] ?? 0);

    const totalMult =
      furnishedMult * dpeMult * floorMult * balconyMult * constructionMult;

    // Apply multipliers to HC per-sqm
    const adjustedMedianHC = medianHC * totalMult;
    const adjustedQ1HC = q1HC * totalMult;
    const adjustedQ3HC = q3HC * totalMult;

    // Calculate totals
    const parkingAdd = hasParking ? PARKING_PREMIUM_EUR : 0;
    const estimatedRentHC = Math.round(adjustedMedianHC * surface) + parkingAdd;
    const rangeLowHC = Math.round(adjustedQ1HC * surface) + parkingAdd;
    const rangeHighHC = Math.round(adjustedQ3HC * surface) + parkingAdd;

    // CC equivalents
    const estimatedChargesTotal = Math.round(chargesPerSqm * surface);
    const estimatedRentCC = estimatedRentHC + estimatedChargesTotal;
    const rangeLowCC = rangeLowHC + estimatedChargesTotal;
    const rangeHighCC = rangeHighHC + estimatedChargesTotal;

    // ── Confidence ──
    const obs = marketData.observations;
    const r2 = marketData.rSquared;
    let confidence: ConfidenceLevel = 'LOW';
    if (
      obs >= CONFIDENCE.HIGH.minObservations &&
      r2 >= CONFIDENCE.HIGH.minRSquared
    ) {
      confidence = 'HIGH';
    } else if (obs >= CONFIDENCE.MEDIUM.minObservations) {
      confidence = 'MEDIUM';
    }
    if (source === 'department' && confidence === 'HIGH') {
      confidence = 'MEDIUM';
    }

    return {
      estimatedRentHC,
      rangeLowHC,
      rangeHighHC,
      estimatedRentCC,
      rangeLowCC,
      rangeHighCC,
      medianPerSqmHC: Math.round(adjustedMedianHC * 100) / 100,
      medianPerSqmCC:
        Math.round(marketData.medianRentPerSqm * totalMult * 100) / 100,
      estimatedChargesPerSqm: chargesPerSqm,
      estimatedChargesTotal,
      adjustments: {
        furnished: furnishedMult,
        dpe: dpeMult,
        floor: floorMult,
        parking: parkingAdd,
        balcony: balconyMult,
        construction: constructionMult,
      },
      adjustmentLabels: {
        ...(isFurnished && { furnished: 'Meublé' }),
        ...(dpe && dpe !== 'D' && DPE_ADJUSTMENT[dpe] !== undefined && { dpe: `DPE ${dpe}` }),
        ...(floor != null && floorMult !== 1.0 && {
          floor: floor === 0
            ? 'Rez-de-chaussée'
            : `${floor}e étage${hasElevator ? ' avec ascenseur' : ' sans ascenseur'}`,
        }),
        ...(hasParking && { parking: 'Place de parking' }),
        ...(hasBalcony && { balcony: 'Balcon / terrasse' }),
        ...(constructionPeriod && constructionMult !== 1.0 && { construction: `Construction ${constructionPeriod}` }),
      },
      confidence,
      observations: obs,
      rSquared: Math.round(r2 * 100) / 100,
      source,
      communeName: marketData.communeName,
      attribution: ANIL_ATTRIBUTION,
    };
  }

  // ── Helpers ──

  private static mapCategory(category: string): string {
    const lower = category.toLowerCase();
    if (lower.includes('maison') || lower === 'house') return 'house';
    return 'apartment';
  }

  private static mapTypology(roomCount: number): string {
    if (roomCount <= 2) return 't1_t2';
    return 't3_plus';
  }

  private static extractDepartment(communeCode: string): string {
    if (communeCode.startsWith('2A') || communeCode.startsWith('2B')) {
      return communeCode.substring(0, 2);
    }
    if (communeCode.startsWith('97')) {
      return communeCode.substring(0, 3);
    }
    return communeCode.substring(0, 2);
  }

  private static extractDepartmentFromZip(zipCode: string): string {
    if (zipCode.startsWith('97')) return zipCode.substring(0, 3);
    return zipCode.substring(0, 2);
  }
}
