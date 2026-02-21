# Coridor

Webapp de location immobilière entre particuliers en France. Combine mise en location + gestion locative + automatisation + signaux de fiabilité candidats + pilotage financier.
Promesse : moins de charge mentale pour le propriétaire + plus de transparence et d'équité pour le locataire, sans passer par une agence.
Positionnement : "Airbnb-like UX" + "gestion locative complète" + "fiabilité candidats" (badges, anti-discrimination, recommandations).

## Stack

- **Framework** : Next.js (App Router) + TypeScript
- **Styling** : Tailwind CSS + PostCSS
- **ORM** : Prisma (PostgreSQL via Supabase)
- **Auth** : Custom sessions DB (model Session)
- **i18n** : next-intl (FR/EN — messages dans `messages/fr.json` et `messages/en.json`)
- **Déploiement** : Vercel via GitHub
- **Images** : Cloudinary (avec transforms dans `lib/cloudinaryTransforms.ts`)
- **Cartes** : Mapbox (`app/libs/mapbox.ts`) + Google Maps/Places (autocomplete)
- **Paiements/Banking** : Powens / GoCardless (`app/lib/powens.ts`, `services/`)
- **Signature** : YouSign (`services/YousignService.ts`)
- **Baux** : `services/LeaseService.ts`, `services/LeaseClauses.ts`
- **Régularisation** : `services/RegularizationService.ts`
- **Notifications** : Push (Web Push API + `app/lib/sendPushNotification.ts`) + in-app
- **PWA** : manifest.json + sw.js + InstallPrompt component
- **Typo custom** : Matter (Light → Heavy, dans `public/fonts/`)

## Commandes

```bash
npm run dev              # Serveur de dev (Next.js)
npm run build            # Build production
npm run lint             # ESLint
npx prisma db push       # Push schema vers Supabase
npx prisma migrate dev   # Créer une migration
npx prisma generate      # Régénérer le client Prisma
npx prisma studio        # Interface visuelle BDD
```

## Structure du projet

```
app/
├── [locale]/             # Pages avec i18n (FR/EN)
│   ├── page.tsx          # Landing / Home
│   ├── HomeClient.tsx    # Client component de la home
│   ├── layout.tsx        # Layout avec locale
│   ├── account/          # Paramètres du compte
│   ├── admin/            # Dashboard admin
│   ├── calendar/         # Calendrier propriétaire
│   ├── components/       # Composants spécifiques aux pages
│   ├── contacts/         # Gestion des contacts
│   ├── dashboard/        # Dashboard propriétaire
│   ├── favorites/        # Favoris / Wishlists
│   ├── inbox/            # Messagerie
│   ├── leases/           # Gestion des baux
│   ├── listings/         # Annonces (recherche + détail)
│   ├── notifications/    # Centre de notifications
│   ├── pricing/          # Page tarifs (FREE/PLUS/PRO)
│   ├── properties/       # CRUD logements propriétaire
│   └── rentals/          # Gestion locative (charges, régul)
├── actions/              # Server Actions (getData, mutations)
├── api/                  # API Routes (REST endpoints)
│   ├── auth/             # Authentification
│   ├── applications/     # Candidatures
│   ├── conversations/    # Messagerie API
│   ├── expenses/         # Charges
│   ├── leases/           # Baux
│   ├── listings/         # Annonces
│   ├── powens/           # Banking (Powens/GoCardless)
│   ├── properties/       # Logements
│   ├── visits/           # Visites
│   ├── webhooks/         # Webhooks externes
│   ├── cron/             # Tâches planifiées
│   └── ...               # Autres endpoints
├── lib/                  # Utilitaires app-level
└── libs/                 # Config (energy.ts, mapbox.ts)

components/               # Composants UI réutilisables
├── ui/                   # Atomiques (Button, BottomSheet, PillButton...)
├── inputs/               # Champs de formulaire (AddressSelect, ImageUpload...)
├── modals/               # Modales (Login, Register, Search, Application...)
├── navbar/               # Navigation (Navbar, UserMenu, Search, Logo)
├── listings/             # Composants annonce (ListingCard, ListingInfo...)
├── map/                  # Couches carte (StationsLayer)
├── documents/            # Génération de docs (LeaseDocument, Regularization)
├── account/              # Composants compte
├── profile/              # Composants profil locataire
├── properties/           # Composants propriété
├── sidebar/              # Sidebar navigation
├── visits/               # Composants visites
├── reports/              # Signalements
├── pwa/                  # InstallPrompt
└── providers/            # ThemeProvider

hooks/                    # Custom hooks
├── useLoginModal.ts      # Contrôle modal login
├── useSearchModal.ts     # Contrôle modal recherche
├── useRentModal.ts       # Contrôle modal loyer
├── useCommuteModal.ts    # Contrôle modal trajet
├── useFavorite.tsx       # Logique favoris
├── useConversation.ts    # Logique messagerie
├── useMediaQuery.ts      # Responsive breakpoints
├── useRealtimeNotifications.ts # Notifications temps réel
└── useUserCounters.ts    # Compteurs utilisateur

services/                 # Logique métier
├── LeaseService.ts       # Génération et gestion des baux
├── LeaseClauses.ts       # Clauses légales des baux
├── RegularizationService.ts # Régularisation des charges
└── YousignService.ts     # Intégration signature électronique

lib/                      # Utilitaires globaux
├── supabase.ts           # Client Supabase
├── supabaseServer.ts     # Client Supabase côté serveur
├── email.ts              # Envoi d'emails
├── cloudinaryTransforms.ts # Transformations images
├── imageCompression.ts   # Compression images
└── utils.ts              # Utilitaires divers

libs/                     # Config et helpers
├── auth.ts               # Logique d'authentification
├── prismadb.ts           # Client Prisma singleton
├── notifications.ts      # Helpers notifications
└── uniqueCode.ts         # Génération code unique contact

i18n/                     # Internationalisation
├── routing.ts            # Config routes i18n
├── navigation.ts         # Navigation i18n
└── request.ts            # Request i18n

types/                    # Types TypeScript
utils/                    # Utilitaires métier
├── dossierGenerator.ts   # Génération dossier locataire
└── rentUtils.ts          # Calculs loyer
```

## Base de données — Architecture 3-tiers

```
Property (bien physique)
  └── RentalUnit (unité louable : entier / chambre privée / chambre partagée)
       └── Listing (annonce commerciale avec prix et statut)
```

### Tables principales

**Utilisateurs** : User, TenantProfile, Guarantor, Income, Account, Session
**Biens** : Property, RentalUnit, Room, PropertyImage, Furniture
**Annonces** : Listing (DRAFT → PENDING_REVIEW → PUBLISHED → ARCHIVED)
**Candidatures** : TenantCandidateScope, RentalApplication, LeaseFinancials
**Visites** : VisitSlot (dispo propriétaire), Visit (réservation locataire)
**Messagerie** : Conversation, Message
**Interactions** : Like, Wishlist, CommuteLocation, SearchAlert
**Finances** : Expense, ReconciliationHistory, ReconciliationItem, RentIndex
**Banking** : BankConnection, BankTransaction (via Powens)
**Système** : Notification, NotificationPreferences, PushSubscription, Report

Voir `prisma/schema.prisma` pour le schéma complet.

## Conventions

- Composants : PascalCase, un par fichier
- Hooks : `useNomDuHook.ts`
- Server Actions : dans `app/actions/` avec préfixe get/set/create/update/delete
- API Routes : dans `app/api/[resource]/route.ts`
- Montants : en centimes (Int) dans la BDD, convertir en euros à l'affichage
- Sécurité : vérifier ownership côté API (`ownerId === session.userId`)
- i18n : toutes les chaînes dans `messages/fr.json` et `messages/en.json`
- Images : upload via Cloudinary, compression côté client avec `imageCompression.ts`
- Toujours gérer les états : loading, error, empty, success

## Contexte métier

Marché : location longue durée entre particuliers en France (loi Elan, encadrement loyers, DPE).
Modèle : plans FREE / PLUS / PRO (propriétaires) + badge Payeur Exemplaire (locataires).
Audiences : propriétaires bailleurs (1-10 biens) et locataires en recherche active.
Différenciation clé :
1. De la recherche au bail + gestion dans un même flux
2. Fiabilité candidats comme produit central (badge Payeur Exemplaire, anonymisation anti-discrimination, reco ancien proprio)
3. UX moderne type Airbnb/Revolut/Claude
4. Conformité France (IRL, GLI, anti-discrimination)
Concurrents : LeBonCoin, SeLoger, PAP (simples annonces), Rentila/Matera (gestion sans acquisition), agences (coûteuses).

Voir @docs/BUSINESS.md pour le positionnement détaillé et personas.
Voir @docs/BACKLOG.md pour l'état des features.
Voir @docs/DESIGN-SYSTEM.md pour la charte graphique.
Voir @project_master_plan.md pour le plan directeur.
