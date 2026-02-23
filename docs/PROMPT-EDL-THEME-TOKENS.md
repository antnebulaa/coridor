# PROMPT — EDL : Migration thème light + Design Tokens centralisés

## Contexte

L'EDL est actuellement en thème dark (bg #0A0A0A, cards #141414) alors que le reste de l'app Coridor est en light. Ça crée une rupture visuelle. On passe l'EDL en light ET on centralise TOUS les styles dans un seul fichier de tokens pour pouvoir modifier l'apparence de toute la mini-app EDL depuis un seul endroit.

## ÉTAPE 1 — Créer le fichier de Design Tokens EDL

**Créer :** lib/inspection-theme.ts

Ce fichier est la **SOURCE UNIQUE DE VÉRITÉ** pour tout le style de l'EDL. Aucun composant EDL ne doit avoir de couleur, background, border, ou style hardcodé. TOUT passe par ce fichier.

```typescript
// lib/inspection-theme.ts
// ============================================================
// DESIGN TOKENS EDL — Modifier ici = modifier PARTOUT
// ============================================================

export const EDL_THEME = {

  // ──────────────────────────────────────────────
  // FONDATIONS
  // ──────────────────────────────────────────────

  // Arrière-plans
  bgPage: "bg-gray-50",                    // Fond de page général
  bgContent: "bg-white rounded-2xl",       // Conteneur central arrondi
  bgCard: "bg-white",                      // Cartes individuelles
  bgCardHover: "hover:bg-gray-50",         // Carte au hover
  bgOverlay: "bg-black/50",               // Overlay (modales, caméra)
  bgInput: "bg-gray-50",                   // Fond des inputs

  // Bordures
  border: "border-gray-200",               // Bordure standard
  borderFocus: "border-amber-500",         // Bordure focus/active
  borderDashed: "border-dashed border-gray-300",  // Bordure ajout (+ Ajouter)

  // Textes
  textPrimary: "text-gray-900",            // Titres, texte principal
  textSecondary: "text-gray-600",          // Sous-titres, descriptions
  textMuted: "text-gray-400",              // Texte tertiaire, placeholders
  textOnAccent: "text-white",              // Texte sur bouton accent
  textOnDark: "text-white",               // Texte sur fond sombre (caméra)

  // Accent (la couleur Coridor)
  accent: "#E8A838",
  accentBg: "bg-amber-500",
  accentText: "text-amber-600",
  accentBorder: "border-amber-500",
  accentBgLight: "bg-amber-50",            // Fond léger accent (bulles IA)
  accentBgHover: "hover:bg-amber-600",

  // ──────────────────────────────────────────────
  // NAVIGATION — Pills inter-pièces (bandeau haut)
  // ──────────────────────────────────────────────

  pillContainer: "bg-white border-b border-gray-200",
  pillDefault: "bg-gray-100 text-gray-600",              // Pièce non faite
  pillActive: "bg-amber-500 text-white",                 // Pièce en cours
  pillCompleted: "bg-emerald-100 text-emerald-700",      // Pièce complétée ✓
  pillCompletedDot: "bg-emerald-500",                    // Dot vert ✓

  // ──────────────────────────────────────────────
  // TABS — Surface tabs (Sols / Murs / Plafond)
  // ──────────────────────────────────────────────

  tabDefault: "bg-gray-100 text-gray-600",               // Tab non fait
  tabActive: "bg-amber-500 text-white",                  // Tab actif
  tabCompleted: "bg-emerald-100 text-emerald-700",       // Tab complété ✓

  // ──────────────────────────────────────────────
  // BOUTONS
  // ──────────────────────────────────────────────

  // Bouton principal (CTA : "Suivant", "Valider", "Commencer")
  btnPrimary: "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700",
  btnPrimaryDisabled: "bg-gray-200 text-gray-400 cursor-not-allowed",

  // Bouton secondaire ("Reprendre photo", "Modifier")
  btnSecondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",

  // Bouton destructif ("Annuler", "Supprimer")
  btnDestructive: "bg-red-50 text-red-600 hover:bg-red-100",

  // Bouton fantôme ("Retour", "Fermer", "Skip")
  btnGhost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",

  // Bouton back (flèche retour en haut)
  btnBack: "text-gray-600 hover:bg-gray-100 rounded-full",

  // Bouton fermer (X en haut à droite)
  btnClose: "text-gray-400 hover:text-gray-600",

  // Bouton ajout ("+ Ajouter un équipement", "+ Ajouter une pièce")
  btnAdd: "border-2 border-dashed border-gray-300 text-gray-500 hover:border-amber-400 hover:text-amber-600 bg-transparent",

  // Bouton photo / shutter (écran caméra)
  btnShutter: "bg-white border-4 border-gray-300",
  btnShutterInner: "bg-amber-500",

  // ──────────────────────────────────────────────
  // CHIPS D'ÉTAT — Qualification (Neuf → H.S.)
  // ──────────────────────────────────────────────

  // Les couleurs des chips d'état sont FIXES (convention EDL)
  // Mais on définit quand même ici le style non sélectionné
  chipDefault: "bg-gray-100 text-gray-600 border border-gray-200",
  chipSelected: "text-white border-2",     // + couleur spécifique ci-dessous

  // Couleurs par niveau (fond quand sélectionné)
  conditionNew:         { bg: "bg-emerald-500", text: "text-white", label: "Neuf" },
  conditionGood:        { bg: "bg-blue-500",    text: "text-white", label: "Bon" },
  conditionNormalWear:  { bg: "bg-amber-500",   text: "text-white", label: "Usure norm." },
  conditionDegraded:    { bg: "bg-orange-500",  text: "text-white", label: "Dégradé" },
  conditionOutOfService:{ bg: "bg-red-500",     text: "text-white", label: "H.S." },
  conditionAbsent:      { bg: "bg-gray-300",    text: "text-gray-600", label: "Absent" },

  // ──────────────────────────────────────────────
  // CHIPS — Nature revêtement (multi-select)
  // ──────────────────────────────────────────────

  natureChipDefault: "bg-gray-100 text-gray-600 border border-gray-200",
  natureChipSelected: "bg-amber-100 text-amber-800 border border-amber-400",

  // ──────────────────────────────────────────────
  // CHIPS — Dégradation types (multi-select)
  // ──────────────────────────────────────────────

  degradChipDefault: "bg-gray-100 text-gray-600 border border-gray-200",
  degradChipSelected: "bg-orange-100 text-orange-800 border border-orange-400",

  // ──────────────────────────────────────────────
  // CARTES PIÈCES (Hub)
  // ──────────────────────────────────────────────

  roomCardDefault: "bg-white border border-gray-200 hover:border-amber-300 hover:shadow-md",
  roomCardCompleted: "bg-emerald-50 border border-emerald-200",
  roomCardIcon: "text-gray-400",
  roomCardIconCompleted: "text-emerald-500",

  // ──────────────────────────────────────────────
  // ÉQUIPEMENTS (liste dans inspection pièce)
  // ──────────────────────────────────────────────

  equipRow: "bg-white border-b border-gray-100",
  equipRowAbsent: "bg-gray-50 opacity-60 line-through",
  equipName: "text-gray-800",
  equipNameAbsent: "text-gray-400 line-through",

  // ──────────────────────────────────────────────
  // ÉCRAN CAMÉRA
  // ──────────────────────────────────────────────

  cameraBg: "bg-black",                    // Fond caméra (reste noir — c'est un viewfinder)
  cameraOverlay: "text-white/80",          // Texte sur caméra
  cameraGrid: "border-white/20",           // Grille de composition
  cameraInstruction: "bg-black/60 text-white",  // Bandeau instruction

  // ──────────────────────────────────────────────
  // AUDIO / MICRO
  // ──────────────────────────────────────────────

  microIdle: "bg-gray-100 text-gray-500",
  microActive: "bg-red-500 text-white",
  microWave: "bg-red-400",
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
  signatureCanvasBorder: "border-gray-300",
  signatureDone: "bg-emerald-50 border border-emerald-300",
  signatureDoneText: "text-emerald-700",

  // ──────────────────────────────────────────────
  // STEPPER / WIZARD (compteurs, étapes)
  // ──────────────────────────────────────────────

  stepperActive: "bg-amber-500 text-white",
  stepperDone: "bg-emerald-500 text-white",
  stepperTodo: "bg-gray-200 text-gray-500",
  stepperLine: "bg-gray-200",
  stepperLineDone: "bg-emerald-500",

  // ──────────────────────────────────────────────
  // TOP BAR
  // ──────────────────────────────────────────────

  topBarBg: "bg-white border-b border-gray-200",
  topBarTitle: "text-gray-900 font-semibold",
  topBarSubtitle: "text-gray-500",
  topBarStepCounter: "text-amber-600 font-medium",

  // ──────────────────────────────────────────────
  // TOAST / FEEDBACK
  // ──────────────────────────────────────────────

  toastSuccess: "bg-emerald-500 text-white",
  toastError: "bg-red-500 text-white",
  toastInfo: "bg-amber-500 text-white",

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

} as const;

// Type pour l'autocomplétion
export type EdlTheme = typeof EDL_THEME;
```

---

## ÉTAPE 2 — Migrer TOUS les composants EDL

**Règle absolue : ZÉRO couleur hardcodée dans les composants EDL.**

Chaque composant doit importer le thème :
```typescript
import { EDL_THEME as t } from "@/lib/inspection-theme";
```

Et utiliser les tokens :
```tsx
// ❌ INTERDIT
<div className="bg-[#0A0A0A] text-white">
<button className="bg-blue-500">

// ✅ OBLIGATOIRE
<div className={t.bgPage}>
<button className={t.btnPrimary}>
```

### Liste des fichiers à migrer

Chaque fichier ci-dessous doit être passé en revue. Remplacer TOUTES les classes Tailwind de couleur, background, border par les tokens du thème.

**Composants :**
| Fichier | Tokens principaux à utiliser |
|---|---|
| components/inspection/InspectionTopBar.tsx | topBarBg, topBarTitle, topBarSubtitle, btnBack, topBarStepCounter |
| components/inspection/InspectionBtn.tsx | btnPrimary, btnPrimaryDisabled, btnSecondary |
| components/inspection/InspectionAIBubble.tsx | aiBubbleBg, aiBubbleText, aiBubbleIcon |
| components/inspection/ConditionChips.tsx | chipDefault, chipSelected, condition* |
| components/inspection/RoomPills.tsx | pillContainer, pillDefault, pillActive, pillCompleted |
| components/inspection/NatureSelector.tsx | natureChipDefault, natureChipSelected |
| components/inspection/DegradationFlow.tsx | degradChipDefault, degradChipSelected, btnPrimary, cameraBg |
| components/inspection/CameraCapture.tsx | cameraBg, cameraOverlay, cameraGrid, cameraInstruction, btnShutter |
| components/inspection/AudioRecorder.tsx | microIdle, microActive, microWave, transcriptionBg |
| components/inspection/SignatureCanvas.tsx | signatureCanvasBg, signatureDone, signatureDoneText |
| components/inspection/WizardInput.tsx | bgPage, bgContent, textPrimary, bgInput, borderFocus |
| components/inspection/WizardPhoto.tsx | bgPage, cameraBg, btnPrimary |

**Pages :**
| Fichier | Tokens principaux |
|---|---|
| app/[locale]/inspection/new/[applicationId]/page.tsx | bgPage, bgContent, textPrimary, btnPrimary, aiBubble* |
| app/[locale]/inspection/[inspectionId]/meters/page.tsx | bgPage, stepper*, bgContent |
| app/[locale]/inspection/[inspectionId]/keys/page.tsx | bgPage, bgContent, btnAdd |
| app/[locale]/inspection/[inspectionId]/rooms/page.tsx | bgPage, roomCard*, btnAdd |
| app/[locale]/inspection/[inspectionId]/rooms/[roomId]/page.tsx | bgPage, bgContent, pill*, tab*, chip*, equip*, btnPrimary |
| app/[locale]/inspection/[inspectionId]/recap/page.tsx | bgPage, recap*, legalBanner* |
| app/[locale]/inspection/[inspectionId]/sign/page.tsx | bgPage, signature*, btnPrimary |
| app/[locale]/inspection/[inspectionId]/sign/tenant/page.tsx | bgPage, signature*, legalBanner* |
| app/[locale]/inspection/[inspectionId]/done/page.tsx | bgPage, toastSuccess, btnPrimary, btnSecondary |

---

## ÉTAPE 3 — Vérification

1. `npm run build` passe (0 erreurs TS)
2. **Grep de validation** : lancer cette commande pour vérifier qu'il ne reste aucun hardcode dans les fichiers EDL :
```bash
# Ne doit retourner AUCUN résultat dans les fichiers inspection
grep -rn "bg-\[#" components/inspection/ app/*/inspection/
grep -rn "#0A0A0A\|#141414\|#1C1C1C\|#2A2A2A" components/inspection/ app/*/inspection/
```
3. Ouvrir l'EDL → le thème est cohérent avec le reste de l'app (fond clair)
4. Les chips d'état sont lisibles sur fond clair (surtout jaune "Usure norm." et vert "Neuf")
5. L'écran caméra RESTE en noir (c'est un viewfinder, le noir est correct)
6. Modifier une seule valeur dans `inspection-theme.ts` (ex: changer `bgPage` de `bg-gray-50` à `bg-blue-50`) → toute l'app EDL change d'un coup

## Règle pour le futur

**Tout nouveau composant ou page EDL DOIT utiliser les tokens de `lib/inspection-theme.ts`.** Si un nouveau style est nécessaire, l'ajouter d'abord dans le fichier de tokens, puis l'utiliser dans le composant. Jamais de couleur en direct.
