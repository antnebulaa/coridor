/**
 * Constantes fiscales 2025-2026 — Simulateur fiscal Coridor
 *
 * Ce fichier regroupe TOUTES les constantes fiscales utilisées par le simulateur.
 * Il est conçu pour être mis à jour annuellement lors de la promulgation de la
 * loi de finances.
 *
 * Dernière vérification : février 2026
 */

// ---------------------------------------------------------------------------
// Année fiscale de référence
// ---------------------------------------------------------------------------

/** Année fiscale de référence pour l'affichage dans l'UI */
export const FISCAL_YEAR = "2026";

// ---------------------------------------------------------------------------
// Barème IR 2026 (revenus perçus en 2025)
// ---------------------------------------------------------------------------

/**
 * Barème progressif de l'impôt sur le revenu — 5 tranches.
 *
 * Source : PLF 2026, art. 2 (procédure 49.3) — revalorisé de ~0,9 % sur
 * le barème 2025 (revenus 2024).
 *
 * ⚠️ Le barème 2026 définitif n'est pas encore voté au moment de la rédaction.
 * Les seuils ci-dessous sont ceux du PLF 2026 (texte 49.3). À confirmer après
 * promulgation.
 */
export const IR_BRACKETS_2026 = [
  { min: 0,       max: 11_497,   rate: 0.00 },
  { min: 11_498,  max: 29_315,   rate: 0.11 },
  { min: 29_316,  max: 83_823,   rate: 0.30 },
  { min: 83_824,  max: 180_294,  rate: 0.41 },
  { min: 180_295, max: Infinity, rate: 0.45 },
] as const;

// ---------------------------------------------------------------------------
// Prélèvements sociaux
// ---------------------------------------------------------------------------

/**
 * Taux de prélèvements sociaux par catégorie de revenu.
 *
 * Source : LFSS 2026 (promulguée 31/12/2025)
 *
 * Détail revenus fonciers :
 *   CSG 9,2 % + CRDS 0,5 % + prélèvement de solidarité 7,5 % = 17,2 %
 *
 * Détail BIC LMNP (interprétation revenus du patrimoine LFSS 2026) :
 *   CSG 10,6 % + CRDS 0,5 % + prélèvement de solidarité 7,5 % = 18,6 %
 *
 * ⚠️ Recommandation : utiliser 17,2 % par défaut pour les BIC LMNP.
 * Le taux de 18,6 % fait l'objet d'un flou juridique (les BIC LMNP
 * peuvent être considérés comme revenus d'activité non salariée et non
 * comme revenus du patrimoine classiques). Mentionner le débat dans l'UI.
 */
export const PRELEVEMENTS_SOCIAUX = {
  /** Revenus fonciers (location nue) — CGI + CSS — taux maintenu à 17,2 % */
  REVENUS_FONCIERS: 0.172,

  /** Revenus BIC meublé (LMNP) — on retient 17,2 % par prudence (cf. note) */
  REVENUS_BIC_LMNP: 0.172,

  /** Plus-values immobilières — maintenu à 17,2 % */
  PLUS_VALUES_IMMO: 0.172,
} as const;

// ---------------------------------------------------------------------------
// Location nue — Micro-foncier et Régime réel (déclaration 2044)
// ---------------------------------------------------------------------------

/**
 * Constantes du régime micro-foncier et du régime réel pour la location nue.
 *
 * Sources :
 *   - CGI art. 32 (micro-foncier : seuil + abattement)
 *   - CGI art. 28-31 (régime réel : charges déductibles)
 *
 * L'abattement micro-foncier reste à 30 % en 2025 et 2026.
 * L'amendement I-2445 du PLF 2025 proposant 50 % n'a PAS été adopté.
 */
export const LOCATION_NUE = {
  MICRO_FONCIER: {
    /** Plafond de revenus fonciers bruts annuels — CGI art. 32 */
    seuil: 15_000,
    /** Abattement forfaitaire — CGI art. 32 */
    abattement: 0.30,
  },
  REGIME_REEL: {
    /**
     * Durée minimale d'engagement au régime réel — CGI art. 32
     * L'option pour le régime réel est irrévocable pendant 3 ans minimum.
     */
    engagement_duree_ans: 3,
  },
} as const;

// ---------------------------------------------------------------------------
// Location meublée — Micro-BIC et Régime réel LMNP
// ---------------------------------------------------------------------------

/**
 * Constantes de la location meublée (LMNP).
 *
 * Sources :
 *   - CGI art. 50-0 (micro-BIC : seuils + abattements)
 *   - Loi Le Meur n° 2024-1039 (seuils courte durée)
 *   - LF 2025 (confirmation)
 *
 * Seule la longue durée est utilisée en V1 du simulateur.
 * Les seuils courte durée sont documentés pour référence.
 */
export const LOCATION_MEUBLEE = {
  MICRO_BIC: {
    /** Location meublée LONGUE DURÉE — CGI art. 50-0 */
    longue_duree: {
      /** Plafond de recettes annuelles */
      seuil: 77_700,
      /** Abattement forfaitaire de 50 % */
      abattement: 0.50,
    },
    /** Location meublée COURTE DURÉE (tourisme non classé) — Loi Le Meur */
    courte_duree_non_classe: {
      seuil: 15_000,
      abattement: 0.30,
    },
    /** Location meublée COURTE DURÉE (meublé classé) — Loi Le Meur */
    courte_duree_classe: {
      seuil: 77_700,
      abattement: 0.50,
    },
  },
  REGIME_REEL: {
    /**
     * Durée minimale d'engagement au régime réel BIC — CGI art. 50-0
     * L'option est irrévocable pour 2 exercices minimum.
     */
    engagement_duree_ans: 2,
  },
} as const;

// ---------------------------------------------------------------------------
// Seuils LMP (Loueur en Meublé Professionnel)
// ---------------------------------------------------------------------------

/**
 * Seuils du statut de Loueur en Meublé Professionnel.
 *
 * Source : CGI art. 155 IV
 *
 * Conditions CUMULATIVES pour être LMP :
 *   1. Recettes annuelles brutes TTC > 23 000 €
 *   2. Recettes > autres revenus d'activité du foyer fiscal
 */
export const LMP = {
  /** Seuil de recettes annuelles brutes TTC — CGI art. 155 IV */
  seuil_recettes: 23_000,
  /** Estimation du taux de cotisations sociales SSI (~35-45 %) */
  cotisations_sociales_taux: 0.40,
  /** Forfait minimum de cotisations même si résultat nul (2026) */
  cotisations_minimum: 1_220,
} as const;

// ---------------------------------------------------------------------------
// Déficit foncier
// ---------------------------------------------------------------------------

/**
 * Règles d'imputation du déficit foncier.
 *
 * Source : CGI art. 156-I-3°
 *
 * Le déficit foncier (hors intérêts d'emprunt) est imputable sur le revenu
 * global dans la limite de 10 700 € par an. L'excédent est reportable
 * pendant 10 ans sur les revenus fonciers ultérieurs.
 *
 * Les intérêts d'emprunt NE SONT PAS imputables sur le revenu global ;
 * ils ne s'imputent que sur les revenus fonciers (année en cours + 10 ans).
 *
 * Le bien doit rester en location pendant 3 ans après l'imputation du déficit
 * sur le revenu global.
 */
export const DEFICIT_FONCIER = {
  /** Plafond d'imputation annuel sur le revenu global — CGI art. 156-I-3° */
  plafond_revenu_global: 10_700,
  /** Plafond majoré pour dispositifs Cosse ou Périssol — CGI art. 156-I-3° */
  plafond_cosse_perissol: 15_300,
  /**
   * Plafond majoré pour dépenses de rénovation énergétique
   * payées avant le 31/12/2025 — LFR 2022, art. 12
   */
  plafond_renovation_energetique: 21_400,
  /** Durée de report du déficit sur les revenus fonciers — CGI art. 156-I-3° */
  report_duree_ans: 10,
  /** Durée minimale de maintien en location après imputation — CGI art. 156-I-3° */
  location_obligatoire_ans: 3,
} as const;

// ---------------------------------------------------------------------------
// Réintégration des amortissements LMNP (depuis 2025)
// ---------------------------------------------------------------------------

/**
 * Règles de réintégration des amortissements LMNP dans le calcul de la
 * plus-value à la revente.
 *
 * Source : LF 2025, art. 24 — CGI art. 150 VB modifié
 *
 * Les amortissements déduits (hors mobilier) sont réintégrés dans le calcul
 * de la plus-value à la revente.
 * Exceptions : résidences étudiantes, seniors, EHPAD.
 * Non applicable aux LMNP micro-BIC.
 *
 * Hors scope V1 (calcul plus-value), mais mentionné dans l'UI.
 */
export const REINTEGRATION_AMORTISSEMENTS = {
  /** Date d'entrée en vigueur — LF 2025, art. 24 */
  applicable_depuis: '2025-02-14',
  /** Concerne uniquement le régime réel LMNP (pas le micro-BIC) */
  concerne_regime_reel_uniquement: true,
} as const;
