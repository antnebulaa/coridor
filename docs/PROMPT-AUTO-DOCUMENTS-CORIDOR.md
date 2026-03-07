# Intégration auto-documents Coridor dans la messagerie

## Contexte

Le système de documents dans la messagerie est en place : `ConversationDocument` modèle, `DocumentService`, panneau Documents avec filtres, bandeau inline, navigation bidirectionnelle. **Mais** les documents auto-générés par Coridor (quittances, baux signés, EDL, mises en demeure) ne sont pas encore indexés dans ce panneau. Les utilisateurs ne les retrouvent pas dans l'espace Documents de leur conversation.

**Objectif :** brancher les services existants pour qu'à chaque génération de document Coridor, celui-ci soit automatiquement indexé dans le panneau Documents de la conversation correspondante, avec un message système dans le fil.

---

## BRANCHEMENTS À EFFECTUER

### 1. Quittances automatiques

**Service concerné :** le cron de génération de quittances (`app/api/cron/generate-receipts/` ou `RentReceiptService`)

**Moment du branchement :** après la génération du PDF de la quittance (via `@react-pdf/renderer`), avant ou après l'envoi de l'email.

**Action à ajouter :**

```typescript
// Après génération du PDF de quittance
// 1. Trouver la conversation entre le proprio et le locataire pour ce bail
const conversation = await prisma.conversation.findFirst({
  where: {
    propertyId: lease.propertyId,
    participants: {
      every: {
        userId: { in: [lease.landlordId, lease.tenantId] },
      },
    },
  },
});

if (conversation) {
  // 2. Créer un message système dans la conversation
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: null, // système Coridor
      type: 'SYSTEM_DOCUMENT',
      content: `Quittance de loyer — ${monthLabel}`,
    },
  });

  // 3. Indexer le document via DocumentService
  await DocumentService.createCoridorDocument({
    conversationId: conversation.id,
    messageId: message.id,
    fileName: `quittance-${monthSlug}.pdf`,
    fileType: 'application/pdf',
    fileSize: pdfBuffer.length,
    fileUrl: receiptPdfUrl, // URL du PDF déjà uploadé (Cloudinary ou Supabase)
    label: `Quittance de loyer — ${monthLabel}`,
    coridorType: 'quittance',
    coridorRef: receipt.id,
  });
}
```

**Note :** les quittances sont déjà générées et uploadées. Il faut juste ajouter l'appel à `DocumentService.createCoridorDocument()` et la création du message système. Si le PDF est déjà stocké quelque part (Cloudinary, Supabase Storage, ou généré à la volée), utiliser l'URL existante. Ne pas re-uploader.

**Adapter selon l'implémentation actuelle :** vérifier comment le service existant génère et stocke le PDF. Si le PDF est généré à la volée à chaque téléchargement (pas de stockage persistant), il faudra d'abord le stocker puis l'indexer. Si le PDF a déjà une URL persistante, l'utiliser directement.

### 2. Bail signé (webhook YouSign)

**Service concerné :** le webhook YouSign (`signature_request.done`) ou le handler qui marque le bail comme signé (`markLeaseAsSigned.ts` ou similaire)

**Moment du branchement :** après réception de la confirmation de signature et récupération du PDF signé.

**Action à ajouter :**

```typescript
// Après récupération du PDF signé via YousignService
const signedPdfUrl = await YousignService.getSignedDocument(signatureRequestId);

const conversation = await prisma.conversation.findFirst({
  where: {
    // Trouver la conversation liée à cette candidature/bail
    // Adapter selon la structure existante
  },
});

if (conversation) {
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: null,
      type: 'SYSTEM_DOCUMENT',
      content: 'Bail signé par toutes les parties',
    },
  });

  await DocumentService.createCoridorDocument({
    conversationId: conversation.id,
    messageId: message.id,
    fileName: `bail-signe-${property.title || 'logement'}.pdf`,
    fileType: 'application/pdf',
    fileSize: signedPdfSize, // si disponible, sinon 0
    fileUrl: signedPdfUrl,
    label: `Bail signé — ${property.address || property.title}`,
    coridorType: 'bail',
    coridorRef: lease.id,
  });
}
```

**Note :** un message système `LEASE_SENT_FOR_SIGNATURE` existe déjà dans la conversation. Le nouveau message `SYSTEM_DOCUMENT` est différent — il confirme que le bail est **signé** et fournit le PDF final. Vérifier qu'il n'y a pas déjà un message système à la signature, auquel cas il suffit d'ajouter l'indexation du document sur ce message existant au lieu d'en créer un nouveau.

### 3. État des lieux (EDL)

**Service concerné :** la route de génération du PDF EDL (`app/api/inspection/.../generate-pdf/route.ts`)

**Moment du branchement :** après la génération et l'upload du PDF EDL.

**Action à ajouter :**

```typescript
// Après génération du PDF EDL et upload (Cloudinary)
// Le PDF est déjà stocké dans inspection.pdfUrl

const conversation = await prisma.conversation.findFirst({
  where: {
    propertyId: inspection.propertyId,
    // Trouver la bonne conversation
  },
});

if (conversation) {
  const edlTypeLabel = inspection.type === 'ENTRY' ? "d'entrée" : 'de sortie';

  // Vérifier si un message système PDF_READY existe déjà
  // Si oui, attacher le document à ce message
  // Si non, créer un nouveau message système
  const existingMessage = await prisma.message.findFirst({
    where: {
      conversationId: conversation.id,
      type: 'SYSTEM',
      content: { contains: 'PDF_READY' },
      // Adapter selon le format des messages système EDL
    },
    orderBy: { createdAt: 'desc' },
  });

  const messageId = existingMessage?.id || (await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: null,
      type: 'SYSTEM_DOCUMENT',
      content: `État des lieux ${edlTypeLabel} — PDF disponible`,
    },
  })).id;

  await DocumentService.createCoridorDocument({
    conversationId: conversation.id,
    messageId,
    fileName: `edl-${inspection.type.toLowerCase()}-${property.title || 'logement'}.pdf`,
    fileType: 'application/pdf',
    fileSize: 0, // pas toujours disponible pour Cloudinary
    fileUrl: inspection.pdfUrl!,
    label: `État des lieux ${edlTypeLabel} — ${property.address || property.title}`,
    coridorType: 'edl',
    coridorRef: inspection.id,
  });
}
```

**Note :** l'EDL a déjà 11 types de messages système dans la conversation. Le document PDF doit être rattaché au message `PDF_READY` existant si possible, au lieu de créer un doublon. Vérifier le format exact des messages système EDL dans `MessageBox.tsx` pour identifier le bon message.

### 4. Mise en demeure (dépôt de garantie)

**Service concerné :** l'API de génération de mise en demeure (`app/api/deposit/[applicationId]/formal-notice/`)

**Moment du branchement :** après génération du PDF de mise en demeure.

**Action à ajouter :**

```typescript
// Après génération du PDF de mise en demeure
const conversation = await prisma.conversation.findFirst({
  where: {
    // Conversation liée à cette candidature
  },
});

if (conversation) {
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: null,
      type: 'SYSTEM_DOCUMENT',
      content: 'Mise en demeure — Restitution dépôt de garantie',
    },
  });

  await DocumentService.createCoridorDocument({
    conversationId: conversation.id,
    messageId: message.id,
    fileName: 'mise-en-demeure-depot-garantie.pdf',
    fileType: 'application/pdf',
    fileSize: pdfBuffer?.length || 0,
    fileUrl: formalNoticePdfUrl,
    label: 'Mise en demeure — Restitution dépôt de garantie',
    coridorType: 'mise_en_demeure',
    coridorRef: deposit.id,
  });
}
```

### 5. Inventaire mobilier (bail meublé)

Si un PDF d'inventaire mobilier est généré à la signature du bail meublé, l'indexer aussi :

```typescript
await DocumentService.createCoridorDocument({
  conversationId: conversation.id,
  messageId: message.id,
  fileName: `inventaire-mobilier-${property.title || 'logement'}.pdf`,
  fileType: 'application/pdf',
  fileSize: 0,
  fileUrl: inventoryPdfUrl,
  label: `Inventaire mobilier — ${property.address || property.title}`,
  coridorType: 'inventaire',
  coridorRef: lease.id,
});
```

---

## MÉTHODE DocumentService.createCoridorDocument()

Vérifier que `DocumentService` a bien une méthode pour créer un document Coridor. Si elle n'existe pas encore (le service actuel gère peut-être uniquement les uploads utilisateur), l'ajouter :

```typescript
// Dans DocumentService.ts (ou équivalent)
static async createCoridorDocument(params: {
  conversationId: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;       // URL existante (Cloudinary, Supabase, etc.)
  label: string;
  coridorType: string;   // 'quittance' | 'bail' | 'edl' | 'mise_en_demeure' | 'inventaire'
  coridorRef?: string;   // ID de l'objet source (receipt.id, lease.id, etc.)
}) {
  return prisma.conversationDocument.create({
    data: {
      conversationId: params.conversationId,
      messageId: params.messageId,
      uploadedById: null,  // système Coridor
      source: 'coridor',
      fileName: params.fileName,
      fileType: params.fileType,
      fileSize: params.fileSize,
      fileUrl: params.fileUrl,
      storagePath: '',     // pas de storage path si l'URL est externe (Cloudinary)
      label: params.label,
      coridorType: params.coridorType,
      coridorRef: params.coridorRef || null,
    },
  });
}
```

**Important :** cette méthode ne fait PAS d'upload. Elle indexe un document dont l'URL existe déjà. C'est le service source (quittances, baux, EDL) qui gère le stockage du PDF. On crée juste l'entrée `ConversationDocument` pour qu'il apparaisse dans le panneau Documents.

---

## TROUVER LA BONNE CONVERSATION

Le pattern récurrent dans tous les branchements c'est "trouver la conversation entre le proprio et le locataire pour ce bien/bail". Créer une fonction utilitaire :

```typescript
// lib/findConversation.ts ou dans DocumentService
export async function findConversationForLease(lease: {
  landlordId: string;
  tenantId: string;
  propertyId: string;
  applicationId?: string;
}): Promise<string | null> {
  // D'abord chercher par applicationId si disponible (le plus précis)
  if (lease.applicationId) {
    const conversation = await prisma.conversation.findFirst({
      where: { applicationId: lease.applicationId },
      select: { id: true },
    });
    if (conversation) return conversation.id;
  }

  // Sinon chercher par propriété + participants
  const conversation = await prisma.conversation.findFirst({
    where: {
      propertyId: lease.propertyId,
      AND: [
        { participants: { some: { userId: lease.landlordId } } },
        { participants: { some: { userId: lease.tenantId } } },
      ],
    },
    orderBy: { updatedAt: 'desc' }, // la plus récente
    select: { id: true },
  });

  return conversation?.id || null;
}
```

**Adapter selon la structure existante.** Le modèle `Conversation` peut avoir des champs différents (`landlordId`/`tenantId` directs, ou une table de participants). Vérifier le schéma Prisma actuel et adapter la requête.

---

## FILTRE "CORIDOR" DANS LE PANNEAU DOCUMENTS

Le panneau Documents a déjà un filtre par source. Vérifier que le filtre "Coridor" fonctionne correctement pour afficher uniquement les documents auto-générés (`source: 'coridor'`). Les documents Coridor doivent avoir un badge distinctif dans la liste (ex: petit label "Coridor" en ambre).

---

## FICHIERS À MODIFIER

| Fichier | Modification |
|---------|-------------|
| `services/DocumentService.ts` | Ajouter `createCoridorDocument()` si absent |
| `lib/findConversation.ts` | Nouvelle fonction utilitaire (ou intégrée dans DocumentService) |
| `app/api/cron/generate-receipts/route.ts` (ou RentReceiptService) | Ajouter indexation quittance après génération PDF |
| Webhook YouSign / handler signature bail | Ajouter indexation bail signé |
| `app/api/inspection/.../generate-pdf/route.ts` | Ajouter indexation EDL après génération PDF |
| `app/api/deposit/[applicationId]/formal-notice/route.ts` | Ajouter indexation mise en demeure |

---

## VÉRIFICATIONS

- [ ] Quittance mensuelle : apparaît dans la conversation comme message système + dans le panneau Documents
- [ ] Bail signé : apparaît dans la conversation + panneau Documents après signature YouSign
- [ ] EDL : PDF apparaît dans le panneau Documents, rattaché au message PDF_READY existant si possible
- [ ] Mise en demeure : apparaît dans la conversation + panneau Documents
- [ ] Filtre "Coridor" dans le panneau Documents affiche uniquement les documents auto-générés
- [ ] Chaque document Coridor a le badge distinctif dans la liste
- [ ] Le lien "Voir dans la conversation →" fonctionne pour les documents Coridor
- [ ] Le lien "Voir dans Documents →" fonctionne sous les messages système avec document
- [ ] Le compteur du bouton Documents (header conversation) inclut les documents Coridor
- [ ] Pas de doublons : si un message système existe déjà, le document est rattaché à ce message
- [ ] npm run build → 0 erreurs
