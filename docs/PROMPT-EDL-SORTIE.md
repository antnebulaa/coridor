# Feature EDL de Sortie — Comparaison pièce par pièce + Vétusté

## Contexte

L'EDL d'entrée est complet : flow 9 écrans, photo-first, qualification (Bon/Usé/Dégradé/Absent), compteurs, clés, mobilier, signatures bilatérales, PDF, amendements. Le champ `entryInspectionId` existe déjà sur le modèle `Inspection` pour lier un EDL de sortie à son EDL d'entrée.

**L'EDL de sortie n'est PAS un nouvel EDL from scratch.** C'est une comparaison avec l'entrée. Le système pré-remplit tout depuis l'EDL d'entrée, et le propriétaire ne modifie que ce qui a changé. Ça passe de 45 minutes à 15-20 minutes.

**Flow réaliste sur le terrain :**
1. Le proprio ouvre l'EDL de sortie sur son téléphone
2. L'app affiche chaque pièce avec les éléments notés à l'entrée
3. Pour chaque élément : "Conforme" (rien n'a changé) ou "Changement constaté" (nouvel état + photo + commentaire)
4. Photos d'entrée accessibles immédiatement si le locataire conteste
5. Compteurs relevés, clés vérifiées, mobilier vérifié
6. Signatures des deux parties
7. **Plus tard, chez lui** : le proprio ouvre l'onglet Retenues, le système liste les dégradations avec coefficient de vétusté, il propose des montants → alimente le DepositService existant

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Backend (Prisma, Services, Vétusté, API)

**Mission :** Modifier le schéma Prisma (ajout champ vétusté sur l'EDL d'entrée, nouveaux champs pour l'EDL de sortie), créer le service de comparaison et de calcul de vétusté, créer les API routes pour l'EDL de sortie, et le service de proposition de retenues.

**Fichiers à produire/modifier :**
- `prisma/schema.prisma` — Modifications
- `services/ExitInspectionService.ts` — **Nouveau**
- `services/VetusteService.ts` — **Nouveau**
- `services/RetentionProposalService.ts` — **Nouveau**
- `lib/vetusteGrid.ts` — **Nouveau** (grille de vétusté)
- `app/api/inspection/[inspectionId]/exit/route.ts` — **Nouveau**
- `app/api/inspection/[inspectionId]/retentions/route.ts` — **Nouveau**

### Agent 2 — Frontend Flow de sortie (Écrans, Diff, Photos)

**Mission :** Créer le flow d'EDL de sortie : écran de démarrage avec choix de l'EDL d'entrée, pièce par pièce avec pré-remplissage et vue diff (état entrée vs sortie), boutons Conforme/Changement, photos comparatives, compteurs, clés, mobilier, signatures.

**Fichiers à produire :**
- `components/inspection/exit/ExitInspectionWizard.tsx` — **Nouveau**
- `components/inspection/exit/ExitRoomInspection.tsx` — **Nouveau**
- `components/inspection/exit/ElementDiffCard.tsx` — **Nouveau**
- `components/inspection/exit/PhotoComparison.tsx` — **Nouveau**
- `components/inspection/exit/ExitMetersStep.tsx` — **Nouveau**
- `components/inspection/exit/ExitKeysStep.tsx` — **Nouveau**
- `components/inspection/exit/ExitFurnitureStep.tsx` — **Nouveau**
- `components/inspection/exit/RetentionsPanel.tsx` — **Nouveau**
- `components/inspection/exit/VetusteIndicator.tsx` — **Nouveau**

### Agent 3 — Intégration (Pages, PDF, Dépôt, Conversation, Patch entrée)

**Mission :** Intégrer le flow de sortie dans les pages existantes, générer le PDF comparatif, brancher les retenues avec le DepositService, ajouter les messages système dans la conversation, et patcher l'EDL d'entrée pour ajouter le champ "année de pose".

**Fichiers à modifier :**
- `app/[locale]/inspection/[inspectionId]/page.tsx` — Adapter pour gérer entrée ET sortie
- `components/documents/InspectionDocument.tsx` — PDF comparatif
- Integration avec `DepositService` existant
- Messages système conversation
- Patch EDL d'entrée : champ année de pose

---

## AGENT 1 — BACKEND

### Modifications Prisma

**1. Ajout champ année de pose sur InspectionElement (EDL entrée + sortie) :**

```prisma
model InspectionElement {
  // ... champs existants (nature, condition, comment, photos) ...

  // Vétusté — année de pose/rénovation du matériau
  installationYear    Int?       // ex: 2019. Optionnel à l'entrée, demandé à la sortie si absent

  // EDL de sortie — champs spécifiques
  exitCondition       String?    // état à la sortie (BON/USE/DEGRADE/ABSENT) — null si conforme
  exitComment         String?    // commentaire de sortie
  isConform           Boolean?   // true = rien n'a changé, null = pas encore inspecté en sortie
}
```

**2. Ajout champs sur InspectionPhoto :**

```prisma
model InspectionPhoto {
  // ... champs existants ...

  inspectionType    String   @default("ENTRY")  // "ENTRY" | "EXIT"
}
```

**3. Ajout champs sur Inspection :**

```prisma
model Inspection {
  // ... champs existants ...

  entryInspectionId   String?       // DÉJÀ EXISTANT — lien vers l'EDL d'entrée
  entryInspection     Inspection?   @relation("EntryExit", fields: [entryInspectionId], references: [id])
  exitInspection      Inspection?   @relation("EntryExit")

  // Retenues proposées (après l'EDL de sortie)
  retentionsProposed  Boolean   @default(false)
  retentionsTotal     Int?      // montant total des retenues proposées en centimes
}
```

**4. Nouveau modèle RetentionItem :**

```prisma
model RetentionItem {
  id              String   @id @default(cuid())
  inspectionId    String   // EDL de sortie
  inspection      Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)

  elementId       String   // InspectionElement concerné
  element         InspectionElement @relation(fields: [elementId], references: [id])

  roomName        String   // nom de la pièce (dénormalisé pour affichage)
  elementName     String   // nom de l'élément (dénormalisé)

  entryCondition  String   // état à l'entrée
  exitCondition   String   // état à la sortie

  // Vétusté
  installationYear  Int?
  lifespanYears     Int?     // durée de vie théorique du matériau
  vetusteCoeff      Float?   // coefficient 0-1 (1 = neuf, 0 = fin de vie)
  
  // Montants
  repairCostCents     Int?     // coût estimé de la réparation/remplacement
  retentionCents      Int?     // montant retenu après vétusté (repairCost × vetusteCoeff)
  
  // Validation
  landlordValidated   Boolean  @default(false)
  tenantDisputed      Boolean  @default(false)
  disputeComment      String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([inspectionId])
}
```

### Grille de vétusté — `lib/vetusteGrid.ts`

Grille standard basée sur les grilles de vétusté couramment annexées aux baux en France. Chaque type de matériau/équipement a une durée de vie théorique et un taux d'abattement par an.

```typescript
interface VetusteRule {
  category: string;        // catégorie d'élément
  materials: string[];     // types de matériaux concernés
  lifespanYears: number;   // durée de vie théorique
  franchise: number;       // années sans abattement (le locataire paye 100%)
  annualRate: number;      // taux d'abattement annuel après franchise (%)
  maxAbatement: number;    // abattement maximum (%)
}

export const VETUSTE_GRID: VetusteRule[] = [
  // Revêtements muraux
  {
    category: 'WALL',
    materials: ['peinture', 'papier peint', 'enduit', 'crépi'],
    lifespanYears: 9,
    franchise: 1,
    annualRate: 12.5,  // (100% - 0%) / 8 ans restants
    maxAbatement: 100,
  },
  {
    category: 'WALL',
    materials: ['faïence', 'carrelage mural'],
    lifespanYears: 25,
    franchise: 2,
    annualRate: 4.35,
    maxAbatement: 100,
  },

  // Revêtements de sol
  {
    category: 'FLOOR',
    materials: ['moquette', 'sol souple', 'lino', 'vinyle'],
    lifespanYears: 7,
    franchise: 1,
    annualRate: 16.67,
    maxAbatement: 100,
  },
  {
    category: 'FLOOR',
    materials: ['parquet', 'parquet massif', 'parquet stratifié', 'parquet flottant'],
    lifespanYears: 25,
    franchise: 2,
    annualRate: 4.35,
    maxAbatement: 100,
  },
  {
    category: 'FLOOR',
    materials: ['carrelage', 'carrelage sol', 'tomettes'],
    lifespanYears: 30,
    franchise: 2,
    annualRate: 3.57,
    maxAbatement: 100,
  },

  // Plafonds
  {
    category: 'CEILING',
    materials: ['peinture plafond', 'enduit plafond'],
    lifespanYears: 12,
    franchise: 1,
    annualRate: 9.09,
    maxAbatement: 100,
  },

  // Menuiseries
  {
    category: 'WOODWORK',
    materials: ['porte', 'porte intérieure', 'placard', 'volet'],
    lifespanYears: 20,
    franchise: 2,
    annualRate: 5.56,
    maxAbatement: 100,
  },
  {
    category: 'WOODWORK',
    materials: ['fenêtre', 'double vitrage', 'velux'],
    lifespanYears: 25,
    franchise: 2,
    annualRate: 4.35,
    maxAbatement: 100,
  },

  // Plomberie / Sanitaire
  {
    category: 'PLUMBING',
    materials: ['robinetterie', 'robinet', 'mitigeur'],
    lifespanYears: 15,
    franchise: 2,
    annualRate: 7.69,
    maxAbatement: 100,
  },
  {
    category: 'PLUMBING',
    materials: ['baignoire', 'douche', 'receveur', 'lavabo', 'évier', 'wc', 'toilettes', 'bidet'],
    lifespanYears: 25,
    franchise: 2,
    annualRate: 4.35,
    maxAbatement: 100,
  },

  // Électricité
  {
    category: 'ELECTRICAL',
    materials: ['prise', 'interrupteur', 'luminaire', 'applique'],
    lifespanYears: 20,
    franchise: 2,
    annualRate: 5.56,
    maxAbatement: 100,
  },

  // Équipements
  {
    category: 'EQUIPMENT',
    materials: ['radiateur', 'convecteur', 'chauffage'],
    lifespanYears: 20,
    franchise: 2,
    annualRate: 5.56,
    maxAbatement: 100,
  },
  {
    category: 'EQUIPMENT',
    materials: ['chauffe-eau', 'cumulus', 'ballon'],
    lifespanYears: 15,
    franchise: 2,
    annualRate: 7.69,
    maxAbatement: 100,
  },
  {
    category: 'EQUIPMENT',
    materials: ['four', 'plaque', 'hotte', 'lave-vaisselle', 'réfrigérateur', 'lave-linge', 'sèche-linge', 'micro-ondes'],
    lifespanYears: 12,
    franchise: 1,
    annualRate: 9.09,
    maxAbatement: 100,
  },
  {
    category: 'EQUIPMENT',
    materials: ['store', 'volet roulant'],
    lifespanYears: 15,
    franchise: 2,
    annualRate: 7.69,
    maxAbatement: 100,
  },
];

/**
 * Trouver la règle de vétusté applicable à un élément
 */
export function findVetusteRule(nature: string): VetusteRule | null {
  const normalized = nature.toLowerCase().trim();
  return VETUSTE_GRID.find(rule =>
    rule.materials.some(m => normalized.includes(m.toLowerCase()))
  ) || null;
}

/**
 * Calculer le coefficient de vétusté
 * Retourne un coefficient entre 0 et 1 :
 * - 1 = le locataire paye 100% (matériau récent)
 * - 0 = le locataire ne paye rien (matériau en fin de vie)
 */
export function calculateVetusteCoefficient(
  installationYear: number,
  exitYear: number,
  rule: VetusteRule
): number {
  const age = exitYear - installationYear;

  if (age <= 0) return 1; // Installé cette année = neuf
  if (age <= rule.franchise) return 1; // Dans la période de franchise

  const yearsAfterFranchise = age - rule.franchise;
  const abatement = Math.min(yearsAfterFranchise * rule.annualRate, rule.maxAbatement);
  const coefficient = Math.max(0, (100 - abatement) / 100);

  return Math.round(coefficient * 100) / 100; // Arrondi à 2 décimales
}
```

### ExitInspectionService.ts

```typescript
export class ExitInspectionService {

  /**
   * Créer un EDL de sortie pré-rempli depuis l'EDL d'entrée
   */
  static async createFromEntry(entryInspectionId: string, scheduledAt?: Date): Promise<Inspection> {
    // 1. Charger l'EDL d'entrée complet
    const entry = await prisma.inspection.findUnique({
      where: { id: entryInspectionId },
      include: {
        rooms: {
          include: {
            elements: { include: { photos: true } },
          },
        },
        meters: true,
        keys: true,
        furnitureItems: true,
      },
    });

    if (!entry || entry.status !== 'SIGNED' && entry.status !== 'LOCKED') {
      throw new Error("L'EDL d'entrée doit être signé");
    }
    if (entry.type !== 'ENTRY') {
      throw new Error("L'inspection référencée n'est pas un EDL d'entrée");
    }

    // 2. Créer l'EDL de sortie
    const exitInspection = await prisma.inspection.create({
      data: {
        propertyId: entry.propertyId,
        leaseId: entry.leaseId,
        type: 'EXIT',
        status: 'DRAFT',
        entryInspectionId: entry.id,
        scheduledAt,
        // Pré-remplir les pièces et éléments depuis l'entrée
        rooms: {
          create: entry.rooms.map(room => ({
            name: room.name,
            type: room.type,
            surface: room.surface,
            order: room.order,
            elements: {
              create: room.elements.map(el => ({
                name: el.name,
                type: el.type,
                nature: el.nature,
                condition: el.condition,           // état d'entrée conservé comme référence
                comment: el.comment,               // commentaire d'entrée conservé
                installationYear: el.installationYear, // année de pose si renseignée
                // exitCondition et exitComment restent null (à remplir)
                // isConform reste null (pas encore inspecté)
              })),
            },
          })),
        },
        // Pré-remplir les compteurs avec les relevés d'entrée comme référence
        meters: {
          create: entry.meters.map(meter => ({
            type: meter.type,
            location: meter.location,
            serialNumber: meter.serialNumber,
            entryReading: meter.reading,  // le relevé d'entrée devient la référence
            // reading reste null (à remplir à la sortie)
          })),
        },
        // Pré-remplir les clés
        keys: {
          create: entry.keys.map(key => ({
            type: key.type,
            description: key.description,
            entryQuantity: key.quantity,  // quantité à l'entrée comme référence
            // quantity reste null (à vérifier à la sortie)
          })),
        },
        // Pré-remplir le mobilier
        furnitureItems: {
          create: entry.furnitureItems.map(item => ({
            name: item.name,
            category: item.category,
            entryCondition: item.condition,  // état d'entrée comme référence
            isRequired: item.isRequired,
            // condition reste null (à vérifier à la sortie)
          })),
        },
      },
    });

    return exitInspection;
  }

  /**
   * Générer la comparaison entrée/sortie pour une pièce
   */
  static async getRoomComparison(exitRoomId: string) {
    const exitRoom = await prisma.inspectionRoom.findUnique({
      where: { id: exitRoomId },
      include: {
        elements: { include: { photos: true } },
        inspection: {
          include: {
            entryInspection: {
              include: {
                rooms: {
                  include: {
                    elements: { include: { photos: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!exitRoom) return null;

    // Trouver la pièce correspondante dans l'EDL d'entrée (par nom et type)
    const entryRoom = exitRoom.inspection.entryInspection?.rooms.find(
      r => r.name === exitRoom.name && r.type === exitRoom.type
    );

    // Construire la comparaison élément par élément
    const comparison = exitRoom.elements.map(exitEl => {
      const entryEl = entryRoom?.elements.find(
        e => e.name === exitEl.name && e.type === exitEl.type
      );

      return {
        id: exitEl.id,
        name: exitEl.name,
        type: exitEl.type,
        nature: exitEl.nature,
        // Entrée
        entryCondition: entryEl?.condition || exitEl.condition, // fallback sur le pré-rempli
        entryComment: entryEl?.comment || exitEl.comment,
        entryPhotos: entryEl?.photos.filter(p => p.inspectionType === 'ENTRY') || [],
        // Sortie
        exitCondition: exitEl.exitCondition,
        exitComment: exitEl.exitComment,
        exitPhotos: exitEl.photos.filter(p => p.inspectionType === 'EXIT'),
        isConform: exitEl.isConform,
        // Vétusté
        installationYear: exitEl.installationYear,
        hasChanged: exitEl.isConform === false,
        hasDegradation: exitEl.exitCondition === 'DEGRADE' && exitEl.condition !== 'DEGRADE',
      };
    });

    return {
      room: exitRoom,
      entryRoom,
      elements: comparison,
    };
  }
}
```

### VetusteService.ts

```typescript
import { findVetusteRule, calculateVetusteCoefficient } from '@/lib/vetusteGrid';

export class VetusteService {

  /**
   * Calculer la vétusté pour un élément dégradé
   */
  static calculateForElement(params: {
    nature: string;          // type de matériau (parquet, peinture, etc.)
    installationYear: number | null;
    exitYear?: number;       // année de l'EDL de sortie (défaut: année en cours)
  }): {
    rule: VetusteRule | null;
    coefficient: number;     // 0-1
    abatementPercent: number; // % de réduction pour le locataire
    ageYears: number;
    lifespanYears: number | null;
    needsInstallationYear: boolean;
  } {
    const exitYear = params.exitYear || new Date().getFullYear();

    if (!params.installationYear) {
      return {
        rule: null,
        coefficient: 1, // Sans date, le locataire paye 100% par défaut
        abatementPercent: 0,
        ageYears: 0,
        lifespanYears: null,
        needsInstallationYear: true,
      };
    }

    const rule = findVetusteRule(params.nature);
    if (!rule) {
      return {
        rule: null,
        coefficient: 1,
        abatementPercent: 0,
        ageYears: exitYear - params.installationYear,
        lifespanYears: null,
        needsInstallationYear: false,
      };
    }

    const coefficient = calculateVetusteCoefficient(
      params.installationYear,
      exitYear,
      rule
    );

    return {
      rule,
      coefficient,
      abatementPercent: Math.round((1 - coefficient) * 100),
      ageYears: exitYear - params.installationYear,
      lifespanYears: rule.lifespanYears,
      needsInstallationYear: false,
    };
  }
}
```

### RetentionProposalService.ts

```typescript
export class RetentionProposalService {

  /**
   * Générer la liste des retenues proposées depuis un EDL de sortie
   */
  static async generateProposal(exitInspectionId: string): Promise<RetentionItem[]> {
    const inspection = await prisma.inspection.findUnique({
      where: { id: exitInspectionId },
      include: {
        rooms: {
          include: {
            elements: true,
          },
        },
      },
    });

    if (!inspection || inspection.type !== 'EXIT') {
      throw new Error("L'inspection doit être un EDL de sortie");
    }

    const items: RetentionItem[] = [];

    for (const room of inspection.rooms) {
      for (const element of room.elements) {
        // Ne garder que les éléments avec un changement constaté (pas conforme)
        // ET qui ont une dégradation (pas juste de l'usure notée "conforme")
        if (element.isConform !== false) continue;
        if (!element.exitCondition) continue;

        // Vérifier que c'est une vraie dégradation vs l'entrée
        const entryCondition = element.condition; // état d'entrée pré-rempli
        if (element.exitCondition === entryCondition) continue; // pas de changement réel

        // Calculer la vétusté
        const vetuste = VetusteService.calculateForElement({
          nature: Array.isArray(element.nature) ? element.nature.join(', ') : element.nature || '',
          installationYear: element.installationYear,
        });

        items.push({
          inspectionId: exitInspectionId,
          elementId: element.id,
          roomName: room.name,
          elementName: element.name,
          entryCondition: entryCondition || 'BON',
          exitCondition: element.exitCondition,
          installationYear: element.installationYear,
          lifespanYears: vetuste.lifespanYears,
          vetusteCoeff: vetuste.coefficient,
          repairCostCents: null,      // à renseigner par le propriétaire
          retentionCents: null,       // calculé automatiquement
          landlordValidated: false,
          tenantDisputed: false,
        });
      }
    }

    // Sauvegarder les items en base
    if (items.length > 0) {
      await prisma.retentionItem.createMany({ data: items });
      await prisma.inspection.update({
        where: { id: exitInspectionId },
        data: { retentionsProposed: true },
      });
    }

    return items;
  }

  /**
   * Mettre à jour un montant de retenue
   * Recalcule automatiquement le montant retenu après vétusté
   */
  static async updateRetentionCost(
    retentionItemId: string,
    repairCostCents: number
  ): Promise<RetentionItem> {
    const item = await prisma.retentionItem.findUnique({
      where: { id: retentionItemId },
    });

    if (!item) throw new Error('Retenue introuvable');

    const retentionCents = Math.round(repairCostCents * (item.vetusteCoeff || 1));

    return prisma.retentionItem.update({
      where: { id: retentionItemId },
      data: {
        repairCostCents,
        retentionCents,
        landlordValidated: true,
      },
    });
  }

  /**
   * Soumettre les retenues au DepositService
   */
  static async submitToDeposit(exitInspectionId: string) {
    const items = await prisma.retentionItem.findMany({
      where: {
        inspectionId: exitInspectionId,
        landlordValidated: true,
      },
    });

    const totalRetention = items.reduce((sum, i) => sum + (i.retentionCents || 0), 0);

    const inspection = await prisma.inspection.findUnique({
      where: { id: exitInspectionId },
      include: { property: true },
    });

    // Trouver le dépôt de garantie associé
    // Adapter selon la structure existante (via lease, application, etc.)
    // Appeler DepositService pour proposer les retenues
    // DepositService.proposeRetentions(depositId, totalRetention, items)

    await prisma.inspection.update({
      where: { id: exitInspectionId },
      data: { retentionsTotal: totalRetention },
    });

    return { totalRetention, items };
  }
}
```

### API Routes

**POST /api/inspection/[inspectionId]/exit** — Créer un EDL de sortie depuis un EDL d'entrée

```typescript
// Body: { scheduledAt?: string }
// Vérifie que inspectionId est un EDL d'entrée signé
// Appelle ExitInspectionService.createFromEntry()
// Retourne l'EDL de sortie créé
```

**GET /api/inspection/[inspectionId]/exit/comparison** — Comparaison complète entrée/sortie

```typescript
// Retourne toutes les pièces avec la comparaison élément par élément
// Inclut photos d'entrée et de sortie
```

**PATCH /api/inspection/[inspectionId]/exit/element/[elementId]** — Mettre à jour un élément de sortie

```typescript
// Body: { isConform: boolean, exitCondition?: string, exitComment?: string, installationYear?: number }
```

**POST /api/inspection/[inspectionId]/retentions** — Générer la proposition de retenues

```typescript
// Appelle RetentionProposalService.generateProposal()
```

**PATCH /api/inspection/[inspectionId]/retentions/[itemId]** — Mettre à jour un montant de retenue

```typescript
// Body: { repairCostCents: number }
// Recalcule automatiquement retentionCents avec vétusté
```

**POST /api/inspection/[inspectionId]/retentions/submit** — Soumettre au dépôt de garantie

```typescript
// Appelle RetentionProposalService.submitToDeposit()
```

---

## AGENT 2 — FRONTEND FLOW DE SORTIE

### ExitInspectionWizard.tsx — Flow principal

Le wizard reprend la structure de l'EDL d'entrée (pills navigation, full-page) mais avec le pré-remplissage et les vues diff.

**Étapes :**
1. **Hub pièces** — liste des pièces pré-remplies depuis l'entrée, avec indicateur de progression (non inspecté / conforme / changements)
2. **Pièce par pièce** — inspection de chaque pièce avec vue diff
3. **Compteurs** — relevés de sortie avec comparaison entrée
4. **Clés** — vérification des clés avec comparaison quantités
5. **Mobilier** — vérification du mobilier (si meublé) avec comparaison états
6. **Signature bailleur**
7. **Envoi lien locataire** — comme l'entrée
8. **Signature locataire** — revue contradictoire avec vue diff
9. **Page done** — récap + lien vers les retenues

### ExitRoomInspection.tsx — Inspection d'une pièce

Pour chaque pièce, afficher la liste des éléments avec leur état d'entrée. Le proprio parcourt et pour chaque élément :

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Mur principal                                           │
│  Peinture · Posé en 2019                                 │
│                                                          │
│  État d'entrée : Bon                                     │
│  « RAS, peinture propre »                                │
│  📷 [photo entrée miniature]                             │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │   ✅ Conforme     │  │  ⚠️ Changement   │              │
│  └──────────────────┘  └──────────────────┘              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Si "Conforme" :** l'élément est marqué vert, on passe au suivant. Rapide.

**Si "Changement" :** le bloc s'expand pour afficher les options :

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Mur principal                                           │
│  Peinture · Posé en 2019                                 │
│                                                          │
│  État d'entrée : Bon                     État de sortie  │
│  📷 [photo entrée]                                       │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Bon    Usé    Dégradé    Absent                    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  Commentaire                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Traces d'humidité angle haut gauche                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  📷 Prendre une photo de sortie                          │
│                                                          │
│  Année de pose (si non renseignée à l'entrée)            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ 2019                                                │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ⚡ Vétusté : 5 ans / 9 ans → abattement 50%            │
│     Le locataire ne paierait que 50% du coût             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Points clés :**
- Les pills de condition (Bon/Usé/Dégradé/Absent) sont les mêmes que pour l'entrée
- La photo d'entrée est toujours visible comme référence
- Le champ "Année de pose" apparaît SEULEMENT si `installationYear` est null ET que l'état est "Dégradé" ou "Absent" (pas besoin pour "Usé" qui est considéré comme vétusté normale)
- L'indicateur de vétusté (`VetusteIndicator`) s'affiche en temps réel dès que l'année de pose est renseignée et que l'état est Dégradé

### ElementDiffCard.tsx — Card de comparaison

Composant réutilisable qui affiche côte à côte l'état d'entrée et de sortie d'un élément :

```
┌─────────────────────────────────────────────┐
│  Parquet salon                              │
│  Parquet stratifié · Posé en 2018           │
│                                             │
│  Entrée (jan 2024)     Sortie (mars 2026)   │
│  ┌──────────┐          ┌──────────┐         │
│  │  📷      │          │  📷      │         │
│  └──────────┘          └──────────┘         │
│  🟢 Bon                🔴 Dégradé           │
│  « Bon état »          « Rayures profondes  │
│                          sur 2m² »          │
│                                             │
│  Vétusté : 8 ans / 25 ans → abattement 26% │
│  ━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░            │
│                                             │
└─────────────────────────────────────────────┘
```

Utilisé dans la revue contradictoire du locataire et dans le PDF.

### PhotoComparison.tsx — Comparaison photos

Affiche côte à côte la photo d'entrée et la photo de sortie pour un même élément :

```
┌─────────────────────────────────────────────┐
│  Entrée                 Sortie              │
│  ┌────────────────┐    ┌────────────────┐   │
│  │                │    │                │   │
│  │   Photo EDL    │    │   Photo EDL    │   │
│  │   d'entrée     │    │   de sortie    │   │
│  │                │    │                │   │
│  └────────────────┘    └────────────────┘   │
│  15 jan 2024           3 mars 2026          │
└─────────────────────────────────────────────┘
```

- Tap sur une photo → plein écran
- Swipe pour comparer (optionnel : slider avant/après)

### VetusteIndicator.tsx — Indicateur de vétusté

Petit composant qui affiche le calcul de vétusté pour un élément dégradé :

```
┌──────────────────────────────────────────┐
│  📊 Vétusté                              │
│  Durée de vie : 25 ans                   │
│  Âge : 8 ans (posé en 2018)             │
│  Abattement : 26%                        │
│  ━━━━━━━━░░░░░░░░░░░░░░░░░░░░░          │
│  Le locataire ne paierait que 74%        │
│  du coût de réparation                   │
└──────────────────────────────────────────┘
```

- Barre de progression : partie pleine = vie consommée (gris), partie restante = vie résiduelle (ambre)
- Texte explicatif en langage simple, pas technique
- Si `installationYear` est null : "Renseignez l'année de pose pour calculer la vétusté"

### RetentionsPanel.tsx — Panneau des retenues

Accessible après la signature de l'EDL de sortie. Le proprio y accède depuis la page du bien ou depuis la conversation.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Retenues sur le dépôt de garantie                       │
│  EDL de sortie du 3 mars 2026                            │
│                                                          │
│  Dépôt de garantie : 850 €                               │
│                                                          │
│  ── Dégradations constatées ──────────────────           │
│                                                          │
│  1. Mur salon — Peinture                                 │
│     Bon → Dégradé · Traces d'humidité                    │
│     Vétusté : 50% (5 ans / 9 ans)                        │
│     Coût réparation :  ┌────────┐                        │
│                        │ 400  € │                        │
│                        └────────┘                        │
│     Retenue après vétusté : 200 €                        │
│                                                          │
│  2. Parquet chambre — Parquet stratifié                   │
│     Bon → Dégradé · Rayures profondes                    │
│     Vétusté : 26% (8 ans / 25 ans)                       │
│     Coût réparation :  ┌────────┐                        │
│                        │ 600  € │                        │
│                        └────────┘                        │
│     Retenue après vétusté : 444 €                        │
│                                                          │
│  ── Récapitulatif ─────────────────────────              │
│                                                          │
│  Total retenues : 644 €                                  │
│  Dépôt de garantie : 850 €                               │
│  À restituer au locataire : 206 €                        │
│                                                          │
│  ┌──────────────────────────────────────────┐            │
│  │      Soumettre les retenues →            │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  Le locataire sera notifié et pourra contester           │
│  chaque retenue individuellement.                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Le proprio saisit le coût de réparation pour chaque dégradation
- Le système calcule automatiquement le montant retenu après coefficient de vétusté
- Le total est comparé au dépôt de garantie
- Warning si le total des retenues dépasse le dépôt
- Bouton "Soumettre" envoie au DepositService et notifie le locataire

---

## AGENT 3 — INTÉGRATION

### Patch EDL d'entrée — Champ année de pose

Ajouter un champ optionnel "Année de pose / rénovation" dans le flow d'EDL d'entrée existant. Dans l'écran de qualification d'un élément (après les pills Bon/Usé/Dégradé/Absent), ajouter un input numérique :

```
Année de pose / rénovation (optionnel)
┌────────────────────────────────────────┐
│ 2019                                   │
└────────────────────────────────────────┘
Utile pour le calcul de vétusté à la sortie
```

- Input type number, min 1950, max année en cours
- Optionnel — le proprio peut skipper
- Texte d'aide : "Utile pour le calcul de vétusté à la sortie"
- Sauvegardé dans `InspectionElement.installationYear`
- Affiché seulement pour les revêtements et équipements principaux (sols, murs, plafonds, menuiseries, sanitaires, électroménager), pas pour les éléments secondaires (poignée de porte, prise)

### Page inspection — Gérer entrée ET sortie

Modifier `app/[locale]/inspection/[inspectionId]/page.tsx` pour détecter si c'est un EDL d'entrée ou de sortie (`inspection.type`) et afficher le bon wizard :

```typescript
if (inspection.type === 'ENTRY') {
  return <EntryInspectionWizard ... />;
} else if (inspection.type === 'EXIT') {
  return <ExitInspectionWizard ... />;
}
```

### Bouton "Démarrer l'EDL de sortie"

Ajouter un bouton dans la page du bien ou dans la conversation quand le bail est en cours et qu'un EDL d'entrée signé existe :

```
┌────────────────────────────────────────┐
│  📋 Démarrer l'état des lieux de sortie │
└────────────────────────────────────────┘
```

Ce bouton appelle `POST /api/inspection/[entryId]/exit` pour créer l'EDL de sortie pré-rempli, puis redirige vers le wizard.

### PDF comparatif

Modifier `InspectionDocument.tsx` (ou créer un nouveau `ExitInspectionDocument.tsx`) pour générer un PDF qui inclut la comparaison :

Pour chaque pièce :
- Tableau avec colonnes : Élément | État entrée | État sortie | Observation | Vétusté
- Photos d'entrée et de sortie côte à côte
- Les dégradations en surbrillance (fond rose/rouge léger)

Section retenues en fin de document :
- Tableau : Élément | Dégradation | Coût | Vétusté | Retenue
- Total des retenues
- Montant restitué

### Messages système conversation

Réutiliser le pattern pipe-delimited existant pour les nouveaux événements :

- `INSPECTION_EXIT_CREATED|inspectionId` — "EDL de sortie créé"
- `INSPECTION_EXIT_STARTED|inspectionId` — "EDL de sortie en cours"
- `INSPECTION_EXIT_SIGNED|inspectionId` — "EDL de sortie signé par les deux parties"
- `RETENTIONS_PROPOSED|inspectionId|totalCents` — "Retenues proposées : XXX €"

Ajouter le rendu dans `MessageBox.tsx` avec des cards interactives (comme l'EDL d'entrée).

### Lien avec DepositService

Quand le proprio soumet les retenues, appeler le `DepositService` existant pour faire avancer la state machine du dépôt de garantie :

```typescript
// Après soumission des retenues
await DepositService.proposeRetentions(depositId, {
  totalAmount: totalRetentionCents,
  items: retentionItems.map(i => ({
    description: `${i.roomName} — ${i.elementName}`,
    amount: i.retentionCents,
  })),
});
// Cela déclenche la transition HELD → RETENTIONS_PROPOSED dans la state machine
```

Le locataire reçoit une notification et peut accepter ou contester chaque retenue via le flow existant du dépôt de garantie.

### Indexation dans le panneau Documents

Quand le PDF de l'EDL de sortie est généré, l'indexer dans le panneau Documents de la messagerie (comme on l'a fait pour l'entrée) :

```typescript
await DocumentService.createCoridorDocument({
  conversationId,
  messageId,
  fileName: `edl-sortie-${property.title}.pdf`,
  fileType: 'application/pdf',
  fileUrl: pdfUrl,
  label: `État des lieux de sortie — ${property.title}`,
  coridorType: 'edl',
  coridorRef: exitInspection.id,
});
```

---

## MODIFICATIONS SUR LE MODÈLE InspectionMeter ET InspectionKey

Les compteurs et clés ont besoin de champs supplémentaires pour la comparaison entrée/sortie :

```prisma
model InspectionMeter {
  // ... champs existants ...
  entryReading    Float?    // relevé à l'entrée (pré-rempli depuis l'entrée)
  // reading = relevé de sortie (existant)
}

model InspectionKey {
  // ... champs existants ...
  entryQuantity   Int?      // quantité à l'entrée (pré-rempli)
  // quantity = quantité vérifiée à la sortie (existant)
}

model InspectionFurnitureItem {
  // ... champs existants ...
  entryCondition  String?   // état à l'entrée (pré-rempli)
  // condition = état à la sortie (existant)
}
```

Vérifier les champs existants et adapter — certains de ces champs existent peut-être déjà sous un autre nom.

---

## FICHIERS RÉCAPITULATIF

### Nouveaux (14)

| Fichier | Agent | Rôle |
|---------|-------|------|
| `services/ExitInspectionService.ts` | 1 | Création pré-remplie, comparaison |
| `services/VetusteService.ts` | 1 | Calcul vétusté par élément |
| `services/RetentionProposalService.ts` | 1 | Proposition retenues, soumission dépôt |
| `lib/vetusteGrid.ts` | 1 | Grille de vétusté (durées de vie, taux) |
| `app/api/inspection/[inspectionId]/exit/route.ts` | 1 | API création + comparaison |
| `app/api/inspection/[inspectionId]/retentions/route.ts` | 1 | API retenues CRUD |
| `components/inspection/exit/ExitInspectionWizard.tsx` | 2 | Flow principal sortie |
| `components/inspection/exit/ExitRoomInspection.tsx` | 2 | Inspection pièce avec diff |
| `components/inspection/exit/ElementDiffCard.tsx` | 2 | Card comparaison entrée/sortie |
| `components/inspection/exit/PhotoComparison.tsx` | 2 | Photos côte à côte |
| `components/inspection/exit/VetusteIndicator.tsx` | 2 | Indicateur vétusté visuel |
| `components/inspection/exit/RetentionsPanel.tsx` | 2 | Panneau retenues avec calcul |
| `components/inspection/exit/ExitMetersStep.tsx` | 2 | Compteurs avec diff |
| `components/inspection/exit/ExitKeysStep.tsx` | 2 | Clés avec diff |

### Modifiés (8+)

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `prisma/schema.prisma` | 1 | Champs exit sur InspectionElement, RetentionItem model, champs sur Meter/Key/Furniture |
| `app/[locale]/inspection/[inspectionId]/page.tsx` | 3 | Router entrée vs sortie |
| Composant qualification EDL d'entrée | 3 | Ajouter champ installationYear optionnel |
| `components/documents/InspectionDocument.tsx` | 3 | PDF comparatif ou nouveau ExitInspectionDocument |
| `MessageBox.tsx` | 3 | Rendu messages système EDL sortie + retenues |
| `ConversationBox.tsx` | 3 | Preview messages EDL sortie |
| Page bien / conversation | 3 | Bouton "Démarrer EDL de sortie" |
| Intégration DepositService | 3 | Soumettre retenues → state machine dépôt |

---

## VÉRIFICATIONS

### Agent 1
- [ ] Migration Prisma : tous les nouveaux champs et modèles créés
- [ ] ExitInspectionService.createFromEntry : pré-remplit correctement pièces, éléments, compteurs, clés, mobilier
- [ ] ExitInspectionService.createFromEntry : refuse si l'EDL d'entrée n'est pas signé
- [ ] Grille de vétusté : couvre peinture, parquet, carrelage, moquette, robinetterie, sanitaires, électroménager
- [ ] VetusteService : coefficient correct (ex: peinture 5 ans / 9 ans → coeff 0.50)
- [ ] VetusteService : franchise respectée (peinture < 1 an → coeff 1.0)
- [ ] VetusteService : sans année de pose → coeff 1.0 + flag needsInstallationYear
- [ ] RetentionProposalService : ne propose que les éléments non conformes avec changement réel
- [ ] RetentionProposalService : calcul retenue = coût × coefficient vétusté
- [ ] API routes fonctionnelles et sécurisées (auth proprio)

### Agent 2
- [ ] ExitInspectionWizard : pills navigation, progression par pièce
- [ ] ExitRoomInspection : chaque élément affiche l'état d'entrée comme référence
- [ ] ExitRoomInspection : boutons Conforme / Changement fonctionnels
- [ ] ExitRoomInspection : Conforme → marque vert, passe au suivant
- [ ] ExitRoomInspection : Changement → expand avec pills condition + commentaire + photo
- [ ] ExitRoomInspection : champ année de pose si null ET dégradation constatée
- [ ] VetusteIndicator : calcul en temps réel, barre visuelle, texte explicatif
- [ ] PhotoComparison : photos entrée/sortie côte à côte
- [ ] RetentionsPanel : liste dégradations, input coût, calcul auto après vétusté
- [ ] RetentionsPanel : total vs dépôt de garantie, warning si dépasse
- [ ] Compteurs : relevé d'entrée affiché comme référence, champ sortie à remplir
- [ ] Clés : quantité d'entrée affichée, vérification sortie
- [ ] Mobile responsive : tout le flow fonctionne sur téléphone (usage terrain)

### Agent 3
- [ ] Patch EDL entrée : champ installationYear optionnel ajouté
- [ ] Page inspection : route correctement vers entrée ou sortie
- [ ] Bouton "Démarrer EDL de sortie" visible quand EDL d'entrée signé existe
- [ ] PDF comparatif : tableau entrée/sortie par pièce, photos, retenues
- [ ] Messages système : INSPECTION_EXIT_CREATED, SIGNED, RETENTIONS_PROPOSED rendus dans MessageBox
- [ ] DepositService : retenues soumises → transition state machine
- [ ] Document indexé dans panneau Documents messagerie
- [ ] Signatures : même flow que l'entrée (bailleur, puis envoi lien locataire, puis locataire)
- [ ] npm run build → 0 erreurs
