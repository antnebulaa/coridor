import { NextResponse } from "next/server";
import {
  InvestmentSimulatorService,
  type InvestmentInput,
} from "@/services/InvestmentSimulatorService";

// ---------------------------------------------------------------------------
// POST — Run investment simulation (public, no auth required)
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide" },
        { status: 400 },
      );
    }

    const validationError = validateInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const input = body as InvestmentInput;
    const result = InvestmentSimulatorService.simulate(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Investment Simulator] POST Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la simulation" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateInput(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return "Le corps de la requête doit être un objet JSON.";
  }

  const input = body as Record<string, unknown>;

  // V1 required numbers
  const requiredNumbers: Array<[string, number?, number?]> = [
    ["purchasePrice", 1],
    ["notaryFeesRate", 0, 0.2],
    ["renovationCost", 0],
    ["furnitureCost", 0],
    ["personalContribution", 0],
    ["loanRate", 0, 0.2],
    ["loanDurationYears", 1, 35],
    ["loanInsuranceRate", 0, 0.05],
    ["bankFees", 0],
    ["monthlyRent", 0],
    ["monthlyCharges", 0],
    ["propertyTaxYearly", 0],
    ["insuranceYearly", 0],
    ["managementFeesRate", 0, 0.2],
    ["vacancyRate", 0, 0.5],
    ["maintenanceYearly", 0],
    ["coprYearly", 0],
    ["marginalTaxRate", 0, 0.45],
    ["projectionYears", 1, 40],
    ["annualRentIncrease", -0.05, 0.1],
    ["annualPropertyValueIncrease", -0.05, 0.1],
    ["annualChargesIncrease", -0.05, 0.1],
  ];

  for (const [field, min, max] of requiredNumbers) {
    const value = input[field];
    if (typeof value !== "number" || isNaN(value)) {
      return `${field} doit être un nombre.`;
    }
    if (min !== undefined && value < min) {
      return `${field} doit être >= ${min}.`;
    }
    if (max !== undefined && value > max) {
      return `${field} doit être <= ${max}.`;
    }
  }

  // taxRegime — V1 regimes + auto + V2 regimes (future Sprint 2)
  const validRegimes = [
    "micro_foncier",
    "reel",
    "micro_bic",
    "reel_lmnp",
    "auto",
    "lmp_reel",
    "sci_is",
    "pinel_6",
    "pinel_9",
    "pinel_12",
    "denormandie_6",
    "denormandie_9",
    "denormandie_12",
  ];
  if (
    typeof input.taxRegime !== "string" ||
    !validRegimes.includes(input.taxRegime)
  ) {
    return `taxRegime doit être l'un de : ${validRegimes.join(", ")}.`;
  }

  if (typeof input.isFurnished !== "boolean") {
    return "isFurnished doit être un booléen.";
  }

  // V2 optional numbers — validate only if present
  const optionalNumbers: Array<[string, number?, number?]> = [
    ["surface", 0, 10000],
    ["downPayment", 0],
    ["guaranteeCost", 0],
    ["monthlyRentHC", 0],
    ["monthlyChargesProvision", 0],
    ["annualPropertyTax", 0],
    ["annualInsurancePNO", 0],
    ["annualCoproNonRecoverable", 0],
    ["managementFeeRate", 0, 0.2],
    ["annualMaintenance", 0],
    ["annualOtherCharges", 0],
    ["gliRate", 0, 0.1],
    ["vacancyWeeksPerYear", 0, 52],
    ["annualIncomeDeclarant1", 0],
    ["annualIncomeDeclarant2", 0],
    ["taxShares", 0.5, 10],
    ["childrenCount", 0, 20],
    ["furnitureAmortizationYears", 1, 30],
    ["resaleYear", 1, 40],
    ["resalePrice", 0],
  ];

  for (const [field, min, max] of optionalNumbers) {
    if (field in input && input[field] != null) {
      const value = input[field];
      if (typeof value !== "number" || isNaN(value as number)) {
        return `${field} doit être un nombre.`;
      }
      if (min !== undefined && (value as number) < min) {
        return `${field} doit être >= ${min}.`;
      }
      if (max !== undefined && (value as number) > max) {
        return `${field} doit être <= ${max}.`;
      }
    }
  }

  // V2 optional enums — validate only if present
  const optionalEnums: Array<[string, string[]]> = [
    ["propertyType", ["APARTMENT", "HOUSE"]],
    [
      "guaranteeType",
      ["CREDIT_LOGEMENT", "HYPOTHEQUE", "PPD", "NONE"],
    ],
    ["renovationType", ["ENERGY", "FITOUT", "STRUCTURAL"]],
    ["familyStatus", ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]],
  ];

  for (const [field, allowed] of optionalEnums) {
    if (field in input && input[field] != null) {
      if (!allowed.includes(input[field] as string)) {
        return `${field} doit être l'un de : ${allowed.join(", ")}.`;
      }
    }
  }

  return null;
}
