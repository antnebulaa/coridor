# Refonte Régularisation des Charges — UX pédagogique + Fixes critiques

## Contexte

La régularisation des charges est une feature clé de Coridor mais elle souffre de deux problèmes majeurs :

1. **UX incompréhensible** — deux dropdowns froids, du jargon comptable, un message de verrouillage caché sous 37 dépenses, aucune explication de ce qu'est une régularisation ni de ce que le proprio doit faire
2. **Bugs critiques dans la logique** — double comptage possible, dépenses verrouillées supprimables, colocation qui multiplie les charges par le nombre de colocataires

Ce prompt couvre le redesign complet du flow ET les corrections des bugs. Le prototype de référence est le widget interactif validé avec Adrien (welcome → guide optionnel → sélection → bilan → dépenses → envoi).

**Philosophie :** Coridor éduque et guide. Un propriétaire qui n'a jamais fait de régularisation de charges doit comprendre le concept, savoir pourquoi il le fait, et être guidé à chaque étape.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Fixes critiques backend (sécurité + intégrité données)

**Mission :** Corriger les 5 bugs identifiés dans l'audit. Aucun changement UI — uniquement la logique serveur.

### Agent 2 — Redesign du flow complet (UI + UX)

**Mission :** Refondre la `RegularizationModal` avec le nouveau flow en 6 étapes. S'inspirer strictement du prototype validé.

### Agent 3 — Intégration, PDF, notifications

**Mission :** Corriger le stockage du PDF (reportUrl), ajouter la notification push/email, créer la page d'historique des régularisations.

---

## AGENT 1 — FIXES CRITIQUES BACKEND

### Fix C1 — Double comptage

**Fichier :** `services/RegularizationService.ts`

**Problème :** `calculateRecoverable` ne filtre pas sur `isFinalized`. Si le proprio régularise deux fois la même année, les mêmes dépenses sont comptées deux fois.

**Solution :** Bloquer la création d'une deuxième régularisation pour la même combinaison (propertyId, leaseId, year). Ajouter un check dans `commitRegularization` :

```typescript
// Dans app/actions/regularization.ts — commitRegularization

// AVANT de créer la ReconciliationHistory, vérifier qu'il n'en existe pas déjà
const existing = await prisma.reconciliationHistory.findFirst({
  where: {
    propertyId,
    leaseId: applicationId,
    periodStart: { gte: new Date(year, 0, 1) },
    periodEnd: { lte: new Date(year, 11, 31) },
  },
});

if (existing) {
  throw new Error('Une régularisation existe déjà pour ce bail et cette année. Annulez-la d\'abord pour en créer une nouvelle.');
}
```

**En plus :** ajouter `isFinalized: false` dans le filtre de `calculateRecoverable` pour exclure les dépenses déjà régularisées :

```typescript
// Dans RegularizationService.ts — calculateRecoverable
where: {
  propertyId,
  isRecoverable: true,
  isFinalized: false, // ← AJOUTER
  dateOccurred: {
    gte: periodStart,
    lte: periodEnd,
  },
}
```

**Ajouter une action "Annuler et refaire" :** Nouvelle server action `cancelRegularization(reconciliationId)` qui :
1. Vérifie que le proprio est bien le owner
2. Supprime les `ReconciliationItem` liés
3. Remet `isFinalized = false` sur les dépenses liées
4. Supprime la `ReconciliationHistory`

### Fix C2 — Delete sans guard

**Fichier :** `app/api/expenses/[expenseId]/route.ts`

**Problème :** L'API DELETE ne vérifie pas `isFinalized`. Une dépense verrouillée (régularisée) peut être supprimée.

**Solution :** Ajouter le même guard que le PATCH :

```typescript
// Dans la route DELETE, AVANT la suppression
if (expense.isFinalized) {
  return NextResponse.json(
    { error: 'Cette dépense est verrouillée (régularisée) et ne peut pas être supprimée.' },
    { status: 403 }
  );
}
```

### Fix C3 — Colocation (division 1/N)

**Fichier :** `services/RegularizationService.ts`

**Problème :** Les dépenses sont filtrées par `propertyId` sans tenir compte du nombre de baux actifs. En colocation avec 3 baux, chaque régularisation compte 100% des charges au lieu de 1/3.

**Solution :** Quand le bien a plusieurs baux actifs sur la même période, diviser le total des charges récupérables par le nombre de baux :

```typescript
// Dans RegularizationService.ts — generateStatement

// Compter le nombre de baux actifs sur le bien pour la même période
const activeLeasesCount = await prisma.rentalApplication.count({
  where: {
    listing: {
      rentalUnit: { propertyId },
    },
    leaseStatus: 'SIGNED',
    // Bail actif pendant la période de régularisation
    leaseFinancials: {
      some: {
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
    },
  },
});

// Diviser les charges récupérables par le nombre de baux
const shareRatio = activeLeasesCount > 1 ? 1 / activeLeasesCount : 1;

// Appliquer le ratio sur le total des charges récupérables
const totalRecoverable = rawTotalRecoverable * shareRatio;

// Stocker le ratio dans le résultat pour l'affichage
statement.shareRatio = shareRatio;
statement.totalLeases = activeLeasesCount;
```

**Affichage côté UI (Agent 2) :** Si colocation, afficher "Charges du bien : 1 000 € · 3 colocataires · Part de Michelle : 333 €".

### Fix H3 — Validation ownership serveur

**Fichier :** `app/actions/regularization.ts`

**Problème :** `previewRegularization` ne vérifie pas que le bail appartient à un bien du proprio.

**Solution :**

```typescript
// Dans previewRegularization et commitRegularization
const userId = await getCurrentUserId();

const application = await prisma.rentalApplication.findFirst({
  where: {
    id: applicationId,
    listing: {
      rentalUnit: {
        property: { ownerId: userId },
      },
    },
  },
});

if (!application) {
  throw new Error('Bail non trouvé ou accès non autorisé.');
}
```

### Fix H4 — Validation récupérabilité serveur

**Fichier :** `app/api/properties/[propertyId]/expenses/route.ts`

**Problème :** Le verrouillage de la récupérabilité par catégorie (taxe foncière = non récupérable) est uniquement côté client.

**Solution :** Dupliquer la logique `CATEGORY_META` côté serveur :

```typescript
// lib/expenses/categoryRules.ts — NOUVEAU

export const FORCED_RECOVERABILITY: Record<string, boolean | null> = {
  TAX_PROPERTY: false,        // Taxe foncière jamais récupérable
  INSURANCE: false,           // Assurance PNO jamais récupérable
  INSURANCE_GLI: false,       // GLI jamais récupérable
  MANAGEMENT_FEES: false,     // Frais de gestion jamais récupérables
  MORTGAGE_INTEREST: false,   // Intérêts emprunt jamais récupérables
  // Les autres catégories : null = le proprio choisit
};

export function enforceRecoverability(category: string, isRecoverable: boolean): boolean {
  const forced = FORCED_RECOVERABILITY[category];
  if (forced !== null && forced !== undefined) return forced;
  return isRecoverable;
}
```

Appeler `enforceRecoverability` dans les routes POST et PATCH des dépenses.

### Fix H5 — Années dynamiques

**Problème :** Les années sont hardcodées `[2023, 2024, 2025, 2026]`.

**Solution :** Générer dynamiquement depuis la date du premier bail jusqu'à l'année en cours :

```typescript
// Dans getEligibleLeases ou dans le composant
const firstLeaseYear = Math.min(...leases.map(l => new Date(l.startDate).getFullYear()));
const currentYear = new Date().getFullYear();
const years = Array.from(
  { length: currentYear - firstLeaseYear + 1 },
  (_, i) => firstLeaseYear + i
);
```

### Fix M1 — Année bissextile

**Fichier :** `RegularizationService.ts`

**Problème :** Le calcul utilise toujours 365 jours.

**Solution :** 

```typescript
const daysInYear = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
```

### Fix M5 — messagesIds push incorrect

**Fichier :** `app/actions/regularization.ts`

**Problème :** `messagesIds: { push: conversation.id }` au lieu de `message.id`.

**Solution :** Corriger ou supprimer si le champ est inutilisé. Vérifier d'abord si `messagesIds` est réellement utilisé quelque part dans le code. Si non, supprimer la ligne.

### Vérifications Agent 1

- [ ] Double régularisation bloquée pour même bail + même année
- [ ] Action "Annuler et refaire" fonctionnelle (déverrouille les dépenses)
- [ ] `isFinalized: false` dans le filtre de `calculateRecoverable`
- [ ] Route DELETE vérifie `isFinalized`
- [ ] Colocation : charges divisées par le nombre de baux actifs
- [ ] Ownership vérifié dans `previewRegularization` et `commitRegularization`
- [ ] Récupérabilité forcée côté serveur (taxe foncière, assurance, etc.)
- [ ] Années dynamiques (pas hardcodées)
- [ ] Année bissextile gérée
- [ ] Fix messagesIds
- [ ] `npm run build` → 0 erreurs

---

## AGENT 2 — REDESIGN DU FLOW

### Architecture du nouveau flow

Le `RegularizationModal` actuel a 3 étapes (SELECT / PREVIEW / COMPLETION). Le nouveau flow en a 6 :

```
WELCOME → GUIDE (optionnel) → SELECT → BALANCE → EXPENSES → SEND → DONE
```

### Étape WELCOME — Page d'accueil

Le premier écran que le proprio voit. Deux chemins :

```
┌──────────────────────────────────────┐
│                              [✕]     │
│                                      │
│                                      │
│  Régularisation                      │
│  des charges                         │
│                                      │
│  Comparez les charges réelles avec   │
│  les provisions de votre locataire.  │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 📖  Première fois ?          │   │
│  │     Suivez le guide, on vous │   │
│  │     explique tout en 30 sec. │ → │
│  └──────────────────────────────┘   │
│                                      │
│                                      │
│  [ Commencer la régularisation ]     │
│                                      │
└──────────────────────────────────────┘
```

- Titre en 30px, gras, haut de page
- Description courte en 14-15px gris
- Card "Première fois ?" avec icône livre, cliquable → ouvre le GUIDE
- Bouton principal noir → passe directement à SELECT

### Étape GUIDE — Slides pédagogiques (optionnel)

5 slides avec barre de progression segmentée (style Airbnb — segments remplis, pas des dots).

**Slide 1 — Le concept**
- Eyebrow : "Guide rapide"
- Titre : "La régularisation des charges"  
- Body : "À la signature du bail, vous avez fixé une estimation des charges mensuelles : ce sont les provisions sur charges. À la fin de l'année, vous devez comparer cette estimation avec le coût réel de ces charges."
- Visuel : deux blocks côte à côte "1057€ Réel" vs "952€ Estimé" avec "vs" entre les deux

**Slide 2 — Les deux résultats**
- Eyebrow : "Les résultats"
- Titre : "Deux issues possibles"
- Deux cards empilées :
  - Card rouge clair : icône flèche haut + "Charges > Provisions → Votre locataire vous doit un complément"
  - Card verte clair : icône flèche bas + "Charges < Provisions → Vous lui remboursez le trop-perçu"

**Slide 3 — Quand**
- Eyebrow : "Le timing"
- Titre : "Une fois par an, en début d'année"
- Body : "Vous régularisez l'année écoulée quand vous avez reçu toutes les factures. Exemple : régularisez 2025 en début 2026."
- Visuel : "2025" en gros + 12 mini carrés pour les mois

**Slide 4 — Pré-requis**
- Eyebrow : "Pré-requis"
- Titre : "Vos dépenses doivent être à jour"
- Body : "Tout au long de l'année, enregistrez chaque dépense de charges dans Coridor : eau, électricité, ménage, entretien…"
- Lien : "Aller dans Dépenses & Charges →" (ouvre la page dans un nouvel onglet ou ferme la modale avec navigation)
- Visuel : mini checklist avec items cochés/non cochés

**Slide 5 — Go**
- Titre : "Coridor s'occupe du reste"
- Body : "On compare automatiquement vos charges réelles avec les provisions, et on génère un décompte à envoyer à votre locataire."
- Bouton : "C'est parti !" → passe à SELECT

**Navigation slides :**
- Bouton "Suivant" (principal) + "Retour" (texte discret)
- Barre de progression en haut (5 segments)
- Pas de bouton "Passer" SAUF sur la slide 1 (discret, en haut à droite)

### Étape SELECT — Sélection locataire + année

```
┌──────────────────────────────────────┐
│  Quel locataire ?                    │
│  Sélectionnez le bail et l'année.    │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ (MS) Michelle San            │   │  ← Card sélectionnée (border noir)
│  │      Appt Lumineux · Levall. │   │
│  │      Depuis Mars 2023        │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ (CR) Colocation Rivoli       │   │  ← Card non sélectionnée
│  │      T4 Rivoli · Paris 1er   │   │
│  └──────────────────────────────┘   │
│                                      │
│  ANNÉE                               │
│  [2023] [2024] [2025]               │  ← Pills, 2025 pré-sélectionné
│                                      │
│  ┌──────────────────────────────┐   │
│  │ ℹ️ Provisions mensuelles     │   │
│  │    79,34 €/mois              │   │
│  └──────────────────────────────┘   │
│                                      │
│  Retour        [ Calculer ]          │
└──────────────────────────────────────┘
```

- Baux en cards cliquables avec avatar initiales (cercle noir si sélectionné, gris si non)
- Années en pills horizontales (noir = sélectionné)
- **Années dynamiques** (cf. fix H5)
- Info card discrète rappelant les provisions mensuelles du bail sélectionné
- Si une régularisation existe déjà pour ce bail + année → afficher "Déjà régularisé" avec lien vers l'historique et option "Annuler et refaire"

### Étape BALANCE — Le bilan

```
┌──────────────────────────────────────┐
│  Le bilan                            │
│  Michelle San · 2025                 │
│                                      │
│  ┌──── CARD DARK ────────────────┐  │
│  │  COMPLÉMENT DÛ PAR LE LOCAT.  │  │
│  │        104,94 €               │  │  ← 44px, blanc sur noir
│  │  Michelle vous doit ce montant │  │
│  └───────────────────────────────┘  │
│                                      │
│  ┌─────────┬─────────┐             │
│  │ Charges │Provisions│             │
│  │ réelles │          │             │
│  │ 1 057 € │  952 €   │             │
│  │ Payé    │ Versé par│             │
│  │ par vous│ Michelle │             │
│  └─────────┴─────────┘             │
│                                      │
│  Dépenses récupérables  12 incluses  │
│  Période          1 jan — 31 déc 25  │
│  Provision mensuelle    79,34 €/mois │
│                                      │
│  ⚠️ Si colocation : afficher ici    │
│  "Charges du bien : 1 000 €          │
│   3 colocataires · Part 1/3"         │
│                                      │
│  Retour    [ Vérifier les dépenses ] │
└──────────────────────────────────────┘
```

- Le résultat principal dans une **card dark** (fond noir/très foncé, texte blanc). C'est LE chiffre important.
- Si le locataire doit payer : "Complément dû par le locataire" + montant
- Si trop-perçu : "Trop-perçu à rembourser" + montant (en vert)
- Les deux montants côte à côte : charges réelles / provisions (card blanche avec bordure, divisée en deux)
- **Colocation :** si `shareRatio < 1`, afficher une ligne supplémentaire : "Charges du bien : X € · N colocataires · Part de [Prénom] : Y €"
- **Impayés :** si des `RentPaymentTracking` avec status `OVERDUE` existent pour ce bail sur la période, afficher un avertissement ambre : "Michelle a X mois d'impayés sur 2025. Les provisions affichées sont celles prévues au bail."

### Étape EXPENSES — Vérification des dépenses

```
┌──────────────────────────────────────┐
│  Les dépenses                        │
│  Décochez pour exclure du calcul.    │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 💡 Il manque des dépenses ?  │   │
│  │    Ajoutez-les dans Dépenses │   │
│  │    & Charges.                │   │
│  └──────────────────────────────┘   │
│                                      │
│  ☑ 💧 Eau Froide 01/2025   26,50 € │
│  ☑ ⚡ Élec. Communs 01/25  15,15 € │
│  ☑ 🧹 Ménage Hall 01/25   30,00 € │
│  ☐ 🔧 Entretien chaud.   120,00 € │ ← décoché
│  ...                                 │
│  ──────────────────────────────────  │
│  10/12 dépenses        937,05 €      │
│  Solde                 -15,06 €      │ ← mis à jour en temps réel
│                                      │
│  Retour              [ Continuer ]   │
└──────────────────────────────────────┘
```

- **Uniquement les dépenses récupérables.** Ne PAS afficher les dépenses non récupérables (plus de "Non récupérable" partout). Elles ne sont pas pertinentes ici.
- Chaque ligne : checkbox ronde + emoji catégorie + label + date + montant
- Décocher = exclure du calcul. L'item passe en opacité réduite avec texte barré.
- **Le solde et le total se recalculent en temps réel** à chaque coche/décoche. Calcul côté client.
- Encart bleu "Il manque des dépenses ?" avec lien vers Dépenses & Charges
- Le résumé sticky en bas : nombre de dépenses incluses, total, nouveau solde

### Étape SEND — Récapitulatif + envoi

```
┌──────────────────────────────────────┐
│  Récapitulatif                       │
│  Vérifiez avant d'envoyer.          │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ Locataire    Michelle San    │   │
│  │ Bien         Appt Lumineux   │   │
│  │ Année        2025            │   │
│  │ ─────────────────────────    │   │
│  │ Charges réelles  1 057,05 €  │   │
│  │ Provisions         952,11 €  │   │
│  │ ─────────────────────────    │   │
│  │ Solde          +104,94 €     │   │
│  └──────────────────────────────┘   │
│                                      │
│  ⚠️ Les dépenses seront             │
│  verrouillées. Un décompte PDF sera  │
│  envoyé à Michelle.                  │
│                                      │
│  Retour      [ Envoyer à Michelle ]  │
└──────────────────────────────────────┘
```

- Récap propre dans une card avec bordure
- **L'avertissement de verrouillage est VISIBLE**, avant le bouton, pas perdu en bas de page
- Le bouton dit "Envoyer à [Prénom]" — pas "Terminé" ni "Valider"
- Au clic : spinner dans le bouton → commit + génération PDF + envoi

### Étape DONE — Confirmation

```
┌──────────────────────────────────────┐
│                                      │
│           ✅ (cercle vert)           │
│                                      │
│       Décompte envoyé                │
│                                      │
│  Michelle a reçu le décompte dans    │
│  la messagerie. Le PDF est dans      │
│  les documents.                      │
│                                      │
│  [ Télécharger le PDF ]              │
│  Voir la conversation                │
│                                      │
└──────────────────────────────────────┘
```

### Design system

- **Mobile-first** — le flow est une modale plein écran sur mobile (comme Airbnb)
- **Typographie :** titres en 26px font-weight 500 (pas 800), body en 14-15px
- **Boutons :** fond noir plein, 16px font-weight 500, border-radius 14px, padding 16px
- **Bouton retour :** texte discret à gauche du bouton principal, pas un vrai bouton
- **Cards :** border 0.5px, border-radius 12px, pas de shadow
- **Card dark (bilan) :** fond noir, texte blanc, border-radius 20px
- **Barre de progression slides :** segments horizontaux (pas des dots), remplis progressivement
- **Couleurs :** utiliser les couleurs fonctionnelles du design system Coridor (pas de couleurs hardcodées)
- **Espacement :** généreux — chaque écran doit respirer. Padding 24px horizontal.

### Fichiers à produire/modifier

| Fichier | Action |
|---------|--------|
| `RegularizationModal.tsx` | **Refonte complète** — nouveau flow 6 étapes |
| `components/regularization/WelcomeStep.tsx` | **Nouveau** |
| `components/regularization/GuideSlides.tsx` | **Nouveau** |
| `components/regularization/SelectStep.tsx` | **Nouveau** |
| `components/regularization/BalanceStep.tsx` | **Nouveau** |
| `components/regularization/ExpenseReviewStep.tsx` | **Nouveau** |
| `components/regularization/SendStep.tsx` | **Nouveau** |
| `components/regularization/DoneStep.tsx` | **Nouveau** |

### Vérifications Agent 2

- [ ] Welcome : deux chemins (guide ou direct)
- [ ] Guide : 5 slides avec barre de progression segmentée
- [ ] Guide : bouton "Passer" discret sur la slide 1
- [ ] Select : baux en cards cliquables, années en pills dynamiques
- [ ] Select : si déjà régularisé, afficher "Déjà régularisé" + option "Annuler et refaire"
- [ ] Balance : résultat dans une card dark, montant en 44px blanc
- [ ] Balance : colocation → afficher "Part de [Prénom] : 1/N"
- [ ] Balance : impayés → avertissement ambre
- [ ] Expenses : uniquement les dépenses récupérables (pas de "Non récupérable")
- [ ] Expenses : checkbox toggle en temps réel, solde recalculé côté client
- [ ] Expenses : encart "Il manque des dépenses ?" avec lien
- [ ] Send : avertissement verrouillage VISIBLE avant le bouton
- [ ] Send : bouton "Envoyer à [Prénom]" (pas "Terminé")
- [ ] Done : confirmation avec téléchargement PDF + lien conversation
- [ ] Mobile-first, espacement généreux, design premium
- [ ] Dark mode supporté
- [ ] `npm run build` → 0 erreurs

---

## AGENT 3 — INTÉGRATION, PDF, NOTIFICATIONS

### Fix H2 — Stocker reportUrl

**Problème :** Le champ `ReconciliationHistory.reportUrl` n'est jamais rempli. L'URL du PDF est dans le message mais pas dans l'historique.

**Solution :** Restructurer le flow pour stocker l'URL :

1. Après `commitRegularization`, générer le PDF côté client
2. Uploader sur Cloudinary
3. Mettre à jour `ReconciliationHistory.reportUrl` via une nouvelle server action :

```typescript
// Nouvelle server action
export async function updateReportUrl(reconciliationId: string, reportUrl: string) {
  // Vérifier ownership
  await prisma.reconciliationHistory.update({
    where: { id: reconciliationId },
    data: { reportUrl },
  });
}
```

### Fix H1 — Notification push + email

**Problème :** Le locataire est notifié uniquement par un message in-app.

**Solution :** Après l'envoi du message dans la conversation, ajouter :

```typescript
// Dans sendRegularizationMessage, APRÈS la création du message

// 1. Notification push (via PushService existant)
await PushService.notifyMessage({
  recipientId: tenantUserId,
  senderName: landlordName,
  preview: `Décompte de régularisation des charges ${year}`,
  conversationId: conversation.id,
});

// 2. Email avec PDF en pièce jointe (via Resend)
await resend.emails.send({
  from: 'Coridor <noreply@coridor.fr>',
  to: tenantEmail,
  subject: `Régularisation des charges ${year} — ${propertyTitle}`,
  html: `
    <p>Bonjour ${tenantFirstName},</p>
    <p>${landlordName} vous a envoyé le décompte de régularisation des charges pour l'année ${year}.</p>
    <p><strong>Solde : ${formattedBalance}</strong></p>
    <p>Retrouvez le détail complet dans votre messagerie Coridor.</p>
  `,
  attachments: [{
    filename: `regularisation-charges-${year}.pdf`,
    content: pdfBuffer, // Buffer du PDF généré
  }],
});
```

### Page historique des régularisations

**Problème (M4) :** Le proprio n'a aucun moyen de consulter les régularisations passées.

**Solution :** Ajouter une section dans la page Dépenses & Charges ou dans /finances :

```typescript
// Composant RegularizationHistory.tsx
// Affiche la liste des régularisations passées avec :
// - Locataire + Bien + Année
// - Solde (positif/négatif)
// - Date de création
// - Lien "Télécharger le PDF" (si reportUrl existe)
// - Lien "Annuler" (si on veut refaire)
```

Accessible depuis :
- La page /finances via les QuickLinks existants
- L'étape SELECT quand une régularisation existe déjà

### Fix B1 — Upload PDF signé

**Problème :** Le PDF est uploadé avec un preset non signé (`airbnb-clone`). Documents financiers avec infos personnelles.

**Solution :** Migrer vers un upload signé côté serveur. Créer une API route :

```typescript
// app/api/documents/upload-pdf/route.ts
// Reçoit le PDF en Buffer, uploade sur Cloudinary avec upload signé
// Retourne l'URL sécurisée
```

Le composant client génère le PDF via `@react-pdf/renderer`, l'envoie au serveur, le serveur uploade sur Cloudinary avec un signed upload.

### Vérifications Agent 3

- [ ] `reportUrl` rempli dans `ReconciliationHistory` après upload
- [ ] Notification push envoyée au locataire (via PushService existant)
- [ ] Email envoyé avec Resend, PDF en pièce jointe
- [ ] Historique des régularisations consultable
- [ ] Historique affiche : locataire, bien, année, solde, date, PDF
- [ ] Option "Annuler et refaire" depuis l'historique
- [ ] Upload PDF signé côté serveur (pas de preset non signé client)
- [ ] `npm run build` → 0 erreurs
