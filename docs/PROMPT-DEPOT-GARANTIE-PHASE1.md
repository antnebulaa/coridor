# Dépôt de Garantie Séquestré — Phase 1 : MVP Confiance

## Document de référence

Lire obligatoirement avant de coder :
- `docs/depot-garantie-sequestre.pdf` — Dossier fonctionnalité complet (contexte, vision, flow, résolution, technique, roadmap, synergies)

## Contexte

Le dépôt de garantie est le contentieux n°1 en location en France (~65% des actions en justice). La Phase 1 ne fait pas de vrai séquestre (pas de Stripe Connect). Elle crée un **système de transparence totale** qui rend le conflit quasi-impossible grâce à la documentation automatique et un flow de résolution structuré.

**Coût infra Phase 1 : 0€.** Le dépôt reste versé classiquement au propriétaire. Coridor track, documente, et facilite la résolution.

## Ce qui existe DÉJÀ (implémenté lors de l'EDL sortie)

Avant de coder quoi que ce soit, **auditer le code existant** car les éléments suivants ont été créés pendant l'implémentation de l'EDL de sortie :

### Schema Prisma (déjà dans schema.prisma)
- `VetusteGrid` + `VetusteGridEntry` (avec `franchiseYears`)
- `DepositDeduction` (inspectionId, elementId, description, repairCostCents, vetustePct, tenantShareCents, photoUrl, entryPhotoUrl)
- `DepositResolution` (inspectionId, applicationId, depositAmountCents, totalDeductionsCents, refundAmountCents, status, timer 14j)
- `DepositResolutionStatus` enum : PENDING, PROPOSED, AGREED, PARTIAL_AGREED, DISPUTED, RESOLVED
- `Listing.securityDeposit: Int?` — montant du dépôt

### Lib & Services (déjà créés)
- `lib/vetuste.ts` — DEFAULT_VETUSTE_GRID (12 types), calculateVetuste (avec franchise), calculateTenantShare
- `services/PassportService.ts` — onCleanExit() : boost score si sortie propre

### API Routes (déjà créées)
- `app/api/inspection/[inspectionId]/deductions/route.ts` — CRUD retenues
- `app/api/inspection/[inspectionId]/deposit-resolution/route.ts` — GET/POST/PATCH résolution

### Pages (déjà créées)
- `app/[locale]/inspection/[inspectionId]/deductions/page.tsx` — Récap retenues (côté proprio)
- `app/[locale]/inspection/[inspectionId]/deposit-response/page.tsx` — Réponse locataire (JWT) : accord / partiel / contestation
- `app/[locale]/properties/[listingId]/vetuste/page.tsx` — Éditeur grille vétusté

### Cron (déjà créé)
- `app/api/cron/deposit-resolution/route.ts` — Cron quotidien (2h) : auto-résolution après 14 jours

### Hook (déjà créé)
- `hooks/useDepositDeductions.ts` — CRUD optimiste retenues avec calcul vétusté

⚠️ **IMPORTANT** : NE PAS recréer ces éléments. Les lire, les comprendre, et construire PAR-DESSUS.

---

## Ce qu'il faut construire — Phase 1 MVP Confiance

### Vue d'ensemble

La Phase 1 ajoute 6 briques manquantes pour transformer le mécanisme EDL sortie + retenues en un **vrai système de gestion du dépôt de garantie** :

1. **SecurityDeposit** — Modèle dédié pour tracker le dépôt de bout en bout
2. **Timeline du dépôt** — Vue chronologique visible par les deux parties
3. **Détection du versement** — Via Powens (déjà intégré)
4. **Rappels légaux automatiques** — Si délai de restitution dépassé
5. **Dossier CDC** — PDF complet prêt à soumettre en cas de litige
6. **Badge Passeport Propriétaire** — « Dépôt restitué dans les délais »

---

## Sprint 1 — Modèle SecurityDeposit + Service

### 1a. Nouveau modèle Prisma

Fichier : `prisma/schema.prisma`

```prisma
enum DepositStatus {
  AWAITING_PAYMENT    // Bail signé, en attente du versement
  PAID                // Versement détecté (Powens) ou confirmé manuellement
  HELD                // Pendant le bail — le proprio détient les fonds
  EXIT_INSPECTION     // EDL de sortie en cours
  RETENTIONS_PROPOSED // Retenues proposées, en attente réponse locataire
  PARTIALLY_RELEASED  // Accord partiel — partie non-contestée restituée
  FULLY_RELEASED      // Restitution complète effectuée
  DISPUTED            // Litige en cours (CDC / conciliateur / tribunal)
  RESOLVED            // Clos définitivement
}

model SecurityDeposit {
  id                    String        @id @default(uuid())
  applicationId         String        @unique
  
  // Montants
  amountCents           Int           // Montant du dépôt (copié depuis Listing.securityDeposit)
  
  // Statut
  status                DepositStatus @default(AWAITING_PAYMENT)
  
  // Dates clés (timeline)
  leaseSignedAt         DateTime?     // Date signature bail
  paidAt                DateTime?     // Date versement détecté
  exitInspectionAt      DateTime?     // Date EDL sortie signé
  retentionsProposedAt  DateTime?     // Date envoi proposition retenues
  tenantRespondedAt     DateTime?     // Date réponse locataire
  releasedAt            DateTime?     // Date restitution (totale ou partielle)
  resolvedAt            DateTime?     // Date clôture définitive
  
  // Restitution
  refundedAmountCents   Int?          // Montant effectivement restitué
  retainedAmountCents   Int?          // Montant retenu par le proprio
  
  // Détection Powens
  powensTransactionId   String?       // ID transaction Powens (versement initial)
  powensRefundId        String?       // ID transaction Powens (restitution)
  paymentConfirmedBy    String?       // "powens" | "manual_landlord" | "manual_tenant"
  refundConfirmedBy     String?       // "powens" | "manual_landlord" | "manual_tenant"
  
  // Délai légal
  legalDeadline         DateTime?     // Date limite de restitution (1 ou 2 mois après remise des clés)
  legalDeadlineMonths   Int?          // 1 (EDL conforme) ou 2 (EDL non conforme)
  isOverdue             Boolean       @default(false)
  
  // Pénalité légale (art. 22 al. 2 loi 89-462 : 10% du loyer mensuel par mois de retard commencé)
  monthlyRentCents      Int?          // Copié depuis LeaseFinancials.rentAmount pour le calcul
  penaltyAmountCents    Int           @default(0) // Calculé par le cron quotidien
  overdueMonths         Int           @default(0) // Nombre de mois de retard (arrondi supérieur)
  
  // Mise en demeure
  formalNoticeSentAt    DateTime?     // Date d'envoi marquée par le locataire
  formalNoticeUrl       String?       // URL du PDF mise en demeure (Cloudinary)
  
  // Lien CDC
  cdcDossierGeneratedAt DateTime?     // Date génération dossier CDC
  cdcDossierUrl         String?       // URL du PDF dossier CDC (Cloudinary)
  
  // Export timeline
  timelineExportUrl     String?       // URL du PDF timeline (Cloudinary)
  
  // Relations
  application           RentalApplication @relation(fields: [applicationId], references: [id])
  events                DepositEvent[]
  
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
}

model DepositEvent {
  id              String           @id @default(uuid())
  depositId       String
  
  type            DepositEventType
  description     String           // Description lisible (FR)
  metadata        Json?            // Données contextuelles (montants, IDs, etc.)
  
  // Qui a déclenché l'événement
  actorType       String           // "system" | "landlord" | "tenant" | "powens" | "cron"
  actorId         String?          // userId si applicable
  
  deposit         SecurityDeposit  @relation(fields: [depositId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime         @default(now())
  
  @@index([depositId])
}

enum DepositEventType {
  LEASE_SIGNED            // Bail signé → dépôt dû
  PAYMENT_DETECTED        // Powens a détecté le virement
  PAYMENT_CONFIRMED       // Confirmation manuelle
  ENTRY_INSPECTION_DONE   // EDL d'entrée signé
  EXIT_INSPECTION_STARTED // EDL de sortie commencé
  EXIT_INSPECTION_SIGNED  // EDL de sortie signé
  RETENTIONS_PROPOSED     // Proprio a envoyé la proposition
  TENANT_AGREED           // Locataire accepte tout
  TENANT_PARTIAL_AGREED   // Accord partiel
  TENANT_DISPUTED         // Contestation
  PARTIAL_RELEASE         // Restitution partielle effectuée
  FULL_RELEASE            // Restitution totale effectuée
  DEADLINE_WARNING        // Rappel : 7 jours avant deadline
  DEADLINE_OVERDUE        // Délai légal dépassé
  PENALTY_UPDATED         // Pénalité recalculée (chaque mois de retard commencé)
  FORMAL_NOTICE_GENERATED // Mise en demeure PDF générée
  FORMAL_NOTICE_SENT      // Mise en demeure marquée comme envoyée par le locataire
  CDC_DOSSIER_GENERATED   // Dossier CDC généré
  TIMELINE_EXPORTED       // Timeline exportée en PDF
  RESOLVED                // Clôture
}
```

Ajouter la relation inverse sur `RentalApplication` :
```prisma
model RentalApplication {
  // ... existant ...
  securityDeposit   SecurityDeposit?
}
```

### 1b. Service DepositService

Nouveau fichier : `services/DepositService.ts`

```typescript
class DepositService {
  
  // === CRÉATION ===
  
  /**
   * Appelé automatiquement après signature du bail (webhook YouSign).
   * Crée le SecurityDeposit + premier événement LEASE_SIGNED.
   * Le montant est copié depuis Listing.securityDeposit.
   */
  static async initializeDeposit(applicationId: string): Promise<SecurityDeposit>
  
  // === TRANSITIONS DE STATUT ===
  
  /**
   * Transition machine d'état. Chaque transition :
   * 1. Valide que la transition est autorisée
   * 2. Met à jour le statut + la date correspondante
   * 3. Crée un DepositEvent
   * 4. Déclenche les effets de bord (notifications, rappels, etc.)
   *
   * Transitions autorisées :
   * AWAITING_PAYMENT → PAID (payment detected/confirmed)
   * PAID → HELD (automatique, immédiat)
   * HELD → EXIT_INSPECTION (EDL sortie commencé)
   * EXIT_INSPECTION → RETENTIONS_PROPOSED (retenues envoyées)
   * RETENTIONS_PROPOSED → FULLY_RELEASED (accord total, aucune retenue)
   * RETENTIONS_PROPOSED → PARTIALLY_RELEASED (accord partiel)
   * RETENTIONS_PROPOSED → DISPUTED (contestation)
   * PARTIALLY_RELEASED → FULLY_RELEASED (reste restitué)
   * PARTIALLY_RELEASED → DISPUTED (contestation sur le reste)
   * DISPUTED → RESOLVED (accord trouvé ou décision CDC)
   * FULLY_RELEASED → RESOLVED (clôture)
   */
  static async transition(
    depositId: string, 
    event: DepositEventType, 
    metadata?: Record<string, any>
  ): Promise<SecurityDeposit>
  
  // === POWENS ===
  
  /**
   * Appelé par le cron Powens existant.
   * Cherche dans les transactions récentes un virement correspondant
   * au montant du dépôt (+/- 5€ de tolérance) vers le compte du proprio.
   * Match sur : montant ≈ deposit.amountCents, date > leaseSignedAt,
   * libellé contient "depot" ou "garantie" (optionnel).
   */
  static async detectPayment(applicationId: string): Promise<boolean>
  
  /**
   * Idem pour la restitution (virement du proprio vers le locataire).
   */
  static async detectRefund(applicationId: string): Promise<boolean>
  
  // === DEADLINE ===
  
  /**
   * Calcule la date limite légale de restitution.
   * Art. 22 loi 89-462 :
   * - 1 mois si EDL sortie conforme (aucune dégradation)
   * - 2 mois si EDL sortie avec réserves
   * La date de référence est la remise des clés (keysReturnDate sur RentalApplication)
   * ou à défaut la date de signature de l'EDL de sortie.
   */
  static async calculateLegalDeadline(depositId: string): Promise<Date>
  
  /**
   * Vérifie si le délai est dépassé. Met à jour isOverdue.
   * Calcule la pénalité de 10% du loyer mensuel par mois de retard commencé.
   * (art. 22 al. 2 loi 89-462)
   * 
   * Formule pénalité :
   *   overdueMonths = Math.ceil(diffInDays(now, legalDeadline) / 30)
   *   penaltyAmountCents = overdueMonths × Math.round(monthlyRentCents × 0.10)
   * 
   * Met à jour : isOverdue, overdueMonths, penaltyAmountCents
   * Crée un événement PENALTY_UPDATED à chaque changement de mois de retard.
   * 
   * Appelé par le cron quotidien.
   */
  static async checkOverdue(depositId: string): Promise<boolean>
  
  /**
   * Rappel proactif J-7 avant échéance.
   * Cherche les SecurityDeposit où :
   *   - legalDeadline est entre now() et now()+7 jours
   *   - status NOT IN (FULLY_RELEASED, RESOLVED)
   *   - aucun événement DEADLINE_WARNING n'existe déjà
   * 
   * Pour chacun :
   *   - Crée événement DEADLINE_WARNING
   *   - Notifie le proprio : "Il vous reste 7 jours pour restituer le dépôt de {locataire}. Échéance : {date}"
   *   - Notifie le locataire : "Le délai de restitution de votre dépôt expire dans 7 jours ({date})"
   * 
   * Appelé par le cron quotidien (avant checkOverdue).
   */
  static async sendPreDeadlineReminders(): Promise<void>
  
  // === TIMELINE ===
  
  /**
   * Retourne tous les événements du dépôt, ordonnés chronologiquement.
   */
  static async getTimeline(depositId: string): Promise<DepositEvent[]>
  
  /**
   * Retourne le SecurityDeposit complet avec :
   * - events (timeline)
   * - application (bail) + listing (bien)
   * - DepositResolution si existe (retenues)
   * - Inspection EXIT si existe (EDL sortie)
   */
  static async getFullDeposit(applicationId: string): Promise<SecurityDepositFull>
  
  // === BADGE PASSEPORT PROPRIO ===
  
  /**
   * Appelé quand status passe à FULLY_RELEASED ou RESOLVED.
   * Si restitution faite AVANT legalDeadline :
   * → Met à jour le compteur depositsReturnedOnTime sur User.
   * Badge affiché : "Dépôt restitué dans les délais — X/Y restitutions"
   */
  static async updateLandlordBadge(depositId: string): Promise<void>
  
  // === MISE EN DEMEURE ===
  
  /**
   * Marquer la mise en demeure comme envoyée (action locataire).
   * Le locataire clique "J'ai envoyé la mise en demeure" + saisit la date d'envoi.
   * Met à jour formalNoticeSentAt, crée événement FORMAL_NOTICE_SENT.
   * La date d'envoi est une preuve pour le dossier CDC.
   */
  static async markFormalNoticeSent(depositId: string, sentDate: Date): Promise<void>
  
  // === EXPORT TIMELINE PDF ===
  
  /**
   * Génère un PDF de la timeline complète du dépôt.
   * Contenu : chronologie de tous les événements avec dates, acteurs, montants.
   * Utile pour archivage (proprio : comptabilité, locataire : dossier perso).
   * Aussi inclus automatiquement dans le dossier CDC.
   */
  static async exportTimelinePDF(depositId: string): Promise<string> // retourne URL Cloudinary
}
```

### 1c. Points d'intégration — Événements déclencheurs

Le SecurityDeposit est alimenté automatiquement par les événements existants. Ajouter ces hooks (ne pas modifier la logique existante, juste appeler DepositService en plus) :

| Événement existant | Fichier | Hook à ajouter |
|---|---|---|
| Bail signé (webhook YouSign) | `app/api/webhooks/yousign/route.ts` | `DepositService.initializeDeposit(applicationId)` |
| Cron Powens | Service Powens existant | `DepositService.detectPayment(applicationId)` pour chaque bail actif avec deposit AWAITING_PAYMENT |
| EDL sortie signé | Route signature EDL existante | `DepositService.transition(depositId, 'EXIT_INSPECTION_SIGNED')` |
| Retenues proposées | `app/api/inspection/[inspectionId]/deposit-resolution/route.ts` POST | `DepositService.transition(depositId, 'RETENTIONS_PROPOSED')` |
| Locataire répond | `app/api/inspection/[inspectionId]/deposit-resolution/route.ts` PATCH | `DepositService.transition(depositId, event)` selon la réponse |
| Cron deposit-resolution (14j) | `app/api/cron/deposit-resolution/route.ts` | `DepositService.transition(depositId, 'RESOLVED')` si auto-résolu |

---

## Sprint 2 — API Routes + Timeline UI

### 2a. API Routes

Nouveau fichier : `app/api/deposit/[applicationId]/route.ts`

```
GET  /api/deposit/[applicationId]
  → SecurityDeposit complet + events + DepositResolution
  → Accessible par landlord ET tenant (vérifier ownership)

PATCH /api/deposit/[applicationId]
  → Confirmation manuelle du paiement ou de la restitution
  → body: { action: "confirm_payment" | "confirm_refund" }
  → Appelle DepositService.transition()
```

Nouveau fichier : `app/api/deposit/[applicationId]/timeline/route.ts`

```
GET /api/deposit/[applicationId]/timeline
  → Liste des DepositEvent ordonnés chronologiquement
  → Accessible par landlord ET tenant
```

### 2b. Hook useSecurityDeposit

Nouveau fichier : `hooks/useSecurityDeposit.ts`

```typescript
function useSecurityDeposit(applicationId: string) {
  return {
    deposit: SecurityDepositFull | null,
    timeline: DepositEvent[],
    isLoading: boolean,
    error: Error | null,
    
    // Actions
    confirmPayment: () => Promise<void>,
    confirmRefund: () => Promise<void>,
    exportTimeline: () => Promise<string>,  // retourne URL du PDF
    
    // Helpers calculés
    isOverdue: boolean,
    daysUntilDeadline: number | null,
    daysOverdue: number | null,            // jours de retard si overdue
    penaltyAmount: number | null,          // pénalité en euros (penaltyAmountCents / 100)
    currentStep: DepositStatus,
    progress: number, // 0-100 pourcentage complétion du flow
  }
}
```

### 2c. Composant DepositTimeline

Nouveau fichier : `components/deposit/DepositTimeline.tsx`

Timeline verticale montrant l'historique complet du dépôt :

```
┌─────────────────────────────────────────┐
│  Dépôt de garantie — 800,00€            │
│  12 rue de la Roquette                  │
│                                          │
│  ● 1 mars    Bail signé                 │
│  │            Dépôt de 800€ dû          │
│  │                                       │
│  ● 3 mars    Versement détecté          │
│  │            Via Powens — virement SEPA │
│  │                                       │
│  ● 3 mars    Fonds détenus              │
│  │            Par le propriétaire        │
│  │                                       │
│  ○ ...        EDL d'entrée signé        │
│  │                                       │
│  ◉ Maintenant  En cours de bail         │
│                                          │
│  ┈ ┈ ┈  Prochaines étapes  ┈ ┈ ┈       │
│                                          │
│  ○ À venir   EDL de sortie             │
│  ○ À venir   Restitution               │
│              Délai légal : 1-2 mois     │
└─────────────────────────────────────────┘
```

Design :
- Événements passés : cercle plein ● + texte normal
- Étape actuelle : cercle accentué ◉ + texte bold
- Étapes futures : cercle vide ○ + texte grisé
- Événements problématiques (overdue, dispute) : rouge
- Événements positifs (accord, restitution) : vert
- Le locataire et le proprio voient la MÊME timeline (transparence = confiance)
- Thème light, couleur accent #E8A838

### 2d. Page dépôt

Nouveau fichier : `app/[locale]/deposit/[applicationId]/page.tsx`

Accessible depuis la conversation, le dashboard, et la page du bien.

Contenu :
1. **Header** : montant, statut (badge coloré), bien concerné
2. **Timeline** : composant DepositTimeline
3. **Bloc action** (conditionnel selon statut) :
   - `AWAITING_PAYMENT` : "En attente du versement. Déjà payé ? Confirmez ici." + bouton
   - `RETENTIONS_PROPOSED` (locataire) : lien vers deposit-response existante
   - `isOverdue` : bandeau rouge "Délai légal dépassé de X jours — Pénalité en cours : {penaltyAmount}€"
4. **Section retenues** (si applicable) : résumé depuis DepositResolution existant
5. **Boutons** : "Générer mise en demeure" (si overdue) / "Générer dossier CDC" (si DISPUTED) / "Exporter la timeline" (toujours visible)

---

## Sprint 3 — Rappels automatiques + Pénalité + Mise en demeure PDF

### 3a. Cron quotidien enrichi

Modifier ou étendre le cron deposit-resolution existant.

L'ordre d'exécution dans le cron est important :

```typescript
// 1. Rappels J-7 (avant que le délai ne soit dépassé)
await DepositService.sendPreDeadlineReminders();

// 2. Détection overdue + calcul pénalité
// Pour chaque SecurityDeposit avec legalDeadline < now() et !isOverdue :
//   → isOverdue = true, DepositEvent DEADLINE_OVERDUE
// Pour chaque SecurityDeposit déjà isOverdue :
//   → Recalculer penaltyAmountCents si le mois de retard a changé
//   → overdueMonths = Math.ceil(diffInDays(now, legalDeadline) / 30)
//   → penaltyAmountCents = overdueMonths × Math.round(monthlyRentCents × 0.10)
//   → Si overdueMonths a changé → DepositEvent PENALTY_UPDATED
//     avec metadata: { overdueMonths, penaltyAmountCents, monthlyRentCents }
await DepositService.checkAllOverdue();
```

Pour chaque SecurityDeposit avec legalDeadline définie :

1. **J-7 avant deadline** (sendPreDeadlineReminders) :
   - DepositEvent `DEADLINE_WARNING` (une seule fois, vérifier absence d'événement existant)
   - Notification proprio : "Rappel : vous avez 7 jours pour restituer le dépôt de [locataire] ([montant]€)."
   - Notification locataire : "Le délai de restitution expire dans 7 jours."

2. **Jour J** (checkAllOverdue) :
   - `isOverdue = true`
   - DepositEvent `DEADLINE_OVERDUE`
   - Notification proprio : "⚠️ Délai dépassé. Risque : pénalité de 10% du loyer par mois de retard (art. 22 loi 89-462)."
   - Notification locataire : "Délai dépassé. Vous pouvez générer une mise en demeure."

3. **Chaque nouveau mois de retard** (checkAllOverdue) :
   - DepositEvent `PENALTY_UPDATED` avec montant cumulé
   - Notification proprio : "⚠️ Pénalité en cours : {penaltyAmount}€ ({overdueMonths} mois de retard)"
   - Notification locataire : "Pénalité de retard cumulée : {penaltyAmount}€"

4. **J+15** : second rappel proprio + suggestion mise en demeure au locataire

### 3b. Mise en demeure PDF

Nouveau fichier : `lib/documents/FormalNoticeDocument.tsx` (via @react-pdf/renderer)

Contenu du PDF :
- Titre : "MISE EN DEMEURE — Lettre recommandée avec accusé de réception"
- Expéditeur : locataire (nom, adresse)
- Destinataire : propriétaire (nom, adresse)
- Objet : "Restitution du dépôt de garantie"
- Corps structuré :
  - Rappel des faits (bail, montant, EDL sortie, date)
  - Référence légale (art. 22 loi 89-462)
  - Délai écoulé : "{overdueMonths} mois de retard"
  - **Pénalité encourue chiffrée** : "Soit une pénalité de {penaltyAmount}€ ({overdueMonths} × 10% de {monthlyRent}€)"
  - Mise en demeure de restituer sous 8 jours
  - Menace CDC / tribunal si non-restitution
- Date + lieu + signature locataire
- Pièces jointes référencées : EDL entrée, EDL sortie, bail

API route : `POST /api/deposit/[applicationId]/formal-notice`
- Génère le PDF → upload Cloudinary
- Crée DepositEvent `FORMAL_NOTICE_GENERATED`
- Retourne l'URL

### 3c. Marquer la mise en demeure comme envoyée

Sur la page dépôt (locataire), après avoir téléchargé la mise en demeure :

Afficher un bouton "J'ai envoyé la mise en demeure" → modale avec :
- Date picker "Date d'envoi" (défaut : aujourd'hui)
- Checkbox "Envoyé en recommandé avec AR" (informatif)
- Bouton "Confirmer"

API : `PATCH /api/deposit/[applicationId]/formal-notice`
- body: `{ sentDate: "2025-06-15", sentViaAR: true }`
- Appelle `DepositService.markFormalNoticeSent(depositId, sentDate)`
- Crée DepositEvent `FORMAL_NOTICE_SENT` avec metadata `{ sentDate, sentViaAR }`
- Met à jour `formalNoticeSentAt` sur SecurityDeposit

**Pourquoi c'est important** : le juge/CDC veut voir que la mise en demeure a été envoyée AVANT la saisine. Cette date est incluse automatiquement dans le dossier CDC.

### 3d. Export Timeline PDF

Nouveau fichier : `lib/documents/DepositTimelineDocument.tsx` (via @react-pdf/renderer)

PDF sobre et chronologique :
- En-tête : "Historique du dépôt de garantie — [Adresse bien]"
- Parties : proprio et locataire (noms, adresses)
- Montant du dépôt
- Tableau chronologique :
  | Date | Événement | Acteur | Détails |
  |------|-----------|--------|---------|
  | 1 mars 2025 | Bail signé | Système | Dépôt de 800€ dû |
  | 3 mars 2025 | Virement détecté | Powens | Transaction #TX123 |
  | ... | ... | ... | ... |
- Si pénalité en cours : section "Pénalité de retard" avec calcul détaillé
- Pied de page : "Document généré par Coridor le [date]"

API route : `POST /api/deposit/[applicationId]/export-timeline`
- Génère le PDF → upload Cloudinary
- Crée DepositEvent `TIMELINE_EXPORTED`
- Retourne l'URL

Bouton "Exporter la timeline" visible en permanence sur la page dépôt (proprio ET locataire).

---

## Sprint 4 — Dossier CDC

### 4a. CDCDossierService

Nouveau fichier : `services/CDCDossierService.ts`

Le dossier CDC est LE produit différenciant de Coridor en cas de litige. Il abaisse massivement la barrière d'accès à la justice.

Le PDF contient (dans cet ordre) :

1. **Page de garde** — "Dossier de saisine — Commission Départementale de Conciliation", parties, bien, objet
2. **Chronologie des faits** — Générée depuis DepositEvent[], chaque événement daté
3. **État des lieux d'entrée** — PDF EDL entrée (signé, horodaté)
4. **État des lieux de sortie** — PDF EDL sortie avec diff comparatif
5. **Comparaison automatique** — Pièce par pièce, photos côte à côte, évolutions, vétusté
6. **Détail des retenues** — Tableau poste par poste (brut, vétusté, charge locataire), justificatifs
7. **Historique des échanges** — Messages conversation Coridor, horodatés
8. **Arguments des parties** — Position proprio (retenues + justification) + position locataire (motif contestation)
9. **Formulaire CDC pré-rempli** — Cerfa pré-rempli, le locataire n'a qu'à signer et envoyer
10. **Bail** — Copie du bail signé

Style : sobre et professionnel (Helvetica, noir/gris, numérotation pages, en-tête par page).

### 4b. API Route

`POST /api/deposit/[applicationId]/cdc-dossier`
- Vérifie statut = DISPUTED
- Génère via CDCDossierService → upload Cloudinary
- Met à jour SecurityDeposit (cdcDossierGeneratedAt, cdcDossierUrl)
- DepositEvent `CDC_DOSSIER_GENERATED`
- Retourne URL

### 4c. UI sur la page dépôt

Quand statut = DISPUTED, afficher un bloc :
- Texte explicatif : "Vous pouvez saisir la CDC. Coridor génère votre dossier complet."
- Bouton "Générer mon dossier CDC"
- Liste de ce que contient le dossier (checkmarks)

---

## Sprint 5 — Intégration écosystème

### 5a. Conversation

Nouveau type de message système : `DEPOSIT_EVENT`

Messages automatiques dans la conversation proprio ↔ locataire :

| Événement | Message |
|---|---|
| LEASE_SIGNED | "📋 Bail signé ! Dépôt de [montant]€ dû." + CTA "Voir le suivi" |
| PAYMENT_DETECTED | "✅ Versement du dépôt détecté." |
| EXIT_INSPECTION_SIGNED | "📸 EDL de sortie signé." |
| RETENTIONS_PROPOSED | "📩 Retenues proposées ([montant]€). [Consulter et répondre]" |
| TENANT_AGREED | "✅ Accord trouvé !" |
| TENANT_PARTIAL_AGREED | "⚖️ Accord partiel. [X]€ restitués, [Y]€ en discussion." |
| TENANT_DISPUTED | "⚠️ Contestation. 14 jours pour trouver un accord." |
| DEADLINE_OVERDUE | "🔴 Délai légal dépassé. [Voir les options]" |
| PENALTY_UPDATED | "🔴 Pénalité de retard : {penaltyAmount}€ ({overdueMonths} mois)" |
| FORMAL_NOTICE_SENT | "📬 Mise en demeure envoyée le {sentDate}" |
| FULL_RELEASE | "🎉 Dépôt restitué intégralement !" |

### 5b. Dashboard

Cartes alertes (même pattern existant) :

- **Proprio** : "Restitution dépôt : [locataire] — [X] jours restants" / "⚠️ Dépôt en retard"
- **Locataire** : "Proposition de retenues reçue" / "Dépôt en retard — Vous pouvez agir"

### 5c. Page bien

Sous-section "Dépôt de garantie" dans la section Location :
- Mini-timeline (3 derniers événements)
- Statut + montant
- Lien page complète

### 5d. Badge Passeport Propriétaire (préparatoire)

Ajouter dans `services/PassportService.ts` :

```typescript
static async updateLandlordDepositBadge(userId: string, deposit: SecurityDeposit): Promise<void>
```

Ajouter sur User (ou nouveau modèle LandlordProfile) :
```prisma
  depositsTotal          Int @default(0)
  depositsReturnedOnTime Int @default(0)
```

---

## Vérification

1. `npx prisma db push` — schema valide
2. `npm run build` — 0 erreurs TypeScript
3. Signer un bail → SecurityDeposit créé (AWAITING_PAYMENT)
4. Confirmer paiement → status HELD, DepositEvent créé
5. EDL de sortie → status EXIT_INSPECTION
6. Proposer retenues → notification locataire dans conversation
7. Locataire accepte → FULLY_RELEASED, badge proprio mis à jour
8. Locataire conteste → DISPUTED, bouton CDC visible
9. Générer dossier CDC → PDF complet avec toutes les pièces
10. Timeline identique pour locataire et proprio
11. Simuler deadline J-7 → notification rappel envoyée aux deux parties
12. Simuler deadline dépassée → isOverdue, penaltyAmountCents calculé correctement
13. Simuler 2 mois de retard → penaltyAmountCents = 2 × 10% × monthlyRentCents, événement PENALTY_UPDATED
14. Mise en demeure PDF → pénalité chiffrée dans le texte, dates et montants justes
15. "Marquer comme envoyée" → formalNoticeSentAt + événement FORMAL_NOTICE_SENT dans timeline
16. Export timeline PDF → chronologie complète avec tous les événements
17. Dossier CDC inclut : date d'envoi mise en demeure + pénalité calculée + timeline
18. Dashboard : alertes visibles quand action requise
19. Conversation : messages système à chaque transition

## Règles absolues

1. **NE PAS recréer** ce qui existe déjà (DepositDeduction, DepositResolution, vetuste, pages retenues, cron 14j, etc.)
2. Le **SecurityDeposit** est le PARENT qui orchestre — DepositResolution et DepositDeduction restent liés à l'Inspection (EDL sortie), SecurityDeposit les référence via applicationId
3. Coridor **NE TRANCHE PAS** — il facilite, documente, et abaisse la barrière d'accès à la justice
4. La timeline est **identique** pour locataire et proprio (transparence totale = principe fondateur)
5. Chaque transition crée un **DepositEvent** (audit trail complet)
6. Les notifications passent par le **système existant** (push + conversation)
7. Les PDFs utilisent **@react-pdf/renderer** (même stack que bail et EDL)
8. Les montants sont toujours en **centimes (Int)** — pas de floating point
9. Le badge proprio est **préparatoire** — le Passeport Propriétaire complet viendra après
10. Phase 1 = **0€ d'infra supplémentaire**. Pas de Stripe Connect, pas de séquestre réel. Le dépôt reste chez le proprio, Coridor track et documente tout.
