# Audit Technique -- Generation de Baux Coridor

**Date** : 2026-02-17
**Perimetre** : Generation PDF, envoi Yousign, webhook de signature, donnees hardcodees.

---

## Table des matieres

1. [Bugs production-bloquants](#1-bugs-production-bloquants)
   - 1.1 Telephone signataire hardcode
   - 1.2 PDF signe stocke en base64 data URL
   - 1.3 Aucune validation du webhook Yousign
2. [Donnees hardcodees](#2-donnees-hardcodees)
   - 2.1 `property.waterHeatingType`
   - 2.2 `property.fiber_optics`
   - 2.3 `property.ancillary_premises`
   - 2.4 `property.common_areas`
   - 2.5 `contract_data.payment_date`
   - 2.6 `contract_data.payment_method`
   - 2.7 `contract_data.recent_works_amount`
   - 2.8 `contract_data.effective_date`
3. [Resume et priorisation](#3-resume-et-priorisation)

---

## 1. Bugs production-bloquants

### 1.1 Telephone signataire hardcode `+33612345678`

**Gravite** : CRITIQUE -- bloque la signature en production
**Fichier** : `app/api/leases/[applicationId]/sign/route.ts`
**Lignes** : 68 et 78

#### Extrait de code

```typescript
// Ligne 64-71 -- Tenants
const signers = leaseConfig.tenants.map((t: any) => ({
    first_name: t.name.split(' ')[0] || "Locataire",
    last_name: t.name.split(' ').slice(1).join(' ') || "Inconnu",
    email: t.email,
    phone_number: "+33612345678" // MOCK PHONE for Sandbox!
}));

// Ligne 74-79 -- Landlord
signers.push({
    first_name: leaseConfig.landlord.name.split(' ')[0] || "Bailleur",
    last_name: leaseConfig.landlord.name.split(' ').slice(1).join(' ') || "Inconnu",
    email: leaseConfig.landlord.email,
    phone_number: "+33612345678" // MOCK
});
```

#### Impact

Yousign utilise `signature_authentication_mode: "otp_sms"` (voir `services/YousignService.ts`, ligne 97). Le code OTP de validation est envoye au numero fourni. En production, **tous les signataires recoivent le SMS OTP sur le meme faux numero**, ce qui rend la signature impossible.

#### Champ existant dans le schema Prisma

Le champ `phoneNumber` existe sur le model `User` (`prisma/schema.prisma`, ligne 87) :

```prisma
phoneNumber       String?
```

Il est de type `String?` (nullable). Il n'y a pas de champ `phone` specifique sur `TenantProfile`.

#### Fix propose

1. **Ajouter `phoneNumber` a la `LeaseConfig`** dans `services/LeaseService.ts` :

   - Pour les tenants (ligne 261) : ajouter `phone: m.phoneNumber || ""` dans le `.map()`.
   - Pour le landlord (ligne 254) : ajouter `phone: landlord.phoneNumber || ""`.

2. **Utiliser le vrai numero dans `sign/route.ts`** :

```typescript
// Tenants
const signers = leaseConfig.tenants.map((t: any) => ({
    first_name: t.name.split(' ')[0] || "Locataire",
    last_name: t.name.split(' ').slice(1).join(' ') || "Inconnu",
    email: t.email,
    phone_number: t.phone  // Vrai numero depuis User.phoneNumber
}));

// Landlord
signers.push({
    first_name: leaseConfig.landlord.name.split(' ')[0] || "Bailleur",
    last_name: leaseConfig.landlord.name.split(' ').slice(1).join(' ') || "Inconnu",
    email: leaseConfig.landlord.email,
    phone_number: leaseConfig.landlord.phone  // Vrai numero depuis User.phoneNumber
});
```

3. **Ajouter une validation pre-envoi** : verifier que tous les signataires ont un `phoneNumber` renseigne au format E.164 avant d'appeler Yousign. Si un numero manque, retourner une erreur 400 explicite.

---

### 1.2 PDF signe stocke en base64 data URL dans la base de donnees

**Gravite** : CRITIQUE -- degrade les performances et peut casser la DB en production
**Fichier** : `services/YousignService.ts`
**Lignes** : 147-149

#### Extrait de code

```typescript
// Ligne 147-149
const base64 = Buffer.from(downloadRes.data).toString('base64');
return `data:application/pdf;base64,${base64}`;
```

Ce resultat est ensuite stocke dans la base de donnees via le webhook (`app/api/webhooks/yousign/route.ts`, lignes 83-96) :

```typescript
// Ligne 83-86
let signedUrl: string | null = null;
try {
    signedUrl = await YousignService.getSignedDocumentUrl(signatureRequestId);
} catch (err) { ... }

// Ligne 91-96
await prisma.rentalApplication.update({
    where: { id: application.id },
    data: {
        leaseStatus: "SIGNED",
        signedLeaseUrl: signedUrl  // <-- string base64 de ~500 Ko a 2 Mo
    }
});
```

**Champ DB** : `RentalApplication.signedLeaseUrl` (`prisma/schema.prisma`, ligne 729) :

```prisma
signedLeaseUrl     String? // URL of final signed PDF
```

#### Impact

- Un PDF de bail fait typiquement 200 Ko a 2 Mo. En base64, cela represente 260 Ko a 2,6 Mo de texte brut stocke dans une colonne `String` PostgreSQL.
- Chaque `findMany` ou `findFirst` sur `RentalApplication` qui ne fait pas de `select` explicite charge ce champ en memoire.
- Avec quelques centaines de baux signes, cela represente des Go de donnees inutilement charges.
- Le client (`LeaseViewerClient.tsx`, lignes 77-89) cree un lien de telechargement a partir du data URL, ce qui fonctionne mais transfere le PDF entier via le JSON API response.

#### Fix propose

Migrer vers Supabase Storage (le projet utilise deja Supabase comme provider PostgreSQL) :

```typescript
// services/YousignService.ts -- getSignedDocumentUrl()
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

static async getSignedDocumentUrl(signatureRequestId: string): Promise<string> {
    // ... (fetch document arraybuffer comme actuellement) ...

    const downloadRes = await axios.get(
        `${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/documents/${documentId}/download`,
        { headers: this.headers, responseType: 'arraybuffer' }
    );

    // Upload vers Supabase Storage
    const fileName = `leases/signed/${signatureRequestId}.pdf`;
    const { error } = await supabase.storage
        .from('documents')
        .upload(fileName, downloadRes.data, {
            contentType: 'application/pdf',
            upsert: true
        });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    // Retourner l'URL publique ou signee
    const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

    return data.publicUrl;
}
```

Ensuite, mettre a jour le `LeaseViewerClient.tsx` pour utiliser `window.open(signedUrl, '_blank')` au lieu du hack data URL.

**Migration des donnees existantes** : ecrire un script one-shot qui lit tous les `RentalApplication` dont `signedLeaseUrl` commence par `data:`, decode le base64, upload sur Supabase Storage, et met a jour l'URL.

---

### 1.3 Aucune validation du webhook Yousign (faille de securite)

**Gravite** : CRITIQUE -- tout acteur malveillant peut forger un webhook et passer un bail en "SIGNED"
**Fichier** : `app/api/webhooks/yousign/route.ts`
**Lignes** : 49-51

#### Extrait de code

```typescript
// Ligne 49-51
export async function POST(request: Request) {
    try {
        const payload: YousignWebhookPayload = await request.json();
        // ^ Aucune verification de signature HMAC !
```

#### Impact

N'importe qui connaissant l'URL du webhook (`/api/webhooks/yousign`) peut envoyer une requete POST forgee avec un `event_name: "signature_request.done"` et un `yousignSignatureId` valide pour passer un bail en statut `SIGNED` sans aucune signature reelle.

#### Fix propose

Yousign envoie un header `X-Yousign-Signature-Hmac-Sha256` contenant une signature HMAC-SHA256 du body avec la cle secrete du webhook. Ajouter la verification :

```typescript
import crypto from 'crypto';

const YOUSIGN_WEBHOOK_SECRET = process.env.YOUSIGN_WEBHOOK_SECRET;

export async function POST(request: Request) {
    try {
        // 1. Lire le body brut
        const rawBody = await request.text();

        // 2. Verifier la signature HMAC
        if (!YOUSIGN_WEBHOOK_SECRET) {
            console.error("[Yousign Webhook] YOUSIGN_WEBHOOK_SECRET not configured");
            return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
        }

        const receivedSignature = request.headers.get('x-yousign-signature-hmac-sha256');
        if (!receivedSignature) {
            console.warn("[Yousign Webhook] Missing HMAC signature header");
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }

        const expectedSignature = crypto
            .createHmac('sha256', YOUSIGN_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

        if (!crypto.timingSafeEqual(
            Buffer.from(receivedSignature),
            Buffer.from(expectedSignature)
        )) {
            console.warn("[Yousign Webhook] Invalid HMAC signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // 3. Parser le JSON seulement apres validation
        const payload: YousignWebhookPayload = JSON.parse(rawBody);

        // ... suite du traitement ...
    }
}
```

Ajouter `YOUSIGN_WEBHOOK_SECRET` dans les variables d'environnement (`.env`, Vercel settings). La cle se configure dans le dashboard Yousign lors de la creation du webhook.

---

## 2. Donnees hardcodees

### 2.1 `property.waterHeatingType` -- toujours "Individuel (Electrique)"

**Fichier** : `services/LeaseService.ts`
**Ligne** : 278

```typescript
waterHeatingType: mapHeating("IND_ELEC"), // Fallback if not in model
```

**Champ Prisma existant ?** : NON. Le model `Property` a `heatingSystem` (ligne 296 du schema) mais aucun champ `waterHeatingSystem` ou equivalent.

**Fix propose** :

1. Ajouter un champ au model `Property` dans `prisma/schema.prisma` :
   ```prisma
   waterHeatingSystem  String?  // "IND_ELEC", "COL_GAZ", etc.
   ```
2. Exposer ce champ dans le formulaire de creation/edition de propriete.
3. Mapper dans `LeaseService.ts` :
   ```typescript
   waterHeatingType: mapHeating(property.waterHeatingSystem || property.heatingSystem),
   ```

---

### 2.2 `property.fiber_optics` -- toujours `true`

**Fichier** : `services/LeaseService.ts`
**Ligne** : 281

```typescript
fiber_optics: true, // Assume yes for modern listings
```

**Champ Prisma existant ?** : OUI. Le model `Property` possede `hasFiber Boolean @default(false)` (ligne 281 du schema).

**Fix propose** : Mapper directement :

```typescript
fiber_optics: property.hasFiber,
```

---

### 2.3 `property.ancillary_premises` -- toujours `[]`

**Fichier** : `services/LeaseService.ts`
**Ligne** : 282

```typescript
ancillary_premises: [], // Populate if available
```

**Champ Prisma existant ?** : PARTIELLEMENT. Il n'y a pas de champ dedie `cave`, `parking`, `storage` sur `Property` ou `RentalUnit`. Les amenities booleen existant sur `Property` ne couvrent pas ces locaux accessoires.

**Fix propose** :

1. Ajouter des champs booleens au model `Property` :
   ```prisma
   hasCellar       Boolean @default(false)
   hasParking      Boolean @default(false)
   hasParkingSpace Boolean @default(false)
   hasStorage      Boolean @default(false)
   ```
   Ou bien un champ JSON plus flexible :
   ```prisma
   ancillaryPremises  String[]  // ["CAVE", "PARKING", "GARAGE"]
   ```

2. Mapper dans `LeaseService.ts` :
   ```typescript
   ancillary_premises: buildAncillaryList(property),
   ```
   avec une fonction helper qui convertit les booleens en liste de libelles.

---

### 2.4 `property.common_areas` -- toujours `["Ascenseur (si applicable)"]`

**Fichier** : `services/LeaseService.ts`
**Ligne** : 283

```typescript
common_areas: ["Ascenseur (si applicable)"]
```

**Champs Prisma existants ?** : OUI, partiellement. Le model `Property` a :
- `hasElevator` (ligne 283 du schema)
- `hasBikeRoom` (ligne 282 du schema)
- `hasPool` (ligne 288 du schema)
- `hasDigicode` (ligne 285 du schema)
- `hasIntercom` (ligne 286 du schema)
- `hasCaretaker` (ligne 287 du schema)

**Fix propose** : Construire la liste dynamiquement :

```typescript
common_areas: [
    ...(property.hasElevator ? ["Ascenseur"] : []),
    ...(property.hasBikeRoom ? ["Local velos"] : []),
    ...(property.hasDigicode ? ["Digicode"] : []),
    ...(property.hasIntercom ? ["Interphone"] : []),
    ...(property.hasCaretaker ? ["Gardien / Concierge"] : []),
    ...(property.hasPool ? ["Piscine"] : []),
],
```

---

### 2.5 `contract_data.payment_date` -- toujours `1`

**Fichier** : `services/LeaseService.ts`
**Ligne** : 458

```typescript
payment_date: 1, // 1st of month
```

**Champ Prisma existant ?** : NON. Ni `Listing`, ni `RentalUnit`, ni `Property` n'ont de champ pour la date de paiement du loyer.

**Fix propose** :

1. Ajouter un champ sur `Listing` :
   ```prisma
   paymentDayOfMonth  Int  @default(1)  // 1 a 28
   ```
   (Sur `Listing` car c'est une condition commerciale de l'offre, pas une propriete physique du bien.)

2. Mapper :
   ```typescript
   payment_date: rentalUnit.listings?.[0]?.paymentDayOfMonth ?? 1,
   ```
   Ou mieux, passer le `Listing` directement (deja disponible via `application.listing`).

---

### 2.6 `contract_data.payment_method` -- toujours `"Virement Bancaire"`

**Fichier** : `services/LeaseService.ts`
**Ligne** : 459

```typescript
payment_method: "Virement Bancaire"
```

**Champ Prisma existant ?** : NON.

**Fix propose** :

1. Ajouter un champ sur `Listing` ou creer un enum :
   ```prisma
   enum PaymentMethod {
     BANK_TRANSFER
     CHECK
     DIRECT_DEBIT
     CASH
   }
   ```
   Puis sur `Listing` :
   ```prisma
   paymentMethod  PaymentMethod  @default(BANK_TRANSFER)
   ```

2. Mapper avec un dictionnaire de traduction :
   ```typescript
   const PAYMENT_METHOD_LABELS: Record<string, string> = {
       'BANK_TRANSFER': 'Virement Bancaire',
       'CHECK': 'Cheque',
       'DIRECT_DEBIT': 'Prelevement Automatique',
       'CASH': 'Especes (dans la limite legale)',
   };
   payment_method: PAYMENT_METHOD_LABELS[listing.paymentMethod] || "Virement Bancaire",
   ```

---

### 2.7 `contract_data.recent_works_amount` -- toujours `0`

**Fichier** : `services/LeaseService.ts`
**Lignes** : 291-292

```typescript
recent_works_amount: 0,
recent_works_description: "Neant"
```

**Champ Prisma existant ?** : NON. Il n'y a pas de champ dedie sur `Listing`, `RentalUnit` ou `Property`.

Cependant, le model `Expense` existe et contient des depenses liees a une propriete. On pourrait theoriquement calculer les travaux recents a partir des `Expense` avec `category: MAINTENANCE`, mais cela ne correspond pas exactement aux "travaux depuis la fin du dernier contrat" au sens legal.

**Fix propose** :

1. Ajouter sur `Listing` :
   ```prisma
   recentWorksAmountCents  Int     @default(0)
   recentWorksDescription  String  @default("Neant")
   ```

2. Mapper :
   ```typescript
   recent_works_amount: (listing.recentWorksAmountCents || 0) / 100,
   recent_works_description: listing.recentWorksDescription || "Neant",
   ```

3. Exposer ces champs dans le formulaire de creation d'annonce (section "Informations legales").

---

### 2.8 `contract_data.effective_date` -- toujours `new Date()` (date du jour)

**Fichier** : `services/LeaseService.ts`
**Ligne** : 452

```typescript
effective_date: new Date().toISOString().split('T')[0],
```

**Champ Prisma existant ?** : OUI. Le model `TenantCandidateScope` possede :

```prisma
targetMoveInDate  DateTime?  // ligne 663
```

Ce champ est deja utilise dans `initializeFinancials` (ligne 525 de `LeaseService.ts`) :

```typescript
const startDate = application.candidateScope.targetMoveInDate || new Date();
```

Mais il n'est PAS utilise dans `calculateContractData`.

**Fix propose** :

1. Passer `targetMoveInDate` en parametre de `calculateContractData` :

```typescript
private static calculateContractData(
    templateId: LeaseTemplateId,
    rentalUnit: any,
    application: RentalApplication,
    targetMoveInDate: Date | null  // <-- ajouter
) {
    // ...
    return {
        effective_date: (targetMoveInDate || new Date()).toISOString().split('T')[0],
        // ...
    };
}
```

2. Mettre a jour l'appel dans `generateLeaseConfig` (ligne 205) :

```typescript
const contractData = this.calculateContractData(
    leaseTemplateId,
    rentalUnit as any,
    application,
    scope.targetMoveInDate  // <-- passer la date d'emmenagement
);
```

---

## 3. Resume et priorisation

| # | Probleme | Fichier | Ligne(s) | Gravite | Champ DB existe ? | Effort |
|---|----------|---------|----------|---------|-------------------|--------|
| 1.1 | Telephone hardcode `+33612345678` | `app/api/leases/[applicationId]/sign/route.ts` | 68, 78 | **CRITIQUE** | OUI (`User.phoneNumber`) | Faible |
| 1.2 | PDF stocke en base64 dans la DB | `services/YousignService.ts` | 147-149 | **CRITIQUE** | N/A (migration Supabase Storage) | Moyen |
| 1.3 | Webhook sans validation HMAC | `app/api/webhooks/yousign/route.ts` | 49-51 | **CRITIQUE** | N/A (env var a ajouter) | Faible |
| 2.1 | `waterHeatingType` hardcode | `services/LeaseService.ts` | 278 | Moyen | NON (champ a creer) | Faible |
| 2.2 | `fiber_optics` hardcode `true` | `services/LeaseService.ts` | 281 | Faible | OUI (`Property.hasFiber`) | Trivial |
| 2.3 | `ancillary_premises` hardcode `[]` | `services/LeaseService.ts` | 282 | Moyen | NON (champs a creer) | Moyen |
| 2.4 | `common_areas` hardcode | `services/LeaseService.ts` | 283 | Faible | OUI (partiellement, booleens existants) | Faible |
| 2.5 | `payment_date` hardcode `1` | `services/LeaseService.ts` | 458 | Moyen | NON (champ a creer sur Listing) | Faible |
| 2.6 | `payment_method` hardcode | `services/LeaseService.ts` | 459 | Faible | NON (champ a creer sur Listing) | Faible |
| 2.7 | `recent_works_amount` hardcode `0` | `services/LeaseService.ts` | 291 | Moyen | NON (champ a creer sur Listing) | Faible |
| 2.8 | `effective_date` = `new Date()` | `services/LeaseService.ts` | 452 | Moyen | OUI (`TenantCandidateScope.targetMoveInDate`) | Trivial |

### Ordre d'execution recommande

1. **P0 (immediat)** : Bugs 1.1 + 1.3 -- quelques heures de travail, impact securite/fonctionnel maximal.
2. **P0 (semaine)** : Bug 1.2 -- necessite configuration Supabase Storage + migration des donnees existantes.
3. **P1 (sprint)** : Items 2.2, 2.4, 2.8 -- les champs existent deja, il suffit de mapper.
4. **P2 (sprint+1)** : Items 2.1, 2.3, 2.5, 2.6, 2.7 -- necessitent migration Prisma + UI de saisie proprietaire.
