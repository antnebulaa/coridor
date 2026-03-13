# Import d'Annonce Externe — Aspirateur d'annonces LeBonCoin / SeLoger / PAP

## Contexte

Un propriétaire qui découvre Coridor a déjà publié son annonce sur LeBonCoin, SeLoger ou PAP. Lui demander de re-saisir toutes les infos est une friction majeure à l'onboarding. Cette feature lui permet de coller l'URL de son annonce existante, et Coridor pré-remplit automatiquement le formulaire de création d'annonce avec les données extraites.

**Le flow :**
1. Le proprio clique "Importer une annonce existante" (bouton sur la page de création d'annonce ou sur le dashboard si aucun bien)
2. Il colle l'URL de son annonce (ex: `leboncoin.fr/ad/immo/2847593847`)
3. Côté serveur : fetch de la page HTML → nettoyage → envoi à Claude Haiku → JSON structuré
4. Le formulaire de création se pré-remplit avec les données extraites
5. Le proprio vérifie, complète ce qui manque (adresse exacte, photos Coridor, critères), et publie

**Coût estimé :** ~0,008 € par import (Claude Haiku 4.5 : ~5 000 tokens input, ~500 tokens output). Négligeable.

**Cadre légal :** Ce n'est PAS du scraping de base de données. C'est le propriétaire de l'annonce lui-même qui fournit l'URL de sa propre annonce, une à la fois, pour importer ses propres données. C'est comparable à un outil de CV parsing qui pré-remplit un profil depuis LinkedIn.

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Backend : API d'import + extraction LLM

**Mission :** Créer l'API route qui reçoit une URL, fetch le HTML, le nettoie, appelle Claude Haiku pour extraire les données structurées, et retourne un JSON mappé aux champs Coridor.

**Fichiers à produire :**
- `app/api/listings/import/route.ts` — **Nouveau**
- `services/ListingImportService.ts` — **Nouveau**
- `lib/listing-import/htmlCleaner.ts` — **Nouveau**
- `lib/listing-import/extractionPrompt.ts` — **Nouveau**
- `lib/listing-import/fieldMapper.ts` — **Nouveau**

### Agent 2 — Frontend : UI d'import + pré-remplissage du formulaire

**Mission :** Créer le composant d'import (input URL + état de chargement + preview des données extraites) et brancher le pré-remplissage sur le formulaire de création d'annonce existant.

**Fichiers à produire/modifier :**
- `components/listing/ListingImportSheet.tsx` — **Nouveau**
- `components/listing/ImportPreview.tsx` — **Nouveau**
- Modifier le formulaire de création d'annonce existant pour accepter des valeurs initiales pré-remplies

---

## AGENT 1 — BACKEND

### API Route `POST /api/listings/import`

```typescript
// Request
{
  url: string; // URL de l'annonce externe
}

// Response (succès)
{
  success: true;
  source: "LEBONCOIN" | "SELOGER" | "PAP" | "BIENICI" | "UNKNOWN";
  confidence: number; // 0-1, confiance globale de l'extraction
  data: ImportedListingData;
  warnings: string[]; // champs non trouvés ou incertains
}

// Response (erreur)
{
  success: false;
  error: "INVALID_URL" | "FETCH_FAILED" | "NOT_A_LISTING" | "EXTRACTION_FAILED";
  message: string;
}
```

**Sécurité :**
- Auth requise (proprio connecté)
- Rate limit : max 10 imports/heure par utilisateur (prévenir les abus)
- Valider que l'URL est bien un domaine autorisé (leboncoin.fr, seloger.com, pap.fr, bienici.com)
- Ne pas stocker le HTML source — uniquement le JSON extrait
- Logger l'import pour analytics (combien d'imports, quel site source, taux de succès)

### ListingImportService.ts

Orchestrateur principal :

```typescript
class ListingImportService {
  /**
   * 1. Valide l'URL
   * 2. Détecte la source (LeBonCoin, SeLoger, PAP...)
   * 3. Fetch le HTML
   * 4. Nettoie le HTML (virer nav, footer, scripts, pubs)
   * 5. Appelle Claude Haiku pour extraction structurée
   * 6. Mappe le JSON extrait aux champs Coridor
   * 7. Retourne les données + warnings
   */
  static async importFromUrl(url: string): Promise<ImportResult> {}
}
```

### htmlCleaner.ts

Nettoie le HTML brut avant de l'envoyer au LLM pour réduire les tokens (= réduire le coût) :

```typescript
/**
 * Prend du HTML brut et retourne un texte nettoyé.
 * 
 * Étapes :
 * 1. Parser le HTML (utiliser cheerio ou node-html-parser)
 * 2. Supprimer : <script>, <style>, <nav>, <footer>, <header>,
 *    <aside>, iframes, éléments publicitaires (data-ad, .ad-*, #ad-*)
 * 3. Extraire le contenu principal :
 *    - Chercher <main>, [role="main"], article, .listing-detail, .ad-detail
 *    - Si pas trouvé, prendre le body entier (après nettoyage)
 * 4. Convertir en texte structuré (garder les titres, listes, tableaux)
 * 5. Tronquer à 8 000 tokens max (~6 000 mots) pour rester dans un coût raisonnable
 * 
 * Objectif : passer de ~50 000 tokens de HTML brut à ~3 000-5 000 tokens de texte utile
 */
export function cleanHtml(rawHtml: string): string {}
```

**Librairie recommandée :** `cheerio` (déjà probablement dans les dépendances ou facile à ajouter). Pas de headless browser (Puppeteer/Playwright) — trop lourd. Un simple `fetch` + cheerio suffit.

**Attention :** certains sites (LeBonCoin notamment) font du rendu client-side (React/SPA). Si le fetch retourne un HTML vide ou un shell SPA, deux options :
- Essayer avec un user-agent mobile (les versions mobiles sont souvent plus statiques)
- Proposer au proprio de coller le texte de l'annonce directement (fallback copier-coller)

### extractionPrompt.ts

Le prompt système envoyé à Claude Haiku :

```typescript
export const EXTRACTION_SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'extraction de données d'annonces immobilières françaises.

Tu reçois le contenu textuel d'une annonce de location immobilière provenant d'un site français (LeBonCoin, SeLoger, PAP, Bien'ici).

Extrais les informations suivantes et retourne UNIQUEMENT un objet JSON valide, sans commentaire ni explication.

Si une information n'est pas trouvée dans le texte, mets null (pas de string vide, pas de valeur inventée).

{
  "title": "string | null — titre de l'annonce",
  "propertyType": "'APARTMENT' | 'HOUSE' | 'STUDIO' | 'LOFT' | null — type de bien",
  "rentAmount": "number | null — loyer mensuel hors charges en euros",
  "chargesAmount": "number | null — montant des charges mensuelles en euros",
  "chargesIncluded": "boolean | null — true si le loyer affiché inclut les charges",
  "securityDeposit": "number | null — dépôt de garantie en euros",
  "surface": "number | null — surface en m²",
  "roomCount": "number | null — nombre de pièces",
  "bedroomCount": "number | null — nombre de chambres",
  "bathroomCount": "number | null — nombre de salles de bain/douche",
  "floor": "number | null — étage (0 = rez-de-chaussée)",
  "totalFloors": "number | null — nombre total d'étages de l'immeuble",
  "hasElevator": "boolean | null — ascenseur",
  "hasBalcony": "boolean | null — balcon ou terrasse",
  "hasParking": "boolean | null — parking ou garage",
  "hasCellar": "boolean | null — cave",
  "isFurnished": "boolean | null — meublé",
  "dpeGrade": "'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | null — classe énergie DPE",
  "gesGrade": "'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | null — classe GES",
  "heatingType": "string | null — type de chauffage (individuel gaz, collectif, électrique...)",
  "constructionYear": "number | null — année de construction",
  "address": {
    "street": "string | null — numéro et nom de rue (si visible)",
    "city": "string | null — ville",
    "zipCode": "string | null — code postal",
    "neighborhood": "string | null — quartier (si mentionné)"
  },
  "description": "string | null — description complète du bien (texte libre)",
  "availableFrom": "string | null — date de disponibilité au format YYYY-MM-DD",
  "photoUrls": ["string[] — URLs des photos si trouvées dans le HTML"]
}

Règles :
- Les montants sont en euros, pas en centimes
- Si le loyer est "850€ CC" (charges comprises), mettre chargesIncluded: true et essayer d'extraire le loyer HC et les charges séparément si l'info est disponible
- Pour le DPE, extraire uniquement la lettre (A à G)
- Les photos : extraire les URLs complètes des images du bien (pas les icônes ou logos du site)
- L'adresse exacte est souvent masquée sur les portails — extrais ce qui est visible (ville, quartier, CP)
- Ne pas inventer d'informations. Si tu n'es pas sûr, mets null`;

export function buildExtractionPrompt(cleanedText: string, sourceUrl: string): string {
  return \`Voici le contenu d'une annonce immobilière provenant de ${sourceUrl} :

---
${cleanedText}
---

Extrais les données au format JSON.\`;
}
```

### Appel à Claude Haiku

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function extractListingData(cleanedHtml: string, sourceUrl: string): Promise<ImportedListingData> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: buildExtractionPrompt(cleanedHtml, sourceUrl),
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  // Parser le JSON (Claude peut parfois entourer de ```json```)
  const cleaned = text.replace(/```json\n?|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  
  return parsed;
}
```

**Important :** l'API Anthropic est déjà dans la stack Coridor (utilisée pour le simulateur ou d'autres features). Vérifier la clé API existante et réutiliser la même instance.

### fieldMapper.ts

Mappe les données extraites aux champs du formulaire de création Coridor :

```typescript
/**
 * Transforme les données extraites par le LLM
 * en valeurs compatibles avec le formulaire Listing Coridor.
 *
 * Mapping :
 * - rentAmount → Listing.price (en centimes si le schema utilise des centimes, vérifier)
 * - chargesAmount → Listing.chargesAmount
 * - surface → RentalUnit.surface OU Listing.surface (vérifier le schema)
 * - roomCount → RentalUnit.roomCount
 * - etc.
 *
 * IMPORTANT : auditer le schema Prisma avant d'implémenter ce mapping.
 * Les noms des champs côté Coridor peuvent différer de ceux extraits.
 */
export function mapToCoridorFields(extracted: ExtractedData): Partial<ListingFormValues> {
  // grep prisma/schema.prisma pour les noms exacts des champs
  // Adapter le mapping en conséquence
}
```

**Avant d'implémenter ce fichier**, l'agent doit :

```bash
# Trouver les champs du formulaire de création d'annonce
grep -rn "interface.*ListingForm\|type.*ListingForm\|CreateListing\|listingSchema" \
  components/ app/ lib/ --include="*.ts" --include="*.tsx" | head -20

# Trouver les champs Listing dans le schema
grep -A 50 "model Listing {" prisma/schema.prisma

# Trouver les champs Property dans le schema
grep -A 30 "model Property {" prisma/schema.prisma

# Trouver les champs RentalUnit
grep -A 20 "model RentalUnit {" prisma/schema.prisma
```

### Source detection

```typescript
function detectSource(url: string): 'LEBONCOIN' | 'SELOGER' | 'PAP' | 'BIENICI' | 'UNKNOWN' {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('leboncoin')) return 'LEBONCOIN';
  if (hostname.includes('seloger') || hostname.includes('logic-immo')) return 'SELOGER';
  if (hostname.includes('pap.fr')) return 'PAP';
  if (hostname.includes('bienici')) return 'BIENICI';
  return 'UNKNOWN';
}
```

### Fallback copier-coller

Si le fetch échoue (SPA rendering, protection anti-bot), l'API doit aussi accepter du texte brut :

```typescript
// POST /api/listings/import
{
  url?: string;           // Option 1 : URL à fetcher
  rawText?: string;       // Option 2 : texte copié-collé par le proprio
}
```

Si `rawText` est fourni, on skip le fetch + nettoyage et on envoie directement au LLM.

---

## AGENT 2 — FRONTEND

### Point d'entrée

L'import se place dans la **modale d'ajout de bien**, sur la page d'accueil de cette modale qui affiche actuellement "Parlez-nous de votre logement" + "Commençons par les caractéristiques principales" + bouton "Commencer".

Ajouter un second chemin sous le bouton principal :

```
┌──────────────────────────────────────────┐
│                                          │
│  Parlez-nous de votre logement           │
│                                          │
│  Commençons par les caractéristiques     │
│  principales                             │
│                                          │
│                                          │
│  [ Commencer ]                           │
│                                          │
│  ── ou ──                                │
│                                          │
│  📋 J'ai déjà une annonce en ligne       │
│  Importez depuis LeBonCoin, SeLoger,     │
│  PAP ou Bien'ici                         │
│                                          │
│  [ Importer mon annonce ]                │
│                                          │
└──────────────────────────────────────────┘
```

- "Commencer" → flow manuel classique (inchangé)
- "Importer mon annonce" → ouvre le ListingImportSheet → après extraction réussie, le proprio atterrit dans le même formulaire mais pré-rempli
- Le séparateur "ou" est discret (`text-neutral-400 text-xs`)
- Le bloc import est secondaire visuellement (pas en concurrence avec le CTA principal)

### ListingImportSheet.tsx

Bottom sheet (mobile) / modale (desktop) avec le flow d'import :

**État 1 — Saisie de l'URL :**
```
┌──────────────────────────────────────────┐
│  Importer une annonce                    │
│                                          │
│  Collez le lien de votre annonce         │
│  LeBonCoin, SeLoger, PAP ou Bien'ici    │
│                                          │
│  [ https://www.leboncoin.fr/ad/im... ]   │
│                                          │
│  [ Importer ]                            │
│                                          │
│  ── ou ──                                │
│                                          │
│  Collez le texte de votre annonce        │
│  [ Coller le texte ]                     │
│                                          │
└──────────────────────────────────────────┘
```

- Input URL avec validation basique (doit commencer par http/https, domaine autorisé)
- Sites supportés affichés sous l'input avec leurs logos (petit, discret)
- Lien "Collez le texte" ouvre un textarea en fallback

**État 2 — Chargement :**
```
┌──────────────────────────────────────────┐
│  Importer une annonce                    │
│                                          │
│        [animation de chargement]         │
│                                          │
│  Analyse de votre annonce en cours...    │
│  LeBonCoin détecté                       │
│                                          │
└──────────────────────────────────────────┘
```

- Skeleton ou spinner élégant
- Afficher la source détectée pendant le chargement
- Timeout : 15 secondes max, puis erreur

**État 3 — Erreur :**
```
┌──────────────────────────────────────────┐
│  Importer une annonce                    │
│                                          │
│  ⚠️ Impossible de lire cette annonce     │
│                                          │
│  Le site bloque peut-être l'accès.       │
│  Essayez de coller le texte de votre     │
│  annonce directement.                    │
│                                          │
│  [ Coller le texte ]  [ Réessayer ]      │
│                                          │
└──────────────────────────────────────────┘
```

- Message d'erreur humain (pas de code technique)
- Proposition du fallback copier-coller
- Bouton réessayer

**État 4 — Succès → fermer le sheet, pré-remplir le formulaire**

Pas de preview intermédiaire. Le sheet se ferme et le formulaire se remplit. Le proprio voit directement ses champs pré-remplis et peut les modifier. C'est plus rapide que de valider un écran de preview.

Les champs pré-remplis sont visuellement marqués (petit badge "importé" ou bordure colorée subtile) pour que le proprio sache ce qui vient de l'import et ce qu'il doit vérifier/compléter.

### Pré-remplissage du formulaire

Le formulaire de création d'annonce existant doit accepter des `defaultValues` :

```typescript
// Dans le composant formulaire de création d'annonce
interface CreateListingFormProps {
  importedData?: Partial<ListingFormValues>; // ← NOUVEAU
}

// Utiliser importedData comme defaultValues dans le form (react-hook-form ou équivalent)
// Les champs null dans importedData restent vides
```

**Champs à pré-remplir (dans l'ordre de fiabilité) :**

| Champ formulaire | Source import | Fiabilité |
|---|---|---|
| Titre | title | Haute |
| Type de bien | propertyType | Haute |
| Loyer | rentAmount | Haute |
| Charges | chargesAmount | Moyenne (parfois absent) |
| Surface | surface | Haute |
| Nombre de pièces | roomCount | Haute |
| Nombre de chambres | bedroomCount | Moyenne |
| Meublé/Nu | isFurnished | Haute |
| DPE | dpeGrade | Haute (obligatoire sur les portails) |
| GES | gesGrade | Haute |
| Étage | floor | Moyenne |
| Ascenseur | hasElevator | Moyenne |
| Balcon/Terrasse | hasBalcony | Moyenne |
| Parking | hasParking | Moyenne |
| Cave | hasCellar | Moyenne |
| Description | description | Haute |
| Ville / CP | address.city, address.zipCode | Haute |
| Rue | address.street | Basse (souvent masquée) |
| Disponibilité | availableFrom | Moyenne |

**Ce qu'il manquera toujours et que le proprio doit compléter :**
- Adresse exacte (numéro + rue) — les portails masquent cette info
- Photos — à uploader depuis son appareil (les URLs des portails ne sont pas réutilisables durablement)
- Critères Coridor (4 toggles : badge payeur, garant, animaux, étudiants)
- Dépôt de garantie (parfois absent de l'annonce)

### Badge "Importé" sur les champs

Pour chaque champ pré-rempli par l'import, afficher un petit indicateur discret :

```typescript
// Composant réutilisable
function ImportedFieldBadge() {
  return (
    <span className="text-[9px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full ml-1.5">
      importé
    </span>
  );
}
```

Affiché à côté du label du champ. Disparaît dès que le proprio modifie la valeur.

---

## FICHIERS RÉCAPITULATIF

### Nouveaux

| Fichier | Agent | Rôle |
|---------|-------|------|
| `app/api/listings/import/route.ts` | 1 | API route d'import |
| `services/ListingImportService.ts` | 1 | Orchestrateur : fetch → clean → LLM → map |
| `lib/listing-import/htmlCleaner.ts` | 1 | Nettoyage HTML → texte |
| `lib/listing-import/extractionPrompt.ts` | 1 | Prompt système + builder |
| `lib/listing-import/fieldMapper.ts` | 1 | Mapping données extraites → champs Coridor |
| `components/listing/ListingImportSheet.tsx` | 2 | UI : bottom sheet d'import (URL/texte) |

### Modifiés

| Fichier | Agent | Modification |
|---------|-------|-------------|
| Formulaire de création d'annonce | 2 | Accepter `importedData` en props, pré-remplir les champs |
| Modale d'ajout de bien (page d'accueil) | 2 | Ajouter le bloc "J'ai déjà une annonce en ligne" + bouton "Importer mon annonce" sous le bouton "Commencer" |

### Dépendances à ajouter

| Package | Rôle |
|---------|------|
| `cheerio` | Parser HTML pour le nettoyage (probablement déjà présent, sinon `npm install cheerio`) |
| `@anthropic-ai/sdk` | Client API Anthropic (probablement déjà présent) |

---

## VÉRIFICATIONS

### Agent 1
- [ ] Audit du schema Prisma AVANT d'écrire le fieldMapper (grep les champs Listing, Property, RentalUnit)
- [ ] URL validée : domaines autorisés uniquement (leboncoin.fr, seloger.com, pap.fr, bienici.com)
- [ ] Rate limit : 10 imports/heure/utilisateur
- [ ] Auth requise
- [ ] HTML nettoyé passe de ~50k tokens à ~3-5k tokens
- [ ] Appel Claude Haiku (pas Sonnet, pas Opus — Haiku suffit et coûte 0,008€/import)
- [ ] JSON parsé correctement même si Claude entoure de ```json```
- [ ] Fallback copier-coller fonctionne (rawText au lieu de url)
- [ ] Erreurs gérées proprement : URL invalide, fetch échoué, HTML vide (SPA), extraction ratée
- [ ] Pas de stockage du HTML source (uniquement le JSON extrait)
- [ ] Log de chaque import : userId, source, succès/échec, nombre de champs remplis
- [ ] Timeout de 15s sur le fetch + 30s sur l'appel LLM

### Agent 2
- [ ] Bouton "Importer une annonce" visible en haut du formulaire de création
- [ ] Bottom sheet avec les 4 états (saisie, chargement, erreur, succès)
- [ ] Fallback texte copier-coller accessible facilement
- [ ] Message d'erreur humain (pas de stack trace)
- [ ] Formulaire pré-rempli après import — champs remplis visuellement identifiables (badge "importé")
- [ ] Badge "importé" disparaît quand le proprio modifie le champ
- [ ] Champs manquants (null) restent vides — pas de valeur inventée
- [ ] Le proprio peut modifier tous les champs pré-remplis normalement
- [ ] Mobile-first : bottom sheet sur mobile, modale sur desktop
- [ ] Le flow ne bloque pas : si l'import échoue, le proprio peut remplir manuellement
- [ ] `npm run build` → 0 erreurs
