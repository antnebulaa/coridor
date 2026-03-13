# Audit — Régularisation des charges

> Date : 13 mars 2026
> Scope : feature complète de régularisation annuelle des charges locatives

---

## 1. Modèle de données charges / provisions

### LeaseFinancials — provisions sur charges du bail

```prisma
// prisma/schema.prisma L997-1012
model LeaseFinancials {
  id                  String @id @default(uuid())
  rentalApplicationId String

  baseRentCents       Int // Loyer hors charges
  serviceChargesCents Int // Provision sur charges (mensuelle)

  startDate DateTime  @db.Date // Date d'entrée en vigueur
  endDate   DateTime? @db.Date // Date de fin (null = actif)

  createdAt DateTime @default(now())
  rentalApplication RentalApplication @relation(...)
}
```

**Le montant de provision sur charges est un montant mensuel fixe** stocké dans `serviceChargesCents` sur chaque période `LeaseFinancials`. Quand le loyer est révisé, un nouveau `LeaseFinancials` est créé avec une `startDate` et l'ancien reçoit un `endDate`. La régularisation utilise toutes les périodes qui chevauchent l'année demandée pour calculer un prorata journalier.

### RentReceipt — quittances de loyer

```prisma
// prisma/schema.prisma L1014-1036
model RentReceipt {
  id                  String @id @default(uuid())
  rentalApplicationId String

  periodStart DateTime @db.Date
  periodEnd   DateTime @db.Date

  rentAmountCents    Int // Loyer HC payé
  chargesAmountCents Int // Charges payées
  totalAmountCents   Int // Total payé

  isPartialPayment Boolean @default(false)
  pdfUrl String?
  sentAt DateTime?
  createdAt DateTime @default(now())
}
```

La quittance distingue bien loyer HC (`rentAmountCents`) et charges (`chargesAmountCents`). Cependant, **la régularisation ne lit PAS les quittances** — elle s'appuie uniquement sur `LeaseFinancials.serviceChargesCents` pour calculer les provisions perçues (voir section 3).

### RentPaymentTracking — suivi des paiements

```prisma
// prisma/schema.prisma L1751-1782
model RentPaymentTracking {
  id                  String @id @default(uuid())
  rentalApplicationId String
  periodMonth Int
  periodYear  Int
  expectedAmountCents Int
  expectedDate        DateTime @db.Date
  detectedAmountCents Int?
  detectedDate        DateTime?
  status RentPaymentStatus @default(PENDING)
  ...
}
```

Le `RentPaymentTracking` suit les paiements réels détectés (via Powens ou confirmation manuelle). **Ce modèle n'est pas utilisé du tout par la régularisation.** Les provisions sont calculées sur une base théorique (bail), pas sur les paiements réellement détectés.

### Expense — dépenses du propriétaire

```prisma
// prisma/schema.prisma L1098-1122
model Expense {
  id                     String           @id @default(uuid())
  propertyId             String
  rentalUnitId           String?
  category               ExpenseCategory
  label                  String
  amountTotalCents       Int
  dateOccurred           DateTime         @db.Date
  frequency              ExpenseFrequency
  isRecoverable          Boolean
  recoverableRatio       Float            @default(1.0)
  proofUrl               String?
  isFinalized            Boolean          @default(false)
  amountRecoverableCents Int?
  amountDeductibleCents  Int?
  ...
}
```

### ReconciliationHistory + ReconciliationItem — historique

```prisma
// prisma/schema.prisma L1124-1158
model ReconciliationHistory {
  id         String @id @default(uuid())
  propertyId String
  leaseId    String // FK vers RentalApplication

  periodStart DateTime @db.Date
  periodEnd   DateTime @db.Date

  totalRealChargesCents Int
  totalProvisionsCents  Int
  finalBalanceCents     Int

  reportUrl String?
  createdAt DateTime @default(now())

  property Property
  lease    RentalApplication
  items    ReconciliationItem[]
}

model ReconciliationItem {
  reconciliationId String
  expenseId        String
  // table pivot : lie chaque dépense incluse à la régularisation
  @@id([reconciliationId, expenseId])
}
```

---

## 2. Logique de récupérabilité

### Champs sur Expense

| Champ | Type | Description |
|-------|------|-------------|
| `isRecoverable` | `Boolean` | Indique si la charge est récupérable sur le locataire |
| `recoverableRatio` | `Float` (default 1.0) | Ratio du montant total récupérable (ex: 0.75 = 75%) |
| `amountRecoverableCents` | `Int?` | Montant récupérable calculé ou saisi manuellement |

### Comportement à la création d'une dépense

La récupérabilité est **pré-remplie automatiquement par catégorie**, mais le propriétaire peut la modifier manuellement (sauf pour les catégories verrouillées).

**Fichier** : `/Users/adrienlc/Dev/coridor/app/[locale]/properties/[listingId]/expenses/ExpensesClient.tsx` (L51-68)

```typescript
const CATEGORY_META = {
    COLD_WATER:          { recoverable: true, ratio: 1.0 },
    HOT_WATER:           { recoverable: true, ratio: 1.0 },
    ELECTRICITY_COMMON:  { recoverable: true, ratio: 1.0 },
    ELECTRICITY_PRIVATE: { recoverable: false, ratio: 0 },
    HEATING_COLLECTIVE:  { recoverable: true, ratio: 1.0 },
    TAX_PROPERTY:        { recoverable: false, ratio: 0 },      // verrouillé
    METERS:              { recoverable: true, ratio: 1.0 },
    GENERAL_CHARGES:     { recoverable: true, ratio: 1.0 },
    BUILDING_CHARGES:    { recoverable: true, ratio: 1.0 },
    ELEVATOR:            { recoverable: true, ratio: 1.0 },
    PARKING:             { recoverable: false, ratio: 0 },
    INSURANCE:           { recoverable: false, ratio: 0 },      // verrouillé
    INSURANCE_GLI:       { recoverable: false, ratio: 0 },
    MAINTENANCE:         { recoverable: true, ratio: 1.0 },
    CARETAKER:           { recoverable: true, ratio: 1.0 },
    OTHER:               { recoverable: false, ratio: 0 },
};
```

**Quand le propriétaire sélectionne une catégorie**, `handleCategoryChange` (L578-592) applique automatiquement le flag `isRecoverable` et le ratio par défaut :

```typescript
const handleCategoryChange = (value: string) => {
    const cat = CATEGORY_META[value];
    if (cat) {
        setIsRecoverable(cat.recoverable);
        if (cat.recoverable) setRecoverableAmount(amount || '0');
        else setRecoverableAmount('0');
    }
};
```

**Verrouillage** (L867-869) : Pour les catégories non récupérables (`INSURANCE`, `TAX_PROPERTY`, `ELECTRICITY_PRIVATE`, etc.), le bouton "Récupérable" est verrouillé (`locked = catMeta && !catMeta.recoverable`). Le propriétaire ne peut PAS forcer une taxe foncière en récupérable.

**Avertissement** (L571-576) : Pour `INSURANCE` et `ELECTRICITY_PRIVATE`, un warning orange s'affiche si l'utilisateur tente de les marquer récupérables.

**Montant récupérable** : Quand `ratio === 1.0`, le montant récupérable est auto-rempli avec le montant total. Le propriétaire peut ajuster manuellement le montant récupérable (champ visible quand `isRecoverable === true`).

### Côté API

**Fichier** : `/Users/adrienlc/Dev/coridor/app/api/properties/[propertyId]/expenses/route.ts` (L57-80)

L'API POST accepte `isRecoverable`, `recoverableRatio`, et `amountRecoverableCents` directement du client. **Il n'y a aucune validation serveur** de la cohérence entre catégorie et récupérabilité — la logique de verrouillage est uniquement côté client (UI).

---

## 3. Calcul de régularisation

### Service principal

**Fichier** : `/Users/adrienlc/Dev/coridor/services/RegularizationService.ts`

#### Méthode `generateStatement` (L22-48)

```typescript
static async generateStatement(applicationId, propertyId, year) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    // 1. Provisions perçues (ce que le locataire a versé via ses charges mensuelles)
    const { total: totalProvisions } = await this.calculateProvisions(applicationId, startOfYear, endOfYear);

    // 2. Charges récupérables réelles (dépenses du propriétaire)
    const { total: totalRecoverable } = await this.calculateRecoverable(propertyId, startOfYear, endOfYear);

    // 3. Solde = Réel - Provisions
    //    Positif = locataire doit de l'argent
    //    Négatif = propriétaire doit rembourser
    const balance = totalRecoverable - totalProvisions;

    return { year, totalProvisionsReceivedCents, totalRecoverableExpensesCents, balanceCents, expenses, provisionsBreakdown };
}
```

#### Calcul des provisions perçues — `calculateProvisions` (L53-116)

Source des données : **`LeaseFinancials.serviceChargesCents`** (montant mensuel de provision sur charges du bail).

Algorithme :
1. Récupère tous les `LeaseFinancials` dont la période chevauche l'année
2. Pour chaque période, calcule l'intersection en jours avec l'année
3. Convertit la provision mensuelle en provision journalière : `(serviceChargesCents * 12) / 365`
4. Multiplie par le nombre de jours d'intersection

```typescript
const yearlyCharge = record.serviceChargesCents * 12;
const dailyCharge = yearlyCharge / 365;
const totalForPeriod = Math.round(dailyCharge * durationDays);
```

**Les provisions NE proviennent PAS des `RentReceipt` ni des `RentPaymentTracking`**. C'est un calcul purement théorique basé sur le montant de provisions inscrit au bail. Si le locataire n'a pas payé certains mois, le calcul ne le sait pas.

#### Calcul des charges récupérables réelles — `calculateRecoverable` (L132-152)

Source des données : **table `Expense`** filtrée sur le `propertyId`.

```typescript
const expenses = await prisma.expense.findMany({
    where: {
        propertyId: propertyId,
        isRecoverable: true,
        dateOccurred: { gte: periodStart, lte: periodEnd }
    }
});

const total = expenses.reduce((acc, exp) => {
    const amount = exp.amountRecoverableCents ?? Math.round(exp.amountTotalCents * (exp.recoverableRatio || 1.0));
    return acc + amount;
}, 0);
```

Pour chaque dépense :
- Priorité au champ `amountRecoverableCents` s'il est renseigné
- Sinon, calcul via `amountTotalCents * recoverableRatio`

**Pas de filtre sur `isFinalized`** : les dépenses déjà régularisées (verrouillées) sont aussi incluses. Cela signifie qu'une deuxième régularisation pour la même année et le même bien inclura les mêmes dépenses (double comptage potentiel).

### Server action orchestratrice

**Fichier** : `/Users/adrienlc/Dev/coridor/app/actions/regularization.ts`

- `getEligibleLeases(propertyId?)` (L11-55) : Récupère les baux signés (`leaseStatus: 'SIGNED'`) du propriétaire. Si `propertyId` est fourni, filtre par bien. Sinon, charge tous les baux de l'utilisateur.
- `previewRegularization(applicationId, propertyId, year)` (L60-68) : Appelle `RegularizationService.generateStatement` sans rien persister.
- `commitRegularization(...)` (L73-121) : Persiste la régularisation (voir section 4).
- `sendRegularizationMessage(leaseId, documentUrl, year)` (L126-209) : Envoie le PDF au locataire via la messagerie.

---

## 4. Bouton "Terminé" et verrouillage

### Ce qui se passe au clic sur "Valider et Clôturer"

**Fichier** : `/Users/adrienlc/Dev/coridor/app/[locale]/properties/components/RegularizationModal.tsx` (L117-143)

Au step `PREVIEW`, le clic sur le bouton principal appelle `commitRegularization` :

```typescript
await commitRegularization(
    selectedLeaseId,
    commitPropertyId,
    selectedYear,
    previewData.balanceCents,
    previewData.totalRecoverableExpensesCents,
    previewData.totalProvisionsReceivedCents,
    previewData.expenses.map((e: any) => e.id)
);
```

### Actions de `commitRegularization` (`app/actions/regularization.ts` L73-121)

#### 1. Création du `ReconciliationHistory`

```typescript
const reconciliation = await prisma.reconciliationHistory.create({
    data: {
        propertyId,
        leaseId: applicationId,
        periodStart: startOfYear,
        periodEnd: endOfYear,
        totalRealChargesCents,
        totalProvisionsCents,
        finalBalanceCents
    }
});
```

#### 2. Création des `ReconciliationItem` (table pivot)

```typescript
await prisma.reconciliationItem.createMany({
    data: expenseIds.map(expId => ({
        reconciliationId: reconciliation.id,
        expenseId: expId
    }))
});
```

#### 3. Verrouillage des dépenses

```typescript
await prisma.expense.updateMany({
    where: { id: { in: expenseIds } },
    data: { isFinalized: true }
});
```

Le flag `isFinalized = true` empêche toute modification ultérieure. Le guard est dans le PATCH API (`app/api/expenses/[expenseId]/route.ts` L74-79) :

```typescript
if (expense.isFinalized) {
    return NextResponse.json(
        { error: 'Cette dépense est verrouillée (régularisée)' },
        { status: 403 }
    );
}
```

**Note** : Le DELETE API (`app/api/expenses/[expenseId]/route.ts`) ne vérifie PAS `isFinalized`. Une dépense verrouillée peut être supprimée.

#### 4. Envoi automatique du PDF au locataire

Après `commitRegularization`, le modal passe au step `COMPLETION`. Un `useEffect` (L330-387) s'exécute automatiquement :

1. Génère le PDF client-side via `@react-pdf/renderer`
2. Upload sur Cloudinary (unsigned preset `airbnb-clone`)
3. Appelle `sendRegularizationMessage` qui :
   - Trouve la conversation entre propriétaire et locataire liée à l'annonce
   - Crée la conversation si elle n'existe pas
   - Envoie un message avec lien de téléchargement du PDF
   - Met à jour `lastMessageAt` sur la conversation

**Pas de notification push ni d'email.** Seul un message in-app est envoyé. Le locataire doit ouvrir sa messagerie pour voir le décompte.

**Pas de `reportUrl` stocké.** Le champ `ReconciliationHistory.reportUrl` existe dans le schema mais n'est jamais rempli par le code. L'URL du PDF uploadé sur Cloudinary est envoyée dans le message mais pas enregistrée dans la BDD.

---

## 5. Flow complet — tous les fichiers impliqués

### Points d'entrée (3 endroits ouvrent la RegularizationModal)

| Composant | Fichier | Méthode d'ouverture |
|-----------|---------|---------------------|
| `PropertyStandardCard` | `app/[locale]/properties/components/PropertyStandardCard.tsx` (L163) | Bouton "Régulariser" dans le menu actions de la carte bien |
| `PropertyColocationCard` | `app/[locale]/properties/components/PropertyColocationCard.tsx` (L215) | Idem pour les colocations |
| `PriceSection` | `app/[locale]/properties/[listingId]/edit/components/PriceSection.tsx` (L442) | Bouton dans la section prix de l'édition du bien |
| `FinancesClient` | `app/[locale]/finances/FinancesClient.tsx` (L216) | Via `QuickLinks.onRegularizationClick` (page finances) |

### Composants et fichiers

| Fichier | Rôle |
|---------|------|
| **`app/[locale]/properties/components/RegularizationModal.tsx`** | Modal principal : 3 étapes (SELECT / PREVIEW / COMPLETION). Sélection bail+année, aperçu, validation, PDF, envoi. |
| **`services/RegularizationService.ts`** | Service de calcul : prorata provisions journalier, somme dépenses récupérables. |
| **`app/actions/regularization.ts`** | Server actions : `getEligibleLeases`, `previewRegularization`, `commitRegularization`, `sendRegularizationMessage`. |
| **`components/documents/RegularizationDocument.tsx`** | Template PDF (`@react-pdf/renderer`) : header Coridor, infos logement/locataire/période, tableau récapitulatif (charges réelles vs provisions), détail des dépenses, solde coloré, mentions légales. |
| **`components/finances/QuickLinks.tsx`** | Lien rapide "Régularisations de charges" sur la page finances (prop `onRegularizationClick`). |
| **`app/[locale]/properties/[listingId]/expenses/ExpensesClient.tsx`** | Gestion des dépenses : CATEGORY_META avec defaults récupérabilité, formulaire d'ajout/édition, verrouillage UI catégories. |
| **`app/api/properties/[propertyId]/expenses/route.ts`** | API POST (création dépense) + GET (liste). |
| **`app/api/expenses/[expenseId]/route.ts`** | API PATCH (modification avec guard `isFinalized`) + DELETE (sans guard). |
| **`prisma/schema.prisma`** | Models : `Expense`, `LeaseFinancials`, `RentReceipt`, `RentPaymentTracking`, `ReconciliationHistory`, `ReconciliationItem`, `ExpenseCategory`, `ExpenseFrequency`. |
| **`messages/fr.json`** (L1473-1519) | Traductions i18n du modal de régularisation. |

### Flow utilisateur pas-à-pas

1. Le propriétaire clique sur "Régulariser" (depuis PropertyCard, PriceSection ou QuickLinks finances)
2. **Step SELECT** : sélection du bail (dropdown des baux signés) + année (dropdown 2023-2026)
3. Clic "Calculer" → appel `previewRegularization` → `RegularizationService.generateStatement`
4. **Step PREVIEW** : affichage du bilan (charges réelles vs provisions vs solde), liste des dépenses incluses avec swipe pour exclure manuellement. Bannière info "En validant, ces dépenses seront verrouillées."
5. Clic "Valider et Clôturer" → appel `commitRegularization` :
   - Crée `ReconciliationHistory`
   - Crée `ReconciliationItem` pour chaque dépense
   - Set `isFinalized = true` sur les dépenses
6. **Step COMPLETION** : page de confirmation avec animation. Auto-envoi en background :
   - Génération PDF client-side
   - Upload Cloudinary
   - Envoi via messagerie (`sendRegularizationMessage`)
   - Affichage statut (envoi en cours / envoyé / erreur)
   - Bouton "Télécharger le PDF" (via `PDFDownloadLink`)

---

## 6. Faiblesses et recommandations

### CRITIQUE

| # | Problème | Impact | Fichier | Recommandation |
|---|----------|--------|---------|----------------|
| C1 | **Double comptage possible** : `calculateRecoverable` ne filtre PAS sur `isFinalized`. Si le propriétaire régularise deux fois la même année pour le même bien, les mêmes dépenses seront comptées deux fois. | Calcul faux | `RegularizationService.ts` L132-143 | Ajouter `isFinalized: false` au filtre, ou vérifier s'il existe déjà une `ReconciliationHistory` pour cette combinaison (propertyId, leaseId, year) et avertir/bloquer. |
| C2 | **Suppression de dépenses verrouillées** : L'API DELETE ne vérifie pas `isFinalized`. Une dépense rattachée à une régularisation peut être supprimée, cassant l'intégrité de l'historique. | Intégrité données | `app/api/expenses/[expenseId]/route.ts` L10-47 | Ajouter `if (expense.isFinalized) return 403` dans la route DELETE. |
| C3 | **Provisions théoriques, pas réelles** : Les provisions sont calculées sur le montant du bail (`serviceChargesCents`), pas sur les paiements effectivement reçus. Si le locataire n'a pas payé 3 mois, les provisions sont quand même comptées, faussant le solde. | Calcul potentiellement faux | `RegularizationService.ts` L53-116 | Enrichir le calcul avec les données de `RentPaymentTracking` ou `RentReceipt` pour ne compter que les provisions réellement perçues. Au minimum, afficher un avertissement si des impayés existent sur la période. |

### HAUTE

| # | Problème | Impact | Fichier | Recommandation |
|---|----------|--------|---------|----------------|
| H1 | **Pas de notification push ni email** : Le locataire est notifié uniquement par un message in-app. Il peut ne pas le voir pendant des jours. | UX locataire | `app/actions/regularization.ts` L126-209 | Ajouter une notification in-app (model `Notification`) + push + email avec le PDF en pièce jointe. |
| H2 | **`reportUrl` jamais rempli** : Le champ `ReconciliationHistory.reportUrl` n'est jamais peuplé. L'URL Cloudinary du PDF est dans le message mais pas rattachée à l'historique. | Traçabilité | `app/actions/regularization.ts` L89-99 | Après l'upload Cloudinary, mettre à jour `reconciliation.reportUrl`. Nécessite de restructurer le flow (upload avant commit, ou update après). |
| H3 | **Pas de validation ownership côté server action** : `previewRegularization` contient un commentaire "Ensure ownership logic here if needed (omitted for brevity)" mais ne vérifie pas. Un utilisateur authentifié pourrait prévisualiser la régularisation de n'importe quel bail. | Sécurité | `app/actions/regularization.ts` L60-68 | Vérifier que le `applicationId` appartient à un bien dont l'utilisateur est propriétaire. |
| H4 | **Validation API côté serveur absente** : L'API de création de dépenses ne valide pas la cohérence catégorie/récupérabilité. Le verrouillage (taxe foncière non récupérable, etc.) est uniquement côté client. Un appel API direct pourrait marquer une taxe foncière comme récupérable. | Intégrité données | `app/api/properties/[propertyId]/expenses/route.ts` L57-80 | Ajouter un guard serveur avec la même logique que `CATEGORY_META`. |
| H5 | **Années hardcodées** : Le sélecteur d'année dans le modal est fixé à `[2023, 2024, 2025, 2026]`. En 2027, il faudra modifier le code. | Maintenance | `RegularizationModal.tsx` L202 | Générer dynamiquement les années depuis la date de début du premier bail jusqu'à l'année en cours. |

### MOYENNE

| # | Problème | Impact | Fichier | Recommandation |
|---|----------|--------|---------|----------------|
| M1 | **Prorata 365 jours** : Le calcul de provision journalière utilise toujours 365 jours, sans tenir compte des années bissextiles. | Précision mineure | `RegularizationService.ts` L99 | Utiliser le nombre réel de jours de l'année. |
| M2 | **Pas de gestion des baux à cheval** : Si un bail commence en juin, la régularisation pour l'année entière calcule des provisions depuis janvier (car `periodStart = 1er janvier`). Le filtre `LeaseFinancials` est correct (intersection), mais si le bail commence en juin, seuls 6 mois de provisions seront comptés. Or les dépenses couvrent toute l'année pour le bien. | Logique métier | `RegularizationService.ts` | Pour les baux en cours d'année, proratiser aussi les charges récupérables, ou au minimum avertir l'utilisateur. |
| M3 | **Exclusion de dépenses côté client uniquement** : Le swipe-to-delete dans le preview recalcule le solde côté client, mais au moment du commit, `previewData.expenses` est la source de vérité. Si le state est corrompu, des dépenses incorrectes pourraient être incluses. | Fiabilité | `RegularizationModal.tsx` L258-270 | Recalculer côté serveur au moment du commit avec la liste filtrée d'IDs. |
| M4 | **Pas d'historique consultable** : `ReconciliationHistory` est créé en BDD mais il n'existe aucune page pour consulter l'historique des régularisations passées. Le propriétaire n'a aucun moyen de revoir les régularisations précédentes (sauf le message dans la conversation). | UX | — | Créer une page/section "Historique des régularisations" avec lien vers le PDF. |
| M5 | **`messagesIds: { push: conversation.id }`** : Dans `sendRegularizationMessage` (L204), le code push le `conversation.id` dans `messagesIds` au lieu du `message.id`. Ce champ semble être un vestige inutilisé, mais l'opération est incorrecte. | Bug silencieux | `app/actions/regularization.ts` L204 | Corriger ou supprimer ce champ si inutilisé. |
| M6 | **Régularisation par bien, pas par unité locative** : Les dépenses sont filtrées par `propertyId`, pas par `rentalUnitId`. En colocation avec plusieurs baux par bien, toutes les dépenses du bien sont comptées pour chaque bail, ce qui double/triple le montant récupérable. | Calcul faux en coloc | `RegularizationService.ts` L133-143 | Filtrer aussi par `rentalUnitId` quand applicable, ou diviser le total par le nombre d'unités louées. |

### BASSE

| # | Problème | Impact | Fichier | Recommandation |
|---|----------|--------|---------|----------------|
| B1 | **Upload Cloudinary non signé** : Le PDF est uploadé avec un preset non signé (`airbnb-clone`). Les documents financiers contenant des infos personnelles (nom, adresse, montants) devraient utiliser un upload signé côté serveur. | Sécurité | `RegularizationModal.tsx` L349-372 | Migrer vers un upload signé côté serveur (API route dédiée). |
| B2 | **Types `any` partout** : `previewData`, `expenses`, `leases` sont tous typés `any`. | Maintenabilité | `RegularizationModal.tsx` | Créer des interfaces typées pour `RegularizationStatement`, `EligibleLease`, etc. |
| B3 | **Le PDF ne mentionne pas le détail des provisions** : Le PDF montre le total des provisions perçues mais pas le breakdown par période (ex: 200€/mois de jan à juin, puis 220€/mois de juil à déc). | Transparence | `RegularizationDocument.tsx` | Ajouter une section "Détail des provisions" avec le prorata par période. |
