# Feature Spec : Selection progressive des candidats apres visites

> Auteur : UX Research (Claude)
> Date : 13 fevrier 2026
> Statut : Proposition / Recherche UX

---

## Table des matieres

1. [Contexte et probleme](#1-contexte-et-probleme)
2. [Analyse du flow existant](#2-analyse-du-flow-existant)
3. [Benchmark et inspirations](#3-benchmark-et-inspirations)
4. [Criteres anti-discrimination](#4-criteres-anti-discrimination)
5. [Concept A : Scorecard Express](#5-concept-a--scorecard-express)
6. [Concept B : Kanban Pipeline](#6-concept-b--kanban-pipeline)
7. [Concept C : Comparateur Cote-a-Cote](#7-concept-c--comparateur-cote-a-cote)
8. [Recommandation finale](#8-recommandation-finale)

---

## 1. Contexte et probleme

### Le scenario typique

Marie (propriétaire, 35 ans, 2 appartements a Paris) publie une annonce sur Coridor. Elle recoit 15-20 candidatures en quelques jours. Elle propose des visites a 8 candidats sur 2 jours (samedi et dimanche).

**Aujourd'hui, voila ce qui se passe :**

1. Marie fait ses visites. Entre chaque candidat, elle a 5-10 minutes.
2. Elle essaie de se rappeler qui etait qui. Les visages se melangent.
3. Le soir, elle tente de faire un tri sur un bout de papier ou dans sa tete.
4. Elle revient sur le calendrier Coridor, mais il n'y a aucun outil pour noter, comparer ou trier.
5. Elle retourne dans la messagerie, ouvre chaque conversation une par une pour revoir les dossiers.
6. Elle prend sa decision "au feeling", souvent biaisee par la derniere impression ou des criteres subjectifs.

### Les douleurs specifiques

| Douleur | Impact |
|---------|--------|
| Aucun outil de prise de notes entre les visites | Oubli des impressions, confusion entre candidats |
| Pas de vue comparative | Impossible de mettre les dossiers cote a cote |
| Pas de criteres structures | Decisions au feeling, risque de discrimination involontaire |
| Navigation eclatee | Calendrier, inbox, dossier candidat : 3 endroits differents |
| Pas de statut post-visite | On ne sait pas ou en est la selection |

### Personas concernes

- **Marie** (proprio active, 2 biens) : veut decider vite et bien entre deux visites, depuis son telephone.
- **Nicolas** (investisseur coloc, 4-10 lots) : veut un process standardise et repetable, avec des KPIs de selection.

---

## 2. Analyse du flow existant

### Architecture actuelle (Prisma Schema)

```
User (proprio)
  |-- Property
       |-- RentalUnit
            |-- Listing
                 |-- Visit (PENDING / CONFIRMED / CANCELLED)
                 |-- RentalApplication (SENT / VISIT_PROPOSED / VISIT_CONFIRMED / ACCEPTED / REJECTED)
                 |-- Conversation
```

**Observations cles du schema :**

- Le model `Visit` ne contient aucun champ pour des notes, impressions ou evaluations.
- Le model `RentalApplication` a un pipeline de statuts, mais il manque une etape explicite "post-visite" (entre VISIT_CONFIRMED et ACCEPTED/REJECTED).
- Il n'existe aucun model `CandidateEvaluation` ou `Scorecard`.
- Le `TenantCandidateScope` contient des donnees factuelles (composition, type bail, enfants) mais pas de scoring.

### Calendrier proprietaire (`LandlordCalendarClient.tsx`)

Le calendrier affiche deux vues : **Agenda** et **Journee**.

- Les visites apparaissent avec : nom du candidat, avatar, heure, adresse, statut (PENDING/CONFIRMED).
- Au clic sur une visite, un **VisitDetailsModal** s'ouvre avec :
  - Photo + nom du candidat
  - Date, heure, lieu
  - Bouton "Voir le dossier complet" (affiche `TenantProfilePreview`)
  - Bouton "Envoyer un message"
- **Ce qui manque** : aucune action post-visite. Pas de bouton "Noter cette visite", "Shortlister", "Refuser". Le modal est purement informatif.

### Inbox / Conversation (`ConversationClient.tsx`)

La sidebar droite du chat affiche le dossier candidat (`TenantProfilePreview`) avec :
- Profil emploi/salaire
- Garants
- Composition du foyer
- Actions : "Proposer une visite" ou "Generer le bail" + "Decliner la candidature"

**Ce qui manque** : pas de vue synthetique de tous les candidats d'une meme annonce. Le proprio doit naviguer conversation par conversation.

### Dashboard (`DashboardClient.tsx`)

Le dashboard affiche :
- KPIs financiers (revenus, depenses, rendement)
- Stats operationnelles (taux occupation, candidatures en attente, visites a venir)
- Lien vers la page Applications

**Ce qui manque** : aucune section "Selection en cours" ou "Candidats a departager".

### Page Applications (`ApplicationsClient.tsx`)

- Liste les candidatures avec onglets Actives / Archivees.
- Chaque `ApplicationCard` affiche : image, titre, ville, prix, statut, date de candidature.
- **Ce qui manque** : pas de filtre par annonce, pas de scoring, pas de vue comparative, pas de tri par evaluation.

### Resume des lacunes

```
AVANT VISITE           PENDANT VISITE         APRES VISITE
    [OK]                   [OK]                  [VIDE]

Candidatures       Calendrier +             Aucun outil pour :
recues             VisitDetailsModal         - Noter
Pipeline clair     Info candidat visible     - Comparer
                                             - Trier
                                             - Decider
```

---

## 3. Benchmark et inspirations

### 3.1 Recrutement : Greenhouse Scorecards

**Principe** : apres chaque entretien, le recruteur remplit une "scorecard" structuree.

- Criteres pre-definis par poste (ex: competences techniques, communication, culture fit)
- Echelle de notation standardisee : 1 (Definitely Not) - 2 (No) - 3 (Mixed) - 4 (Yes) - 5 (Strong Yes)
- Decision globale obligatoire en fin de scorecard
- Pas de commentaires libres sur les criteres individuels (seulement sur la decision globale, encadre)

**Ce qu'on retient pour Coridor** :
- Criteres pre-definis et standardises = anti-discrimination
- Echelle simple (pas de note sur 100, pas de decimales)
- Decision binaire en fin de process (retenu / pas retenu)
- Scorecard remplie immediatement apres l'interaction

### 3.2 Recrutement : Lever Pipeline

**Principe** : vue kanban avec des colonnes correspondant aux etapes.

- Colonnes : New > Phone Screen > On-site > Offer > Hired
- Chaque candidat est une carte qu'on deplace par drag & drop
- Feedback structure attache a chaque carte
- Vue "compare" pour mettre les finalistes cote a cote

**Ce qu'on retient pour Coridor** :
- La metaphore kanban est puissante pour visualiser ou en sont les candidats
- Le drag & drop est satisfaisant mais problematique sur mobile
- La comparaison des finalistes est un besoin reel

### 3.3 Recrutement : Workable

**Principe** : notation + commentaires structures + decision collaborative.

- Scorecard avec categories de criteres
- Chaque critere a une echelle d'etoiles (1-5)
- Score global auto-calcule
- Timeline des interactions avec le candidat

**Ce qu'on retient pour Coridor** :
- Les etoiles sont un pattern connu et rapide
- Le score auto-calcule aide a la decision sans etre deterministe

### 3.4 Notion / Linear : Kanban databases

**Principe** : vues multiples sur les memes donnees.

- Vue kanban (colonnes par statut)
- Vue tableau (tri/filtre par n'importe quel champ)
- Vue galerie (cards visuelles)
- Filtres et tri dynamiques

**Ce qu'on retient pour Coridor** :
- Flexibilite des vues, mais attention a la complexite pour un non-technicien
- La vue "galerie" avec photos est ideale pour se rappeler les visages

### 3.5 Tinder / Bumble : Decision rapide

**Principe** : decision binaire en un geste.

- Swipe gauche = non / Swipe droite = oui
- Decision forcee : on ne peut pas "skip" indefiniment
- Information progressive : photo d'abord, details ensuite
- Undo possible sur la derniere action

**Ce qu'on retient pour Coridor** :
- La rapidite de decision est excellente (1-2 secondes)
- Mais trop reducteur pour une decision aussi importante que choisir un locataire
- L'idee du "tri rapide" en premiere passe est bonne, a condition d'avoir une etape plus reflechie ensuite
- Le pattern "Like / Passer" peut s'adapter en "Shortlister / Ecarter"

### 3.6 Apps immobilieres existantes

**Constat** : la plupart des plateformes (LeBonCoin, SeLoger, PAP, Bien'ici) n'offrent aucun outil de selection post-visite. Le proprietaire est livre a lui-meme une fois les visites terminees.

Les outils de gestion locative (Rentila, Matera) gerent l'apres-bail mais pas la phase de selection.

**Flatlooker / Masteos** (gestion locative deleguee) : proposent parfois un rapport de visite interne, mais c'est fait par un agent, pas par le proprio.

**Opportunite Coridor** : cette lacune est un differenciateur majeur. Aucun concurrent direct ne propose d'outil de selection structure pour les proprietaires particuliers.

### Synthese benchmark

| Source | Pattern cle | Applicable a Coridor |
|--------|------------|---------------------|
| Greenhouse | Scorecard structuree | OUI - criteres pre-definis |
| Lever | Kanban pipeline | OUI - colonnes post-visite |
| Workable | Etoiles par critere | OUI - notation rapide |
| Notion | Vues multiples | PARTIEL - trop complexe pour mobile |
| Tinder | Swipe binaire | PARTIEL - bon pour le tri rapide |
| Competitors immo | Rien | OPPORTUNITE |

---

## 4. Criteres anti-discrimination

### Cadre legal (loi francaise)

La loi du 6 juillet 1989 et la loi Alur interdisent de fonder la selection d'un locataire sur :
- L'origine, l'ethnie, la nationalite
- Le sexe, l'orientation sexuelle, la situation de famille
- L'etat de sante, le handicap
- Les opinions politiques, les activites syndicales
- L'apparence physique, le patronyme
- La religion

Seuls les criteres lies a la **solvabilite** et au **serieux du dossier** sont admis.

### Criteres autorises et structures proposes

Chaque critere utilise une echelle discrete (pas de texte libre) :

#### Categorie A : Adequation dossier / logement (auto-calculable)

Ces criteres peuvent etre pre-remplis par le systeme a partir des donnees du dossier candidat :

| Critere | Echelle | Source donnees |
|---------|---------|---------------|
| Ratio revenus / loyer | Automatique (x fois le loyer) | TenantProfile.netSalary vs Listing.price |
| Presence garantie | Oui / Non + type | Guarantor[] |
| Completude du dossier | % (pieces fournies) | TenantProfile fields remplis |
| Adequation type bail | Match / Partiel / Non | TenantCandidateScope.targetLeaseType vs Listing.leaseType |
| Date emmenagement souhaitee | Compatible / A discuter / Incompatible | TenantCandidateScope.targetMoveInDate vs Listing.availableFrom |

#### Categorie B : Impression visite (saisie proprio)

Ces criteres sont remplis par le proprietaire apres la visite :

| Critere | Echelle | Justification objective |
|---------|---------|----------------------|
| Ponctualite | A l'heure / En retard / Absent | Factuel, observable |
| Interet pour le logement | Fort / Modere / Faible | Base sur les questions posees |
| Questions pertinentes | Beaucoup / Quelques / Aucune | Signe de serieux et preparation |
| Comprehension des conditions | Bonne / Partielle / Insuffisante | Le candidat a-t-il compris le bail |
| Projet locatif clair | Tres clair / Vague / Incoherent | Duree, motivation, projet de vie |

#### Categorie C : Reactivite et serieux (auto-calculable)

| Critere | Echelle | Source donnees |
|---------|---------|---------------|
| Delai de reponse moyen | Rapide / Normal / Lent | Messages timestamps |
| Confirmation visite | Immediate / Dans les temps / Tardive | Visit.confirmedAt vs createdAt |
| Pieces fournies dans les temps | Oui / Partiel / Non | Documents upload timestamps |

### Ce qui est INTERDIT dans le systeme

- **Aucun champ de texte libre** pour les criteres individuels (empeche les commentaires discriminatoires)
- **Aucun critere lie a l'apparence** physique
- **Aucune photo du candidat** dans l'interface de notation (uniquement l'avatar gradient Coridor)
- **Aucune mention** du nom de famille dans la scorecard (prenom + initiale seulement)
- **Pas de note globale "feeling"** : la decision est la somme des criteres objectifs

### Note sur le champ de commentaire global

Si un champ de commentaire est necessaire (ex: "Remarques supplementaires"), il doit :
- Etre optionnel
- Etre limite en longueur (200 caracteres max)
- Afficher un avertissement : "Ce commentaire doit porter uniquement sur des elements objectifs lies au dossier ou a la visite."
- Potentiellement etre modere ou flagge par des mots-cles sensibles (piste future)

---

## 5. Concept A : Scorecard Express

### Nom : "Scorecard Express"
### Philosophie : "30 secondes entre deux visites"

### Flow complet (mobile-first)

#### Etape 1 : Declenchement apres la visite

Le proprietaire est dans son calendrier, il vient de finir une visite.

**Declencheur** : dans le `VisitDetailsModal`, un nouveau bouton apparait une fois que la visite est passee (date < maintenant) :

```
[  Evaluer ce candidat  ]
```

Alternative : une notification push 5 minutes apres l'heure de fin de la visite :
"Comment s'est passee la visite avec Thomas B. ? Evaluez en 30 secondes."

#### Etape 2 : Scorecard rapide (bottom sheet mobile)

Un bottom sheet s'ouvre avec une interface epuree.

**En-tete** :
- Avatar gradient du candidat + prenom + initiale
- Nom de l'annonce + adresse

**Criteres pre-remplis** (categorie A, read-only, montres comme contexte) :
- "Revenus : 3.2x le loyer" (vert)
- "Dossier complet a 85%" (jaune)
- "Garant : Visale" (vert)

**Criteres a remplir** (categorie B, 5 curseurs) :

Chaque critere est une rangee avec 3 options tactiles (icones) :

```
Ponctualite      [A l'heure]  [En retard]  [Absent]
Interet           [Fort]       [Modere]     [Faible]
Questions         [Beaucoup]   [Quelques]   [Aucune]
Conditions        [Compris]    [Partiel]    [Non]
Projet locatif    [Clair]      [Vague]      [Flou]
```

Chaque option est un bouton-pillule. Selection par tap, pas de swipe.

**Decision rapide** :

```
Votre impression apres visite :

[ Shortlister ]    [ Indecis ]    [ Ecarter ]
     (vert)         (gris)         (rouge)
```

**Validation** : "Enregistrer" (un seul bouton, pas de confirmation modale).

#### Etape 3 : Retour au calendrier

Apres enregistrement, le candidat apparait dans le calendrier avec un badge couleur :
- Vert = Shortliste
- Gris = Indecis
- Rouge = Ecarte

Le proprietaire enchaine avec la visite suivante.

#### Etape 4 : Decision finale (apres toutes les visites)

Depuis le calendrier ou la page Applications, un nouveau bouton apparait :

```
[ Comparer mes candidats (5) ]
```

Cela ouvre une vue comparative (cf. Concept C pour les details de cette vue).

### Integration dans l'app existante

| Composant existant | Modification |
|-------------------|-------------|
| `VisitDetailsModal.tsx` | Ajouter bouton "Evaluer" si visite passee |
| `LandlordCalendarClient.tsx` | Ajouter badge couleur sur les visites evaluees |
| `ApplicationsClient.tsx` | Ajouter filtre "Shortlistes / Indecis / Ecartes" + score |
| `DashboardClient.tsx` | Ajouter widget "Selection en cours" avec compteurs |

### Schema Prisma propose

```prisma
model CandidateEvaluation {
  id                String   @id @default(uuid())
  visitId           String   @unique
  listingId         String
  evaluatorId       String   // Le proprietaire

  // Criteres Categorie B (impression visite)
  punctuality       String   // ON_TIME, LATE, ABSENT
  interestLevel     String   // HIGH, MODERATE, LOW
  questionsAsked    String   // MANY, SOME, NONE
  conditionsGrasped String   // GOOD, PARTIAL, INSUFFICIENT
  rentalProject     String   // CLEAR, VAGUE, UNCLEAR

  // Decision
  decision          String   // SHORTLISTED, UNDECIDED, REJECTED

  // Meta
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  visit             Visit    @relation(fields: [visitId], references: [id], onDelete: Cascade)
  listing           Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([listingId])
  @@index([evaluatorId])
}
```

### Avantages

- **Ultra-rapide** : 30 secondes, 5 taps + 1 decision
- **Mobile-first** : bottom sheet, boutons tactiles, pas de formulaire
- **Anti-discrimination** : criteres pre-definis, pas de texte libre, avatars anonymises
- **Memoire** : le proprio retrouve ses impressions a froid
- **Integre** : directement dans le flow calendrier existant

### Risques et limites

- Les 5 criteres peuvent sembler insuffisants pour certains proprios
- La decision ternaire (shortlister/indecis/ecarter) peut frustrer si trop de candidats finissent "indecis"
- Le declenchement post-visite necessite de bien detecter que la visite est terminee (heure de fin)
- Pas de collaboration si le proprio visite avec quelqu'un d'autre (conjoint, parent)

### Complexite technique : Simple

- 1 nouveau model Prisma
- 1 nouveau composant (ScorecardSheet)
- Modification de 3-4 composants existants (VisitDetailsModal, Calendar, Applications)
- 1 nouvelle route API (CRUD evaluation)
- Pas de logique complexe, pas de calcul cote serveur

---

## 6. Concept B : Kanban Pipeline

### Nom : "Kanban Pipeline Post-Visite"
### Philosophie : "Visualiser l'entonnoir de selection"

### Flow complet (mobile-first)

#### Etape 1 : Nouvelle page "Selection" (accessible depuis le dashboard et le calendrier)

Une nouvelle page dediee par annonce. Accessible via :
- Dashboard > Widget "Selection en cours" > Clic sur une annonce
- Calendrier > Bouton contextuel "Voir la selection"
- Page Applications > Bouton "Gerer la selection"

#### Etape 2 : Vue Kanban (3 colonnes)

```
 A evaluer  |  Shortliste  |  Ecartes
 ---------- |  ----------- |  --------
 [Thomas B] |              |
 [Julie R]  |              |
 [Mehdi K]  |              |
 [Anna S]   |              |
```

Chaque carte candidat affiche :
- Avatar gradient + prenom + initiale
- Score dossier auto-calcule (ratio revenus, completude)
- Badge scorecard si deja evalue (icone etoile + score)
- Date de la visite

#### Etape 3 : Interaction avec une carte

**Sur mobile** : tap sur la carte ouvre un bottom sheet avec :
1. Resume du dossier (TenantProfilePreview compact)
2. Scorecard rapide (meme que Concept A)
3. Boutons : "Shortlister" / "Ecarter" / "Message"

**Sur desktop** : clic ouvre un panel lateral (style Notion) avec les memes infos.

#### Etape 4 : Deplacement entre colonnes

**Sur desktop** : drag & drop des cartes entre colonnes.
**Sur mobile** : les boutons "Shortlister" / "Ecarter" dans le bottom sheet deplacent automatiquement la carte.

#### Etape 5 : Finalisation

Quand le proprio a trie tous les candidats :
- Bouton "Comparer la shortliste" (ouvre le Comparateur du Concept C)
- Bouton "Choisir mon locataire" : selectionne le laureat et decline les autres

### Integration dans l'app existante

| Composant existant | Modification |
|-------------------|-------------|
| `DashboardClient.tsx` | Ajouter widget "Selection en cours" avec miniKanban |
| `LandlordCalendarClient.tsx` | Ajouter lien "Voir la selection pour [annonce]" |
| Navigation | Nouvelle page `/selection/[listingId]` |
| `ApplicationsClient.tsx` | Ajouter badge "En selection" + lien vers le Kanban |

### Schema Prisma (en complement du Concept A)

Meme model `CandidateEvaluation` que le Concept A, avec en plus un champ `pipelineStage` :

```prisma
model CandidateEvaluation {
  // ... memes champs que Concept A ...
  pipelineStage     String   @default("TO_EVALUATE")
  // TO_EVALUATE, SHORTLISTED, REJECTED, SELECTED
}
```

### Avantages

- **Vue d'ensemble** : le proprio voit tous ses candidats d'un coup
- **Satisfaisant** : le kanban est un pattern tres satisfaisant (drag & drop, progression visuelle)
- **Scalable** : marche aussi bien pour 3 que pour 15 candidats
- **Standardise** : meme process pour chaque annonce = anti-discrimination systemique
- **Nicolas** (investisseur) adore : c'est repetable, il peut comparer les selections entre ses differents biens

### Risques et limites

- **Complexite mobile** : le drag & drop est frustrant sur petit ecran. Il faut un fallback en boutons.
- **Page supplementaire** : ajoute de la navigation, le proprio doit "sortir" du calendrier/inbox
- **Overkill pour 3 candidats** : si Marie a fait seulement 3 visites, un kanban complet semble lourd
- **Temps d'adoption** : le pattern kanban est connu des techs mais pas forcement des proprios non-techs

### Complexite technique : Moyen

- 1 nouveau model Prisma (meme que Concept A + pipelineStage)
- 1 nouvelle page avec route dynamique
- Composant Kanban (drag & drop desktop + bottom sheet mobile)
- Modifications dashboard + calendrier + applications
- Logique de synchronisation si le statut de l'application change en parallele

---

## 7. Concept C : Comparateur Cote-a-Cote

### Nom : "Comparateur"
### Philosophie : "Decider en voyant tous les criteres en un coup d'oeil"

### Flow complet (mobile-first)

#### Etape 1 : Declenchement

Ce concept fonctionne comme une **etape finale**, complementaire aux Concepts A ou B.

Declenchement :
- Depuis la Scorecard Express : "Comparer mes candidats"
- Depuis le Kanban : "Comparer la shortliste"
- Depuis les Applications : "Comparer les finalistes"

#### Etape 2 : Vue comparative (mobile)

Sur mobile, le comparateur utilise un **carrousel horizontal** :

```
< Thomas B.         2/5 >

Revenus       3.2x le loyer    [vert]
Dossier       85% complet      [jaune]
Garant        Visale           [vert]
Ponctualite   A l'heure        [vert]
Interet       Fort             [vert]
Questions     Beaucoup         [vert]
Conditions    Compris          [vert]
Projet        Clair            [vert]

Decision actuelle : Shortliste

[ Choisir ce candidat ]
```

Navigation par swipe horizontal entre les candidats. Indicateur "2/5" en haut.

#### Etape 2 bis : Vue comparative (desktop)

Sur desktop, vue en colonnes :

```
Critere          | Thomas B.  | Julie R.  | Mehdi K.
-----------------+------------+-----------+---------
Revenus          | 3.2x [v]   | 2.8x [v]  | 4.1x [v]
Dossier          | 85%  [j]   | 100% [v]  | 70%  [r]
Garant           | Visale [v] | CDI [v]   | Non  [r]
Ponctualite      | OK   [v]   | OK   [v]  | Retard[j]
Interet          | Fort [v]   | Fort [v]  | Mod. [j]
Questions        | Bcp  [v]   | Qqs  [j]  | Aucune[r]
Conditions       | OK   [v]   | OK   [v]  | Part.[j]
Projet           | Clair[v]   | Clair[v]  | Vague[j]
-----------------+------------+-----------+---------
Score global     | 9/10       | 8/10      | 4/10
Decision         | Shortliste | Shortliste| Ecarte
```

Code couleur : vert = bon, jaune = moyen, rouge = faible.

#### Etape 3 : Selection du locataire

Bouton "Choisir [Prenom]" qui :
1. Met a jour `RentalApplication.status` = ACCEPTED pour le selectionne
2. Propose de decliner les autres avec un motif pre-defini ("Un autre candidat a ete retenu")
3. Envoie un message systeme dans chaque conversation concernee
4. Redirige vers la generation du bail

### Integration dans l'app existante

Le Comparateur n'est pas un concept autonome, c'est un **complement** aux Concepts A ou B. Il s'integre comme la derniere etape du funnel.

| Point d'entree | Condition |
|----------------|-----------|
| Scorecard Express | Au moins 2 candidats evalues |
| Kanban Pipeline | Au moins 2 candidats en shortliste |
| Page Applications | Au moins 2 candidats avec statut VISIT_CONFIRMED+ |

### Schema Prisma

Aucun nouveau model. Le Comparateur lit les donnees existantes :
- `CandidateEvaluation` (scorecards)
- `TenantProfile` + `TenantCandidateScope` (donnees dossier)
- `RentalApplication` (statut)

### Avantages

- **Decision eclairee** : tous les criteres visibles en un coup d'oeil
- **Equitable** : meme grille pour tous, code couleur objectif
- **Satisfaisant** : le moment "et le gagnant est..." ferme la boucle de selection
- **Actionnable** : la decision declenche directement le bail + les notifications

### Risques et limites

- **Necessite des donnees** : si le proprio n'a pas rempli les scorecards, la vue est vide
- **Tableau sur mobile** : un tableau multi-colonnes est difficile a lire sur petit ecran (d'ou le carrousel)
- **Pas autonome** : doit etre combine avec un systeme de notation (Concept A ou B)
- **Effet "spreadsheet"** : risque de deshumaniser la decision si c'est trop tabulaire

### Complexite technique : Simple

- 1 nouveau composant (CandidateComparator)
- Pas de nouveau model
- Lecture seule sur les donnees existantes
- La complexite est dans la vue responsive (tableau desktop vs carrousel mobile)

---

## 8. Recommandation finale

### Recommandation : Concept A (Scorecard Express) + Concept C (Comparateur)

**Pourquoi cette combinaison :**

#### 1. Usage mobile (proprio entre deux visites)

La Scorecard Express est concue pour etre remplie debout, dans un couloir, en 30 secondes. C'est un bottom sheet avec des boutons-pillules, pas un formulaire. Le proprio termine sa visite, sort son telephone, tap-tap-tap, c'est fait.

Le Kanban (Concept B) est seduisant sur desktop mais penible sur mobile. Le drag & drop tactile est une source de frustration connue. Et forcer le proprio a naviguer vers une page dediee entre deux visites, c'est ajouter de la friction au pire moment.

#### 2. Rapidite d'utilisation (30 secondes max)

- Scorecard Express : 5 criteres x 1 tap + 1 decision = ~30 secondes
- Kanban Pipeline : navigation vers la page + trouver la carte + ouvrir + evaluer = ~1-2 minutes
- Comparateur : temps de lecture, pas de saisie = ~1 minute pour la decision finale

Le flow optimal est donc :
```
[Visite terminee] --30s--> [Scorecard Express] --le soir--> [Comparateur] --5min--> [Decision]
```

#### 3. Anti-discrimination

La Scorecard Express est le concept le plus protecteur :
- Criteres 100% pre-definis, pas de texte libre
- Avatar gradient (pas de photo)
- Prenom + initiale (pas de nom complet)
- Criteres auto-calcules (revenus, dossier) separes des criteres subjectifs (impression visite)
- Echelle discrete (3 niveaux) au lieu d'une note sur 10 qui invite aux micro-biais

Le Comparateur renforce cela en montrant tous les candidats sur la meme grille, rendant visible toute incoherence de notation.

#### 4. Faisabilite technique

La combinaison A + C est la plus simple a implementer :
- 1 nouveau model Prisma (`CandidateEvaluation`)
- 2 nouveaux composants (ScorecardSheet + CandidateComparator)
- Modifications mineures sur 4 composants existants
- 2 routes API (CRUD evaluation + GET comparatif)
- Pas de drag & drop, pas de nouvelle page de navigation

**Estimation** : 3-5 jours de developpement pour un MVP fonctionnel.

#### 5. Chemin d'evolution

La beaute de cette approche est qu'elle pose les fondations pour le Kanban (Concept B) en V2 :

```
V1 (maintenant)  : Scorecard Express + Comparateur
V2 (plus tard)   : + Vue Kanban sur la page Selection
V3 (encore apres): + Scoring automatique + Recommandations IA
```

Le model `CandidateEvaluation` avec `pipelineStage` permet de passer au Kanban sans migration de schema.

### Plan d'implementation propose

#### Phase 1 : Scorecard Express (MVP)

1. Ajouter le model `CandidateEvaluation` au schema Prisma
2. Creer le composant `ScorecardSheet` (bottom sheet mobile)
3. Modifier `VisitDetailsModal.tsx` : ajouter le bouton "Evaluer" si visite passee
4. Creer la route API `POST /api/evaluations` + `GET /api/evaluations?listingId=`
5. Modifier `LandlordCalendarClient.tsx` : badge couleur sur les visites evaluees
6. Notification push post-visite : "Evaluez votre candidat en 30 secondes"

#### Phase 2 : Comparateur

7. Creer le composant `CandidateComparator` (carrousel mobile + tableau desktop)
8. Creer la route API `GET /api/listings/[listingId]/candidates-comparison`
9. Modifier `ApplicationsClient.tsx` : bouton "Comparer" + filtres par evaluation
10. Ajouter le widget "Selection en cours" dans `DashboardClient.tsx`

#### Phase 3 : Boucler le cycle

11. Action "Choisir ce candidat" depuis le Comparateur
12. Decliner automatiquement les autres avec motif pre-defini
13. Message systeme dans les conversations concernees
14. Redirection vers la generation du bail

### Metriques de succes

| Metrique | Objectif | Comment mesurer |
|----------|----------|-----------------|
| Taux d'adoption scorecard | > 60% des visites evaluees | CandidateEvaluation.count / Visit.count (passees) |
| Temps de remplissage | < 45 secondes | Timestamp createdAt - ouverture du sheet |
| Taux de decision post-comparaison | > 80% des selections finalisees | RentalApplication.status = ACCEPTED apres comparaison |
| Delai selection | < 48h apres derniere visite | Timestamp decision - derniere visite |
| Utilisation du texte libre | < 20% des evaluations | Si un champ commentaire est ajoute |

---

## Annexe : Maquette textuelle de la Scorecard Express (mobile)

```
+------------------------------------------+
|  [X]           Evaluer le candidat       |
+------------------------------------------+
|                                           |
|    [Avatar Gradient]                      |
|    Thomas B.                              |
|    Appt T3 - 15 rue des Lilas            |
|    Visite du 12 fev, 14h30               |
|                                           |
|  -- Dossier (auto) --                    |
|                                           |
|  Revenus     3.2x le loyer        [vert] |
|  Dossier     85% complet         [jaune] |
|  Garant      Visale                [vert] |
|  Bail        Compatible           [vert] |
|  Emmenagement  Compatible         [vert] |
|                                           |
|  -- Impression visite --                 |
|                                           |
|  Ponctualite                              |
|  [A l'heure]  [En retard]  [Absent]      |
|     ^^^                                   |
|                                           |
|  Interet pour le bien                     |
|  [Fort]  [Modere]  [Faible]              |
|   ^^^                                     |
|                                           |
|  Questions posees                         |
|  [Beaucoup]  [Quelques]  [Aucune]        |
|     ^^^                                   |
|                                           |
|  Comprehension conditions                 |
|  [Bonne]  [Partielle]  [Insuffisante]    |
|   ^^^                                     |
|                                           |
|  Projet locatif                           |
|  [Clair]  [Vague]  [Flou]               |
|   ^^^                                     |
|                                           |
|  -- Votre decision --                    |
|                                           |
|  [  Shortlister  ] [Indecis] [Ecarter]   |
|       (vert)        (gris)     (rouge)    |
|                                           |
|  [ -------- Enregistrer --------- ]      |
|                                           |
+------------------------------------------+
```

---

## Annexe : Maquette textuelle du Comparateur (desktop)

```
+----------------------------------------------------------------+
|  Selection : Appt T3 - 15 rue des Lilas                       |
|  5 candidats evalues  |  3 shortlistes  |  1 indecis  | 1 ecarte
+----------------------------------------------------------------+
|                                                                 |
|  Critere           | Thomas B. | Julie R. | Mehdi K. | Anna S. |
|  ------------------+-----------+----------+----------+---------|
|  DOSSIER                                                       |
|  Revenus           |  3.2x [v] | 2.8x [v] | 4.1x [v]| 2.1x[j]|
|  Completude        |  85% [j]  | 100% [v] | 70%  [r] | 95%[v] |
|  Garant            | Visale[v] | CDI  [v] | Non  [r] | PACS[v]|
|  Type bail         | OK   [v]  | OK   [v] | OK   [v] | OK [v] |
|  Date emmenagement | OK   [v]  | OK   [v] | A disc[j]| OK [v] |
|  ------------------+-----------+----------+----------+---------|
|  IMPRESSION VISITE                                             |
|  Ponctualite       | OK   [v]  | OK   [v] | Retard[j]| OK [v] |
|  Interet           | Fort [v]  | Fort [v] | Mod. [j] |Fort[v] |
|  Questions         | Bcp  [v]  | Qqs  [j] | Aucune[r]| Bcp[v] |
|  Conditions        | OK   [v]  | OK   [v] | Part.[j] | OK [v] |
|  Projet            | Clair[v]  | Clair[v] | Vague[j] |Clair[v]|
|  ------------------+-----------+----------+----------+---------|
|  REACTIVITE                                                    |
|  Reponses          | Rapide[v] | Normal[j]| Lent [r] |Rapide[v]|
|  Confirmation      | Immed.[v] | OK   [v] | Tardif[j]| OK  [v]|
|  ------------------+-----------+----------+----------+---------|
|  DECISION          | SHORT [v] | SHORT[v] | ECARTE[r]|INDEC[j]|
|  ------------------+-----------+----------+----------+---------|
|                                                                |
|  [  Choisir Thomas B.  ]   [  Choisir Julie R.  ]             |
|                                                                |
+----------------------------------------------------------------+
```

---

*Document genere par UX Research pour Coridor. A discuter et iterer avec l'equipe produit et dev.*
