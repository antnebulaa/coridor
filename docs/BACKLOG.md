# Backlog Coridor — État d'avancement

> Dernière mise à jour : 12 février 2026
> Légende : ✅ = done, 🔧 = en cours / partiel, ❌ = à faire / pas commencé

---

## PROPRIÉTAIRE

### Annonces & Biens
- [✅] Architecture 3-tiers Property → RentalUnit → Listing (schema + CRUD)
- [✅] Création/édition d'annonces (`app/[locale]/listings/`, `app/api/listings/`)
- [✅] Workflow de modération (DRAFT → PENDING_REVIEW → PUBLISHED → REJECTED → ARCHIVED) — enum + admin approve/reject/archive routes + UI
- [✅] Types de bail (LONG_TERM, SHORT_TERM, STUDENT, COLOCATION)
- [✅] Gestion des photos par pièces (`Room` + `PropertyImage` avec liens Property/RentalUnit/Room)
- [✅] Colocation : chaque chambre = RentalUnit louable individuellement
- [✅] Caractéristiques du bien (DPE, GES, équipements, étage, orientation...)
- [✅] Google Maps / Mapbox : autocomplete adresse, coordonnées, quartier, transports
- [✅] Vérification conformité meublé : check-list (model `Furniture` — 13 éléments obligatoires + optionnels)
- [✅] Adjectif marketing pour l'annonce (`propertyAdjective`) — utilisé dans ListingCard + RentModal

### Candidatures & Pipeline
- [✅] Pipeline candidat : `RentalApplication` avec statuts (PENDING → SENT → VISIT_PROPOSED → VISIT_CONFIRMED → ACCEPTED / REJECTED)
- [✅] Dossier candidat `TenantCandidateScope` (solo/couple/groupe, enfants, type bail souhaité)
- [✅] Server action `getApplications.ts`
- [✅] Actions rapides dans le pipeline (proposer visite + décliner candidature avec motifs prédéfinis anti-discrimination)
- [✅] Rejet de candidature (`app/api/applications/[applicationId]/` — PATCH status REJECTED + motif + notification + email + message système)
- [✅] Modale de déclin avec motifs prédéfinis respectueux (protection anti-discrimination)
- [✅] Affichage visuel candidature déclinée (dossier grisé, actions masquées, message système dans conversation)
- [✅] Résumé du dossier candidat dans la conversation (TenantProfilePreview — bio, projet, situation pro, garants, synthèse financière, solvabilité)

### Visites
- [✅] Créneaux de disponibilité propriétaire (`VisitSlot` avec géoloc + rayon + durée auto)
- [✅] Réservation de visite (`Visit` : PENDING → CONFIRMED → CANCELLED)
- [✅] Composant `VisitSlotSelector.tsx`
- [✅] Server actions : `getVisits.ts`, `getLandlordCalendarData.ts`
- [✅] Page calendrier (`app/[locale]/calendar/`) — mode propriétaire + locataire
- [✅] Durée de visite auto selon taille du bien (studio=15min → maison=40min)
- [✅] 2 candidats par créneau (capacityPerSlot = 2 dans l'API)
- [✅] Confirmation de visite par le candidat (24h pour confirmer, API `app/api/visits/[visitId]/confirm/`)
- [✅] Relances automatiques si non confirmé (cron `app/api/cron/visit-reminders/` — rappel à 12h, notification + email)
- [✅] Annulation auto si non confirmé (cron — annulation après 24h, notification + email aux deux parties)
- [✅] Badges de statut visite côté propriétaire (En attente / Confirmée) dans le calendrier + modal détails

### Évaluation & Sélection des candidats
- [✅] Scorecard d'évaluation multi-étapes (`ScorecardSheet.tsx`) — 8 étapes : dossier auto → 5 critères impression → coup de coeur → décision
- [✅] Critères d'impression visite : ponctualité, intérêt, questions, compréhension, projet locatif — sélection avec auto-avance
- [✅] Analyse dossier automatique (revenus avec éligibilité GLI, complétude, garant, compatibilité bail, date emménagement)
- [✅] Note par lettres A/B/C (composite des critères) avec boost coup de coeur (+1 tier)
- [✅] Coup de coeur : étape dédiée avec toggle coeur animé (framer-motion)
- [✅] Page décision finale en dark mode avec recap visuel (avatar gradient, note, dots critères)
- [✅] Anti-discrimination : avatars gradient, prénom + initiale, critères structurés uniquement
- [✅] Backend évaluation (`app/api/evaluations/`, `Evaluation` + `EvaluationScore` models, `EvaluationCriterion` enum)
- [✅] Page comparateur de candidats (`app/[locale]/selection/[listingId]/`) — tableau comparatif, tri par score, filtre par décision
- [✅] Accès depuis Dashboard → widget "Sélection en cours" ou bannière candidatures

### Baux & Signature
- [✅] Génération de baux PDF (`services/LeaseService.ts` + `services/LeaseClauses.ts`)
- [✅] Composant document (`components/documents/LeaseDocument.tsx`)
- [✅] Signature YouSign (`services/YousignService.ts` — initiation, suivi, récupération doc signé)
- [✅] Workflow bail : DRAFT → PENDING_SIGNATURE → SIGNED
- [✅] Server action `markLeaseAsSigned.ts`
- [✅] Page baux (`app/[locale]/leases/[applicationId]/`) — viewer + signature
- [❌] Quittances automatiques
- [❌] Rappels légaux automatiques

### Gestion financière
- [✅] Gestionnaire dépenses/charges (`Expense`, `app/api/expenses/`) — CRUD complet (GET/POST/PATCH/DELETE)
- [✅] Filtres dépenses client-side (année, mois, catégorie multi-select, récupérable/non-récupérable)
- [✅] Édition d'une dépense existante (tap → modale pré-remplie, PATCH API)
- [✅] Indicateurs résumé au-dessus de la liste (total, récupérable, non-récupérable, barre de progression)
- [✅] Catégories de charges (eau froide/chaude, électricité, ascenseur, assurance, etc.) — enum ExpenseCategory complet
- [✅] Charges récupérables vs non-récupérables avec ratio (`isRecoverable` + `recoverableRatio`)
- [✅] Régularisation annuelle (`ReconciliationHistory`, `services/RegularizationService.ts`, `components/documents/RegularizationDocument.tsx`)
- [✅] Server action `regularization.ts` (preview + commit + eligible leases)
- [✅] Révision IRL automatique (`RentIndex`, `calculateRevision.ts` — formule Loyer × NouvelIndice/AncienIndice)
- [✅] Historique financier du bail (`LeaseFinancials` : loyer + charges par période)
- [🔧] Montants déductibles des impôts (`amountDeductibleCents`) — champ existe, pas de logique fiscale
- [✅] Page rentals (`app/[locale]/rentals/`) — affiche les baux signés

### Banking & Paiements (Powens)
- [✅] Connexion bancaire (`BankConnection`, `app/lib/powens.ts`, `app/api/powens/`) — OAuth + sync
- [✅] Import de transactions (`BankTransaction`)
- [🔧] Matching paiement ↔ bail (`matchedLeaseId`) — champ existe, logique de matching à compléter
- [❌] Badge Payeur Exemplaire (`rentVerified`, `detectedRentAmount`, `rentPaymentDate`)
- [❌] Relance impayés automatique
- [🔧] Dashboard de suivi des paiements — getOperationalStats référence unpaidRents, incomplet

### Dashboard & KPI
- [✅] Page dashboard (`app/[locale]/dashboard/`) — mode propriétaire + locataire
- [✅] Server actions : `getDashboardAlerts.ts`, `getOperationalStats.ts`, `analytics.ts`
- [✅] Rendement brut/net/net-net (calculé dans `analytics.ts`)
- [✅] Bénéfice net (calculé dans `analytics.ts`)
- [🔧] Alertes (IRL, échéances, impayés) — getDashboardAlerts existe mais limité (vérifie seulement la config)

### Admin
- [✅] Dashboard admin (`app/[locale]/admin/`, `app/api/admin/`)
- [✅] Server action `getAdminDashboardStats.ts` (stats complètes + graphique 30 jours)
- [✅] Modération des annonces (approve/reject/archive endpoints + UI)
- [✅] Ban utilisateurs (`isBanned` — PATCH endpoint)
- [✅] Signalements (`Report` — model + admin status update)

---

## LOCATAIRE

### Profil & Dossier
- [✅] Profil locataire (`TenantProfile` : emploi, salaire, APL, bio)
- [✅] Garants multiples (`Guarantor` : famille, Visale, Garantme, Cautionner, tiers)
- [✅] Revenus additionnels (`Income`)
- [✅] Server action `getTenantProfile.ts`
- [🔧] Lissage salaire freelance — champs existent (netSalary + partnerNetSalary), logique de lissage non visible
- [🔧] Dossier unique réutilisable — `generateDossierHtml` existe, UX à confirmer

### Recherche & Navigation
- [✅] Recherche d'annonces (`app/[locale]/listings/`, `app/api/listings/`)
- [✅] Filtres (prix, pièces, catégorie)
- [✅] Map split-screen (`components/Map.tsx`, `components/MapMain.tsx`, `components/Map3D.tsx`)
- [✅] Annonces en modale/scindé (pas de changement de page)
- [✅] Modal de recherche (`components/modals/SearchModal.tsx`)
- [✅] Affichage métro le plus proche (`components/listings/ListingTransit.tsx`, `app/api/transit/`)
- [✅] Score de quartier (`components/listings/NeighborhoodScore.tsx`, `app/api/neighborhood/`) — PostGIS
- [✅] Recherche par temps de trajet (`CommuteLocation`, `components/listings/ListingCommute.tsx`)
- [✅] Lieux favoris pour trajet (`components/inputs/CommuteAddressSelect.tsx`, `CommuteModal`)
- [✅] Dernière recherche proposée (`components/listings/ResumeSearch.tsx`)
- [✅] Composants annonce riches : `ListingCard`, `ListingInfo`, `ListingAmenities`, `ListingEnergy`, `ListingLocation`, `ListingHead`, `ListingImageGallery`
- [✅] Tri des annonces (`ListingSort.tsx`)

### Favoris & Likes
- [✅] Likes (`Like`, `components/LikeButton.tsx`)
- [✅] Wishlists par albums (`Wishlist`, `app/[locale]/favorites/`, `WishlistCard.tsx`)
- [✅] Ajout aux favoris (`components/HeartButton.tsx`, `useFavorite.tsx`)
- [✅] Server actions : `getAllFavorites.ts`, `getFavoriteListings.ts`, `getLikes.ts`

### Candidature
- [✅] Candidature via modale (`components/modals/ApplicationModal.tsx`)
- [✅] `TenantCandidateScope` (solo/couple/groupe)
- [✅] Candidature simplifiée (formulaire avec message + lien)

### Alertes
- [✅] Alertes de recherche (`SearchAlert` : INSTANT/DAILY/WEEKLY)
- [✅] Modal d'alerte (`components/modals/SearchAlertModal.tsx`)
- [✅] API alertes (`app/api/alerts/`)
- [✅] Cron pour envoi (`app/api/cron/check-alerts/`) — matching listings + push + email notifications
- [✅] Gestionnaire d'alertes (page dédiée : `app/[locale]/account/alerts/AlertsClient.tsx`)

### Anti-discrimination
- [✅] Avatars gradient (`components/inputs/ProfileGradientGenerator.tsx`)
- [✅] Identifiants neutres (`uniqueCode` + `app/api/user/generate-code/`) — utilisé dans le système de contacts
- [🔧] Anonymisation initiale dans les candidatures — uniqueCode existe, anonymisation complète côté UI à renforcer

---

## COMMUN

### Auth & Compte
- [✅] Inscription / Connexion (sessions DB custom via Next-Auth)
- [✅] Switch propriétaire ↔ locataire (`switchMode.ts`, `userMode`)
- [✅] Page compte (`app/[locale]/account/`) — sous-pages : tenant-profile, settings, preferences, security, alerts, project, personal-info, notifications
- [✅] Paramètres (`components/account/SettingsClient.tsx`) — thème clair/sombre/système
- [✅] Plans FREE/PLUS/PRO
- [✅] Page pricing (`app/[locale]/pricing/`) — mensuel/annuel

### Messagerie
- [✅] Conversations liées aux annonces (`Conversation`, `Message`)
- [✅] Pièces jointes (images, PDF) (`fileUrl`, `fileName`, `fileType`)
- [✅] Statut "vu" (`seenIds`)
- [✅] Page inbox (`app/[locale]/inbox/`)
- [✅] Server actions : `getConversations.ts`, `getConversationById.ts`, `getMessages.ts`, `getUnreadMessageCount.ts`
- [✅] Tabs de tri dans la messagerie
- [✅] Résumé du dossier candidat dans la conversation (TenantProfilePreview)

### Notifications
- [🔧] Notifications in-app (`Notification`, polling 60s, `NotificationCenter.tsx`)
- [🔧] Push notifications (`PushSubscription`, `PushNotificationManager.tsx`, `sw.js`) — conditionnel HTTPS/localhost
- [🔧] Préférences par type + DND (`NotificationPreferences` avec heures 24h)
- [🔧] Realtime (`hooks/useRealtimeNotifications.ts`) — Supabase Broadcast
- [🔧] Centre de notifications (`components/navbar/NotificationCenter.tsx`) — dropdown + non lus

### Contacts
- [✅] Système de contacts par code unique (`uniqueCode`, `contacts`)
- [✅] Modal d'ajout (`components/modals/AddContactModal.tsx`, `components/modals/MyCodeModal.tsx`)
- [✅] Page contacts (`app/[locale]/contacts/`)
- [✅] QR code (`qrcode.react` — QRCodeCanvas dans MyCodeModal)

### i18n
- [✅] Français + Anglais (`messages/fr.json` ~1310 lignes, `messages/en.json` ~1276 lignes)
- [✅] Routing i18n (`i18n/routing.ts`, `middleware.ts` — next-intl)

### PWA
- [✅] Manifest + Service Worker (`public/manifest.json`, `public/sw.js`)
- [✅] Icône app + favicon (`app/icon.png`, `app/apple-icon.png`, `manifest.json`)
- [✅] Safe area iOS PWA (`black-translucent` + `pt-safe` sur MainLayout, Modal, ScorecardSheet, ListingImageGallery, AllPhotosModal)
- [🔧] Install prompt (`components/pwa/InstallPrompt.tsx`) — beforeinstallprompt + cooldown 24h

### Signalements
- [✅] Report annonce ou utilisateur (`Report`, `components/reports/ReportButton.tsx`) — modal avec raison/détails
- [✅] API (`app/api/reports/`) — création + admin status update

---

## ❌ À FAIRE (features non encore implémentées)

### Priorité haute (avant lancement)
- [ ] Quittances automatiques (génération PDF mensuelle)
- [ ] Rappels légaux automatiques (échéances bail, diagnostics)
- [x] ~~Relances automatiques visites non confirmées~~ (fait)
- [x] ~~Annulation auto visites non confirmées~~ (fait)
- [ ] Relance impayés automatique
- [ ] Badge Payeur Exemplaire (logique + UI)

### Priorité moyenne
- [ ] Alertes dashboard avancées (IRL, échéances, impayés) — base existe, à enrichir
- [ ] Matching automatique paiement ↔ bail (logique) — champ existe
- [ ] Dashboard suivi des paiements complet
- [ ] Suggestions de prix
- [ ] Anonymisation renforcée dans les candidatures côté UI
- [ ] Logique fiscale pour montants déductibles

### Pistes futures
- [ ] Module fiscal (aide déclaration revenus fonciers)
- [ ] Intégration GLI (Garantie Loyers Impayés)
- [ ] Vérification de pièces d'identité
- [ ] Mix bail 9 mois étudiant + été saisonnier
- [ ] Scoring fiabilité avancé
- [ ] B2B2C : partenariats (assurance, déménagement)
- [ ] Recommandation d'ancien propriétaire
- [ ] Lissage salaire freelance (calcul avancé)

---

## ⚠️ Notes déploiement

- **Cron jobs désactivés** : Les routes `/api/cron/visit-reminders/` et `/api/cron/check-alerts/` existent mais ne sont pas configurées dans `vercel.json` (nécessite Vercel Pro). À réactiver quand on passe sur un plan payant.

---

## 🐛 Bugs connus
(À compléter)

- [ ] ...
