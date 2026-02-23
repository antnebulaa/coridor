# PROMPT IMPLÉMENTATION — État des Lieux Numérique Coridor

## Contexte

Tu implémentes la fonctionnalité **État des Lieux (EDL) numérique** pour Coridor, une webapp française de gestion locative. C'est la pièce maîtresse de tout l'écosystème de confiance (dépôt séquestré, Passeports, dossier CDC).

**Lis attentivement le document SPEC-EDL-V3.md** joint à ce prompt — c'est la source de vérité pour toutes les décisions produit, UX et légales. Ne dévie pas des décisions verrouillées.

Un **prototype interactif JSX** (edl-prototype-v3.jsx) est également fourni comme **référence visuelle uniquement**. Il montre la structure des écrans, le flow de navigation, et le design system. Ce n'est PAS du code production — ne le copie pas tel quel, utilise-le comme maquette de référence.

## Stack existante

```
Frontend :  Next.js App Router (React 18, TypeScript, Tailwind CSS)
Backend :   API Routes Next.js, Prisma ORM
BDD :       Supabase (PostgreSQL)
Storage :   Supabase Storage (pour les photos)
Auth :      Supabase Auth
Signature : YouSign (déjà intégré pour les baux — mais PAS utilisé pour l'EDL, voir spec)
Design :    DM Sans, accent #E8A838, fond dark #0A0A0A
```

## Ce qui existe déjà dans le codebase

- Modèle `Room` (pièces du bien) — peut être lié mais ne pas en dépendre
- Modèle `Lease` (bail) — l'EDL est toujours lié à un bail
- Modèle `Property` (bien) — fournit l'adresse
- Modèle `User` — fournit les identités bailleur/locataire
- Système d'auth Supabase
- Composants UI existants (boutons, cards, inputs) dans le design system Coridor

---

## PHASE 1 — Base de données et API

### 1.1 Schéma Prisma

Implémente exactement le schéma décrit dans la section I de la spec :
- `Inspection` (modèle principal)
- `InspectionMeter` (compteurs)
- `InspectionKey` (clés)
- `InspectionRoom` (pièces)
- `InspectionElement` (éléments par pièce — sols, murs, plafond, équipements)
- `InspectionPhoto` (photos avec metadata)
- `InspectionFurniture` (inventaire meublé)
- `InspectionAmendment` (rectifications 10 jours)

**Points critiques :**
- `@@unique([leaseId, type])` sur Inspection — un seul EDL entrée et un seul sortie par bail
- `@@unique([inspectionId, type])` sur InspectionMeter
- Le champ `isAbsent` sur InspectionElement pour les équipements inexistants
- Le champ `nature` sur InspectionElement pour la nature des revêtements (obligation légale)
- Le champ `evolution` sur InspectionElement pour le diff sortie
- Cascade delete depuis Inspection vers tous les enfants
- Le type `PhotoType` inclut `SURFACE` (pas juste OVERVIEW et DETAIL)

### 1.2 Migration

```bash
npx prisma migrate dev --name add-inspection-models
```

### 1.3 API Routes

Implémente les routes listées dans la section J de la spec. Priorité MVP :

```
POST   /api/inspection                              → Créer (depuis un leaseId)
GET    /api/inspection/[id]                          → Récupérer complet (include rooms, elements, photos)
PATCH  /api/inspection/[id]                          → Mettre à jour status, infos générales
POST   /api/inspection/[id]/rooms                    → Ajouter pièce
PATCH  /api/inspection/[id]/rooms/[roomId]           → Modifier pièce
POST   /api/inspection/[id]/rooms/[roomId]/elements  → Ajouter élément
PATCH  /api/inspection/[id]/elements/[elementId]     → Modifier état/condition
POST   /api/inspection/[id]/photos                   → Upload photo (multipart/form-data)
POST   /api/inspection/[id]/meters                   → Ajouter/modifier compteur
POST   /api/inspection/[id]/keys                     → Ajouter/modifier clé
POST   /api/inspection/[id]/sign                     → Signer (landlord ou tenant)
GET    /api/inspection/[id]/sign-link                → Générer lien signature locataire (JWT 24h)
POST   /api/inspection/[id]/generate-pdf             → Générer PDF final
```

**Sécurité :**
- Vérifier que l'utilisateur est bien landlord ou tenant du bail lié
- Seul le landlord peut modifier un EDL en DRAFT
- Aucune modification après status SIGNED (sauf amendments)
- Le lien de signature locataire est un JWT à expiration 24h

**Upload photo :**
- Accepter multipart/form-data
- Compresser à 2048px max côté long, JPEG 80%
- Générer thumbnail 400px
- Calculer SHA-256 de l'original
- Stocker dans Supabase Storage : `inspections/{inspectionId}/{type}/{elementId}.jpg`
- Capturer metadata : timestamp serveur, géoloc, device info
- Retourner l'URL et le thumbnailUrl

---

## PHASE 2 — Frontend : les écrans

### Architecture des routes Next.js

```
/app/inspection/new/[leaseId]/page.tsx          → Écran Home (sas d'initialisation)
/app/inspection/[id]/meters/page.tsx            → Wizard compteurs
/app/inspection/[id]/keys/page.tsx              → Écran clés
/app/inspection/[id]/rooms/page.tsx             → Hub des pièces
/app/inspection/[id]/rooms/[roomId]/page.tsx    → Inspection pièce (toutes les phases)
/app/inspection/[id]/recap/page.tsx             → Récapitulatif
/app/inspection/[id]/sign/page.tsx              → Signature bailleur
/app/inspection/[id]/sign/tenant/page.tsx       → Signature locataire (accès via lien JWT)
/app/inspection/[id]/done/page.tsx              → Confirmation
```

### 2.1 Home (sas d'initialisation)

- Afficher infos pré-remplies depuis le bail (noms, adresse, date, type)
- Bulle IA : conseil pré-inspection
- Check "locataire présent" (si non → flow mandataire, champ nom + upload mandat)
- CTA → `/inspection/[id]/meters`

### 2.2 Wizard compteurs — PLEINE PAGE

**Principe fondamental : UNE SEULE question par écran, clavier adapté pré-ouvert.**

Implémente un composant `WizardStep` réutilisable :
```tsx
<WizardStep
  title="Électricité"
  icon="⚡"
  label="N° du compteur"
  hint="Ex: PDL-4928103"
  inputMode="text"  // ou "numeric" pour les index
  onNext={(value) => goToStep(next)}
  onBack={() => goToStep(prev)}
  step={1}
  total={7}
/>
```

Et un composant `WizardPhoto` pour les étapes photo :
```tsx
<WizardPhoto
  title="Électricité"
  label="Photo du compteur"
  instruction="Cadrez les chiffres lisiblement"
  onNext={(photoUrl) => goToStep(next)}
/>
```

Dernière étape : résumé en cartes avec option "Pas de gaz".

**Le focus du input doit se faire automatiquement à l'ouverture de chaque étape.**

### 2.3 Clés

1. Zone photo "Posez les clés sur une table" → caméra
2. Steppers (+/-) par type de clé (pré-remplis : porte, BAL, cave, badge, télécommande)
3. Bouton ajouter un type

### 2.4 Hub des pièces

- Liste de cartes avec indicateur (grisé / vert)
- Pièces pré-remplies depuis template basé sur la typologie du bail
- Bouton "+ Ajouter une pièce" (chips rapides des types de pièce)
- Les pièces créées dans l'EDL sont synchronisées vers le modèle Room du bien

### 2.5 Inspection d'une pièce — LE PLUS COMPLEXE

**Ce composant gère plusieurs phases internes** via un état local. Pas de routes séparées par phase — c'est un seul composant avec un state machine.

#### Pills de navigation inter-pièces

Composant `RoomPills` persistant en haut :
- Pills horizontales scrollables montrant toutes les pièces
- Tap = switch direct vers cette pièce (reset de la phase interne)
- Auto-scroll pour centrer la pill active
- Indicateur visuel : active (accent) / done (vert) / todo (grisé)

#### Phases internes (state machine)

```
OVERVIEW → SURFACE_PHOTO → SURFACE_QUALIFY → [DEGRAD_TYPE → DEGRAD_CLOSEUP → DEGRAD_AUDIO] → EQUIP → OBS → DONE
```

**OVERVIEW :**
- Caméra plein écran "Plan large — Cadrez la pièce en entier"
- Indication "Mode paysage recommandé"
- Shutter → sauvegarde photo type OVERVIEW → passe à SURFACE_PHOTO

**SURFACE_PHOTO (pour chaque surface : Sols, Murs, Plafond) :**
- Tabs en haut montrant les 3 surfaces avec état (todo/done)
- Caméra "Photographiez les sols/murs/plafond"
- Shutter → sauvegarde photo type SURFACE → passe à SURFACE_QUALIFY

**SURFACE_QUALIFY :**
- Preview de la photo prise (avec bouton "Reprendre")
- Sélecteur nature revêtement : `<select>` avec options selon la surface (sols: parquet/carrelage/lino... | murs: peinture/papier peint/crépi... | plafond: peinture/lambris/dalles...)
- 5 chips d'état : Neuf / Bon / Usure norm. / Dégradé / H.S.
- Si Neuf/Bon/Usure → option observation vocale → surface suivante ou EQUIP
- Si Dégradé/H.S. → entre dans le sous-flow dégradation

**DEGRAD_TYPE :**
- Pleine page, chips de types : Tache, Rayure, Trou, Fissure, Moisissure, Écaillé, Cassé, Jauni, Décollé, Manquant
- Multi-sélection
- Suivant → DEGRAD_CLOSEUP

**DEGRAD_CLOSEUP :**
- Caméra "Plan serré — Zoomez sur la dégradation"
- Shutter → sauvegarde photo type DETAIL → DEGRAD_AUDIO

**DEGRAD_AUDIO :**
- Bouton micro press-and-hold "Maintenez pour dicter"
- Web Speech API pour transcription
- Affichage du texte transcrit, modifiable
- Fallback clavier
- Enregistrer → retour au flow surfaces (surface suivante ou EQUIP)

**EQUIP :**
- Liste d'équipements pré-remplis selon le type de pièce (voir mapping dans la spec)
- Chaque équipement : 5 chips d'état EN LIGNE + chip "Absent" (grisé)
- Si Dégradé/H.S. → même sous-flow dégradation
- Bulle IA contextuelle (ex: "Testez les volets, le robinet, la VMC")
- Bouton "+ Ajouter un équipement"
- Suivant quand tout est qualifié → OBS

**OBS :**
- Micro pleine page "Observation générale sur la pièce"
- Transcription + fallback clavier
- Valider → toast "✓ [Pièce] validée → [Pièce suivante]" (1 seconde) → auto-avance

### 2.6 Récapitulatif

- Résumé par pièce : surfaces + nombre de photos
- Checklist anti-oubli (détecteur fumée, VMC, joints, volets, sonnette)
- Consigne "Tendez le téléphone au locataire"
- CTA → signature

### 2.7 Signature

**Bailleur :**
- Canvas HTML5 pour signature manuscrite
- Capturer en SVG + metadata (timestamp serveur, IP, user-agent, géoloc)
- Le SVG est stocké dans le champ JSON `landlordSignature`

**Locataire :**
- Bouton "Envoyer le lien de signature"
- Génère un JWT (24h) via `/api/inspection/[id]/sign-link`
- Le locataire accède à `/inspection/[id]/sign/tenant?token=xxx`
- Il voit le récap en mode accordéon (anomalies visibles, "Tout conforme" replié)
- Il peut ajouter des réserves (micro ou clavier)
- Il signe sur son propre téléphone

### 2.8 Confirmation

- Animation succès
- Boutons : voir le PDF, renvoyer par email

---

## PHASE 3 — Génération PDF

Le PDF doit être **conforme au décret 2016-382**. Utilise `@react-pdf/renderer` ou Puppeteer.

Structure du PDF :
```
Page 1 : En-tête légal
  - "ÉTAT DES LIEUX D'ENTRÉE" (ou DE SORTIE) en gros
  - Date, adresse, identité des parties, mandataires
  - [Sortie] Nouvelle adresse locataire, date EDL entrée

Page 2 : Compteurs & Clés
  - Tableau compteurs (type, n°, index, photo thumbnail)
  - Tableau clés (type, quantité)

Pages 3+ : Pièces (une section par pièce)
  - Nom + photo vue d'ensemble
  - Tableau : Élément | Nature | État | Observations
  - Photos : thumbnails (plan moyen + plan serré si dégradation)
  - Réserves locataire encadrées distinctement

Dernière page : Signatures
  - Images SVG des signatures
  - Timestamps
  - Mentions légales (10 jours rectification)
  - "Document établi via Coridor.fr"
```

---

## PHASE 4 — Auto-save et session recovery

- Sauvegarder l'état complet de l'EDL toutes les 5 secondes (PATCH vers l'API)
- Au lancement de l'app, vérifier s'il existe un EDL en status DRAFT → proposer "Reprendre l'EDL en cours"
- Stocker l'état local dans sessionStorage comme backup
- L'EDL reste en DRAFT jusqu'à la première signature

---

## Règles de développement

1. **TypeScript strict** — pas de `any`, interfaces typées pour toutes les données
2. **Server Components par défaut** — Client Components uniquement pour l'interactivité (caméra, signature, formulaires)
3. **Mobile-first** — tous les composants doivent être conçus pour 375px d'abord. Boutons min 44x44px. Texte min 16px.
4. **Accessibilité** — contraste WCAG AA, labels sur les inputs, focus visible
5. **Tests** — au minimum : tests unitaires sur les API routes, test du flow de signature (JWT)
6. **Pas d'over-engineering** — V1 = fonctionnel et conforme. Les optimisations (offline, OCR, IA photo) sont V2.
