# Feature Documents dans la Messagerie Coridor

## Contexte

La messagerie Coridor permet aux propriétaires et locataires d'échanger dans le cadre d'un bien. Actuellement, les fichiers envoyés se perdent dans le fil de conversation. On ajoute un **système de documents intégré** : chaque fichier échangé (par les utilisateurs ou auto-généré par Coridor) est collecté automatiquement dans un panneau latéral "Documents" accessible depuis la conversation.

**Philosophie Coridor :** Tout est documenté, horodaté, retrouvable. La traçabilité protège les deux parties.

**Inspiration UI :** Le bandeau fichier de Claude (icône type + nom + type + bouton Télécharger) pour l'affichage inline. Le panneau latéral de Claude pour la prévisualisation des fichiers.

---

## MODÈLE DE DONNÉES

### Nouveau modèle : ConversationDocument

```prisma
model ConversationDocument {
  id              String   @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  // Lien vers le message d'origine (null si généré par Coridor hors conversation)
  messageId       String?
  message         Message? @relation(fields: [messageId], references: [id], onDelete: SetNull)
  
  // Qui a envoyé le document
  uploadedById    String?  // null = généré par Coridor (système)
  uploadedBy      User?    @relation(fields: [uploadedById], references: [id], onDelete: SetNull)
  source          String   @default("user") // "user" | "coridor"
  
  // Fichier
  fileName        String   // nom original du fichier
  fileType        String   // MIME type (application/pdf, image/jpeg, etc.)
  fileSize        Int      // taille en bytes
  fileUrl         String   // URL Supabase Storage
  storagePath     String   // chemin dans le bucket Supabase
  
  // Métadonnées
  label           String?  // libellé libre saisi par l'utilisateur ("Attestation assurance 2026")
  category        String?  // catégorie auto-détectée ou manuelle pour filtrage futur
  
  // Coridor auto-generated metadata
  coridorType     String?  // "quittance" | "bail" | "edl" | "mise_en_demeure" | "inventaire" | null
  coridorRef      String?  // référence interne (ex: ID de la quittance, du bail, etc.)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([conversationId, createdAt(sort: Desc)])
  @@index([conversationId, fileType])
}
```

### Modification du modèle Message existant

Ajouter la relation :

```prisma
model Message {
  // ... champs existants ...
  
  documents   ConversationDocument[]
}
```

### Modification du modèle Conversation existant

Ajouter la relation :

```prisma
model Conversation {
  // ... champs existants ...
  
  documents   ConversationDocument[]
}
```

---

## STOCKAGE — Supabase Storage

### Configuration du bucket

Créer un bucket `conversation-documents` dans Supabase Storage :

```sql
-- Créer le bucket (via Supabase Dashboard ou migration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-documents',
  'conversation-documents',
  false,  -- privé (accès via RLS)
  52428800,  -- 50MB max par fichier
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
);
```

### Row Level Security (RLS)

```sql
-- Seuls les participants de la conversation peuvent voir les documents
CREATE POLICY "Participants can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'conversation-documents'
  AND EXISTS (
    SELECT 1 FROM "ConversationDocument" cd
    JOIN "Conversation" c ON c.id = cd."conversationId"
    WHERE cd."storagePath" = name
    AND (c."landlordId" = auth.uid() OR c."tenantId" = auth.uid())
  )
);

-- Seuls les participants peuvent uploader
CREATE POLICY "Participants can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'conversation-documents'
);

-- Personne ne peut supprimer (traçabilité Coridor)
-- Les documents sont permanents pour protéger les deux parties
```

### Structure des chemins

```
conversation-documents/
  {conversationId}/
    {timestamp}-{uuid}.{ext}
```

Exemple : `conversation-documents/clx123abc/1709510400000-abc123def.pdf`

### Service upload

Créer `services/DocumentUploadService.ts` :

```typescript
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role pour bypass RLS côté serveur
);

const BUCKET = 'conversation-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

export class DocumentUploadService {

  /**
   * Upload un document envoyé par un utilisateur dans la conversation
   */
  static async uploadUserDocument(params: {
    conversationId: string;
    messageId: string;
    uploadedById: string;
    file: Buffer;
    fileName: string;
    fileType: string;
    fileSize: number;
    label?: string;
  }): Promise<ConversationDocument> {
    // Validations
    if (params.fileSize > MAX_FILE_SIZE) {
      throw new Error('Fichier trop volumineux (max 50MB)');
    }
    if (!ALLOWED_TYPES.includes(params.fileType)) {
      throw new Error('Type de fichier non autorisé');
    }

    // Générer le chemin de stockage
    const ext = params.fileName.split('.').pop() || 'bin';
    const storagePath = `${params.conversationId}/${Date.now()}-${randomUUID()}.${ext}`;

    // Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, params.file, {
        contentType: params.fileType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    // Générer l'URL signée (valide 1 an, renouvelée à chaque accès)
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 an

    // Créer l'entrée en base
    const document = await prisma.conversationDocument.create({
      data: {
        conversationId: params.conversationId,
        messageId: params.messageId,
        uploadedById: params.uploadedById,
        source: 'user',
        fileName: params.fileName,
        fileType: params.fileType,
        fileSize: params.fileSize,
        fileUrl: urlData?.signedUrl || '',
        storagePath,
        label: params.label || null,
      },
    });

    return document;
  }

  /**
   * Enregistrer un document auto-généré par Coridor
   * (quittance, bail, EDL, etc.)
   */
  static async registerCoridorDocument(params: {
    conversationId: string;
    messageId?: string;
    file: Buffer;
    fileName: string;
    fileType: string;
    fileSize: number;
    coridorType: string;   // "quittance" | "bail" | "edl" | "mise_en_demeure" | "inventaire"
    coridorRef?: string;
    label: string;         // ex: "Quittance de loyer — Mars 2026"
  }): Promise<ConversationDocument> {
    const ext = params.fileName.split('.').pop() || 'pdf';
    const storagePath = `${params.conversationId}/${Date.now()}-coridor-${params.coridorType}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, params.file, {
        contentType: params.fileType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erreur upload Coridor: ${uploadError.message}`);
    }

    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    const document = await prisma.conversationDocument.create({
      data: {
        conversationId: params.conversationId,
        messageId: params.messageId || null,
        uploadedById: null, // système
        source: 'coridor',
        fileName: params.fileName,
        fileType: params.fileType,
        fileSize: params.fileSize,
        fileUrl: urlData?.signedUrl || '',
        storagePath,
        label: params.label,
        coridorType: params.coridorType,
        coridorRef: params.coridorRef || null,
      },
    });

    return document;
  }

  /**
   * Récupérer tous les documents d'une conversation
   */
  static async getConversationDocuments(
    conversationId: string,
    filters?: {
      fileType?: string;   // "pdf" | "image" | "all"
      source?: string;     // "user" | "coridor" | "all"
      search?: string;     // recherche dans le libellé
    }
  ) {
    const where: any = { conversationId };

    if (filters?.fileType === 'pdf') {
      where.fileType = 'application/pdf';
    } else if (filters?.fileType === 'image') {
      where.fileType = { startsWith: 'image/' };
    }

    if (filters?.source && filters.source !== 'all') {
      where.source = filters.source;
    }

    if (filters?.search) {
      where.OR = [
        { label: { contains: filters.search, mode: 'insensitive' } },
        { fileName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const documents = await prisma.conversationDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Renouveler les URLs signées si nécessaire
    const refreshed = await Promise.all(
      documents.map(async (doc) => {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(doc.storagePath, 60 * 60); // 1h pour l'affichage
        return { ...doc, fileUrl: data?.signedUrl || doc.fileUrl };
      })
    );

    return refreshed;
  }

  /**
   * Générer une URL de téléchargement temporaire
   */
  static async getDownloadUrl(documentId: string, userId: string): Promise<string> {
    const doc = await prisma.conversationDocument.findUnique({
      where: { id: documentId },
      include: {
        conversation: {
          select: { landlordId: true, tenantId: true },
        },
      },
    });

    if (!doc) throw new Error('Document introuvable');

    // Vérifier que l'utilisateur est participant de la conversation
    const isParticipant =
      doc.conversation.landlordId === userId ||
      doc.conversation.tenantId === userId;

    if (!isParticipant) throw new Error('Accès non autorisé');

    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storagePath, 60 * 60); // 1h

    if (!data?.signedUrl) throw new Error('Erreur génération URL');

    return data.signedUrl;
  }
}
```

---

## COMPOSANTS UI

### Structure des fichiers

```
components/
  messaging/
    DocumentBanner.tsx           — Bandeau fichier inline (style Claude)
    DocumentUploadInput.tsx      — Input d'envoi de fichier + champ libellé
    DocumentsPanel.tsx           — Panneau latéral liste des documents
    DocumentsPanelItem.tsx       — Ligne individuelle dans le panneau
    DocumentPreview.tsx          — Prévisualisation (images inline, PDF embed)
    DocumentSystemMessage.tsx    — Message système Coridor (quittance générée, etc.)
    DocumentsButton.tsx          — Bouton pour ouvrir le panneau (compteur)

hooks/
  useConversationDocuments.ts    — Hook SWR pour charger les documents
```

### DocumentBanner.tsx — Bandeau fichier inline (style Claude)

Affiché dans le fil de conversation quand un message contient un document :

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  📄  Attestation assurance habitation 2026.pdf    │  │
│  │      Document · PDF · 245 Ko                      │  │
│  │                                    [ Télécharger ] │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Voici mon attestation d'assurance pour cette année.    │
│                                                         │
│  Voir dans Documents →                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Spécifications visuelles :**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [icône]  {libellé ou nom du fichier}            │
│           {type} · {extension} · {taille}        │
│                                  [ Télécharger ] │
│                                                  │
└──────────────────────────────────────────────────┘
```

- Conteneur : `rounded-xl border border-neutral-200 bg-neutral-50 p-4`
- Icône : dépend du type fichier (📄 PDF, 🖼️ image, 📊 Excel, 📝 Word, 📎 autre)
- Nom/libellé : `text-sm font-medium text-neutral-900` — affiche le libellé si renseigné, sinon le nom du fichier
- Metadata : `text-xs text-neutral-500`
- Bouton télécharger : `rounded-lg border border-neutral-300 px-4 py-1.5 text-sm font-medium`
- Lien "Voir dans Documents →" : `text-xs text-amber-600 hover:text-amber-700 mt-2`
- Si le fichier est une image : afficher une miniature (max 300px largeur) au-dessus du bandeau, cliquable pour voir en plein écran
- Si le fichier est un PDF : afficher seulement le bandeau (pas de prévisualisation inline)

**Icônes par type :**

```typescript
function getFileIcon(fileType: string): string {
  if (fileType === 'application/pdf') return '📄';
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  return '📎';
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toUpperCase() || '';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
```

### DocumentUploadInput.tsx — Envoi de fichier

Intégré dans la barre de saisie de message, bouton trombone (📎) :

1. L'utilisateur clique sur 📎
2. Sélecteur de fichier natif s'ouvre (accept types configurés)
3. Fichier sélectionné → une preview apparaît au-dessus du champ de saisie :

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📄 attestation-assurance.pdf                          ✕   │  │
│  │     PDF · 245 Ko                                           │  │
│  │                                                            │  │
│  │  Libellé (optionnel)                                       │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ Attestation assurance habitation 2026                │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────┐  ┌──────────────┐   │
│  │ Voici mon attestation...               │  │   Envoyer ➤  │   │
│  └────────────────────────────────────────┘  └──────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- L'utilisateur peut ajouter un libellé descriptif (optionnel mais encouragé)
- L'utilisateur peut ajouter un message texte en accompagnement
- Bouton ✕ pour annuler l'envoi du fichier
- Le libellé est affiché en priorité dans le bandeau et dans le panneau Documents
- Si pas de libellé, le nom du fichier original est utilisé
- Upload en cours : barre de progression sur le bandeau, bouton Envoyer désactivé
- Envoi multiple : un seul fichier à la fois (simplicité)

### DocumentsPanel.tsx — Panneau latéral

S'ouvre en sidebar droite (comme Claude pour la prévisualisation), déclenché par le bouton DocumentsButton :

```
┌──────────────────────────────────────────────┐
│                                              │
│  Documents (12)                          ✕   │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🔍 Rechercher par libellé...          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [ Tous ]  [ PDF ]  [ Images ]  [ Coridor ] │
│                                              │
│  ── Mars 2026 ────────────────────────────   │
│                                              │
│  📄 Quittance de loyer — Mars 2026           │
│     Coridor · 3 mars 2026                    │
│     [ ↓ ] [ Voir dans la conversation → ]    │
│                                              │
│  🖼️ Photo compteur eau                       │
│     Marie D. · 1er mars 2026                 │
│     [ ↓ ] [ Voir dans la conversation → ]    │
│                                              │
│  ── Février 2026 ─────────────────────────   │
│                                              │
│  📄 Attestation assurance habitation 2026    │
│     Marie D. · 15 fév 2026                   │
│     [ ↓ ] [ Voir dans la conversation → ]    │
│                                              │
│  📄 Quittance de loyer — Février 2026        │
│     Coridor · 1er fév 2026                   │
│     [ ↓ ] [ Voir dans la conversation → ]    │
│                                              │
│  📄 Bail signé — T2 Rue de Rivoli            │
│     Coridor · 15 jan 2026                    │
│     [ ↓ ] [ Voir dans la conversation → ]    │
│                                              │
│  ...                                         │
│                                              │
└──────────────────────────────────────────────┘
```

**Spécifications :**

- Sidebar : `fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50` (mobile : plein écran)
- Animation : slide-in depuis la droite (300ms ease-out)
- Backdrop semi-transparent sur le reste de l'écran (click = fermer)
- Regroupement par mois (séparateurs visuels)
- Chaque item : icône + libellé (ou nom fichier) + envoyeur + date
- Bouton téléchargement (↓) discret à droite
- Lien "Voir dans la conversation →" scroll jusqu'au message d'origine
- Filtres en pills : Tous / PDF / Images / Coridor (documents auto-générés)
- Recherche par libellé ou nom de fichier
- Scroll infini ou pagination (si beaucoup de documents)
- Clic sur une image : ouvre la prévisualisation plein écran
- Clic sur un PDF : ouvre dans un nouvel onglet ou embed

**Style items :**

- Documents Coridor : petit badge `bg-amber-50 text-amber-700 text-xs rounded-full px-2` avec "Coridor"
- Documents utilisateur : prénom + initiale nom
- Hover : `bg-neutral-50`

### DocumentsButton.tsx — Bouton d'accès au panneau

Placé dans le header de la conversation, à côté du nom de l'interlocuteur :

```
┌─────────────────────────────────────────────────────┐
│  ← Marie Dupont            📎 12  [ ⋯ ]            │
│     T2 Rue de Rivoli                                 │
└─────────────────────────────────────────────────────┘
```

- Icône trombone + compteur de documents
- Badge compteur : `bg-amber-100 text-amber-700 text-xs font-medium rounded-full min-w-[1.25rem] h-5 px-1`
- Si 0 documents : afficher l'icône sans compteur
- Click → ouvre DocumentsPanel

### DocumentSystemMessage.tsx — Message système Coridor

Quand Coridor génère automatiquement un document (quittance, EDL, etc.), un message système apparaît dans la conversation :

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              ─── 1er mars 2026 ───                      │
│                                                         │
│     ┌─────────────────────────────────────────────┐     │
│     │  🏠 Coridor a généré un document            │     │
│     │                                             │     │
│     │  ┌───────────────────────────────────────┐  │     │
│     │  │  📄 Quittance de loyer — Mars 2026    │  │     │
│     │  │     Document · PDF · 89 Ko            │  │     │
│     │  │                        [ Télécharger ] │  │     │
│     │  └───────────────────────────────────────┘  │     │
│     │                                             │     │
│     │  Voir dans Documents →                      │     │
│     └─────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Message centré (comme un message système/date)
- Fond légèrement différent : `bg-amber-50/50 border border-amber-100 rounded-xl`
- Icône maison Coridor
- Le DocumentBanner est inclus à l'intérieur
- Pas de bulle gauche/droite — c'est un message neutre de la plateforme

---

## INTÉGRATION DANS LES SERVICES EXISTANTS

### Quittances automatiques

Dans le service qui génère les quittances mensuelles, après génération du PDF :

```typescript
// Après avoir généré le PDF de la quittance
const pdfBuffer = await generateQuittancePdf(quittance);

// Trouver la conversation entre le proprio et le locataire pour ce bien
const conversation = await prisma.conversation.findFirst({
  where: {
    propertyId: lease.propertyId,
    landlordId: lease.landlordId,
    tenantId: lease.tenantId,
  },
});

if (conversation) {
  // Créer un message système dans la conversation
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: null, // système
      type: 'SYSTEM_DOCUMENT',
      content: `Quittance de loyer — ${monthLabel}`,
    },
  });

  // Enregistrer le document
  await DocumentUploadService.registerCoridorDocument({
    conversationId: conversation.id,
    messageId: message.id,
    file: pdfBuffer,
    fileName: `quittance-${monthSlug}.pdf`,
    fileType: 'application/pdf',
    fileSize: pdfBuffer.length,
    coridorType: 'quittance',
    coridorRef: quittance.id,
    label: `Quittance de loyer — ${monthLabel}`,
  });
}
```

### Bail signé

Après signature YouSign, quand le bail PDF signé est récupéré :

```typescript
await DocumentUploadService.registerCoridorDocument({
  conversationId: conversation.id,
  messageId: message.id,
  file: signedPdfBuffer,
  fileName: `bail-signe-${property.title}.pdf`,
  fileType: 'application/pdf',
  fileSize: signedPdfBuffer.length,
  coridorType: 'bail',
  coridorRef: lease.id,
  label: `Bail signé — ${property.title}`,
});
```

### État des lieux

Après génération du PDF d'EDL :

```typescript
await DocumentUploadService.registerCoridorDocument({
  conversationId: conversation.id,
  messageId: message.id,
  file: edlPdfBuffer,
  fileName: `edl-${type}-${property.title}.pdf`,
  fileType: 'application/pdf',
  fileSize: edlPdfBuffer.length,
  coridorType: 'edl',
  coridorRef: edl.id,
  label: `État des lieux ${type === 'entry' ? "d'entrée" : 'de sortie'} — ${property.title}`,
});
```

### Mise en demeure

```typescript
await DocumentUploadService.registerCoridorDocument({
  conversationId: conversation.id,
  messageId: message.id,
  file: pdfBuffer,
  fileName: `mise-en-demeure-depot-garantie.pdf`,
  fileType: 'application/pdf',
  fileSize: pdfBuffer.length,
  coridorType: 'mise_en_demeure',
  coridorRef: deposit.id,
  label: `Mise en demeure — Restitution dépôt de garantie`,
});
```

---

## API

### POST /api/conversations/[conversationId]/documents

Upload d'un document par un utilisateur.

```typescript
// Request: multipart/form-data
// - file: le fichier
// - label: string (optionnel)
// - messageId: string (ID du message associé)

// Response
{
  id: "clx...",
  fileName: "attestation-assurance.pdf",
  fileType: "application/pdf",
  fileSize: 250000,
  fileUrl: "https://xxx.supabase.co/storage/v1/...",
  label: "Attestation assurance habitation 2026",
  source: "user",
  uploadedBy: { id: "...", firstName: "Marie", lastName: "D." },
  createdAt: "2026-03-01T10:00:00Z"
}
```

### GET /api/conversations/[conversationId]/documents

Liste des documents de la conversation.

```typescript
// Query params
// - type: "pdf" | "image" | "all" (défaut: "all")
// - source: "user" | "coridor" | "all" (défaut: "all")
// - search: string (recherche libellé/nom)
// - cursor: string (pagination cursor)
// - limit: number (défaut: 20)

// Response
{
  documents: [
    {
      id: "clx...",
      fileName: "quittance-mars-2026.pdf",
      fileType: "application/pdf",
      fileSize: 89000,
      fileUrl: "https://...",
      label: "Quittance de loyer — Mars 2026",
      source: "coridor",
      coridorType: "quittance",
      uploadedBy: null,
      messageId: "msg_abc",
      createdAt: "2026-03-01T00:00:00Z"
    },
    // ...
  ],
  nextCursor: "clx...",
  total: 12
}
```

### GET /api/documents/[documentId]/download

Téléchargement d'un document (URL signée temporaire).

```typescript
// Response
{
  url: "https://xxx.supabase.co/storage/v1/object/sign/...",
  expiresIn: 3600
}
```

---

## NAVIGATION CONVERSATION ↔ DOCUMENTS

### "Voir dans Documents →" (conversation → panneau)

Quand l'utilisateur clique sur ce lien sous un document dans la conversation :

1. Le panneau Documents s'ouvre
2. Le document concerné est scrollé en vue et brièvement surligné (`bg-amber-100` pendant 2s puis fade-out)

### "Voir dans la conversation →" (panneau → conversation)

Quand l'utilisateur clique sur ce lien dans le panneau Documents :

1. Le panneau se ferme
2. La conversation scroll jusqu'au message contenant le document
3. Le message est brièvement surligné (`bg-amber-50` pendant 2s puis fade-out)

Pour implémenter le scroll vers un message : chaque message a un `id` HTML (`message-{messageId}`). Le lien utilise `document.getElementById('message-{messageId}')?.scrollIntoView({ behavior: 'smooth', block: 'center' })`.

---

## MODIFICATIONS DU MESSAGE EXISTANT

### Envoi de message avec fichier

Le flow d'envoi de message actuel doit être modifié pour supporter les fichiers :

1. L'utilisateur tape un message et/ou attache un fichier
2. Au submit :
   a. Le message texte est créé en base (comme avant)
   b. Si un fichier est attaché, il est uploadé via `DocumentUploadService.uploadUserDocument()`
   c. Le `ConversationDocument` est lié au message via `messageId`
3. Le message affiché dans la conversation inclut le texte + le DocumentBanner

### Type de message

Ajouter un type `SYSTEM_DOCUMENT` au enum des types de messages si ce n'est pas déjà fait :

```prisma
enum MessageType {
  TEXT
  SYSTEM          // messages système existants
  SYSTEM_DOCUMENT // document généré par Coridor
}
```

Ou si les types de messages sont des strings, ajouter `"SYSTEM_DOCUMENT"` aux types gérés.

---

## FICHIERS

### Nouveaux fichiers (10)

| Fichier | Rôle |
|---------|------|
| `services/DocumentUploadService.ts` | Upload, stockage, requêtes documents |
| `components/messaging/DocumentBanner.tsx` | Bandeau fichier inline (style Claude) |
| `components/messaging/DocumentUploadInput.tsx` | Input envoi fichier + libellé |
| `components/messaging/DocumentsPanel.tsx` | Panneau latéral liste documents |
| `components/messaging/DocumentsPanelItem.tsx` | Item individuel dans le panneau |
| `components/messaging/DocumentPreview.tsx` | Prévisualisation (images, PDF) |
| `components/messaging/DocumentSystemMessage.tsx` | Message système Coridor |
| `components/messaging/DocumentsButton.tsx` | Bouton accès panneau (header conversation) |
| `hooks/useConversationDocuments.ts` | Hook SWR chargement documents |
| `app/api/documents/[documentId]/download/route.ts` | API téléchargement URL signée |

### Fichiers modifiés (8)

| Fichier | Modification |
|---------|-------------|
| `prisma/schema.prisma` | Modèle ConversationDocument + relations Message/Conversation |
| `app/api/conversations/[conversationId]/messages/route.ts` | Support upload fichier au POST |
| `app/api/conversations/[conversationId]/route.ts` | Nouvelle route /documents (GET) |
| `components/messaging/MessageBubble.tsx` | Intégrer DocumentBanner si message a des documents |
| `components/messaging/MessageInput.tsx` | Ajouter bouton 📎 + DocumentUploadInput |
| `components/messaging/ConversationHeader.tsx` | Ajouter DocumentsButton |
| `services/QuittanceService.ts` (ou équivalent) | Appeler DocumentUploadService après génération |
| `services/LeaseService.ts` (ou équivalent) | Appeler DocumentUploadService après signature bail |

---

## VÉRIFICATIONS

- [ ] Migration Prisma : ConversationDocument créé sans erreur
- [ ] Bucket Supabase `conversation-documents` créé avec RLS
- [ ] Upload fichier : bouton 📎 ouvre le sélecteur, fichier sélectionné affiché en preview
- [ ] Upload fichier : champ libellé optionnel visible et fonctionnel
- [ ] Upload fichier : barre de progression pendant l'upload
- [ ] Upload fichier : types autorisés uniquement (PDF, images, Word, Excel, CSV, texte)
- [ ] Upload fichier : rejet si > 50MB avec message d'erreur
- [ ] DocumentBanner : affiché dans la conversation avec icône, nom/libellé, type, taille, bouton Télécharger
- [ ] DocumentBanner : images affichées en miniature cliquable
- [ ] DocumentBanner : lien "Voir dans Documents →" ouvre le panneau et scroll au bon document
- [ ] DocumentsPanel : s'ouvre en sidebar droite avec animation slide-in
- [ ] DocumentsPanel : liste tous les documents groupés par mois
- [ ] DocumentsPanel : filtres Tous/PDF/Images/Coridor fonctionnels
- [ ] DocumentsPanel : recherche par libellé/nom fonctionnelle
- [ ] DocumentsPanel : lien "Voir dans la conversation →" ferme le panneau et scroll au message
- [ ] DocumentsPanel : message surligné brièvement après scroll
- [ ] DocumentsButton : affiche le compteur correct de documents
- [ ] DocumentSystemMessage : affiché correctement pour les documents Coridor
- [ ] Quittances auto : apparaissent dans la conversation ET dans le panneau Documents
- [ ] Bail signé : apparaît dans la conversation ET dans le panneau Documents
- [ ] EDL : apparaît dans la conversation ET dans le panneau Documents
- [ ] Téléchargement : URL signée fonctionne, fichier se télécharge
- [ ] Sécurité : seuls les participants de la conversation accèdent aux documents
- [ ] Sécurité : impossible de supprimer un document (traçabilité)
- [ ] Mobile : panneau Documents en plein écran
- [ ] Mobile : upload fichier fonctionne (sélecteur natif)
- [ ] Dark mode : tous les composants
- [ ] npm run build → 0 erreurs
