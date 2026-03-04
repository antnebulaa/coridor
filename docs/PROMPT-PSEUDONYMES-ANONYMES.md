# Feature Pseudonymes Anonymes — Identités Fun Coridor

## Contexte

Coridor anonymise les candidatures pour lutter contre la discrimination. Chaque locataire reçoit un pseudonyme généré aléatoirement au format **emoji + nom fun** (inspiré de Transit). Le locataire peut régénérer jusqu'à trouver un combo qui lui plaît. Le pseudonyme est utilisé partout où l'identité est masquée (candidature, messagerie pré-sélection, pipeline propriétaire).

**Philosophie :** Tout le sérieux est dans le système (Badge Payeur, Passeport, documents horodatés). Le pseudonyme se permet d'être humain, chaleureux et drôle. Ça désamorce la tension des visites ("Vous êtes Concombre Captivant ? Haha"), ça différencie Coridor de toutes les apps sérieuses et froides du marché, et ça rend la recherche d'appartement plus fun.

**Exemples de pseudonymes :**
- 🥒 Concombre Captivant
- ⛸️ Patineur Déterminé
- 🤠 Cowboy du Mercredi
- 🌿 Arôme Farouche
- 🚂 Train Pénible
- 🦊 Renard Cosmique
- 🍋 Citron Audacieux
- 🎺 Trompette Discrète
- 🦉 Hibou Élégant
- 🧊 Glaçon Passionné

---

## ORGANISATION EN TEAM AGENTS

Ce prompt est conçu pour être exécuté avec des sous-agents spécialisés.

### Agent 1 — Dictionnaire & Génération (Backend)

**Mission :** Créer le dictionnaire de mots (emojis, noms, adjectifs, prépositions), la logique de génération, le filtre anti-combinaisons gênantes, et le service côté serveur.

**Fichiers à produire :**
- `lib/pseudonym/dictionary.ts` — dictionnaires de mots
- `lib/pseudonym/blacklist.ts` — combinaisons interdites
- `lib/pseudonym/generator.ts` — logique de génération
- `services/PseudonymService.ts` — service complet (génération, attribution, régénération)
- `app/api/pseudonym/generate/route.ts` — API de génération/régénération

### Agent 2 — Modèle de données & Intégration (Backend)

**Mission :** Modifier le schéma Prisma, intégrer le pseudonyme dans le flow d'inscription/candidature, gérer la levée d'anonymat après sélection.

**Fichiers à produire/modifier :**
- `prisma/schema.prisma` — champs pseudonyme sur User
- Modification du flow d'inscription locataire
- Modification du flow de candidature
- Modification du flow de sélection (levée d'anonymat)
- `app/api/applications/route.ts` — intégration pseudonyme

### Agent 3 — Composants UI (Frontend)

**Mission :** Créer le sélecteur de pseudonyme (écran de génération avec bouton régénérer), l'affichage du pseudonyme partout dans l'app (pipeline, messagerie, candidatures), et le moment de révélation de l'identité réelle.

**Fichiers à produire :**
- `components/pseudonym/PseudonymGenerator.tsx` — écran de génération
- `components/pseudonym/PseudonymBadge.tsx` — affichage compact du pseudo
- `components/pseudonym/IdentityReveal.tsx` — animation de révélation
- Modifications des composants existants (pipeline, messagerie, candidatures)

---

## AGENT 1 — DICTIONNAIRE & GÉNÉRATION

### Structure du pseudonyme

Format : **{emoji} {Nom} {Adjectif}** ou **{emoji} {Nom} {Préposition} {Complément}**

Deux patterns qui alternent :
- Pattern A : `🥒 Concombre Captivant` (nom + adjectif)
- Pattern B : `🤠 Cowboy du Mercredi` (nom + préposition + complément)

Ratio : 70% pattern A, 30% pattern B (le B est plus rare donc plus mémorable quand il sort).

### Dictionnaire : `lib/pseudonym/dictionary.ts`

Le dictionnaire doit contenir au minimum :

**Emojis (100+)** — variés, reconnaissables, qui marchent sur tous les OS :

Catégories à couvrir :
- Animaux : 🦊 🦉 🐧 🦁 🐸 🐨 🦋 🐝 🐙 🦈 🐋 🦩 🦜 🐿️ 🦔 🐢 🦎 🐬 🦀 🐞
- Nourriture : 🥒 🍋 🍕 🥐 🧁 🍉 🥑 🍇 🫒 🥨 🍩 🧀 🥭 🍊 🫐
- Objets : 🎺 🎸 🧊 🔮 🎪 🛸 🪁 🧲 🎯 🪃 🏺 🧸 ⚡ 🌈 🔑
- Activités : ⛸️ 🏄 🎿 🚀 🛶 🏹 🎭 🧗 🤸 ⛵
- Nature : 🌿 🌸 🍀 🌊 🌙 ⭐ 🌺 🍁 🌵 🪷
- Véhicules/Lieux : 🚂 🎠 🏔️ 🌋 🗿 🏰 🎡 🚁

**Noms (150+)** — objets, animaux, personnages archétypaux, éléments naturels :

Exemples par catégorie :
- Animaux : Renard, Hibou, Panda, Colibri, Loutre, Hérisson, Dauphin, Papillon, Koala, Flamant, Perroquet, Écureuil, Tortue, Caméléon, Lynx, Phoque, Pingouin, Gazelle, Cigale, Marmotte
- Nourriture : Concombre, Citron, Bretzel, Macaron, Madeleine, Brioche, Croissant, Olive, Noisette, Pistache, Mangue, Artichaut, Truffe, Figue, Praline
- Objets : Trompette, Boussole, Lanterne, Telescope, Parapluie, Métronome, Pendule, Origami, Mosaïque, Kaléidoscope, Sablier, Jumelles, Compas, Harmonica, Balançoire
- Nature : Volcan, Aurore, Cascade, Brise, Corail, Orage, Glacier, Dune, Brume, Mousson, Éclipse, Comète, Rosée, Torrent, Embruns
- Personnages : Capitaine, Cowboy, Viking, Maestro, Funambule, Acrobate, Explorateur, Astronaute, Pirate, Mousquetaire, Alchimiste, Troubadour, Chevalier, Vagabond, Sentinelle

**Adjectifs (150+)** — positifs, neutres ou drôles, jamais négatifs ni offensants :

- Positifs : Captivant, Déterminé, Audacieux, Élégant, Intrépide, Radieux, Sublime, Fabuleux, Magistral, Prodigieux, Flamboyant, Étincelant, Magnifique, Glorieux, Triomphant
- Caractère : Farouche, Discret, Cosmique, Mystérieux, Paisible, Serein, Espiègle, Malicieux, Rêveur, Songeur, Philosophe, Stoïque, Zen, Placide, Fougueux
- Drôles : Pénible, Perplexe, Dubitatif, Sceptique, Somnolent, Grognon, Distrait, Étourdi, Turbulent, Maladroit, Ronchon, Bougon, Flegmatique, Nonchalant, Lunaire
- Intensité : Passionné, Foudroyant, Volcanique, Titanesque, Monumental, Colossal, Phénoménal, Stratosphérique, Légendaire, Mythique, Épique

**Prépositions + Compléments (50+ combos)** — pour le pattern B :

- Temporels : du Mardi, du Mercredi, du Jeudi, du Vendredi, du Dimanche, du Matin, du Soir, du Crépuscule, de l'Aube, de Minuit, des Vacances
- Spatiaux : du Nord, du Sud, des Alpes, des Tropiques, du Sahara, de l'Atlantique, du Cosmos, de l'Espace, des Nuages, du Grenier, du Balcon, des Toits
- Abstraits : du Silence, du Hasard, de l'Impossible, du Tonnerre, de l'Infini, du Mystère, de la Chance, du Destin, de l'Aventure

### Blacklist : `lib/pseudonym/blacklist.ts`

Un filtre pour éviter les combinaisons involontairement gênantes, à double sens, ou inappropriées.

**Approche :** plutôt que de blacklister des combinaisons spécifiques (il y en aurait trop), on blackliste certains **appariements nom + adjectif** :

```typescript
// Noms qui ne doivent pas être combinés avec certains adjectifs
const BLACKLIST_PAIRS: Record<string, string[]> = {
  // Éviter les connotations sexuelles
  'Saucisse': ['Molle', 'Ardente', 'Passionnée', 'Brûlante', 'Humide'],
  'Banane': ['Agitée', 'Molle', 'Courbée', 'Glissante'],
  'Concombre': ['Humide', 'Glissant', 'Juteux'],
  'Olive': ['Lubrifiée', 'Glissante'],
  'Boudin': ['*'], // retirer complètement
  
  // Éviter les connotations racistes/discriminantes
  'Singe': ['*'], // retirer complètement
  'Sauvage': ['*'], // retirer en tant qu'adjectif
  
  // Éviter les connotations péjoratives
  'Limace': ['Molle', 'Lente', 'Baveuse'],
  'Serpent': ['Sournois', 'Fourbe', 'Visqueux'],
};

// Adjectifs retirés complètement (trop négatifs pour un pseudo)
const BLACKLIST_ADJECTIVES: string[] = [
  'Humide', 'Visqueux', 'Gluant', 'Moite', 'Suintant',
  'Fourbe', 'Sournois', 'Vicieux', 'Pervers', 'Louche',
  'Puant', 'Nauséabond', 'Répugnant', 'Abject',
  'Stupide', 'Idiot', 'Débile', 'Crétin',
  'Laid', 'Moche', 'Hideux', 'Affreux',
  'Gros', 'Obèse', 'Maigre', 'Rachitique',
];

// Noms retirés complètement
const BLACKLIST_NOUNS: string[] = [
  'Boudin', 'Singe', 'Porc', 'Cochon', 'Vermine',
  'Vautour', 'Hyène', 'Cafard', 'Parasite',
  'Navet', 'Courge', // trop péjoratif en français
];
```

**Important :** la blacklist doit être revue par un humain (Adrien) avant mise en production. Claude Code génère une première version, Adrien valide et ajuste.

### Générateur : `lib/pseudonym/generator.ts`

```typescript
import { EMOJIS, NOUNS, ADJECTIVES, PREPOSITION_COMPLEMENTS } from './dictionary';
import { isBlacklisted } from './blacklist';

interface Pseudonym {
  emoji: string;
  text: string;        // "Concombre Captivant"
  full: string;        // "🥒 Concombre Captivant"
  pattern: 'A' | 'B';
}

export function generatePseudonym(): Pseudonym {
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    attempts++;

    const emoji = randomPick(EMOJIS);
    const noun = randomPick(NOUNS);
    const usePatternB = Math.random() < 0.3;

    let text: string;
    let pattern: 'A' | 'B';

    if (usePatternB) {
      const complement = randomPick(PREPOSITION_COMPLEMENTS);
      text = `${noun} ${complement}`;
      pattern = 'B';
    } else {
      const adjective = randomPick(ADJECTIVES);
      text = `${noun} ${adjective}`;
      pattern = 'A';
    }

    // Vérifier la blacklist
    if (!isBlacklisted(noun, text)) {
      // Vérifier que le genre grammatical est cohérent
      // (adjectif féminin si nom féminin)
      const genderedText = applyGender(noun, text);

      return {
        emoji,
        text: genderedText,
        full: `${emoji} ${genderedText}`,
        pattern,
      };
    }
  }

  // Fallback safe
  return {
    emoji: '⭐',
    text: 'Étoile Mystérieuse',
    full: '⭐ Étoile Mystérieuse',
    pattern: 'A',
  };
}

function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
```

### Accord grammatical

C'est crucial en français. "Renard Captivant" mais "Tortue Captivante". "Cowboy du Mercredi" mais "Gazelle du Mercredi" (pas de changement pour le pattern B).

Le dictionnaire de noms doit inclure le genre :

```typescript
interface NounEntry {
  word: string;
  gender: 'M' | 'F';
}

const NOUNS: NounEntry[] = [
  { word: 'Renard', gender: 'M' },
  { word: 'Tortue', gender: 'F' },
  { word: 'Concombre', gender: 'M' },
  { word: 'Brioche', gender: 'F' },
  { word: 'Capitaine', gender: 'M' },
  { word: 'Sentinelle', gender: 'F' },
  // ...
];
```

Les adjectifs doivent avoir les deux formes :

```typescript
interface AdjectiveEntry {
  masculine: string;
  feminine: string;
}

const ADJECTIVES: AdjectiveEntry[] = [
  { masculine: 'Captivant', feminine: 'Captivante' },
  { masculine: 'Déterminé', feminine: 'Déterminée' },
  { masculine: 'Audacieux', feminine: 'Audacieuse' },
  { masculine: 'Discret', feminine: 'Discrète' },
  { masculine: 'Cosmique', feminine: 'Cosmique' }, // invariable
  { masculine: 'Épique', feminine: 'Épique' },     // invariable
  // ...
];
```

La fonction `applyGender` sélectionne la forme correcte selon le genre du nom.

### Unicité

Le pseudonyme n'a PAS besoin d'être unique globalement. Deux locataires peuvent être "🥒 Concombre Captivant" — les chances sont infimes (100 emojis × 150 noms × 150 adjectifs = 2,25 millions de combinaisons pour le pattern A). Et même si ça arrive, ils ne postulent probablement pas au même bien.

Par contre, au sein d'une même annonce (dans le pipeline du propriétaire), les pseudonymes doivent être distincts. Le service vérifie ça au moment de la candidature et régénère si collision.

---

## AGENT 2 — MODÈLE DE DONNÉES & INTÉGRATION

### Modifications Prisma

```prisma
model User {
  // ... champs existants ...
  
  // Pseudonyme anonyme
  pseudonymEmoji    String?   // "🥒"
  pseudonymText     String?   // "Concombre Captivant"
  pseudonymFull     String?   // "🥒 Concombre Captivant"
  pseudonymPattern  String?   // "A" ou "B"
}
```

### Flow d'attribution

**1. À l'inscription du locataire :**

Après création du compte, générer automatiquement un pseudonyme :

```typescript
const pseudonym = generatePseudonym();
await prisma.user.update({
  where: { id: user.id },
  data: {
    pseudonymEmoji: pseudonym.emoji,
    pseudonymText: pseudonym.text,
    pseudonymFull: pseudonym.full,
    pseudonymPattern: pseudonym.pattern,
  },
});
```

**2. Régénération :**

Le locataire peut régénérer son pseudonyme à tout moment depuis son profil. Appel API `POST /api/pseudonym/generate` → nouveau pseudonyme attribué.

**Restriction :** une fois qu'une candidature est en cours (statut != REJECTED/WITHDRAWN), le pseudonyme ne peut plus être changé. Ça éviterait la confusion côté propriétaire ("c'est qui celui-là ? il était pas là hier").

**3. À la candidature :**

Le pseudonyme est déjà sur le User, il s'affiche automatiquement. Vérifier l'unicité au sein du même listing :

```typescript
// Avant de créer la candidature
const existingPseudonyms = await prisma.application.findMany({
  where: { listingId },
  include: { applicant: { select: { pseudonymFull: true } } },
});

const existing = existingPseudonyms.map(a => a.applicant.pseudonymFull);

if (existing.includes(user.pseudonymFull)) {
  // Collision — régénérer pour cette candidature uniquement
  // Stocker le pseudo spécifique dans Application
}
```

**4. Levée d'anonymat :**

Quand le propriétaire sélectionne un candidat (statut → SELECTED ou ACCEPTED), l'identité réelle est révélée :

```typescript
// Dans le handler de changement de statut
if (newStatus === 'SELECTED' || newStatus === 'ACCEPTED') {
  // Le propriétaire peut maintenant voir :
  // - Prénom + Nom
  // - Photo de profil
  // - Coordonnées
  // Le pseudonyme reste affiché à côté (pour la continuité)
}
```

La levée d'anonymat est :
- **Automatique** côté propriétaire quand il sélectionne le candidat
- **Visible** côté locataire ("Le propriétaire peut maintenant voir votre identité")
- **Irréversible** pour cette candidature

### Où le pseudonyme est affiché (anonyme) vs le vrai nom

| Contexte | Avant sélection | Après sélection |
|----------|-----------------|-----------------|
| Pipeline candidatures (proprio) | 🥒 Concombre Captivant | Marie Dupont (🥒 Concombre Captivant) |
| Messagerie (proprio) | 🥒 Concombre Captivant | Marie Dupont |
| Fiche candidature (proprio) | 🥒 Concombre Captivant + Passeport anonymisé | Marie Dupont + Passeport complet |
| Profil locataire (proprio) | Non accessible | Accessible |
| Messagerie (locataire) | Voit le proprio normalement | Inchangé |

### API

**POST /api/pseudonym/generate**

```typescript
// Auth requise (locataire)
// Vérifie qu'aucune candidature active
// Génère et attribue un nouveau pseudonyme

// Response
{
  emoji: "🦊",
  text: "Renard Cosmique",
  full: "🦊 Renard Cosmique"
}
```

---

## AGENT 3 — COMPOSANTS UI

### PseudonymGenerator.tsx — Écran de génération

Affiché à l'inscription (étape du flow) et accessible depuis le profil du locataire.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│            Votre identité Coridor                        │
│                                                          │
│   Votre candidature est anonyme. Les propriétaires       │
│   verront ce pseudonyme jusqu'à ce qu'ils vous           │
│   sélectionnent.                                         │
│                                                          │
│                                                          │
│                      🥒                                  │
│                                                          │
│             Concombre Captivant                          │
│                                                          │
│                                                          │
│              [ 🔄 Générer un autre ]                     │
│                                                          │
│                                                          │
│              [ C'est moi ! Continuer → ]                 │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Spécifications :**

- L'emoji est affiché en très grand (72-96px) au centre, avec une animation subtile (léger bounce à chaque génération)
- Le texte du pseudonyme en dessous, `text-2xl font-bold`
- Bouton "Générer un autre" : déclenche une animation de shuffle (l'emoji et le texte changent avec un effet de slot machine rapide, 300ms)
- Bouton "C'est moi !" : valide le choix, sauvegarde en base, passe à l'étape suivante
- Chaque clic sur "Générer" fait un appel API (ou génère côté client avec le même dictionnaire)
- Pas de limite de régénérations — le locataire peut cliquer autant qu'il veut
- Animation de transition : fade-out ancien → scale-up emoji → fade-in nouveau texte

**Animation de génération :**

```
[Clic "Générer"]
  → L'emoji actuel fait un spin rapide (rotate 360° en 200ms)
  → Pendant le spin, l'emoji change
  → Le texte fait un fade-out/fade-in rapide (150ms)
  → Léger bounce de l'emoji à l'arrivée (scale 1 → 1.15 → 1, 200ms ease-out)
```

### PseudonymBadge.tsx — Affichage compact

Utilisé partout où le pseudonyme apparaît (pipeline, messagerie, candidatures) :

**Variante compacte (dans les listes) :**
```
🥒 Concombre Captivant
```
- Emoji + texte sur une ligne
- `text-sm font-medium`
- Pas de conteneur visible

**Variante badge (dans les headers, fiches) :**
```
┌────────────────────────────────┐
│  🥒 Concombre Captivant       │
└────────────────────────────────┘
```
- `rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium`
- Hover : tooltip "Identité anonyme — sera révélée après sélection"

**Variante post-révélation :**
```
Marie Dupont  (🥒 Concombre Captivant)
```
- Vrai nom en premier, pseudonyme en petit à côté en `text-neutral-400`
- Le proprio peut toujours identifier la personne par son ancien pseudo

### IdentityReveal.tsx — Animation de révélation

Quand le propriétaire sélectionne un candidat, un moment de révélation :

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                      🥒                                  │
│             Concombre Captivant                          │
│                                                          │
│                    est en fait                            │
│                                                          │
│                      📸                                  │
│                 Marie Dupont                              │
│                                                          │
│    Vous pouvez maintenant voir son profil complet        │
│    et la contacter directement.                          │
│                                                          │
│              [ Voir le profil → ]                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Animation :**
```
1. Le pseudonyme (emoji + texte) est affiché
2. Pause 500ms
3. L'emoji fait un flip 3D (rotateY 180°)
4. Derrière l'emoji : la photo de profil du locataire (apparaît en reveal)
5. Le texte du pseudonyme se transforme en vrai nom (morph text ou fade)
6. Le reste apparaît en fade-in
```

C'est un petit moment satisfaisant — le proprio "découvre" qui est la personne. Ça crée un souvenir positif associé à Coridor.

**Si le locataire n'a pas de photo de profil :** utiliser ses initiales dans un cercle coloré à la place de la photo.

### Intégration dans les composants existants

**Pipeline candidatures :**

Remplacer l'affichage du nom du candidat par le PseudonymBadge. Avant sélection → badge anonyme. Après sélection → badge post-révélation (vrai nom + pseudo en petit).

**Messagerie :**

Le header de la conversation affiche le PseudonymBadge avant sélection. Après sélection, le vrai nom avec le pseudo en parenthèses. Les bulles de message utilisent l'emoji comme avatar.

**Candidature (fiche détaillée) :**

Le header de la fiche affiche le PseudonymBadge en grand. Les infos du Passeport sont affichées normalement (revenus, badge payeur, historique) mais sans nom ni photo.

---

## FICHIERS

### Nouveaux fichiers (9)

| Fichier | Agent | Rôle |
|---------|-------|------|
| `lib/pseudonym/dictionary.ts` | Agent 1 | Dictionnaires emojis, noms (avec genre), adjectifs (M/F), compléments |
| `lib/pseudonym/blacklist.ts` | Agent 1 | Paires interdites, noms interdits, adjectifs interdits |
| `lib/pseudonym/generator.ts` | Agent 1 | Logique de génération, accord grammatical, fallback |
| `services/PseudonymService.ts` | Agent 1 | Service complet (génération, attribution, vérification unicité par listing) |
| `app/api/pseudonym/generate/route.ts` | Agent 2 | API génération/régénération |
| `components/pseudonym/PseudonymGenerator.tsx` | Agent 3 | Écran de sélection avec animation |
| `components/pseudonym/PseudonymBadge.tsx` | Agent 3 | Badge compact (3 variantes) |
| `components/pseudonym/IdentityReveal.tsx` | Agent 3 | Animation de révélation |
| `lib/pseudonym/index.ts` | Agent 1 | Export centralisé |

### Fichiers modifiés (7)

| Fichier | Agent | Modification |
|---------|-------|-------------|
| `prisma/schema.prisma` | Agent 2 | Champs pseudonyme sur User |
| `app/[locale]/register/page.tsx` (ou flow inscription) | Agent 2 | Étape PseudonymGenerator dans le flow |
| `components/applications/ApplicationCard.tsx` | Agent 3 | PseudonymBadge au lieu du nom |
| `components/applications/ApplicationPipeline.tsx` | Agent 3 | PseudonymBadge + IdentityReveal à la sélection |
| `components/messaging/ConversationHeader.tsx` | Agent 3 | PseudonymBadge ou vrai nom selon statut |
| `components/messaging/MessageBubble.tsx` | Agent 3 | Emoji comme avatar |
| `app/api/applications/[id]/status/route.ts` | Agent 2 | Déclencher la levée d'anonymat |

---

## CONTENU DU DICTIONNAIRE — EXIGENCES MINIMALES

Le dictionnaire livré doit contenir au minimum :

- **100 emojis** couvrant les 6 catégories (animaux, nourriture, objets, activités, nature, véhicules/lieux)
- **150 noms** avec genre grammatical, couvrant les 5 catégories (animaux, nourriture, objets, nature, personnages)
- **120 adjectifs** avec formes masculine ET féminine, couvrant les 4 registres (positifs, caractère, drôles, intensité)
- **40 compléments** prépositionnels couvrant les 3 catégories (temporels, spatiaux, abstraits)

Cela donne **100 × 150 × 120 × 0.7 + 100 × 150 × 40 × 0.3 = ~1,44 million de combinaisons** pattern A + **~180 000 combinaisons** pattern B = **~1,6 million de pseudonymes possibles**.

Le dictionnaire doit être drôle, varié, et 100% safe. Tout le contenu est en français. Les adjectifs "drôles" doivent rester bienveillants (Pénible, Ronchon, Grognon = ok. Stupide, Moche = non).

---

## VÉRIFICATIONS

### Agent 1
- [ ] Dictionnaire : 100+ emojis, 150+ noms (avec genre), 120+ adjectifs (M/F), 40+ compléments
- [ ] Blacklist : paires interdites, noms interdits, adjectifs interdits
- [ ] Générateur : pattern A (70%) et pattern B (30%) fonctionnels
- [ ] Accord grammatical : "Tortue Captivante" (F), "Renard Captivant" (M)
- [ ] Blacklist : aucune combinaison gênante ne passe
- [ ] Fallback : si 50 tentatives échouent, retourne un pseudo safe
- [ ] Performances : génération < 5ms

### Agent 2
- [ ] Migration Prisma : champs pseudonyme ajoutés sans erreur
- [ ] Inscription : pseudonyme auto-généré à la création du compte locataire
- [ ] Régénération : API fonctionne, nouveau pseudo attribué
- [ ] Régénération bloquée si candidature active
- [ ] Candidature : unicité du pseudo vérifiée par listing
- [ ] Sélection : levée d'anonymat déclenchée au changement de statut
- [ ] Levée d'anonymat : irréversible

### Agent 3
- [ ] PseudonymGenerator : emoji grand, texte lisible, bouton régénérer
- [ ] PseudonymGenerator : animation de shuffle fluide
- [ ] PseudonymGenerator : bouton "C'est moi !" sauvegarde et continue
- [ ] PseudonymBadge compact : emoji + texte sur une ligne
- [ ] PseudonymBadge pill : avec fond, hover tooltip
- [ ] PseudonymBadge post-révélation : vrai nom + pseudo en gris
- [ ] IdentityReveal : animation flip emoji → photo
- [ ] IdentityReveal : texte morph pseudo → vrai nom
- [ ] Pipeline : pseudonyme affiché au lieu du nom
- [ ] Messagerie header : pseudonyme avant sélection, vrai nom après
- [ ] Messagerie bulles : emoji comme avatar
- [ ] Mobile : tous les composants responsive
- [ ] Dark mode : tous les composants
- [ ] npm run build → 0 erreurs
