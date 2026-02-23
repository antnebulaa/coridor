# CORRECTIONS EDL — Retours de test terrain

## 1. Multi-revêtements par surface (BUG)

**Problème :** On ne peut sélectionner qu'un seul type de revêtement par surface. En réalité, une salle de bain a souvent du carrelage (bas des murs) + de la peinture (haut des murs). Une cuisine peut avoir une crédence carrelée + peinture.

**Correction :**
- Le sélecteur de nature (NatureSelector) doit passer en **multi-select chips** (pas un dropdown single-select)
- L'utilisateur peut taper plusieurs chips : "Carrelage" + "Peinture"
- En base de données : le champ `nature` sur `InspectionElement` doit accepter plusieurs valeurs. Deux options :
  - Option A : `nature String[]` (array de strings) — le plus simple
  - Option B : garder `nature String?` mais stocker en JSON stringify — moins propre
  - **Recommandé : Option A** (`String[]`)
- Migration Prisma nécessaire si le champ existe déjà en `String?`
- Affichage dans le récap et le PDF : "Murs : Carrelage, Peinture — Bon"

## 2. Type de pièce "Salle de bain + WC" (MANQUE)

**Problème :** Les templates proposent "Salle de bain" et "WC" séparés. Mais dans beaucoup de logements français (studios, T2, immeubles anciens), les WC sont dans la salle de bain.

**Correction :**
- Ajouter le type `BATHROOM_WC` dans l'enum `InspectionRoomType`
- Ajouter dans les templates de pièces (lib/inspection.ts) :

```typescript
// ROOM_TEMPLATES — ajouter des variantes
'STUDIO': ['ENTRY', 'LIVING', 'KITCHEN', 'BATHROOM_WC'],  // SdB+WC combiné
'T2': ['ENTRY', 'LIVING', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'WC'], // Séparés par défaut
// etc.

// EQUIPMENTS_BY_ROOM — ajouter
BATHROOM_WC: [
  // Équipements SdB
  "Douche/Baignoire", "Lavabo", "Robinet", "VMC", "Joints", "Miroir",
  // Équipements WC
  "Cuvette", "Chasse d'eau", "Lave-mains",
],
```

- Dans le Hub des pièces, quand le proprio ajoute une pièce, proposer "Salle de bain + WC" comme option distincte de "Salle de bain" et "WC"
- Icône : 🚿 (comme SdB)
- Label affiché : "Salle de bain + WC"

## 3. Natures de sols enrichies (MANQUE)

**Problème :** "Parquet" est trop vague. Le parquet clipsable / stratifié est le revêtement le plus courant en location rénovée, et il est juridiquement distinct du parquet massif (durée de vie différente = vétusté différente).

**Correction :**
Remplacer la liste actuelle des natures de sols dans lib/inspection.ts :

```typescript
FLOOR: [
  'Parquet massif',
  'Parquet contrecollé',
  'Parquet stratifié (clipsable)',
  'Carrelage',
  'Lino / Vinyle',
  'Moquette',
  'Béton ciré',
  'Résine',
  'Jonc de mer',
  'Tomettes',
  'Autre',
],
```

Tant qu'on y est, enrichir aussi les murs :
```typescript
WALL: [
  'Peinture',
  'Papier peint',
  'Crépi / Enduit',
  'Carrelage',
  'Faïence',
  'Lambris',
  'Béton brut',
  'Pierre apparente',
  'Autre',
],
```

Et les plafonds :
```typescript
CEILING: [
  'Peinture',
  'Lambris',
  'Dalles / Faux plafond',
  'Plâtre moulé',
  'Béton brut',
  'Autre',
],
```

## 4. Chip "Absent" pour les équipements (BUG — prévu dans la spec mais non implémenté)

**Problème :** La liste d'équipements pré-remplis contient des éléments qui peuvent ne pas exister dans le logement (hotte, volets, interphone, fenêtre dans une pièce aveugle...). L'utilisateur est BLOQUÉ car il doit qualifier chaque équipement pour avancer, mais aucune option "Absent" n'existe.

**Correction :**
- Ajouter un 6ème chip **"Absent"** à côté des 5 chips d'état, visuellement distinct (grisé, pas de couleur)
- Style : fond `#1C1C1C`, texte `#6B7280`, bordure `#2A2A2A` — clairement différent des 5 niveaux d'état
- Quand sélectionné : l'équipement est marqué `isAbsent: true` en base (le champ existe déjà dans le schema Prisma)
- Un équipement absent **ne génère PAS de ligne** dans le PDF final
- Un équipement absent **ne bloque PAS** le bouton "Suivant"
- Affichage dans la liste : texte barré en gris, "Absent" affiché

```
Hotte            [N] [B] [U] [D] [X] [Absent]
─────────────────────────────────────────────
✓ Absent                          ← grisé, barré
```

## 5. Bouton "+ Ajouter un équipement" (BUG — prévu dans la spec mais non fonctionnel)

**Problème :** Si un équipement n'est pas dans la liste pré-remplie, impossible de l'ajouter. Exemples : meuble vasque dans une SdB, sèche-serviettes, climatisation, store, porte-serviettes, détecteur de fumée...

**Correction :**
- Le bouton "+ Ajouter un équipement" doit être fonctionnel (pas juste affiché)
- Au clic : ouvrir un **input pleine page** (pattern WizardInput) avec le label "Nom de l'équipement"
- L'utilisateur tape le nom → Valider → l'équipement est ajouté à la liste avec les 5 chips d'état
- L'équipement ajouté est sauvegardé en base comme un InspectionElement normal avec `category: EQUIPMENT`
- Prévoir aussi des **suggestions rapides** en chips sous l'input pour les équipements courants non listés :

```typescript
const EXTRA_EQUIPMENT_SUGGESTIONS = [
  "Détecteur de fumée",
  "Sèche-serviettes",
  "Climatisation",
  "Store",
  "Meuble vasque",
  "Porte-serviettes",
  "Prise TV",
  "Prise téléphone",
  "Thermostat",
  "Tableau électrique",
];
```

---

## Résumé des fichiers à modifier

| Fichier | Modification |
|---|---|
| `prisma/schema.prisma` | `nature String[]` sur InspectionElement + enum `BATHROOM_WC` |
| `lib/inspection.ts` | Natures enrichies (sols, murs, plafonds) + BATHROOM_WC dans templates + EXTRA_EQUIPMENT_SUGGESTIONS |
| `components/inspection/NatureSelector.tsx` | Multi-select chips au lieu de dropdown single |
| `components/inspection/ConditionChips.tsx` | Ajouter chip "Absent" (6ème option, grisé) |
| Écran équipements (dans room inspection) | Rendre "+ Ajouter" fonctionnel + suggestions rapides |
| Hub des pièces (rooms/page.tsx) | Ajouter "Salle de bain + WC" dans les choix |
| PDF generation | Gérer multi-natures + exclure éléments absents |

## Priorité

1. **Chip "Absent"** — c'est un **bloqueur** (l'utilisateur ne peut pas avancer)
2. **Bouton "+ Ajouter"** — bloqueur aussi (équipements manquants)
3. **Multi-revêtements** — important pour la conformité légale
4. **SdB + WC** — important pour les templates
5. **Natures enrichies** — amélioration qualité
