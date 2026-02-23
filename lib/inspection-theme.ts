// lib/inspection-theme.ts
// ============================================================
// DESIGN TOKENS EDL — Modifier ici = modifier PARTOUT
// ============================================================

export const EDL_THEME = {

  // ──────────────────────────────────────────────
  // FONDATIONS
  // ──────────────────────────────────────────────

  // Arrière-plans
  bgPage: "bg-gray-80",                    // Fond de page général
  bgContent: "bg-white rounded-2xl",       // Conteneur central arrondi
  bgCard: "bg-white",                      // Cartes individuelles
  bgCardHover: "hover:bg-gray-50",         // Carte au hover
  bgOverlay: "bg-black/50",               // Overlay (modales, caméra)
  bgInput: "bg-gray-50",                   // Fond des inputs

  // Bordures
  border: "border-gray-100",               // Bordure standard
  borderFocus: "border-amber-500",         // Bordure focus/active
  borderDashed: "border-dashed border-gray-300",  // Bordure ajout (+ Ajouter)

  // Textes
  textPrimary: "text-gray-900",            // Titres, texte principal
  textSecondary: "text-gray-500",          // Sous-titres, descriptions
  textMuted: "text-gray-400",              // Texte tertiaire, placeholders
  textOnAccent: "text-white",              // Texte sur bouton accent
  textOnDark: "text-white",               // Texte sur fond sombre (caméra)

  // Accent (la couleur Coridor)
  accent: "#FE3C10",
  accentBg: "bg-amber-600",
  accentText: "text-amber-600",
  accentBorder: "border-amber-500",
  accentBgLight: "bg-amber-50",            // Fond léger accent (bulles IA)
  accentBgHover: "hover:bg-amber-600",

  // Sémantiques (hex pour inline styles et SVG)
  green: "#16a34a",
  red: "#ef4444",
  orange: "#FE3C10",
  blue: "#3b82f6",

  // ──────────────────────────────────────────────
  // NAVIGATION — Pills inter-pièces (bandeau haut)
  // ──────────────────────────────────────────────

  pillContainer: "bg-white border-b border-gray-100",
  pillDefault: "bg-gray-100 text-gray-600",              // Pièce non faite
  pillActive: "bg-gray-900 text-white",                 // Pièce en cours
  pillCompleted: "bg-emerald-100 text-emerald-700",      // Pièce complétée ✓
  pillCompletedDot: "bg-emerald-500",                    // Dot vert ✓

  // ──────────────────────────────────────────────
  // TABS — Surface tabs (Sols / Murs / Plafond)
  // ──────────────────────────────────────────────

  tabDefault: "bg-gray-100 text-gray-600",               // Tab non fait
  tabActive: "bg-amber-500 text-white",                  // Tab actif
  tabCompleted: "bg-emerald-500 text-white",             // Tab complété ✓

  // ──────────────────────────────────────────────
  // BOUTONS
  // ──────────────────────────────────────────────

  // Bouton principal (CTA : "Suivant", "Valider", "Commencer")
  btnPrimary: "bg-neutral-900 text-white",
  btnPrimaryDisabled: "bg-gray-200 text-gray-400 cursor-not-allowed",

  // Bouton secondaire ("Reprendre photo", "Modifier")
  btnSecondary: "bg-gray-100 text-gray-700",

  // Bouton destructif ("Annuler", "Supprimer")
  btnDestructive: "bg-red-50 text-red-600",

  // Bouton fantôme ("Retour", "Fermer", "Skip")
  btnGhost: "text-gray-500",

  // Bouton back (flèche retour en haut)
  btnBack: "text-gray-600",

  // Bouton fermer (X en haut à droite)
  btnClose: "text-gray-400",

  // Bouton ajout ("+ Ajouter un équipement", "+ Ajouter une pièce")
  btnAdd: "border-2 border-dashed border-gray-300 text-gray-500 bg-transparent",

  // Bouton photo / shutter (écran caméra)
  btnShutter: "bg-white border-4 border-gray-300",
  btnShutterInner: "bg-amber-500",

  // ──────────────────────────────────────────────
  // CHIPS D'ÉTAT — Qualification (Neuf → H.S.)
  // ──────────────────────────────────────────────

  chipDefault: "bg-gray-100 text-gray-600 border border-gray-200",
  chipSelected: "text-white border-2",     // + couleur spécifique ci-dessous

  // Couleurs par niveau (fond quand sélectionné)
  conditionNew:         { bg: "bg-emerald-500", text: "text-white", color: "#16a34a", label: "Neuf" },
  conditionGood:        { bg: "bg-blue-500",    text: "text-white", color: "#3b82f6", label: "Bon" },
  conditionNormalWear:  { bg: "bg-amber-500",   text: "text-white", color: "#f59e0b", label: "Usure norm." },
  conditionDegraded:    { bg: "bg-orange-500",  text: "text-white", color: "#f97316", label: "Dégradé" },
  conditionOutOfService:{ bg: "bg-red-500",     text: "text-white", color: "#ef4444", label: "H.S." },
  conditionAbsent:      { bg: "bg-gray-300",    text: "text-gray-600", color: "#d1d5db", label: "Absent" },

  // ──────────────────────────────────────────────
  // CHIPS — Nature revêtement (multi-select)
  // ──────────────────────────────────────────────

  natureChipDefault: "bg-gray-100 text-gray-900 border border-gray-200",
  natureChipSelected: "bg-amber-100 text-amber-800 border border-amber-200",

  // ──────────────────────────────────────────────
  // CHIPS — Dégradation types (multi-select)
  // ──────────────────────────────────────────────

  degradChipDefault: "bg-gray-100 text-gray-900 border border-gray-200",
  degradChipSelected: "bg-orange-100 text-orange-800 border border-orange-200",

  // ──────────────────────────────────────────────
  // CARTES PIÈCES (Hub)
  // ──────────────────────────────────────────────

  roomCardDefault: "bg-white border border-gray-200",
  roomCardCompleted: "bg-emerald-50 border border-emerald-200",
  roomCardIcon: "text-gray-400",
  roomCardIconCompleted: "text-emerald-500",

  // ──────────────────────────────────────────────
  // ÉQUIPEMENTS (liste dans inspection pièce)
  // ──────────────────────────────────────────────

  equipRow: "bg-white border border-gray-200",
  equipRowAbsent: "bg-gray-50 opacity-60",
  equipName: "text-gray-800",

  // ──────────────────────────────────────────────
  // ÉCRAN CAMÉRA
  // ──────────────────────────────────────────────

  cameraBg: "bg-gray-80",                    // Fond noir extérieur (derrière le viewfinder)
  cameraViewfinder: "linear-gradient(180deg, #0d1117, #070b10)",  // Fond gris foncé arrondi (viewfinder)
  cameraOverlay: "text-white/80",          // Texte sur caméra
  cameraInstruction: "bg-black/60 text-white",  // Bandeau instruction

  // ──────────────────────────────────────────────
  // AUDIO / MICRO
  // ──────────────────────────────────────────────

  microIdle: "bg-gray-100 text-gray-500",
  microActive: "bg-red-500 text-white",
  transcriptionBg: "bg-gray-50 border border-gray-200",

  // ──────────────────────────────────────────────
  // BULLE IA
  // ──────────────────────────────────────────────

  aiBubbleBg: "bg-amber-50 border border-amber-200",
  aiBubbleText: "text-amber-800",
  aiBubbleIcon: "text-amber-500",

  // ──────────────────────────────────────────────
  // SIGNATURE
  // ──────────────────────────────────────────────

  signatureCanvasBg: "bg-white border-2 border-gray-300 rounded-xl",
  signatureDone: "bg-emerald-50 border border-emerald-300",
  signatureDoneText: "text-emerald-700",

  // ──────────────────────────────────────────────
  // STEPPER / WIZARD (compteurs, étapes)
  // ──────────────────────────────────────────────

  stepperActive: "bg-neutral-900 text-white",
  stepperDone: "bg-emerald-500 text-white",
  stepperTodo: "bg-gray-200 text-gray-500",
  stepperLine: "bg-gray-200",
  stepperLineDone: "bg-emerald-500",

  // ──────────────────────────────────────────────
  // TOP BAR
  // ──────────────────────────────────────────────

  topBarBg: "bg-white border-b border-gray-200",
  topBarTitle: "text-gray-900",
  topBarSubtitle: "text-gray-500",

  // ──────────────────────────────────────────────
  // TOAST / FEEDBACK
  // ──────────────────────────────────────────────

  toastSuccess: "bg-emerald-500 text-white",
  toastError: "bg-red-500 text-white",

  // ──────────────────────────────────────────────
  // RÉCAP
  // ──────────────────────────────────────────────

  recapSectionBg: "bg-white rounded-xl border border-gray-200",
  recapBadgeOk: "bg-emerald-100 text-emerald-700",
  recapBadgeWarning: "bg-orange-100 text-orange-700",
  recapBadgeDanger: "bg-red-100 text-red-700",

  // ──────────────────────────────────────────────
  // BANDEAU LÉGAL (10 jours)
  // ──────────────────────────────────────────────

  legalBannerBg: "bg-blue-50 border border-blue-200",
  legalBannerText: "text-blue-800",
  legalBannerIcon: "text-blue-500",

  // ──────────────────────────────────────────────
  // COMPARAISON ENTRÉE / SORTIE (split-screen)
  // ──────────────────────────────────────────────

  exitEntryLabel: "text-gray-400 text-[13px] font-medium uppercase tracking-wide",
  exitExitLabel: "text-gray-900 text-[13px] font-medium uppercase tracking-wide",
  exitEntryBg: "bg-gray-50 rounded-xl border border-gray-200",
  exitExitBg: "bg-white rounded-xl border border-gray-200",
  exitNoPhoto: "bg-gray-100 text-gray-400",

  // ──────────────────────────────────────────────
  // BADGES ÉVOLUTION
  // ──────────────────────────────────────────────

  evolutionUnchanged: "bg-emerald-100 text-emerald-700",
  evolutionNormalWear: "bg-amber-100 text-amber-700",
  evolutionDeterioration: "bg-red-100 text-red-700",
  evolutionImprovement: "bg-blue-100 text-blue-700",

  // ──────────────────────────────────────────────
  // RETENUES SUR DÉPÔT
  // ──────────────────────────────────────────────

  deductionCard: "bg-white rounded-xl border border-gray-200",
  deductionTotal: "bg-gray-900 text-white rounded-xl",
  deductionRefund: "bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200",

} as const;

// Type pour l'autocomplétion
export type EdlTheme = typeof EDL_THEME;
