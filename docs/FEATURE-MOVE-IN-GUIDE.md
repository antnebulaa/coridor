# Feature Spec — Guide d'Emménagement Post-Signature

## 1. Contexte & Vision

### Problème
Après la signature du bail, le locataire se retrouve seul face à une dizaine de démarches administratives à effectuer dans un ordre et des délais précis. C'est un moment de stress qui contraste avec l'euphorie de la signature. Aucune plateforme locative en France n'accompagne ce moment de manière intégrée et guidée.

### Solution
Un parcours "Stories" style Instagram/Revolut qui s'ouvre automatiquement après la signature du bail sur Coridor (via YouSign). Le locataire découvre chaque étape dans un format immersif, digeste et engageant — avec un design **clair et joyeux** (fond blanc, touches de couleurs pastel) adapté à ce moment de célébration. Le contenu est ensuite persisté comme checklist interactive dans "Mon logement".

### Objectifs
- **Engagement** : Transformer un moment admin en moment d'accompagnement → renforce la perception de Coridor comme partenaire, pas juste un outil
- **Rétention** : Le locataire revient sur Coridor pendant les semaines suivant la signature pour cocher ses étapes
- **Valeur** : Aucune info ne sera oubliée, le locataire est guidé avec les bons délais et priorités
- **Monétisation future** : Partenariats possibles avec assureurs, fournisseurs d'énergie, FAI (sans jamais vendre de données)

---

## 2. Trigger & Conditions d'affichage

### Déclenchement automatique
- **Quand** : Dès que le webhook YouSign confirme la signature complète du bail (toutes les parties ont signé)
- **Où** : Modale fullscreen (style stories) qui s'ouvre côté **locataire** uniquement
- **Fallback** : Si le locataire n'est pas connecté au moment de la signature, les stories s'affichent à sa prochaine connexion avec un banner dans "Mon espace" : "🎉 Votre bail est signé ! Découvrez les prochaines étapes"

### Conditions
- `lease.status === 'signed'` (toutes les parties)
- `lease.moveInGuideShown === false` (ne s'affiche qu'une fois en mode stories)
- Utilisateur = locataire du bail

### Réaffichage
- Le locataire peut relancer les stories depuis "Mon logement" → bouton "Revoir le guide d'emménagement"
- La checklist (vue liste, pas stories) est toujours accessible dans "Mon logement"

---

## 3. Les 10 Stories — Contenu détaillé

### Story 1 — 🎉 Félicitations

**Type** : `congrats` (écran spécial célébration)

**Contenu** :
- Emoji : 🎉 (grande taille, centré)
- Titre : "Félicitations !"
- Sous-titre : "Votre bail est signé.\nBienvenue chez vous."
- Card info logement structurée :
  - Icône 🏠 dans cercle doré + adresse complète
  - 3 mini-cards : Type (Appart.) | Surface (m²) | Loyer (€)
  - Bandeau vert avec date de début du bail
- CTA : "Découvrir les prochaines étapes →"

**Design** :
- Background : `linear-gradient(160deg, #FFF9F0 0%, #FFFFFF 50%, #F0F7FF 100%)`
- Card logement : fond `#FFFFFF`, border `rgba(0,0,0,0.06)`, `rounded-2xl`, shadow `0 2px 12px rgba(0,0,0,0.04)`
- Mini-cards info : fond `#F8F8FA`, label uppercase `10px` gris, valeur `14px` bold dark
- Bandeau date : fond `#F0FAF3`, texte `#2D9F4F`
- Animation : `scaleIn` (0.92→1, 0.5s ease)

**Données dynamiques** :
- `lease.property.address`
- `lease.property.type` (Appartement/Maison/Studio)
- `lease.property.surface` (m²)
- `lease.rentAmount` (€/mois)
- `lease.startDate`

---

### Story 2 — 🛡️ Assurance habitation

**Type** : `step`
**Priorité** : `urgent` (rouge)
**Tag** : "Obligatoire · Sous 30 jours"
**Couleur** : `#D94040` · Fond pastel : `#FFF5F5` · Border : `rgba(217,64,64,0.12)`

**Headline** : "Assurance\nhabitation"
**Description** : "Obligatoire avant l'entrée dans les lieux. Votre propriétaire vous demandera l'attestation."

**Tips** :
1. Multirisque habitation recommandée (responsabilité civile + biens personnels)
2. Comparez sur LeLynx, Assurland, ou via votre banque
3. Budget moyen : 15-25€/mois pour un appartement
4. Attestation à fournir au bailleur sous 30 jours max

**Contexte juridique** :
- Art. 7g de la loi du 6 juillet 1989 : obligation du locataire
- Risques locatifs minimum : incendie, dégât des eaux, explosion
- Le bailleur peut résilier le bail si pas d'assurance (clause résolutoire)

**CTA dans checklist** : "Comparer les assurances"

---

### Story 3 — ⚡ Électricité & Gaz

**Type** : `step`
**Priorité** : `high`
**Tag** : "Important · Avant emménagement"
**Couleur** : `#2D9F4F` · Fond pastel : `#F0FAF3` · Border : `rgba(45,159,79,0.12)`

**Headline** : "Électricité\n& gaz"
**Description** : "Ouvrez vos compteurs pour avoir l'énergie dès le jour J. Relevez les index à l'état des lieux."

**Tips** :
1. Relevez les compteurs (électricité ET gaz) le jour de l'état des lieux
2. Mise en service EDF : ~5 jours ouvrés, express possible
3. Comparez : EDF, Engie, TotalEnergies, Ekwateur...
4. Linky = mise en service à distance possible

**CTA dans checklist** : "Ouvrir mes compteurs"

---

### Story 4 — 📡 Internet & Box

**Type** : `step`
**Priorité** : `high`
**Tag** : "Important · 2 semaines avant"
**Couleur** : `#3B7FD9` · Fond pastel : `#F0F5FF` · Border : `rgba(59,127,217,0.12)`

**Headline** : "Internet\n& box"
**Description** : "Anticipez ! Le raccordement peut prendre 2 semaines. Vérifiez l'éligibilité fibre de votre adresse."

**Tips** :
1. Test éligibilité : ariase.com ou degrouptest.com
2. Délai raccordement fibre : 2-3 semaines
3. Prévenez votre FAI actuel pour résiliation ou transfert
4. Demandez au proprio si une prise optique existe

**CTA dans checklist** : "Tester mon éligibilité fibre" → ariase.com

---

### Story 5 — 💰 Demande d'APL

**Type** : `step`
**Priorité** : `medium`
**Tag** : "Si éligible · Dès la signature"
**Couleur** : `#E8A838` · Fond pastel : `#FFF9F0` · Border : `rgba(232,168,56,0.15)`

**Headline** : "Demande\nd'APL"
**Description** : "Faites votre demande dès maintenant — le traitement prend plusieurs semaines."

**Tips** :
1. Simulez vos droits sur caf.fr avant de faire la demande
2. Documents : bail signé, RIB, ressources 12 derniers mois
3. Délai moyen de traitement : 1 à 2 mois
4. L'APL n'est pas rétroactive — chaque jour de retard = argent perdu

**Affichage** : Toujours affiché avec mention "Si éligible" (critères complexes)

**CTA dans checklist** : "Simuler mes droits APL" → caf.fr

---

### Story 6 — 📬 Changement d'adresse

**Type** : `step`
**Priorité** : `medium`
**Tag** : "Pratique · Premières semaines"
**Couleur** : `#7B5CB8` · Fond pastel : `#F5F0FF` · Border : `rgba(123,92,184,0.12)`

**Headline** : "Changement\nd'adresse"
**Description** : "Prévenez tout le monde d'un coup sur service-public.fr. Pensez à la réexpédition du courrier."

**Tips** :
1. service-public.fr → "Je déménage" (prévient CAF, impôts, CPAM en une fois)
2. Réexpédition La Poste : ~30€/6 mois (recommandé)
3. Banque, mutuelle, employeur, assurance auto à prévenir manuellement

**CTA dans checklist** : "Faire mon changement d'adresse" → service-public.fr

---

### Story 7 — 📋 État des lieux

**Type** : `step`
**Priorité** : `high`
**Tag** : "Le jour J · Avec le propriétaire"
**Couleur** : `#2D9F4F` · Fond pastel : `#F0FAF3` · Border : `rgba(45,159,79,0.12)`

**Headline** : "État des\nlieux"
**Description** : "Soyez minutieux — photographiez tout. C'est votre protection pour le dépôt de garantie."

**Tips** :
1. Photographiez chaque pièce (murs, sols, plafonds, équipements)
2. Notez la moindre rayure, tache, fissure — même minime
3. Testez robinets, prises, volets, interrupteurs, chasse d'eau
4. 10 jours après pour signaler un oubli (par LRAR)

**Info juridique** :
- Bailleur refuse l'état des lieux → ne pourra pas retenir le dépôt
- Désaccord → huissier (frais partagés 50/50)
- État des lieux d'entrée = GRATUIT (interdit de facturer au locataire)

**Lien Coridor futur** : CTA "Faire mon état des lieux sur Coridor" quand la feature sera prête

---

### Story 8 — 🏘️ Infos quartier

**Type** : `step`
**Priorité** : `low` (bonus)
**Tag** : "Bonus · Votre nouveau quartier"
**Couleur** : `#2BA89E` (teal) · Fond pastel : `#F0FAFA` · Border : `rgba(43,168,158,0.12)`

**Headline** : "Infos\nquartier"
**Description** : "Découvrez votre nouveau quartier : transports, commerces, médecins et services à proximité."

**Tips** :
1. Stations de métro & bus les plus proches
2. Supermarchés & commerces essentiels
3. Médecins, pharmacies, urgences
4. Mairie, poste, déchetterie

**V1** : Contenu statique avec les 4 tips + CTA vers Google Maps centré sur l'adresse du bail

**V2 (futur)** :
- Données dynamiques via Google Places API / data.gouv.fr / OpenStreetMap
- Carte interactive avec POI à proximité
- Temps de trajet vers transports les plus proches

**CTA dans checklist** : "Explorer mon quartier" → Google Maps (adresse pré-remplie)

---

### Story 9 — 🚗 Carte grise & Listes électorales

**Type** : `step`
**Priorité** : `low`
**Tag** : "Si concerné · Sous 1 mois"
**Couleur** : `rgba(0,0,0,0.4)` · Fond pastel : `#F8F8F8` · Border : `rgba(0,0,0,0.06)`

**Headline** : "Carte grise\n& listes électorales"
**Description** : "Mettez à jour l'adresse de votre carte grise sous 1 mois. Pensez aux listes électorales."

**Tips** :
1. Carte grise : ants.gouv.fr (gratuit, 100% en ligne)
2. Délai légal : 1 mois (amende possible si oubli)
3. Listes électorales : mairie ou service-public.fr
4. Passeport/CNI : modification non obligatoire

**CTA dans checklist** : "Modifier ma carte grise" → ants.gouv.fr

---

### Story 10 — ✅ Récapitulatif

**Type** : `recap`

**Contenu** :
- Emoji : ✅
- Titre : "Tout est prêt !"
- Sous-titre : "Votre checklist est dans « Mon logement ».\nOn vous enverra des rappels aux bons moments."
- Mini-liste des 8 étapes : emoji + titre + tag + checkbox vide
- CTA : "Voir ma checklist complète" → "Mon logement"

**Design** : Même gradient que Story 1 (boucle visuelle)

---

## 4. Design System — Thème Clair

### Philosophie
Le guide utilise un thème **clair et joyeux** qui contraste avec le dark mode de l'app. C'est un moment de célébration — pas de gestion administrative.

### Navigation Stories

| Élément | Spécification |
|---------|---------------|
| Container | `max-w-[380px]` · `h-[min(90vh, 740px)]` · `rounded-[28px]` |
| Barres progression | `h-[3px]` · `gap-[3px]` · remplissage `#E8A838` · fond `rgba(0,0,0,0.08)` |
| Auto-avance | 8 secondes par story (pause on touch/hold) |
| Navigation | Swipe gauche/droite + tap zones (30% gauche/droite) |
| Bouton fermer | ✕ · `30px` · `bg-rgba(0,0,0,0.06)` · `color-rgba(0,0,0,0.35)` |
| Compteur | `{n}/{total}` · `11px` · `rgba(0,0,0,0.25)` |
| Overlay | `bg-rgba(0,0,0,0.4)` · `backdrop-blur-[12px]` |
| Ombre container | `0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)` |

### Typographie

| Élément | Spécification |
|---------|---------------|
| Headline | `28px` · bold · `#1A1A1A` · `leading-tight` · `whitespace-pre-line` |
| Description | `15px` · `rgba(0,0,0,0.5)` · `leading-relaxed` |
| Tags | `11px` · semibold · couleur de la step |
| Tips numéro | `9px` · bold · couleur step · dans carré `18×18px` pastel |
| Tips texte | `13px` · `rgba(0,0,0,0.5)` |

### Couleurs par priorité

| Priorité | Couleur texte | Fond tag | Border tag | Label |
|----------|--------------|----------|------------|-------|
| `urgent` | `#D94040` | `#FFF0F0` | `rgba(217,64,64,0.15)` | Urgent |
| `high` | `#C88A20` | `#FFF6E8` | `rgba(232,168,56,0.15)` | Important |
| `medium` | `#3B7FD9` | `#EEF4FF` | `rgba(59,127,217,0.12)` | Recommandé |
| `low` | `rgba(0,0,0,0.4)` | `#F5F5F7` | `rgba(0,0,0,0.06)` | Optionnel |

### Visuels des steps
- **Cercle emoji** : `140px`, fond pastel, border colorée subtile, shadow `0 8px 32px {colorBorder}`, emoji `64px` centré
- Pas de SVG complexes — emoji + cercle = rendu joyeux et lisible

### Backgrounds
- Base `#FFFFFF` avec teinte pastel directionnelle par story
- Transition : `background 0.6s ease`

### Animations
- Steps : `fadeUp` (opacity 0→1, translateY 20→0, 0.4s ease)
- Congrats/Recap : `scaleIn` (scale 0.92→1, 0.5s ease)
- Progression : requestAnimationFrame (fluide)

---

## 5. Checklist Persistée (Vue "Mon logement")

### Structure

```
Section "Votre emménagement"
├── Barre de progression (X/8 étapes)
├── 🛡️ Assurance habitation     [urgent]  [□ / ✓]
├── ⚡ Électricité & gaz         [high]    [□ / ✓]
├── 📡 Internet & box            [high]    [□ / ✓]
├── 💰 Demande d'APL             [medium]  [□ / ✓]
├── 📬 Changement d'adresse      [medium]  [□ / ✓]
├── 📋 État des lieux            [high]    [□ / ✓]
├── 🏘️ Infos quartier            [bonus]   [□ / ✓]
├── 🚗 Carte grise               [low]     [□ / ✓]
└── 🔄 Revoir le guide d'emménagement
```

### Comportement
- Items expandables : tap → description + tips + CTA externe
- Checkbox : toggle manuel, optimistic update
- Tri : priorité (urgent → high → medium → low), complétés en bas
- Progression : barre linéaire `X/8 étapes`
- 8/8 : "🎉 Tout est en ordre ! Profitez bien de votre nouveau logement."

### Rappels (futur)
- J-7 : "N'oubliez pas votre assurance habitation"
- J-1 : "Demain c'est le grand jour !"
- J+7 : "Changement d'adresse fait ?"

### Données

```typescript
interface MoveInStep {
  id: string;       // 'assurance' | 'energie' | 'internet' | 'apl' | 'adresse' | 'etat-des-lieux' | 'quartier' | 'carte-grise'
  completed: boolean;
  completedAt?: Date;
}

interface MoveInGuide {
  leaseId: string;
  storiesShownAt?: Date;
  steps: MoveInStep[];
}
```

---

## 6. Architecture technique

### Fichiers

```
lib/
  moveInGuide.ts                 # Types, constantes, config des 8 steps

components/
  move-in/
    MoveInStories.tsx            # Container stories fullscreen (thème clair)
    MoveInStoryProgress.tsx      # Barres dorées
    MoveInStoryCongrats.tsx      # Célébration
    MoveInStoryStep.tsx          # Step générique (emoji circle)
    MoveInStoryRecap.tsx         # Récap
    MoveInChecklist.tsx          # Checklist "Mon logement"
    MoveInChecklistItem.tsx      # Item expandable

hooks/
  useMoveInGuide.ts              # Hook CRUD Supabase
```

### Prisma

```prisma
model MoveInGuide {
  id              String   @id @default(cuid())
  leaseId         String   @unique
  lease           Lease    @relation(fields: [leaseId], references: [id])
  storiesShownAt  DateTime?
  steps           Json     // MoveInStep[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### API Routes

```
POST   /api/move-in-guide/init          # Crée après signature
GET    /api/move-in-guide/[leaseId]     # Lecture
PATCH  /api/move-in-guide/[leaseId]     # Update (toggle step, mark stories shown)
```

### Webhook YouSign

```typescript
if (event === 'signature_request.done') {
  // ... logique existante
  await prisma.moveInGuide.create({
    data: {
      leaseId: lease.id,
      steps: DEFAULT_MOVE_IN_STEPS, // 8 étapes, completed: false
    }
  });
}
```

---

## 7. Edge Cases

| Cas | Comportement |
|-----|-------------|
| Locataire pas connecté à la signature | Banner + stories à la prochaine connexion |
| Ferme les stories avant la fin | `storiesShownAt` = now(), checklist dispo |
| Bail annulé | Supprimer/archiver le guide |
| Renouvellement (même logement) | Ne PAS recréer de guide |
| Colocation | Chaque locataire a sa propre checklist |
| Côté propriétaire | Pas de stories, mais "Emménagement en cours (3/8)" possible |

---

## 8. Métriques

| Métrique | Cible |
|----------|-------|
| Ouverture stories | > 80% |
| Complétion stories (jusqu'au bout) | > 60% |
| Utilisation checklist (1+ item coché) | > 50% |
| Complétion checklist (8/8) | > 30% |
| Rétention J+7 | > 40% |

---

## 9. Évolutions futures

**Court terme** : Notifications push, liens partenaires (affiliate), état des lieux intégré

**Moyen terme** : Infos quartier dynamiques (Google Places API, data.gouv.fr), personnalisation (masquer APL/carte grise selon profil), guide propriétaire

**Long terme** : Marketplace services (déménageurs, nettoyage), gamification, partage social "J'ai emménagé avec Coridor"

---

## 10. Wireframe

`/mnt/user-data/outputs/movein-stories-light.jsx` — 10 stories, thème clair, fond blanc + couleurs pastel, navigation swipe/tap, auto-avance 8s.
