# SPEC — État des Lieux Numérique Coridor
## Version 3.0 — Février 2026 (VERROUILLÉE)

---

# Vision produit

L'application n'est pas un formulaire numérisé. C'est un **appareil photo intelligent et assisté**. Le postulat fondamental : on photographie d'abord, on qualifie ensuite, on dicte au lieu de taper.

Trois principes non négociables :
1. **Photo-first** → chaque surface est photographiée, même en bon état (preuve à l'entrée = protection à la sortie)
2. **Wizard pleine page** → si l'utilisateur doit taper quelque chose, un seul champ par écran, clavier adapté pré-ouvert
3. **Audio natif** → les observations sont dictées, pas tapées (on est debout, une main occupée)

---

# A. Qui fait quoi ? Le flow collaboratif

## Décision : "One-Device Flow" — Un pilote, deux signataires

L'EDL se fait sur **un seul appareil** (celui du proprio). Le locataire est physiquement à côté, regarde l'écran (pensé pour être lisible à ~1m grâce au thème dark et aux gros contrastes), et le téléphone lui est tendu à la fin pour la phase de revue et réserves.

**Pourquoi un seul device :**
- Réalité du terrain : caves sans réseau, locataires avec téléphone déchargé, personnes âgées
- Pas de sync temps réel (complexité massive pour gain nul)
- Ils sont côte à côte, un mur ne peut pas être "bon" et "dégradé" en même temps
- Toutes les apps pro (Check & Visit, Chapps) font pareil

**Le flow :**

```
1. INITIATION → Le proprio ouvre l'EDL, Coridor pré-remplit tout (bail, noms, adresse)
2. SUR PLACE  → Le proprio tient le téléphone, photographie et qualifie
                 Le locataire regarde et intervient oralement
3. REVUE      → Le proprio tend le téléphone au locataire
                 Écran accordéon : seules les anomalies sont visibles
                 Le locataire peut ajouter des réserves horodatées
4. SIGNATURE  → Le proprio signe sur son écran (canvas tactile)
                 Un lien est envoyé au locataire qui signe sur son propre téléphone
5. ENVOI      → PDF généré et envoyé aux deux parties
```

**Mandataire :** Si une partie est absente → champ mandataire (nom + qualité + photo du mandat). Le mandataire signe à sa place.

**Refus de signer :** Message explicatif + CTA "Trouver un commissaire de justice" (frais partagés).

---

# B. Le parcours écran par écran

## Écran 1 : Sas d'initialisation

- Fond dark, infos pré-remplies depuis le bail (noms, adresse, date, type)
- Bulle IA : "Assurez-vous que l'électricité fonctionne et que le logement est vide"
- Check obligatoire : "Le locataire est présent" (déclenche flow Mandataire si non)
- CTA : "Commencer l'inspection →"

## Écran 2 : Compteurs — Wizard pleine page

**Pattern : une seule question par écran, clavier adapté.**

```
Étape 1/7 → ⚡ "N° du compteur électricité"    [clavier alphanumérique]
Étape 2/7 → ⚡ "Index (kWh)"                    [clavier numérique]
Étape 3/7 → ⚡ Photo du compteur                 [caméra plein écran]
Étape 4/7 → 💧 "N° du compteur eau"             [clavier alphanumérique]
Étape 5/7 → 💧 "Index (m³)"                     [clavier numérique]
Étape 6/7 → 💧 Photo du compteur                 [caméra plein écran]
Étape 7/7 → Résumé : cartes avec N°, index, photos + option "Pas de gaz"
```

**V1 :** Saisie manuelle des index + photo obligatoire.
**V2 :** OCR automatique depuis la photo avec fallback saisie manuelle.

## Écran 3 : Clés & accès

1. **Photo d'abord** : "Posez toutes les clés séparées sur une table et photographiez-les" → la photo fait preuve ET aide à compter
2. **Compteurs par type** : steppers (+/-) pour chaque type d'accès (porte, BAL, cave, badge, télécommande, digicode)
3. Ajout de types supplémentaires possible

## Écran 4 : Hub des pièces

- Liste de grosses cartes verticales, une par pièce
- Indicateurs visuels : grisé (non faite), vert (complète)
- Template auto basé sur le bail (Studio/T2/T3…)
- Bouton "+ Ajouter une pièce" avec chips rapides
- Pas besoin de suivre l'ordre : on commence par où on est
- Bulle IA : "Commencez par la pièce où vous êtes"

## Écran 5 : Inspection d'une pièce — Le cœur du réacteur

### Navigation inter-pièces : Pills flottantes

Un bandeau de **pills horizontales scrollables** est persistant en haut quand on inspecte une pièce. Tap sur "Cuisine" → on y est direct, sans repasser par le hub. L'auto-scroll centre la pill active.

### Phase 1 : Vue d'ensemble (plan large)

- Caméra plein écran avec viseur
- Consigne : "Cadrez la pièce en entier — Mode paysage recommandé"
- Le gros bouton shutter déclenche la photo
- C'est le **contexte de référence** de la pièce

### Phase 2 : Surfaces — Photo PUIS qualification

Pour chaque surface (Sols → Murs → Plafond), le flow est :

```
1. CAMÉRA S'OUVRE → "Photographiez les sols"
   → L'utilisateur shoote
   
2. LA PHOTO S'AFFICHE → preview avec bouton "Reprendre"
   → En dessous : sélecteur Nature du revêtement (Parquet ▾ / Carrelage / Lino...)
   → Puis 5 chips d'état : [Neuf] [Bon] [Usure norm.] [Dégradé] [H.S.]
   
3a. Si "Neuf", "Bon" ou "Usure norm." → option "Ajouter observation vocale" → Suivant
   
3b. Si "Dégradé" ou "H.S." → SOUS-FLOW DÉGRADATION :
    → La photo de base devient le "plan moyen" (contexte)
    → Écran choix type de dégradation (chips pleine page)
    → Écran photo "plan serré" (zoom sur le défaut)
    → Écran observation vocale (micro maintenez-pour-dicter)
    → Retour au flow principal, surface suivante
```

**Tabs de surface** en haut : `Sols` `Murs` `Plafond` — permettent de naviguer entre surfaces, de revenir corriger. Check vert quand complété.

### Phase 3 : Équipements — Mode checklist

Les équipements ne se photographient pas (sauf dégradation), on les **vérifie**.

- Liste d'équipements pré-remplie selon le type de pièce
- Chaque équipement : 5 chips d'état en ligne + chip "Absent" (si l'équipement n'existe pas)
- Si "Dégradé" ou "H.S." → même sous-flow dégradation (photo + audio)
- Bouton "+ Ajouter un équipement"
- Bulle IA contextuelle : "Testez les volets, ouvrez les fenêtres, essayez les robinets"

### Phase 4 : Observation générale

- Micro pleine page "Maintenez pour dicter"
- Transcription affichée, modifiable
- Fallback clavier disponible
- → Valider la pièce ✓

### Transition entre pièces

Quand une pièce est validée :
- **Toast de confirmation** : "✓ Cuisine validée → Chambre" (1 seconde)
- **Auto-avance** vers la prochaine pièce non faite
- Quand toutes les pièces sont faites → retour au hub

## Écran 6 : Récapitulatif

- Carte résumé : X pièces inspectées, compteurs, clés
- Détail par pièce : état des surfaces + nombre de photos
- **Checklist anti-oubli IA** : détecteur fumée, VMC, joints SdB, volets, sonnette
- Consigne : "Tendez le téléphone au locataire pour la revue contradictoire"

## Écran 7 : Revue contradictoire (locataire)

- **Accordéon** : seules les anomalies sont visibles (dégradations + observations)
- Les éléments "Bon"/"Neuf" sont repliés sous "Tout est conforme"
- Le locataire peut ajouter des **réserves** sur n'importe quel élément (micro ou clavier)
- Chaque réserve est horodatée et attribuée au locataire
- Rappel légal en bas : "Vous disposez de 10 jours pour signaler un défaut non visible"

## Écran 8 : Signature

- **Bailleur** : canvas tactile sur son téléphone (SVG + metadata : timestamp, IP, géoloc)
- **Locataire** : lien unique envoyé par SMS/notif. Il parcourt le récap sur son propre téléphone, peut ajouter des réserves, et signe.
- Pas de YouSign (trop lourd pour du sur-place). Canvas tactile = la bonne approche.
- Token JWT à expiration 24h pour le lien de signature

## Écran 9 : Confirmation

- Animation de succès
- PDF généré côté serveur, envoyé par email aux deux parties
- Accessible dans Coridor (section Documents du bail)
- Bandeau "10 jours pour rectifier" visible dans l'app

---

# C. La saisie de l'état : 5 niveaux

| Chip | Signification | Couleur | Usage |
|------|--------------|---------|-------|
| **Neuf** | Jamais utilisé, état parfait | 🟢 Vert | Logement neuf ou élément remplacé |
| **Bon** | Usure minime, très bon état | 🔵 Bleu | La majorité des éléments à l'entrée |
| **Usure normale** | Marques d'usage, vétusté attendue | 🟡 Jaune | Distinction juridique clé : non imputable au locataire |
| **Dégradé** | Dommage visible au-delà de l'usure | 🟠 Orange | Déclenche le sous-flow dégradation |
| **H.S.** | Ne fonctionne pas / irréparable | 🔴 Rouge | Déclenche le sous-flow dégradation |

**Pourquoi 5 et pas 4 (Neuf/Bon/Usage/Dégradé) :**
- "H.S." est distinct de "Dégradé" : un radiateur rayé ≠ un radiateur qui ne s'allume pas
- "Usure normale" est la distinction juridique fondamentale pour le calcul de vétusté à la sortie

**Équipements : 6ème option "Absent"** — si l'équipement listé n'existe pas dans le logement (ex: hotte, sèche-serviettes). Chip grisé, ne génère pas de ligne dans le document final.

---

# D. Nature des revêtements (obligation légale)

Le décret exige la "description précise des revêtements". Un sélecteur discret est affiché sur l'écran de qualification de chaque surface :

**Sols :** Parquet | Carrelage | Lino/Vinyle | Moquette | Béton ciré | Autre
**Murs :** Peinture | Papier peint | Crépi | Carrelage | Lambris | Autre
**Plafond :** Peinture | Lambris | Dalles | Autre

Format : dropdown discret "Nature : Parquet ▾" au-dessus des chips d'état.

---

# E. Stratégie photo

## Principe : ON PHOTOGRAPHIE TOUT

Chaque surface de chaque pièce a obligatoirement une photo, même en bon état. La photo prouve l'état à l'entrée = protection des deux parties à la sortie.

### Types de photos

| Type | Quand | Obligatoire | Usage |
|------|-------|-------------|-------|
| **OVERVIEW** | Entrée dans une pièce | Oui (1 par pièce) | Vue d'ensemble, contexte |
| **SURFACE** | Pour chaque surface (sols, murs, plafond) | Oui (1 par surface) | Preuve d'état, plan moyen |
| **DETAIL** | Quand dégradation signalée | Oui si dégradé | Plan serré sur le défaut |
| **METER** | Compteurs | Oui | Index lisible |
| **KEY** | Clés posées sur table | Oui | Inventaire visuel |

### Volume estimé par EDL

- T2 (4 pièces) : ~20 photos minimum → ~10 MB
- T3 (6 pièces) : ~30 photos minimum → ~15 MB
- Avec dégradations : +2-3 photos par dégradation

### Métadonnées par photo

- Timestamp serveur (fait foi) + timestamp device (recoupement)
- Géolocalisation (si autorisée)
- Device info
- Hash SHA-256 de l'original (preuve d'intégrité)
- Lien vers pièce + élément

### Compression et stockage

- Capture : résolution native du device
- Stockage : JPEG 80%, max 2048px côté long
- Thumbnail : 400px, 60% qualité
- Original HD : conservé 30 jours puis supprimé
- Compressé : durée du bail + 3 ans (prescription)
- Upload en arrière-plan (service worker + file d'attente)

---

# F. Audio : commentaires vocaux → texte

## Flow technique

1. L'utilisateur maintient le bouton 🎤 (press-and-hold)
2. Animation ondes sonores pendant l'enregistrement
3. Relâche → transcription instantanée affichée
4. Le texte est modifiable avant validation
5. Le fichier audio n'est PAS conservé (RGPD)

## Technologie

- **V1 :** Web Speech API (native browser, gratuit, bon en français)
- **V2 :** Whisper API (meilleur en bruit ambiant)

## Moments d'utilisation

- **Après photo de dégradation** → décrire le défaut (obligatoire dans le sous-flow)
- **Observation générale** → fin de chaque pièce
- **Réserves locataire** → pendant la revue contradictoire
- Fallback clavier toujours disponible

---

# G. L'EDL de sortie — Le Diff Mode

## Lancement

Le proprio initie l'EDL de sortie. L'app charge la **même structure** que l'entrée.

## L'écran d'inspection sortie

Pour chaque surface, l'écran est divisé :
- En haut : la photo prise à l'entrée
- En bas : la caméra live
- **Ghosting (V2)** : superposition semi-transparente de l'ancienne photo sur la caméra pour aider à cadrer au même angle

## Qualification

Deux gros boutons après la photo :
- **[État identique]** → auto-sélectionné si même qualification → gain de temps massif (~80% des éléments)
- **[Nouvelle dégradation]** → sous-flow : type + photo serré + observation vocale

## Qualification de la vétusté

Si dégradation signalée, l'IA pose la question : "Dégradation accidentelle ou usure naturelle (vétusté) ?"

Si grille de vétusté annexée au bail → calcul automatique :
```
Rayure parquet cuisine
  Durée depuis installation : 8 ans
  Franchise grille : 2 ans
  Abattement annuel : 10%
  Vétusté applicable : 60%
  → Part locataire estimée : 40% du devis
```

## Lien avec le dépôt séquestré

Le bouton "Proposer des retenues" en fin de diff mène directement au flow de dépôt séquestré. Les dégradations sont pré-chargées avec le calcul de vétusté.

---

# H. L'agent IA : guidage contextuel

L'IA n'est PAS un chatbot. C'est un guide contextuel (cards/toasts, icône 💡, couleur ambrée).

| Moment | Intervention |
|--------|-------------|
| Début EDL | "Vérifiez que l'électricité fonctionne et que le logement est vide" |
| Entrée pièce | Pré-remplit équipements standards du type de pièce |
| Cuisine | "Testez : plaques, four, robinet, VMC" |
| SdB | "Vérifiez joints douche/baignoire et VMC" |
| Dégradation signalée | "Prenez le plan serré et décrivez" |
| Fin toutes pièces | Checklist anti-oubli (détecteur fumée, VMC, joints, volets, sonnette) |
| Récap avant signature | "Il manque X photos" (si applicable) |
| EDL sortie | Aide à qualifier vétusté vs dégradation |

---

# I. Modèle de données Prisma

```prisma
model Inspection {
  id            String    @id @default(cuid())
  leaseId       String
  lease         Lease     @relation(fields: [leaseId], references: [id])
  propertyId    String
  property      Property  @relation(fields: [propertyId], references: [id])

  type          InspectionType   // ENTRY | EXIT
  status        InspectionStatus // DRAFT | PENDING_SIGNATURE | SIGNED | LOCKED | AMENDED

  date          DateTime         // Date d'établissement
  address       String           // Adresse complète

  landlordId    String
  landlord      User      @relation("InspectionLandlord", fields: [landlordId], references: [id])
  tenantId      String
  tenant        User      @relation("InspectionTenant", fields: [tenantId], references: [id])

  landlordAgent     String?
  landlordAgentDoc  String?
  tenantAgent       String?
  tenantAgentDoc    String?

  entryInspectionId  String?
  entryInspection    Inspection? @relation("EntryExit", fields: [entryInspectionId], references: [id])
  exitInspection     Inspection? @relation("EntryExit")
  tenantNewAddress   String?

  meters        InspectionMeter[]
  keys          InspectionKey[]
  rooms         InspectionRoom[]

  landlordSignature   Json?      // { svg, timestamp, ip, userAgent, geoLocation }
  tenantSignature     Json?
  landlordSignedAt    DateTime?
  tenantSignedAt      DateTime?

  pdfUrl        String?
  pdfHash       String?

  rectificationDeadline  DateTime?
  amendments             InspectionAmendment[]

  isFurnished   Boolean   @default(false)
  furnitureItems InspectionFurniture[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  signedAt      DateTime?
  lockedAt      DateTime?

  @@unique([leaseId, type])
}

enum InspectionType { ENTRY EXIT }
enum InspectionStatus { DRAFT PENDING_SIGNATURE SIGNED LOCKED AMENDED }

model InspectionMeter {
  id            String    @id @default(cuid())
  inspectionId  String
  inspection    Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  type          MeterType
  meterNumber   String?
  indexHP       String?
  indexHC       String?
  indexMain     String?
  photoUrl      String?
  absent        Boolean @default(false)
  @@unique([inspectionId, type])
}

enum MeterType { ELECTRICITY WATER GAS }

model InspectionKey {
  id            String    @id @default(cuid())
  inspectionId  String
  inspection    Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  type          String
  quantity      Int    @default(0)
  notes         String?
  @@unique([inspectionId, type])
}

model InspectionRoom {
  id            String    @id @default(cuid())
  inspectionId  String
  inspection    Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  roomId        String?
  room          Room?     @relation(fields: [roomId], references: [id])
  name          String
  type          RoomType
  sortOrder     Int    @default(0)
  overviewPhotoUrl  String?
  generalNotes      String?
  elements      InspectionElement[]
  createdAt     DateTime  @default(now())
}

enum RoomType {
  ENTRY HALLWAY LIVING BEDROOM KITCHEN BATHROOM WC
  LAUNDRY OFFICE DRESSING BALCONY TERRACE CELLAR PARKING GARAGE OTHER
}

model InspectionElement {
  id            String    @id @default(cuid())
  roomId        String
  room          InspectionRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  category      ElementCategory
  name          String
  nature        String?          // "Parquet chêne", "Carrelage", "Peinture blanche"
  sortOrder     Int    @default(0)
  condition     ElementCondition
  isAbsent      Boolean @default(false)  // Équipement absent du logement
  degradationType String?
  notes         String?
  entryElementId  String?
  evolution       ElementEvolution?
  photos        InspectionPhoto[]
  createdAt     DateTime  @default(now())
}

enum ElementCategory { FLOOR WALL CEILING EQUIPMENT }
enum ElementCondition { NEW GOOD NORMAL_WEAR DEGRADED OUT_OF_SERVICE }
enum ElementEvolution { UNCHANGED NORMAL_WEAR DETERIORATION IMPROVEMENT }

model InspectionPhoto {
  id            String    @id @default(cuid())
  elementId     String?
  element       InspectionElement? @relation(fields: [elementId], references: [id], onDelete: Cascade)
  url           String
  thumbnailUrl  String?
  originalHash  String
  type          PhotoType
  timestamp     DateTime
  timestampDevice DateTime?
  geoLatitude   Float?
  geoLongitude  Float?
  geoAccuracy   Float?
  deviceInfo    String?
  createdAt     DateTime  @default(now())
}

enum PhotoType { OVERVIEW SURFACE DETAIL METER KEY }

model InspectionFurniture {
  id            String    @id @default(cuid())
  inspectionId  String
  inspection    Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  roomName      String
  name          String
  condition     ElementCondition
  notes         String?
  photoUrl      String?
  createdAt     DateTime  @default(now())
}

model InspectionAmendment {
  id            String    @id @default(cuid())
  inspectionId  String
  inspection    Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  requestedBy   String
  requestedAt   DateTime  @default(now())
  description   String
  photoUrls     String[]
  status        AmendmentStatus
  respondedAt   DateTime?
  responseNotes String?
  createdAt     DateTime  @default(now())
}

enum AmendmentStatus { PENDING ACCEPTED REJECTED }
```

---

# J. Architecture technique

## API Routes

```
POST   /api/inspection                              Créer un EDL
GET    /api/inspection/[id]                          Récupérer un EDL complet
PATCH  /api/inspection/[id]                          Mettre à jour
POST   /api/inspection/[id]/rooms                    Ajouter pièce
PATCH  /api/inspection/[id]/rooms/[roomId]           Modifier pièce
POST   /api/inspection/[id]/rooms/[roomId]/elements  Ajouter élément
PATCH  /api/inspection/[id]/elements/[elementId]     Modifier état
POST   /api/inspection/[id]/photos                   Upload photo (multipart)
POST   /api/inspection/[id]/meters                   Ajouter compteur
POST   /api/inspection/[id]/keys                     Ajouter clé
POST   /api/inspection/[id]/sign                     Signer
GET    /api/inspection/[id]/sign-link                Lien signature locataire
POST   /api/inspection/[id]/generate-pdf             Générer PDF
POST   /api/inspection/[id]/amendments               Demander rectification
GET    /api/inspection/[id]/diff                     Diff entrée↔sortie
GET    /api/inspection/[id]/export-cdc               Export dossier CDC
```

## Offline

- Service Worker + IndexedDB
- Sauvegarde auto toutes les 5 secondes
- Photos stockées en local, sync au retour du réseau
- Indicateur : 🟢 En ligne / 🟡 Sync / 🔴 Hors ligne
- Écran "Reprendre l'EDL en cours" au lancement

## Stockage Supabase

```
Bucket: "inspections"
  {inspectionId}/
    overview/{roomId}.jpg
    surfaces/{elementId}.jpg
    details/{elementId}-{index}.jpg
    meters/{meterType}.jpg
    keys/all.jpg
    thumbnails/{photoId}-thumb.jpg

RLS: lecture landlord+tenant | écriture landlord en DRAFT | jamais de suppression post-signature
```

---

# K. Checklist conformité légale

| # | Obligation (Décret 2016-382) | Couverture Coridor | ✓ |
|---|---|---|---|
| 1 | Type d'EDL | Champ `type` ENTRY/EXIT | ✅ |
| 2 | Date d'établissement | Champ `date`, horodatage serveur | ✅ |
| 3 | Localisation | Champ `address`, pré-rempli | ✅ |
| 4 | Nom des parties + domicile bailleur | Relations `landlord`/`tenant` | ✅ |
| 5 | Mandataires | Champs optionnels + upload mandat | ✅ |
| 6 | Relevés compteurs | InspectionMeter (élec/eau/gaz) + photos | ✅ |
| 7 | Détail clés et accès | InspectionKey (type + quantité) + photo | ✅ |
| 8 | Description état pièce par pièce (sols, murs, plafonds, équipements) | InspectionElement avec categories + nature revêtement | ✅ |
| 9 | Observations, réserves, images | Notes + audio transcrit + photos obligatoires | ✅ |
| 10 | Signature des parties | Canvas tactile + metadata | ✅ |
| 11 | [Sortie] Nouvelle adresse locataire | Champ `tenantNewAddress` | ✅ |
| 12 | [Sortie] Date EDL d'entrée | Via `entryInspectionId` | ✅ |
| 13 | [Sortie] Évolutions constatées | `evolution` par élément + diff auto | ✅ |
| 14 | Comparaison entrée ↔ sortie | Même structure + diff visuel + split-screen | ✅ |
| 15 | Support électronique | PDF + stockage numérique | ✅ |
| 16 | Remis à chaque partie | Email auto + accès in-app | ✅ |
| 17 | Illustré d'images | Photos obligatoires par surface | ✅ |
| 18 | [Meublé] Inventaire mobilier | InspectionFurniture | ✅ |
| 19 | Rectification 10 jours | Bandeau + InspectionAmendment | ✅ |
| 20 | Vétusté | Calcul auto si grille annexée | ✅ |

---

# L. Priorisation

## MVP (avant beta)

- Flow complet EDL d'entrée (tous les écrans décrits)
- Wizard pleine page pour compteurs
- Photo obligatoire chaque surface + vue d'ensemble
- 5 niveaux d'état + nature revêtements
- Sous-flow dégradation (type + plan serré + audio)
- Navigation par pills entre pièces
- Équipements pré-remplis par type + chip "Absent"
- Clés (photo + steppers)
- Observations vocales (Web Speech API)
- Signature canvas tactile + lien locataire
- PDF conforme + distribution auto
- Sauvegarde auto (DRAFT) + écran "Reprendre"
- Bandeau rectification 10 jours
- Toast de transition entre pièces

## V2

- EDL de sortie avec diff automatique
- Split-screen photos entrée ↔ sortie
- Ghosting (overlay photo entrée sur caméra live)
- Calcul vétusté avec grille intégrée
- Lien dépôt séquestré (proposition retenues)
- Mode offline complet (IndexedDB + sync)
- OCR compteurs
- Whisper API (meilleure transcription)
- Checklist anti-oubli intelligente
- Inventaire meublé complet
- Export dossier CDC

## V3 (Scale)

- Analyse photo IA (détection dégradations)
- Suggestions IA état + type de dégradation
- Import EDL papier (scan + extraction IA)
- Grille vétusté dynamique par région

---

# M. Améliorations identifiées (à tester en conditions réelles)

1. **Chip "Absent" pour équipements** — quand l'équipement listé n'existe pas dans le logement
2. **Sélecteur nature revêtement** — dropdown "Nature : Parquet ▾" sur l'écran de qualification
3. **Toast de transition** — "✓ Cuisine validée → Chambre" (1s) avant auto-avance
4. **Indicateur mode paysage** — "Tournez votre téléphone →" pour les vues d'ensemble
5. **Session recovery** — "Reprendre l'EDL en cours" si l'app est fermée/relancée
