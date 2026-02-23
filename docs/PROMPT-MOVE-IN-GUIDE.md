# Prompt Teammates — Guide d'Emménagement Post-Signature

## Contexte global

Coridor est une webapp de gestion locative française (Next.js App Router, Supabase, Prisma, YouSign, Stripe). Après la signature d'un bail via YouSign, on affiche un parcours "Stories" immersif (style Instagram) qui guide le locataire dans ses démarches d'emménagement, puis persiste comme checklist interactive dans "Mon logement".

**IMPORTANT — Thème clair** : Ce parcours utilise un design **fond blanc + touches de couleurs pastel** (pas le dark mode habituel de l'app). C'est un moment joyeux — le design doit refléter ça.

**Documents de référence** :
- Spec complète : `FEATURE-MOVE-IN-GUIDE.md`
- Wireframe React : `movein-stories-light.jsx` (10 stories en thème clair)
- Design Coridor standard : fond dark, accent doré — MAIS ce parcours fait exception avec fond blanc

---

## Agent 1 — Backend & Data (Prisma, API Routes, Webhook)

### Mission
Créer le modèle de données, les API routes, et l'intégration webhook pour le guide d'emménagement.

### Tâches

**1. Modèle Prisma**

Ajouter au schéma :

```prisma
model MoveInGuide {
  id              String   @id @default(cuid())
  leaseId         String   @unique
  lease           Lease    @relation(fields: [leaseId], references: [id])
  storiesShownAt  DateTime?
  steps           Json     // Array de { id: string, completed: boolean, completedAt?: string }
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Vérifier que `Lease` a la relation inverse : `moveInGuide MoveInGuide?`

Migration : `npx prisma migrate dev --name add-move-in-guide`

**2. Constantes — `lib/moveInGuide.ts`**

```typescript
export const MOVE_IN_STEP_IDS = [
  'assurance',
  'energie',
  'internet',
  'apl',
  'adresse',
  'etat-des-lieux',
  'quartier',
  'carte-grise',
] as const;

export type MoveInStepId = typeof MOVE_IN_STEP_IDS[number];

export interface MoveInStep {
  id: MoveInStepId;
  completed: boolean;
  completedAt?: string;
}

export const DEFAULT_MOVE_IN_STEPS: MoveInStep[] = MOVE_IN_STEP_IDS.map(id => ({
  id,
  completed: false,
}));

export type MoveInStepPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface MoveInStepConfig {
  id: MoveInStepId;
  emoji: string;
  title: string;
  tag: string;
  priority: MoveInStepPriority;
  description: string;
  tips: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  color: string;           // Couleur principale de la step
  colorLight: string;      // Fond pastel (cercle emoji, numéros tips)
  colorBorder: string;     // Border subtile
}

export const MOVE_IN_STEPS_CONFIG: MoveInStepConfig[] = [
  {
    id: 'assurance',
    emoji: '🛡️',
    title: 'Assurance habitation',
    tag: 'Obligatoire · Sous 30 jours',
    priority: 'urgent',
    description: "Obligatoire avant l'entrée dans les lieux. Votre propriétaire vous demandera l'attestation.",
    tips: [
      'Multirisque habitation recommandée',
      'Comparez sur LeLynx, Assurland...',
      'Budget moyen : 15-25€/mois',
      'Attestation à fournir au bailleur sous 30 jours',
    ],
    ctaLabel: 'Comparer les assurances',
    color: '#D94040',
    colorLight: '#FFF0F0',
    colorBorder: 'rgba(217,64,64,0.12)',
  },
  {
    id: 'energie',
    emoji: '⚡',
    title: 'Électricité & gaz',
    tag: 'Important · Avant emménagement',
    priority: 'high',
    description: "Ouvrez vos compteurs pour avoir l'énergie dès le jour J. Relevez les index à l'état des lieux.",
    tips: [
      "Relevez les compteurs à l'entrée",
      'Mise en service EDF : ~5 jours',
      'Comparez : EDF, Engie, TotalEnergies...',
      'Linky = mise en service à distance possible',
    ],
    ctaLabel: 'Ouvrir mes compteurs',
    color: '#2D9F4F',
    colorLight: '#EEFAF1',
    colorBorder: 'rgba(45,159,79,0.12)',
  },
  {
    id: 'internet',
    emoji: '📡',
    title: 'Internet & box',
    tag: 'Important · 2 semaines avant',
    priority: 'high',
    description: "Anticipez ! Le raccordement peut prendre 2 semaines. Vérifiez l'éligibilité fibre de votre adresse.",
    tips: [
      'Test éligibilité sur ariase.com',
      'Fibre souvent incluse en zone urbaine',
      'Prévenez votre FAI actuel',
      'Demandez au proprio si une prise optique existe',
    ],
    ctaLabel: 'Tester mon éligibilité fibre',
    ctaUrl: 'https://www.ariase.com/box/test-eligibilite',
    color: '#3B7FD9',
    colorLight: '#EEF4FF',
    colorBorder: 'rgba(59,127,217,0.12)',
  },
  {
    id: 'apl',
    emoji: '💰',
    title: "Demande d'APL",
    tag: 'Si éligible · Dès la signature',
    priority: 'medium',
    description: 'Faites votre demande dès maintenant — le traitement prend plusieurs semaines.',
    tips: [
      'Simulez vos droits sur caf.fr',
      'Documents : bail signé, RIB, ressources 12 mois',
      'Délai moyen : 1 à 2 mois',
      "L'APL n'est pas rétroactive",
    ],
    ctaLabel: 'Simuler mes droits APL',
    ctaUrl: 'https://www.caf.fr/allocataires/mes-services-en-ligne/faire-une-simulation',
    color: '#E8A838',
    colorLight: '#FFF6E8',
    colorBorder: 'rgba(232,168,56,0.15)',
  },
  {
    id: 'adresse',
    emoji: '📬',
    title: "Changement d'adresse",
    tag: 'Pratique · Premières semaines',
    priority: 'medium',
    description: "Prévenez tout le monde d'un coup sur service-public.fr. Pensez à la réexpédition du courrier.",
    tips: [
      'service-public.fr → "Je déménage" (CAF, impôts, CPAM)',
      'Réexpédition La Poste : ~30€/6 mois',
      'Banque, mutuelle, employeur, assurance auto',
    ],
    ctaLabel: "Faire mon changement d'adresse",
    ctaUrl: 'https://www.service-public.fr/particuliers/vosdroits/R11193',
    color: '#7B5CB8',
    colorLight: '#F3EEFF',
    colorBorder: 'rgba(123,92,184,0.12)',
  },
  {
    id: 'etat-des-lieux',
    emoji: '📋',
    title: 'État des lieux',
    tag: 'Le jour J · Avec le propriétaire',
    priority: 'high',
    description: "Soyez minutieux — photographiez tout. C'est votre protection pour le dépôt de garantie.",
    tips: [
      'Photographiez chaque pièce',
      'Notez la moindre rayure/tache',
      'Testez robinets, prises, volets',
      '10 jours pour signaler un oubli',
    ],
    color: '#2D9F4F',
    colorLight: '#EEFAF1',
    colorBorder: 'rgba(45,159,79,0.12)',
  },
  {
    id: 'quartier',
    emoji: '🏘️',
    title: 'Infos quartier',
    tag: 'Bonus · Votre nouveau quartier',
    priority: 'low',
    description: 'Découvrez votre nouveau quartier : transports, commerces, médecins et services à proximité.',
    tips: [
      'Stations de métro & bus les plus proches',
      'Supermarchés & commerces essentiels',
      'Médecins, pharmacies, urgences',
      'Mairie, poste, déchetterie',
    ],
    ctaLabel: 'Explorer mon quartier',
    // ctaUrl sera construit dynamiquement avec l'adresse du bail → Google Maps
    color: '#2BA89E',
    colorLight: '#E8F8F7',
    colorBorder: 'rgba(43,168,158,0.12)',
  },
  {
    id: 'carte-grise',
    emoji: '🚗',
    title: 'Carte grise & listes électorales',
    tag: 'Si concerné · Sous 1 mois',
    priority: 'low',
    description: "Mettez à jour l'adresse de votre carte grise sous 1 mois. Pensez aux listes électorales.",
    tips: [
      'Carte grise : ants.gouv.fr (gratuit)',
      'Listes électorales : mairie ou service-public.fr',
      'Passeport/CNI : pas obligatoire',
    ],
    ctaLabel: 'Modifier ma carte grise',
    ctaUrl: 'https://ants.gouv.fr/',
    color: 'rgba(0,0,0,0.4)',
    colorLight: '#F5F5F7',
    colorBorder: 'rgba(0,0,0,0.06)',
  },
];
```

**3. API Routes**

Créer `app/api/move-in-guide/[leaseId]/route.ts` :

```typescript
// GET : récupère le guide
// - Vérifier que l'utilisateur courant est locataire du bail
// - Retourner le guide avec steps parsés

// PATCH : met à jour le guide
// Body possibles :
//   { storiesShown: true }  → storiesShownAt = now()
//   { stepId: string, completed: boolean } → toggle une étape
// - Vérifier ownership
// - Valider stepId contre MOVE_IN_STEP_IDS
// - Retourner le guide mis à jour
```

**4. Webhook YouSign**

Dans le handler existant, après `signature_request.done` :

```typescript
const existingGuide = await prisma.moveInGuide.findUnique({
  where: { leaseId: lease.id }
});
if (!existingGuide) {
  await prisma.moveInGuide.create({
    data: { leaseId: lease.id, steps: DEFAULT_MOVE_IN_STEPS }
  });
}
```

### Vérifications
- [ ] Migration passe sans erreur
- [ ] GET retourne 404 si pas de guide
- [ ] GET vérifie que l'user est locataire du bail
- [ ] PATCH toggle les steps et met à jour updatedAt
- [ ] Webhook ne crée pas de doublon

---

## Agent 2 — Frontend Stories (Thème clair, composant fullscreen)

### Mission
Implémenter le composant MoveInStories basé sur `movein-stories-light.jsx`.

### ⚠️ THÈME CLAIR — PAS DARK MODE

Ce composant fait exception au dark mode de l'app :
- Fonds : blanc `#FFFFFF` + gradients pastel
- Textes : dark `#1A1A1A` et `rgba(0,0,0,0.5)`
- Barres de progression : accent `#E8A838` sur fond `rgba(0,0,0,0.08)`
- Overlay derrière : `rgba(0,0,0,0.4)` + `backdrop-blur-[12px]`

### Tâches

**1. Composant principal `MoveInStories.tsx`**

Reprendre la structure exacte de `movein-stories-light.jsx`.

Props :
```typescript
interface MoveInStoriesProps {
  lease: {
    id: string;
    property: { address: string; type: string; surface: number; };
    rentAmount: number;
    startDate: string;
  };
  onClose: () => void;
  onComplete: () => void;
}
```

State : `currentIndex`, `progress` (0-1), `paused`
Auto-avance : requestAnimationFrame, 8s (avec pause on touch/hold)
Navigation : swipe + tap zones 30%

**2. Sous-composants**

- `MoveInStoryCongrats.tsx` — Story 1 : animation scaleIn, emoji 🎉, card logement structurée (icône 🏠 dans cercle doré, 3 mini-cards type/surface/loyer, bandeau date vert), CTA accent
- `MoveInStoryStep.tsx` — Stories 2-9 : générique, prend `MoveInStepConfig`. Grand cercle emoji (140px, fond pastel, border colorée, shadow), tag priorité, headline, description, card tips numérotés
- `MoveInStoryRecap.tsx` — Story 10 : mini-liste 8 items, CTA "Voir ma checklist complète"
- `MoveInStoryProgress.tsx` — 10 barres accent sur gris clair

**3. Design des steps (THÈME CLAIR)**

Chaque step a :
- **Cercle emoji** : `w-[140px] h-[140px] rounded-full`, fond = `config.colorLight`, border = `1px solid ${config.colorBorder}`, shadow = `0 8px 32px ${config.colorBorder}`, emoji `text-[64px]` centré
- **Tag priorité** : pill avec dot coloré + texte, fond/border selon priorité
- **Card tips** : fond `#FFFFFF`, border `rgba(0,0,0,0.05)`, shadow `0 1px 4px rgba(0,0,0,0.03)`, `rounded-2xl`
- **Numéros tips** : carrés `18×18px`, `rounded-[6px]`, fond `config.colorLight`, border `config.colorBorder`, texte `config.color` bold `9px`

**4. Backgrounds par story** (tous sur base blanche)

| Story | Gradient |
|-------|----------|
| Congrats | `#FFF9F0 → #FFFFFF → #F0F7FF` |
| Assurance | `#FFFFFF → #FFF5F5 → #FFFFFF` |
| Énergie | `#FFFFFF → #F0FAF3 → #FFFFFF` |
| Internet | `#FFFFFF → #F0F5FF → #FFFFFF` |
| APL | `#FFFFFF → #FFF9F0 → #FFFFFF` |
| Adresse | `#FFFFFF → #F5F0FF → #FFFFFF` |
| État des lieux | `#FFFFFF → #F0FAF3 → #FFFFFF` |
| Quartier | `#FFFFFF → #F0FAFA → #FFFFFF` |
| Carte grise | `#FFFFFF → #F8F8F8 → #FFFFFF` |
| Recap | `#FFF9F0 → #FFFFFF → #F0F7FF` |

**5. Animations**

- `fadeUp` : opacity 0→1, translateY 20→0, 0.4s ease
- `scaleIn` : scale 0.92→1, opacity 0→1, 0.5s ease
- Background : `transition: background 0.6s ease`

**6. CTA Buttons**

- Bouton principal (Congrats, Recap) : `bg-[#E8A838]`, `text-white`, `rounded-2xl`, `font-semibold`, shadow `0 4px 16px rgba(232,168,56,0.3)`
- Pas de bouton CTA dans les steps individuels (les CTA seront dans la checklist)

### Vérifications
- [ ] 10 stories affichées dans l'ordre
- [ ] Auto-avance 8s, réinitialisation à chaque changement
- [ ] Pause on touch/click, reprise on release
- [ ] Swipe et tap navigation
- [ ] Fermer appelle onClose
- [ ] Données bail affichées dans story 1
- [ ] Fond blanc + couleurs pastel (PAS dark mode)
- [ ] Pas de scroll vertical dans la modale
- [ ] Body scroll désactivé quand modale ouverte

---

## Agent 3 — Frontend Checklist + Intégration Dashboard

### Mission
Checklist persistée dans "Mon logement" + trigger d'affichage des stories.

### Tâches

**1. Hook `useMoveInGuide.ts`**

```typescript
export function useMoveInGuide(leaseId: string | undefined) {
  // GET /api/move-in-guide/[leaseId]
  // Retourne { guide, isLoading, error, toggleStep, markStoriesShown }
  // toggleStep(stepId) → PATCH { stepId, completed: !current } (optimistic)
  // markStoriesShown() → PATCH { storiesShown: true }
}
```

**2. `MoveInChecklist.tsx`**

Section dans "Mon logement" :

```
┌─────────────────────────────────────────────┐
│ 📦 Votre emménagement                       │
│ ████████████░░░░  5/8 étapes                │
│                                             │
│ 🛡️ Assurance habitation    [Urgent]    [✓]  │
│ ⚡ Électricité & gaz        [Important] [✓]  │
│ 📡 Internet & box           [Important] [✓]  │
│ 💰 Demande d'APL            [Recommandé][✓]  │
│ 📬 Changement d'adresse     [Recommandé][✓]  │
│ 📋 État des lieux           [Important] [ ]  │
│ 🏘️ Infos quartier           [Bonus]     [ ]  │
│ 🚗 Carte grise              [Optionnel] [ ]  │
│                                             │
│ 🔄 Revoir le guide d'emménagement          │
└─────────────────────────────────────────────┘
```

- Items expandables : tap → description + tips numérotés + CTA externe
- Checkbox : cercle `22px`, border `rgba(0,0,0,0.1)`, coché → `bg-accent` + checkmark blanc
- Tags priorité : pills colorées selon priorityColors
- Complétés : opacité réduite, déplacés en bas
- Progression : barre linéaire accent
- 8/8 : "🎉 Tout est en ordre !"

**3. `MoveInChecklistItem.tsx`**

```typescript
interface MoveInChecklistItemProps {
  config: MoveInStepConfig;
  step: MoveInStep;
  onToggle: () => void;
}
```

- Fermé : emoji + titre + tag priorité + checkbox
- Ouvert : + description + tips numérotés + CTA si présent
- Animation expand : height smooth
- Note pour "quartier" : construire le `ctaUrl` dynamiquement :
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lease.property.address)}`

**4. Intégration "Mon logement"**

```typescript
const { guide, isLoading, toggleStep, markStoriesShown } = useMoveInGuide(lease?.id);
const [showStories, setShowStories] = useState(false);

useEffect(() => {
  if (guide && !guide.storiesShownAt) setShowStories(true);
}, [guide]);

const handleStoriesClose = () => {
  setShowStories(false);
  markStoriesShown();
};

return (
  <>
    {showStories && (
      <MoveInStories lease={lease} onClose={handleStoriesClose} onComplete={handleStoriesClose} />
    )}
    {guide && (
      <MoveInChecklist guide={guide} onToggleStep={toggleStep} onReplayStories={() => setShowStories(true)} />
    )}
  </>
);
```

**5. Banner "Mon espace" (fallback)**

```typescript
{guide && !guide.storiesShownAt && (
  <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 flex items-center gap-3">
    <span className="text-2xl">🎉</span>
    <div className="flex-1">
      <p className="text-gray-900 font-semibold text-sm">Votre bail est signé !</p>
      <p className="text-gray-500 text-xs">Découvrez les étapes pour votre emménagement</p>
    </div>
    <button onClick={() => router.push('/mon-logement')} className="...">Voir →</button>
  </div>
)}
```

### Vérifications
- [ ] Checklist charge et affiche les 8 étapes
- [ ] Toggle met à jour en optimistic + appel API
- [ ] Barre de progression reflète X/8
- [ ] Items expandables avec détails au tap
- [ ] "Revoir le guide" réouvre les stories
- [ ] Stories ne se réaffichent pas si déjà vues
- [ ] Banner "Mon espace" seulement si stories pas vues
- [ ] 8/8 → message de félicitations
- [ ] CTA "Explorer mon quartier" construit dynamiquement avec l'adresse du bail

---

## Ordre d'exécution

1. **Agent 1 (Backend)** — migration, API, webhook
2. **Agent 2 (Stories)** en parallèle — composant UI autonome (mock data OK)
3. **Agent 3 (Checklist + Intégration)** — branche tout ensemble

## Points d'attention

- **THÈME CLAIR** : fond blanc + couleurs pastel. PAS le dark mode habituel. C'est la seule exception de l'app — un moment de célébration
- **Typo** : DM Sans partout
- **8 étapes** (pas 7) : assurance, énergie, internet, apl, adresse, etat-des-lieux, **quartier**, carte-grise
- **10 stories** : congrats + 8 steps + recap
- **Emoji circles** : 140px, fond pastel, border colorée — pas de SVG géométriques complexes
- **Tips numérotés** : petits carrés colorés (1, 2, 3, 4) — pas des dots
- **Mobile first** : stories parfaites sur mobile (use case principal)
- **Données dynamiques** : story 1 utilise les vraies données du bail
- **CTA quartier** : URL Google Maps construite avec l'adresse du bail
