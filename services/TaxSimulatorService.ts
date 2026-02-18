/**
 * TaxSimulatorService — Service de simulation fiscale pour propriétaires bailleurs
 *
 * Service stateless qui compare les régimes fiscaux applicables aux revenus
 * locatifs et estime l'imposition nette (IR + prélèvements sociaux).
 *
 * Périmètre V1 :
 *   - Location nue : micro-foncier vs régime réel (déclaration 2044)
 *   - Location meublée : micro-BIC vs régime réel LMNP
 *   - Déficit foncier (location nue, régime réel)
 *   - Détection automatique du statut LMP
 *
 * ⚠️ Simulation indicative — ne constitue pas un conseil fiscal.
 */

import {
  IR_BRACKETS_2026,
  PRELEVEMENTS_SOCIAUX,
  LOCATION_NUE,
  LOCATION_MEUBLEE,
  LMP,
  DEFICIT_FONCIER,
} from "@/lib/fiscalRules";

// ---------------------------------------------------------------------------
// Interfaces — exportées pour le frontend
// ---------------------------------------------------------------------------

export interface SimulationInput {
  /** Autres revenus imposables du foyer (hors revenus locatifs) */
  revenuGlobalAnnuel: number;
  /** Nombre de parts du quotient familial */
  nombreParts: number;
  /** Liste des biens locatifs à simuler */
  biens: BienLocatif[];
}

export interface BienLocatif {
  /** Lien optionnel vers une Property existante dans Coridor */
  propertyId?: string;
  /** Type de bail : location nue ou meublée */
  typeBail: 'NUE' | 'MEUBLEE';
  /** Loyers encaissés sur l'année */
  loyerAnnuelBrut: number;
  /** Total charges annuelles (si réel) */
  chargesAnnuelles: number;
  /** Intérêts d'emprunt annuels */
  interetsEmprunt: number;
  /** Travaux de réparation/entretien/amélioration */
  travauxDeductibles: number;
  /** Taxe foncière */
  taxeFonciere: number;
  /** Assurance propriétaire non occupant */
  assurancePNO: number;
  /** Frais de gestion (dont forfait 20 €) */
  fraisGestion: number;
  /** Charges de copropriété */
  chargesCopropriete: number;
  /** Amortissement annuel du bien (meublé uniquement) */
  amortissementBien?: number;
  /** Amortissement annuel du mobilier (meublé uniquement) */
  amortissementMobilier?: number;
  /** Amortissement travaux immobilisés (meublé uniquement) */
  amortissementTravaux?: number;
}

export interface SimulationResult {
  /** Résultat détaillé par régime fiscal */
  regimes: RegimeResult[];
  /** Nom du régime optimal recommandé */
  regimeOptimal: string;
  /** Économie annuelle entre le meilleur et le pire régime éligible */
  economieAnnuelle: number;
  /** Alertes contextuelles (seuil LMP, engagement réel, déficit reportable…) */
  alertes: string[];
}

export interface RegimeResult {
  /** Nom du régime : "Micro-foncier", "Réel 2044", "Micro-BIC", "Réel LMNP" */
  nom: string;
  /** Base imposable après abattement ou déductions */
  revenuImposable: number;
  /** Impôt sur le revenu calculé (marginal : différence avec/sans revenus locatifs) */
  impotRevenu: number;
  /** Prélèvements sociaux calculés */
  prelevementsSociaux: number;
  /** Total imposition = IR + PS */
  totalImposition: number;
  /** Taux effectif d'imposition = totalImposition / loyersBruts */
  tauxEffectif: number;
  /** Déficit foncier imputé sur le revenu global (si applicable) */
  deficitFoncier?: number;
  /** Excédent de déficit ou amortissement reportable sur les années suivantes */
  deficitReportable?: number;
  /** Le régime est-il éligible pour cette situation ? */
  eligible: boolean;
  /** Raison d'inéligibilité le cas échéant */
  raisonIneligibilite?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TaxSimulatorService {
  // -------------------------------------------------------------------------
  // Méthode principale
  // -------------------------------------------------------------------------

  /**
   * Lance la simulation pour un foyer fiscal et ses biens locatifs.
   * Compare tous les régimes applicables et recommande le plus avantageux.
   */
  static simuler(input: SimulationInput): SimulationResult {
    const { revenuGlobalAnnuel, nombreParts, biens } = input;

    // Agréger les biens par type de bail
    const biensNus = biens.filter((b) => b.typeBail === 'NUE');
    const biensMeubles = biens.filter((b) => b.typeBail === 'MEUBLEE');

    const totalLoyersNus = biensNus.reduce((s, b) => s + b.loyerAnnuelBrut, 0);
    const totalLoyersMeubles = biensMeubles.reduce((s, b) => s + b.loyerAnnuelBrut, 0);
    const totalLoyersBruts = totalLoyersNus + totalLoyersMeubles;

    const regimes: RegimeResult[] = [];
    const alertes: string[] = [];

    // --- Régimes location nue ---
    if (biensNus.length > 0) {
      regimes.push(
        this.calculerMicroFoncier(biensNus, revenuGlobalAnnuel, nombreParts),
      );
      regimes.push(
        this.calculerReelFoncier(biensNus, revenuGlobalAnnuel, nombreParts),
      );
    }

    // --- Régimes location meublée ---
    if (biensMeubles.length > 0) {
      regimes.push(
        this.calculerMicroBIC(biensMeubles, revenuGlobalAnnuel, nombreParts),
      );
      regimes.push(
        this.calculerReelLMNP(biensMeubles, revenuGlobalAnnuel, nombreParts),
      );
    }

    // --- Détection LMP ---
    if (biensMeubles.length > 0) {
      const alertesLMP = this.detecterLMP(totalLoyersMeubles, revenuGlobalAnnuel);
      alertes.push(...alertesLMP);
    }

    // --- Alertes engagement durée ---
    const reelFoncier = regimes.find((r) => r.nom === 'Réel 2044');
    if (reelFoncier && reelFoncier.eligible) {
      alertes.push(
        `Le régime réel foncier vous engage pour ${LOCATION_NUE.REGIME_REEL.engagement_duree_ans} ans minimum.`,
      );
    }

    const reelLMNP = regimes.find((r) => r.nom === 'Réel LMNP');
    if (reelLMNP && reelLMNP.eligible) {
      alertes.push(
        `Le régime réel LMNP vous engage pour ${LOCATION_MEUBLEE.REGIME_REEL.engagement_duree_ans} exercices minimum.`,
      );
    }

    // --- Alertes déficit reportable ---
    if (reelFoncier && reelFoncier.deficitReportable && reelFoncier.deficitReportable > 0) {
      alertes.push(
        `Vous avez ${reelFoncier.deficitReportable.toLocaleString('fr-FR')} € de déficit foncier reportable sur les ${DEFICIT_FONCIER.report_duree_ans} prochaines années.`,
      );
      alertes.push(
        `Le bien doit rester en location pendant ${DEFICIT_FONCIER.location_obligatoire_ans} ans après l'imputation du déficit sur le revenu global.`,
      );
    }

    if (reelLMNP && reelLMNP.deficitReportable && reelLMNP.deficitReportable > 0) {
      alertes.push(
        `Vous avez ${reelLMNP.deficitReportable.toLocaleString('fr-FR')} € d'amortissement reportable (sans limite de durée).`,
      );
    }

    // --- Alerte réintégration amortissements à la revente ---
    if (reelLMNP && reelLMNP.eligible) {
      alertes.push(
        "Depuis le 14/02/2025, les amortissements déduits en LMNP réel sont réintégrés dans le calcul de la plus-value à la revente (LF 2025, art. 24).",
      );
    }

    // --- Déterminer le régime optimal ---
    const { regimeOptimal, economieAnnuelle } = this.determinerRegimeOptimal(
      regimes,
      totalLoyersBruts,
    );

    return {
      regimes,
      regimeOptimal,
      economieAnnuelle,
      alertes,
    };
  }

  // -------------------------------------------------------------------------
  // A) Location nue — Micro-foncier
  // -------------------------------------------------------------------------

  /**
   * Calcule le micro-foncier (CGI art. 32).
   *
   * Éligible si le total des revenus fonciers bruts <= 15 000 €.
   * Base imposable = 70 % des loyers bruts (abattement 30 %).
   * IR marginal + PS 17,2 %.
   */
  static calculerMicroFoncier(
    biens: BienLocatif[],
    revenuGlobal: number,
    parts: number,
  ): RegimeResult {
    const loyerBrutTotal = biens.reduce((s, b) => s + b.loyerAnnuelBrut, 0);

    // Vérifier éligibilité
    if (loyerBrutTotal > LOCATION_NUE.MICRO_FONCIER.seuil) {
      return {
        nom: 'Micro-foncier',
        revenuImposable: 0,
        impotRevenu: 0,
        prelevementsSociaux: 0,
        totalImposition: 0,
        tauxEffectif: 0,
        eligible: false,
        raisonIneligibilite: `Revenus fonciers bruts (${loyerBrutTotal.toLocaleString('fr-FR')} €) supérieurs au seuil micro-foncier de ${LOCATION_NUE.MICRO_FONCIER.seuil.toLocaleString('fr-FR')} €.`,
      };
    }

    const revenuImposable = Math.round(
      loyerBrutTotal * (1 - LOCATION_NUE.MICRO_FONCIER.abattement),
    );

    // IR marginal : différence d'IR avec et sans revenus locatifs
    const irSansLocatif = this.calculerIR(revenuGlobal, parts);
    const irAvecLocatif = this.calculerIR(revenuGlobal + revenuImposable, parts);
    const impotRevenu = irAvecLocatif - irSansLocatif;

    const prelevementsSociaux = Math.round(
      revenuImposable * PRELEVEMENTS_SOCIAUX.REVENUS_FONCIERS,
    );

    const totalImposition = impotRevenu + prelevementsSociaux;
    const tauxEffectif =
      loyerBrutTotal > 0
        ? Math.round((totalImposition / loyerBrutTotal) * 10000) / 10000
        : 0;

    return {
      nom: 'Micro-foncier',
      revenuImposable,
      impotRevenu,
      prelevementsSociaux,
      totalImposition,
      tauxEffectif,
      eligible: true,
    };
  }

  // -------------------------------------------------------------------------
  // B) Location nue — Régime réel (déclaration 2044)
  // -------------------------------------------------------------------------

  /**
   * Calcule le régime réel foncier (CGI art. 28-31).
   *
   * Charges déductibles complètes. Gestion du déficit foncier :
   *   - Plafond 10 700 € sur revenu global (hors intérêts d'emprunt)
   *   - Report 10 ans sur revenus fonciers
   */
  static calculerReelFoncier(
    biens: BienLocatif[],
    revenuGlobal: number,
    parts: number,
  ): RegimeResult {
    // Agréger tous les biens nus
    let loyerBrutTotal = 0;
    let chargesDeductiblesTotal = 0;
    let interetsEmpruntTotal = 0;

    for (const bien of biens) {
      loyerBrutTotal += bien.loyerAnnuelBrut;

      const charges =
        bien.taxeFonciere +
        bien.assurancePNO +
        bien.travauxDeductibles +
        bien.fraisGestion +
        bien.chargesCopropriete +
        bien.interetsEmprunt;

      chargesDeductiblesTotal += charges;
      interetsEmpruntTotal += bien.interetsEmprunt;
    }

    const revenuFoncierNet = loyerBrutTotal - chargesDeductiblesTotal;

    // Cas positif : pas de déficit
    if (revenuFoncierNet >= 0) {
      const irSansLocatif = this.calculerIR(revenuGlobal, parts);
      const irAvecLocatif = this.calculerIR(revenuGlobal + revenuFoncierNet, parts);
      const impotRevenu = irAvecLocatif - irSansLocatif;

      const prelevementsSociaux = Math.round(
        revenuFoncierNet * PRELEVEMENTS_SOCIAUX.REVENUS_FONCIERS,
      );

      const totalImposition = impotRevenu + prelevementsSociaux;
      const tauxEffectif =
        loyerBrutTotal > 0
          ? Math.round((totalImposition / loyerBrutTotal) * 10000) / 10000
          : 0;

      return {
        nom: 'Réel 2044',
        revenuImposable: revenuFoncierNet,
        impotRevenu,
        prelevementsSociaux,
        totalImposition,
        tauxEffectif,
        eligible: true,
      };
    }

    // Cas négatif : déficit foncier
    const deficitTotal = Math.abs(revenuFoncierNet);

    // Charges hors intérêts d'emprunt
    const chargesHorsInterets = chargesDeductiblesTotal - interetsEmpruntTotal;

    // Le déficit imputable sur le revenu global est le déficit hors intérêts,
    // mais ne peut pas dépasser le montant du déficit total.
    // Si les charges hors intérêts > loyers bruts, le déficit hors intérêts = charges hors intérêts - loyers bruts (plafonné à deficitTotal)
    // Sinon le déficit est intégralement dû aux intérêts d'emprunt → 0 imputable sur revenu global
    const deficitHorsInterets = Math.max(
      0,
      Math.min(deficitTotal, chargesHorsInterets - loyerBrutTotal),
    );

    const imputationRevenuGlobal = Math.min(
      deficitHorsInterets,
      DEFICIT_FONCIER.plafond_revenu_global,
    );

    // Le reste du déficit est reportable sur les revenus fonciers des 10 prochaines années
    const deficitReportable = deficitTotal - imputationRevenuGlobal;

    const revenuGlobalReduit = Math.max(0, revenuGlobal - imputationRevenuGlobal);

    const irSansLocatif = this.calculerIR(revenuGlobal, parts);
    const irAvecDeficit = this.calculerIR(revenuGlobalReduit, parts);
    // L'IR marginal est négatif (économie d'impôt)
    const impotRevenu = irAvecDeficit - irSansLocatif;

    // Pas de PS quand il y a déficit foncier
    const prelevementsSociaux = 0;

    const totalImposition = impotRevenu + prelevementsSociaux;
    const tauxEffectif =
      loyerBrutTotal > 0
        ? Math.round((totalImposition / loyerBrutTotal) * 10000) / 10000
        : 0;

    return {
      nom: 'Réel 2044',
      revenuImposable: 0,
      impotRevenu,
      prelevementsSociaux,
      totalImposition,
      tauxEffectif,
      deficitFoncier: imputationRevenuGlobal,
      deficitReportable,
      eligible: true,
    };
  }

  // -------------------------------------------------------------------------
  // C) Location meublée — Micro-BIC
  // -------------------------------------------------------------------------

  /**
   * Calcule le micro-BIC pour la location meublée longue durée (CGI art. 50-0).
   *
   * Éligible si le total des recettes meublées <= 77 700 €.
   * Base imposable = 50 % des recettes (abattement 50 %).
   * IR marginal + PS 17,2 %.
   */
  static calculerMicroBIC(
    biens: BienLocatif[],
    revenuGlobal: number,
    parts: number,
  ): RegimeResult {
    const recettesTotal = biens.reduce((s, b) => s + b.loyerAnnuelBrut, 0);

    // Vérifier éligibilité
    if (recettesTotal > LOCATION_MEUBLEE.MICRO_BIC.longue_duree.seuil) {
      return {
        nom: 'Micro-BIC',
        revenuImposable: 0,
        impotRevenu: 0,
        prelevementsSociaux: 0,
        totalImposition: 0,
        tauxEffectif: 0,
        eligible: false,
        raisonIneligibilite: `Recettes meublées (${recettesTotal.toLocaleString('fr-FR')} €) supérieures au seuil micro-BIC de ${LOCATION_MEUBLEE.MICRO_BIC.longue_duree.seuil.toLocaleString('fr-FR')} €.`,
      };
    }

    const revenuImposable = Math.round(
      recettesTotal * (1 - LOCATION_MEUBLEE.MICRO_BIC.longue_duree.abattement),
    );

    // IR marginal
    const irSansLocatif = this.calculerIR(revenuGlobal, parts);
    const irAvecLocatif = this.calculerIR(revenuGlobal + revenuImposable, parts);
    const impotRevenu = irAvecLocatif - irSansLocatif;

    const prelevementsSociaux = Math.round(
      revenuImposable * PRELEVEMENTS_SOCIAUX.REVENUS_BIC_LMNP,
    );

    const totalImposition = impotRevenu + prelevementsSociaux;
    const tauxEffectif =
      recettesTotal > 0
        ? Math.round((totalImposition / recettesTotal) * 10000) / 10000
        : 0;

    return {
      nom: 'Micro-BIC',
      revenuImposable,
      impotRevenu,
      prelevementsSociaux,
      totalImposition,
      tauxEffectif,
      eligible: true,
    };
  }

  // -------------------------------------------------------------------------
  // D) Location meublée — Régime réel LMNP
  // -------------------------------------------------------------------------

  /**
   * Calcule le régime réel LMNP avec amortissement.
   *
   * L'amortissement ne peut PAS créer de déficit BIC.
   * Si résultat avant amortissement < 0 → déficit BIC (report illimité).
   * Si résultat avant amortissement > 0 → amortissement imputé dans cette limite.
   * L'excédent d'amortissement est reporté sans limite de durée.
   */
  static calculerReelLMNP(
    biens: BienLocatif[],
    revenuGlobal: number,
    parts: number,
  ): RegimeResult {
    let recettesTotal = 0;
    let chargesDeductiblesTotal = 0;
    let amortissementTotal = 0;

    for (const bien of biens) {
      recettesTotal += bien.loyerAnnuelBrut;

      const charges =
        bien.taxeFonciere +
        bien.assurancePNO +
        bien.travauxDeductibles +
        bien.fraisGestion +
        bien.chargesCopropriete +
        bien.interetsEmprunt;

      chargesDeductiblesTotal += charges;

      amortissementTotal +=
        (bien.amortissementBien || 0) +
        (bien.amortissementMobilier || 0) +
        (bien.amortissementTravaux || 0);
    }

    const resultatAvantAmortissement = recettesTotal - chargesDeductiblesTotal;

    let resultatFiscal: number;
    let amortissementReportable = 0;

    if (resultatAvantAmortissement > 0) {
      // L'amortissement ne peut pas créer de déficit
      const amortissementImpute = Math.min(
        amortissementTotal,
        resultatAvantAmortissement,
      );
      amortissementReportable = amortissementTotal - amortissementImpute;
      resultatFiscal = resultatAvantAmortissement - amortissementImpute;
    } else {
      // Déficit BIC — l'amortissement est intégralement reporté
      resultatFiscal = resultatAvantAmortissement;
      amortissementReportable = amortissementTotal;
    }

    // L'IR est calculé sur max(0, résultat fiscal)
    const baseImposable = Math.max(0, resultatFiscal);

    const irSansLocatif = this.calculerIR(revenuGlobal, parts);
    const irAvecLocatif = this.calculerIR(revenuGlobal + baseImposable, parts);
    const impotRevenu = irAvecLocatif - irSansLocatif;

    const prelevementsSociaux = Math.round(
      baseImposable * PRELEVEMENTS_SOCIAUX.REVENUS_BIC_LMNP,
    );

    const totalImposition = impotRevenu + prelevementsSociaux;
    const tauxEffectif =
      recettesTotal > 0
        ? Math.round((totalImposition / recettesTotal) * 10000) / 10000
        : 0;

    return {
      nom: 'Réel LMNP',
      revenuImposable: baseImposable,
      impotRevenu,
      prelevementsSociaux,
      totalImposition,
      tauxEffectif,
      deficitReportable:
        amortissementReportable > 0 ? amortissementReportable : undefined,
      eligible: true,
    };
  }

  // -------------------------------------------------------------------------
  // Calcul IR — barème progressif
  // -------------------------------------------------------------------------

  /**
   * Calcule l'impôt sur le revenu avec le barème progressif et le quotient familial.
   *
   * Formule : pour chaque tranche, on calcule l'impôt par part, puis on multiplie
   * par le nombre de parts.
   *
   * Source : PLF 2026, art. 2 — barème à 5 tranches.
   */
  static calculerIR(revenuImposable: number, parts: number): number {
    if (revenuImposable <= 0) return 0;

    const quotient = revenuImposable / parts;
    let impotParPart = 0;

    for (const tranche of IR_BRACKETS_2026) {
      if (quotient <= tranche.min) break;
      const base = Math.min(quotient, tranche.max) - tranche.min;
      impotParPart += base * tranche.rate;
    }

    return Math.round(impotParPart * parts);
  }

  // -------------------------------------------------------------------------
  // Détection LMP
  // -------------------------------------------------------------------------

  /**
   * Détecte si le statut de Loueur en Meublé Professionnel (LMP) est atteint.
   *
   * Conditions cumulatives (CGI art. 155 IV) :
   *   1. Recettes annuelles brutes TTC > 23 000 €
   *   2. Recettes > autres revenus d'activité du foyer fiscal
   *
   * Retourne un tableau d'alertes si les seuils sont atteints ou proches.
   */
  static detecterLMP(
    recettesMeublees: number,
    autresRevenus: number,
  ): string[] {
    const alertes: string[] = [];

    const estLMP =
      recettesMeublees > LMP.seuil_recettes &&
      recettesMeublees > autresRevenus;

    if (estLMP) {
      alertes.push(
        `Attention : vos recettes meublées (${recettesMeublees.toLocaleString('fr-FR')} €) dépassent les seuils LMP (${LMP.seuil_recettes.toLocaleString('fr-FR')} € ET supérieures à vos autres revenus). Vous seriez soumis au statut de Loueur en Meublé Professionnel.`,
      );
      alertes.push(
        `En LMP : cotisations sociales SSI (~${Math.round(LMP.cotisations_sociales_taux * 100)} %) au lieu des prélèvements sociaux (17,2 %). Possibilité d'imputer le déficit sur le revenu global et exonération de plus-value après 5 ans si recettes < 90 000 €.`,
      );
    } else if (recettesMeublees > LMP.seuil_recettes * 0.8) {
      // Alerte préventive si proche du seuil (à 80 %)
      alertes.push(
        `Vos recettes meublées (${recettesMeublees.toLocaleString('fr-FR')} €) approchent du seuil LMP de ${LMP.seuil_recettes.toLocaleString('fr-FR')} €. Surveillez l'évolution pour anticiper un éventuel changement de statut.`,
      );
    } else {
      alertes.push(
        `Vos recettes meublées (${recettesMeublees.toLocaleString('fr-FR')} €) sont sous le seuil LMP de ${LMP.seuil_recettes.toLocaleString('fr-FR')} €.`,
      );
    }

    return alertes;
  }

  // -------------------------------------------------------------------------
  // Détermination du régime optimal
  // -------------------------------------------------------------------------

  /**
   * Compare les régimes éligibles et recommande le plus avantageux.
   *
   * Critère : totalImposition le plus bas parmi les régimes éligibles.
   * L'économie annuelle = totalImposition du pire - totalImposition du meilleur.
   */
  static determinerRegimeOptimal(
    regimes: RegimeResult[],
    _totalLoyersBruts?: number,
  ): { regimeOptimal: string; economieAnnuelle: number } {
    const eligibles = regimes.filter((r) => r.eligible);

    if (eligibles.length === 0) {
      return { regimeOptimal: 'Aucun régime éligible', economieAnnuelle: 0 };
    }

    // Trier par totalImposition croissant
    const tries = [...eligibles].sort(
      (a, b) => a.totalImposition - b.totalImposition,
    );

    const meilleur = tries[0];
    const pire = tries[tries.length - 1];

    return {
      regimeOptimal: meilleur.nom,
      economieAnnuelle: pire.totalImposition - meilleur.totalImposition,
    };
  }
}
