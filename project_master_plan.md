# 🗺️ Coridor - Master Project Plan

Ce document sert de **référence unique** pour l'état d'avancement du projet Coridor. Il consolide toutes les fonctionnalités développées, en cours, et planifiées.

---

## 🟢 1. Core Platform & Auth
**Statut : Opérationnel**
- [x] **Authentification CIAM** : Connexion/Inscription (Email, Google, Github) via NextAuth.
- [x] **Gestion de Profil** :
    - Mode Locataire / Propriétaire (switch).
    - Informations personnelles (Nom, contact, date de naissance).
    - Avatar (Upload + UI Avatars fallback).
- [x] **Design System** :
    - UI Components (Boutons, Inputs, Modals, Cards).
    - Responsive Design (Mobile First focus récent).
    - Dark Mode (Support partiel/complet selon les pages).

## 🟢 2. Marketplace (Recherche & Annonces)
**Statut : Avancé**
- [x] **Création d'Annonce (Propriétaire)** :
    - Flow multi-étapes (Catégorie, Localisation, Info, Photos, Prix).
    - Gestion des "Rental Units" (Logement entier vs Chambres).
    - Upload Photos (Cloudinary).
    - Photo organization par pièce avec drag & drop.
    - Assistant de Prix avec contrôle des loyers.
- [x] **Recherche (Locataire)** :
    - Filtres avancés (Prix, Surface, Pièces, etc.).
    - Map interactive (Leaflet) avec visualisation isochrone.
    - Affichage en Grille / Liste.
    - Tri personnalisable (ListingSort).
- [x] **Détail Annonce** :
    - Galerie photos avec vue immersive.
    - Informations complètes (Charges, Dépôt, Meubles).
    - Carte de localisation (floutée).
    - Score Quartier (Proximité transports, écoles, etc.).
    - Footer mobile avec actions rapides.
- [x] **"Reprendre la recherche"** :
    - ResumeSearch component avec image du dernier bien consulté.
    - Affichage sur page d'accueil (hors recherche active).
    - Design attractif avec gradient et animations.
    - Stockage localStorage de la dernière recherche.
- [x] **Favoris & Wishlists** :
    - Système de Wishlists multiples.
    - Ajouter/Retirer des favoris.
    - SaveListingMenu avec organisation.
    - Page dédiée `/favorites` et `/favorites/[wishlistId]`.
- [x] **Likes** :
    - Système de "j'aime" sur les annonces.
    - API `/api/likes/[listingId]`.
- [x] **Alertes Recherche Avancées** :
    - SearchAlert model avec critères multiples + statistiques.
    - Fréquence : INSTANT ou DAILY.
    - SearchAlertModal pour création/modification.
    - **Page de gestion complète** (`/account/alerts`) :
        - Liste de toutes les alertes actives/en pause.
        - Affichage des critères de recherche avec icônes.
        - **Statistiques** : Nombre de matches, dernière notification envoyée.
        - Actions : Activer/Désactiver, Supprimer.
        - Interface moderne avec badges et dark mode.
    - **Bouton d'alerte toujours visible** :
        - Banner complet quand recherche active.
        - Bouton compact sur page d'accueil.
    - **Système de notification automatique** :
        - Cron job Vercel (`/api/cron/check-alerts`, toutes les 30min).
        - Vérifie les nouvelles annonces matchant les critères.
        - Envoie notifications push + email + in-app.
        - Respect des préférences utilisateur (DND, types).
        - Tracking lastSentAt et matchCount.
    - API complète : GET, POST, PATCH, DELETE.

## 🟢 3. Expérience Locataire (Candidature & Dossier)
**Statut : Avancé**
- [x] **Dossier Locataire** :
    - Intégration **DossierFacile** (Connexion SSO).
    - TenantProfile avec revenus, garants, situation professionnelle.
    - **Vérification Bancaire Powens** :
        - BankConnection et BankTransaction models.
        - API Powens (init, callback, sync, analyze, connect-landlord).
        - Analyse automatique des transactions (détection loyer, revenus).
        - Vérification des revenus locataires.
    - CommuteLocation pour préférences de trajet.
- [x] **Candidature** :
    - RentalApplication model avec statuts multiples.
    - Flow de candidature (Solo, Couple, Coloc).
    - TenantCandidateScope : "Smart Scope" (Groupement des revenus pour éligibilité).
    - Statuts : PENDING, ACCEPTED, REJECTED, VISIT_PROPOSED, LEASE_SENT, LEASE_SIGNED.
    - Suivi des candidatures dans Dashboard locataire.
- [x] **Signature Bail Électronique** :
    - **Intégration Yousign complète** :
        - YousignService pour créer et gérer les signatures.
        - API `/api/leases/[applicationId]/sign` pour initier signature.
        - API `/api/leases/preview` pour prévisualiser le bail.
        - LeaseFinancials model pour détails financiers du bail.
        - Webhooks Yousign (`/api/webhooks/yousign`) pour événements :
            - signature_request.done
            - signature_request.expired
            - signature_request.declined
            - signer.done
        - Notifications push lors des événements de signature.
    - LeaseViewerClient (`/leases/[applicationId]`) pour visualiser le bail.
    - Statut de bail trackable via API `/api/leases/[applicationId]/status`.

## 🟢 4. Expérience Propriétaire (Dashboard & Gestion)
**Statut : Très Avancé**
- [x] **Dashboard Propriétaire** :
    - DashboardClient avec vue d'ensemble complète.
    - Stats Cards (Annonces actives, Candidatures, Visites).
    - SubscriptionCarousel pour upgrades.
    - VisitCard pour visites à venir.
- [x] **Gestion des Biens** (`/properties`) :
    - PropertiesClient avec liste des propriétés.
    - Property model 3-tier : Property → RentalUnit → Listing.
    - Cartes de propriétés (PropertyStandardCard, PropertyColocationCard).
    - PropertiesListRow pour affichage liste.
    - **Édition Complète** (`/properties/[listingId]/edit`) :
        - EditPropertyClient avec sections multiples :
            - TitleSection, DescriptionSection
            - CategorySection, LocationSection
            - PriceSection avec PriceAssistantModal
            - AmenitiesSection, FurnitureSection
            - LeaseTypeSection, RoomsConfigSection
            - **PhotosSection** avec gestion avancée :
                - PhotoGrid, PhotoTour
                - Drag & drop (SortablePhoto)
                - Organisation par pièce (Room)
                - AddRoomModal, MovePhotoModal, SelectUnassignedModal
                - AllPhotosModal pour vue d'ensemble
            - VisitsSection, StatusSection
        - Rent control utilities (rentControlUtils.ts).
- [x] **Gestion des Candidatures** (`/dashboard/applications`) :
    - ApplicationsClient avec Kanban / Liste.
    - ApplicationCard pour chaque candidat.
    - Accès au Dossier complet (Géré par permissions).
    - Actions : Proposer visite, Accepter, Refuser, Envoyer bail.
- [x] **Gestion des Visites** :
    - VisitSlot model : créneaux de disponibilité.
    - Visit model : demandes et réservations.
    - **Calendrier Propriétaire** (`/calendar`) :
        - LandlordCalendarClient interactif.
        - VisitDetailsModal pour détails visite.
    - API `/api/listings/[listingId]/visits` et `/api/visits/book`.
    - Acceptation/Refus des demandes.
- [x] **Finances & Comptabilité** :
    - **Dashboard Financier** (`/dashboard/finances`) :
        - FinancesClient avec analytics complètes.
        - CashflowChart (graphique flux de trésorerie).
        - ExpenseDistributionBar (répartition des dépenses).
        - KPICards (indicateurs clés : revenus, dépenses, rentabilité).
    - **Gestion des Dépenses** (`/properties/[listingId]/expenses`) :
        - ExpensesClient pour suivi des frais.
        - SwipeableExpenseItem pour interface mobile.
        - Expense model avec catégories.
        - API `/api/expenses/[expenseId]` et `/api/properties/[propertyId]/expenses`.
    - ReconciliationHistory et ReconciliationItem models (rapprochements comptables).
    - RentIndex model (indexation des loyers).
    - Modals : RentRevisionModal, RegularizationModal.

## 🟢 5. Communication & Notifications
**Statut : Très Avancé**
- [x] **Messagerie In-App** :
    - Temps réel (Polling/SWR).
    - Envoi de pièces jointes (Fichiers, Images).
    - Contextualisation (Lien avec l'annonce discutée).
    - UX Mobile optimisée.
- [x] **Système de Notifications In-App** :
    - Centre de notification dans la Navbar (Cloche).
    - Notification model avec types (Message, Candidature, Visite, Like).
    - Polling automatique (60s).
    - Marquer comme lu / Tout marquer comme lu.
    - Lien direct vers la ressource concernée.
- [x] **Notifications Push Web** :
    - Web Push intégré (VAPID keys).
    - Support multi-devices (PushSubscription model).
    - Préférences utilisateur (NotificationPreferences) :
        - Activer/Désactiver par type (Messages, Visites, Candidatures, Likes).
        - Mode "Do Not Disturb" (plages horaires).
    - Envoi automatique via `sendPushNotification()`.
    - Nettoyage automatique des subscriptions expirées.
- [x] **Emails Transactionnels** :
    - Templates HTML via Resend.
    - EmailTemplate component.
    - Envoi automatique pour événements importants.

## 🟢 6. Administration & Sécurité
**Statut : Très Avancé**
- [x] **Back-office Admin Complet** :
    - **Dashboard Admin** (`/admin`) :
        - Stats Cards (Pending Listings, Users, Reports, Published Listings).
        - Growth Analytics Chart (Recharts).
        - Recent Listings Feed.
        - Recent Reports Section.
        - New Users Sidebar.
    - **Gestion Utilisateurs** (`/admin/users`) :
        - UserManagementClient avec liste complète.
        - Actions : Bannir, Supprimer, Changer le rôle.
        - Filtrage et recherche.
    - **Modération Annonces** (`/admin/listings`) :
        - ListingModerationTable avec statuts (PENDING_REVIEW, PUBLISHED, REJECTED).
        - Actions : Approuver, Rejeter avec motif, Archiver.
        - Vue détaillée par annonce (`/admin/listings/[listingId]`).
    - **Gestion des Rapports** (`/admin/reports`) :
        - ReportsClient pour gérer les signalements.
        - Affichage Reporter + Target (User ou Listing).
        - Actions : Résoudre, Ignorer, Sanctionner.
- [x] **Système de Signalements (Safety)** :
    - Report model (raison, détails, statut).
    - ReportButton component.
    - API `/api/reports` pour créer un signalement.
    - Types : Signalement d'utilisateur ou d'annonce.
    - Prévention auto-signalement.

## 🟢 7. Progressive Web App (PWA)
**Statut : Opérationnel**
- [x] **Configuration PWA** :
    - `manifest.json` complet avec métadonnées.
    - Icônes (192x192, 512x512) + maskable icons.
    - Display mode : standalone.
    - Shortcuts vers Inbox, Dashboard, Favorites.
    - Screenshots pour app stores.
- [x] **Service Worker** (`sw.js`) :
    - Stratégie Network-first avec cache fallback.
    - Précache des assets critiques.
    - Nettoyage automatique des anciens caches.
    - Gestion offline (page offline).
- [x] **InstallPrompt Component** :
    - Détection automatique du prompt d'installation.
    - UI attractive pour inciter à l'installation.
    - Cooldown 24h après dismiss.
    - Animation Framer Motion.
- [x] **Intégration dans le layout** :
    - Service worker enregistré au démarrage.
    - Support iOS et Android.
    - Mode standalone détecté.

## 🟢 8. Internationalisation (i18n)
**Statut : Très Avancé (FR/EN)**
- [x] **Infrastructure Complète** :
    - `next-intl` intégré (routing, middleware, plugin Next.js).
    - Fichiers de traduction : `messages/fr.json` + `messages/en.json` (488+ clés, 11+ namespaces).
    - Détection automatique de la locale via middleware.
    - **Migration complète vers `app/[locale]/`** :
        - Toutes les pages migrées vers la nouvelle structure.
        - 33 pages principales + 28 client components.
        - 4 layouts localisés (root, account, admin, inbox).
- [x] **Pages traduites** :
    - **Navigation** : Navbar, MobileMenu, Footer, Sélecteur de langue.
    - **Homepage** : HomeClient, ListingCard, filtres, tri.
    - **Modals** : Login, Register, Search, Rent.
    - **Dashboard** : Tenant + Landlord, Applications, Finances.
    - **Account** : Project, Tenant Profile, Security, Preferences, Notifications, Personal Info.
    - **Listings** : Page détail, galerie, informations.
    - **Favorites** : Wishlists, gestion des favoris.
    - **Calendar** : Calendrier locataire et propriétaire.
    - **Contacts** : Gestion des contacts.
    - **Pricing** : Page de tarification.
- [ ] **Reste à traduire** :
    - Pages Admin (dashboard, listings, users, reports).
    - Inbox / Messaging (conversations, messages).
    - Properties / Listings (édition complète).
    - Toast Notifications (certains encore hardcodés en FR).
    - Emails transactionnels.

## 🟢 9. UX & Design Enhancements
**Statut : Avancé**
- [x] **iOS-Style Page Transitions** :
    - TransitionProvider avec animations Framer Motion.
    - Transitions fluides entre les pages.
    - Gestion de l'historique de navigation.
- [x] **Mobile-First Design** :
    - Responsive design complet.
    - MobileMenu optimisé.
    - ListingMobileFooter avec actions rapides.
    - SwipeableExpenseItem pour gestes tactiles.
- [x] **Dark Mode** :
    - Support ThemeProvider.
    - Adaptation des composants.
    - Persistence des préférences.
- [x] **Design System Consistant** :
    - Composants réutilisables (Buttons, Inputs, Cards).
    - Palette de couleurs cohérente.
    - Animations et micro-interactions.

## 🟢 10. Pricing & Abonnements
**Statut : En place (UI prête)**
- [x] **Page Pricing** (`/pricing`) :
    - PricingClient avec plans FREE, PLUS, PRO.
    - Affichage des fonctionnalités par plan.
    - Call-to-action pour upgrade.
- [x] **Plan Model** :
    - Enum Plan (FREE, PLUS, PRO) dans User model.
    - Tracking du plan actuel utilisateur.
- [ ] **Intégration Paiement** :
    - Stripe à intégrer pour abonnements payants.
    - Gestion des périodes d'essai.
    - Webhooks Stripe pour events.

## 🚀 Roadmap & Reste à Faire

### Court Terme (Prioritaire)
1.  ~~**Refonte Dashboard Admin**~~ ✅ : Graphiques Recharts, StatsCards, données historiques, gestion complète.
2.  ~~**Mobile Polish**~~ ✅ : Audit complet — app optimisée mobile avec PWA.
3.  ~~**Internationalisation (i18n)**~~ ✅ : Migration complète vers `app/[locale]/`. FR/EN opérationnel. Reste : Admin, Inbox, Properties edit, Toasts.
4.  ~~**PWA**~~ ✅ : Manifest, Service Worker, InstallPrompt, support offline.
5.  ~~**Notifications Push**~~ ✅ : Web Push intégré avec préférences et DND.
6.  ~~**Système de Signalements**~~ ✅ : Reports complets avec gestion admin.
7.  ~~**Alertes de Recherche**~~ ✅ : Système complet avec page de gestion, API CRUD, bouton toujours visible.
8.  ~~**Signature Électronique**~~ ✅ : Yousign intégré avec webhooks.
9.  ~~**Vérification Bancaire**~~ ✅ : Powens intégré pour analyse des revenus.
10. ~~**Dashboard Financier**~~ ✅ : Analytics complètes avec graphiques et KPIs.

### Moyen Terme
1.  **Finaliser l'i18n** :
    - Traduire pages Admin complètes.
    - Traduire Inbox / Messaging.
    - Traduire Properties edit (toutes les sections).
    - Internationaliser tous les Toasts.
    - Templates emails multilingues.
2.  **Gestion Locative Avancée** :
    - ~~États des lieux (Module ou intégration).~~ ✅ EDL complet (entrée) — 9 écrans, signature, PDF, conversation, calendrier, rectification 10j
    - ~~Quittances de loyer automatiques.~~ ✅
    - ~~Rappels de paiement.~~ ✅
    - Historique des locataires.
    - EDL de sortie (diff avec EDL d'entrée).
3.  **Paiements Stripe** :
    - Intégration Stripe Connect (Abonnements Propriétaires).
    - Webhooks Stripe pour events.
    - Gestion des périodes d'essai.
    - Paiement des loyers in-app (Optionnel).
4.  **Amélioration Analytics** :
    - Tableaux de bord personnalisables.
    - Export de données (CSV, PDF).
    - Prévisions de revenus.

### Tech / Maintenance
- [x] **Nettoyage Code** : Linting & suppression code unused.
- [x] **Performance** : Optimisation Images (Cloudinary transforms) & Requêtes DB.
- [x] **Migration Structure** : Migration vers `app/[locale]/` terminée.
- [x] **Tests E2E** : Playwright installé, 8 tests critiques (dashboard, navigation, finances, création annonce, messagerie, suivi loyers, régularisation, EDL), setup auth, CI GitHub Actions, projets desktop + mobile.
- [x] **Monitoring** : Sentry intégré — `@sentry/nextjs` v10, configs client/server/edge, instrumentation Next.js, identification utilisateur, error boundary locale, source maps, page confidentialité RGPD.
- [ ] **Documentation** : Documentation développeur (Storybook, composants, API).

---

## 📊 Statistiques du Projet

### Architecture
- **Framework** : Next.js 15+ avec App Router
- **Base de données** : PostgreSQL (Prisma ORM)
- **Authentification** : NextAuth.js
- **UI/UX** : Tailwind CSS, Framer Motion, Lucide Icons
- **Maps** : Leaflet
- **Uploads** : Cloudinary
- **Emails** : Resend
- **i18n** : next-intl
- **PWA** : Custom Service Worker + Web Push (VAPID)

### Modèles de Données (Prisma)
- **33 models** au total
- Principaux : User, Property, RentalUnit, Listing, RentalApplication, Visit, Message, Notification, Report, SearchAlert, BankConnection, PushSubscription

### Pages & Routes
- **33 pages principales** sous `app/[locale]/`
- **28 client components** principaux
- **60+ API routes** (`app/api/`)
- **4 layouts** (root, account, admin, inbox)

### Intégrations Externes
- ✅ DossierFacile (SSO dossier locataire)
- ✅ Yousign (Signature électronique)
- ✅ Powens (Vérification bancaire)
- ✅ Cloudinary (Images)
- ✅ Resend (Emails)
- ✅ Leaflet (Cartes)
- ⏳ Stripe (À intégrer pour paiements)

---
*Dernière mise à jour : 11 Février 2026*
