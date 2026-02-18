import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { hasFeature } from "@/lib/features";
import prisma from "@/libs/prismadb";
import { FiscalService } from "@/services/FiscalService";
import {
  TaxSimulatorService,
  type SimulationInput,
  type BienLocatif,
} from "@/services/TaxSimulatorService";

// ---------------------------------------------------------------------------
// POST — Exécuter une simulation fiscale
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }

    // Vérifier le feature flag
    const canAccess = await hasFeature(currentUser.id, "TAX_SIMULATOR");
    if (!canAccess) {
      return NextResponse.json(
        { error: "Fonctionnalité non disponible avec votre abonnement" },
        { status: 403 },
      );
    }

    // Parser le body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide" },
        { status: 400 },
      );
    }

    // Validation manuelle (pas de zod)
    const validationError = validateSimulationInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const input = body as SimulationInput;

    // Exécuter la simulation
    const result = TaxSimulatorService.simuler(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Tax Simulator] POST Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la simulation fiscale" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Pré-remplissage des biens depuis Coridor
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 },
      );
    }

    // Vérifier le feature flag
    const canAccess = await hasFeature(currentUser.id, "TAX_SIMULATOR");
    if (!canAccess) {
      return NextResponse.json(
        { error: "Fonctionnalité non disponible avec votre abonnement" },
        { status: 403 },
      );
    }

    // Charger les propriétés de l'utilisateur avec les RentalUnit et Listing
    const properties = await prisma.property.findMany({
      where: { ownerId: currentUser.id },
      include: {
        rentalUnits: {
          where: { isActive: true },
          include: {
            listings: {
              where: {
                status: { in: ["PUBLISHED", "DRAFT"] },
              },
              select: {
                id: true,
                price: true,
                leaseType: true,
              },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    // Pour chaque propriété, construire un BienLocatif pré-rempli
    const biens: BienLocatif[] = [];

    for (const property of properties) {
      // Générer le récapitulatif fiscal via FiscalService
      const currentYear = new Date().getFullYear();
      const fiscalYear = currentYear - 1; // Année N-1 (revenus de l'année précédente)

      let fiscalSummary: Awaited<
        ReturnType<typeof FiscalService.generateFiscalSummary>
      > | null = null;
      try {
        fiscalSummary = await FiscalService.generateFiscalSummary(
          property.id,
          fiscalYear,
        );
      } catch {
        // Si pas de données fiscales, on continue avec des valeurs à 0
      }

      for (const unit of property.rentalUnits) {
        const listing = unit.listings[0];
        if (!listing) continue;

        // Déterminer le type de bail :
        // isFurnished sur le RentalUnit OU leaseType sur le Listing
        const isMeublee =
          unit.isFurnished || listing.leaseType === "SHORT_TERM";
        const typeBail: 'NUE' | 'MEUBLEE' = isMeublee ? 'MEUBLEE' : 'NUE';

        // Loyer annuel : prix mensuel * 12
        const loyerAnnuelBrut = listing.price * 12;

        // Charges depuis FiscalService (conversion centimes -> euros)
        const taxeFonciere = fiscalSummary
          ? Math.round(fiscalSummary.categories.taxProperty.amount / 100)
          : 0;
        const assurancePNO = fiscalSummary
          ? Math.round(fiscalSummary.categories.insurance.amount / 100)
          : 0;
        const travauxDeductibles = fiscalSummary
          ? Math.round(fiscalSummary.categories.maintenance.amount / 100)
          : 0;
        const chargesCopropriete = fiscalSummary
          ? Math.round(fiscalSummary.categories.copro.amount / 100)
          : 0;
        const fraisGestion = fiscalSummary
          ? Math.round(fiscalSummary.managementFeesCents / 100)
          : 0;

        const bien: BienLocatif = {
          propertyId: property.id,
          typeBail,
          loyerAnnuelBrut,
          chargesAnnuelles:
            taxeFonciere +
            assurancePNO +
            travauxDeductibles +
            chargesCopropriete +
            fraisGestion,
          interetsEmprunt: 0, // Non disponible dans Coridor — saisie manuelle
          travauxDeductibles,
          taxeFonciere,
          assurancePNO,
          fraisGestion,
          chargesCopropriete,
          // Amortissements non disponibles dans Coridor — saisie manuelle
          amortissementBien: 0,
          amortissementMobilier: 0,
          amortissementTravaux: 0,
        };

        biens.push(bien);
      }
    }

    return NextResponse.json({
      biens,
      anneeReference: new Date().getFullYear() - 1,
    });
  } catch (error) {
    console.error("[Tax Simulator] GET Error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des données" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Validation manuelle de l'input
// ---------------------------------------------------------------------------

function validateSimulationInput(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return "Le corps de la requête doit être un objet JSON.";
  }

  const input = body as Record<string, unknown>;

  // revenuGlobalAnnuel
  if (
    typeof input.revenuGlobalAnnuel !== "number" ||
    input.revenuGlobalAnnuel < 0
  ) {
    return "revenuGlobalAnnuel doit être un nombre positif ou nul.";
  }

  // nombreParts
  if (
    typeof input.nombreParts !== "number" ||
    input.nombreParts < 1 ||
    input.nombreParts > 20
  ) {
    return "nombreParts doit être un nombre entre 1 et 20.";
  }

  // biens
  if (!Array.isArray(input.biens) || input.biens.length === 0) {
    return "biens doit être un tableau non vide de biens locatifs.";
  }

  for (let i = 0; i < input.biens.length; i++) {
    const bien = input.biens[i] as Record<string, unknown>;
    const prefix = `biens[${i}]`;

    if (!bien || typeof bien !== "object") {
      return `${prefix} doit être un objet.`;
    }

    if (bien.typeBail !== "NUE" && bien.typeBail !== "MEUBLEE") {
      return `${prefix}.typeBail doit être "NUE" ou "MEUBLEE".`;
    }

    const numericFields = [
      "loyerAnnuelBrut",
      "chargesAnnuelles",
      "interetsEmprunt",
      "travauxDeductibles",
      "taxeFonciere",
      "assurancePNO",
      "fraisGestion",
      "chargesCopropriete",
    ] as const;

    for (const field of numericFields) {
      const value = bien[field];
      if (typeof value !== "number" || value < 0) {
        return `${prefix}.${field} doit être un nombre positif ou nul.`;
      }
    }

    // Champs optionnels (amortissements)
    const optionalNumericFields = [
      "amortissementBien",
      "amortissementMobilier",
      "amortissementTravaux",
    ] as const;

    for (const field of optionalNumericFields) {
      const value = bien[field];
      if (value !== undefined && value !== null) {
        if (typeof value !== "number" || value < 0) {
          return `${prefix}.${field} doit être un nombre positif ou nul.`;
        }
      }
    }
  }

  return null;
}
