# Backlog Coridor — État d'avancement

> Dernière mise à jour : 21 février 2026
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
- [✅] Pipeline candidat : `RentalApplication` avec statuts complets (PENDING → SENT → VISIT_PROPOSED → VISIT_CONFIRMED → SHORTLISTED → FINALIST → SELECTED → ACCEPTED / REJECTED)
- [✅] Sélection finale du candidat (statut `SELECTED`) — `/api/applications/[applicationId]/advance` avec `targetStatus: 'SELECTED'`, auto-rejet des autres candidatures avec notification + email + message système
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
- [✅] Quittances automatiques — model `RentReceipt`, `RentReceiptService.ts`, cron mensuel (`app/api/cron/generate-receipts/`), API CRUD (`app/api/receipts/`), PDF `@react-pdf/renderer` (`RentReceiptDocument.tsx`), page locataire (`account/receipts/`), section propriétaire (`LeaseReceiptsSection.tsx`), notification + email
- [✅] Viewer de bail PDF pleine largeur — `PdfPagesRenderer` avec `react-pdf` (canvas rendering), responsive, navigation multi-pages, zoom
- [✅] Validation pré-envoi du bail — vérification des champs manquants (loyer, charges, dépôt, date début, identité signataires) avant initiation de la signature
- [✅] Bouton "Signer le bail" dans le message système LEASE_SENT_FOR_SIGNATURE — lien direct vers `/leases/[applicationId]` (locataire : "Signer le bail", propriétaire : "Consulter le bail")
- [✅] Lien de signature Yousign dans le viewer — récupération `signature_link` par signataire via `YousignService.getSignatureStatus`, bouton "Signer le bail" (locataire) ou "En cours de signature" (propriétaire), fallback "Vérifiez votre email"
- [✅] Rappels légaux automatiques V1 — model `LegalReminder` (12 types, 6 statuts, 4 priorités), `ReminderEngine.ts` orchestrateur, calculateurs (`DiagnosticReminders`, `LeaseReminders`, `TaxReminders`), cron quotidien (`app/api/cron/legal-reminders/`), API CRUD (`app/api/reminders/`), page rappels (`account/reminders/`), widget dashboard (`LegalRemindersWidget`), formulaire diagnostics (`DiagnosticsSection`), notification + email
- [✅] Guide d'emménagement post-signature — model `MoveInGuide` (steps JSON, storiesShownAt), `lib/moveInGuide.ts` (8 étapes : assurance, énergie, internet, APL, adresse, état des lieux, quartier, carte grise — types + config + couleurs par priorité), 10 stories Instagram-style thème clair (`components/move-in/MoveInStories.tsx` — auto-avance 8s, swipe/tap, barres de progression dorées, overlay blur), 3 sous-composants (Congrats avec card logement dynamique, StoryStep générique avec cercle emoji 140px + tips numérotés, Recap avec mini-liste), `MoveInChecklist.tsx` + `MoveInChecklistItem.tsx` (items expandables, checkbox toggle optimistic, barre de progression, CTA externes, tri par complétion), hook `useMoveInGuide.ts` (GET/PATCH optimistic), API `app/api/move-in-guide/[applicationId]` (GET + PATCH toggle step / mark stories shown, auth tenant only), webhook Yousign auto-create guide sur `signature_request.done`, intégré `MyRentalClient` (stories auto-ouverture + checklist section), banner `TenantDashboardClient` (progression + lien vers my-rental)

### État des lieux (EDL)
- [✅] Modèle Prisma complet — `Inspection` (DRAFT → PENDING_SIGNATURE → SIGNED → LOCKED → AMENDED → CANCELLED), `InspectionRoom`, `InspectionElement`, `InspectionPhoto`, `InspectionMeter`, `InspectionKey`, `InspectionFurnitureItem`, `InspectionAmendment`
- [✅] Flow 9 écrans — Hub pièces, inspection par pièce (surfaces + équipements), compteurs, clés, mobilier, signature bailleur, envoi lien locataire, signature locataire (revue contradictoire), page done
- [✅] Multi-revêtements — `nature String[]` (multi-select NatureSelector), natures enrichies par type (parquet massif, stratifié, carrelage, moquette, etc.)
- [✅] SdB+WC — type `BATHROOM_WC` dans `InspectionRoomType`, config + équipements dédiés
- [✅] Ajout d'équipement — bouton "+ Ajouter un équipement" en phase EQUIP avec suggestions rapides
- [✅] Qualification — ConditionChips (Bon/Usé/Dégradé/Absent) + commentaires + photos par élément
- [✅] Compteurs — eau/électricité/gaz avec relevés (photos optionnelles)
- [✅] Clés — inventaire par type (porte, boîte, cave, etc.) avec quantités
- [✅] Mobilier obligatoire — checklist décret meublé avec états
- [✅] Signature bailleur — canvas SVG, horodatage, IP, user-agent, géoloc
- [✅] Envoi lien signature locataire — JWT 24h, notification in-app + push + email
- [✅] Signature locataire — revue contradictoire (accordéons par pièce), réserves audio/texte, bandeau légal 10 jours, canvas signature
- [✅] Génération PDF — `@react-pdf/renderer` (`InspectionDocument.tsx`), upload Cloudinary, stockage `pdfUrl`
- [✅] Page done — récap signatures, bandeau 10 jours, bouton PDF, renvoi email
- [✅] Intégration conversation — 11 types de messages système (SCHEDULED, CONFIRMED, REMINDER, STARTED, COMPLETED, SIGNED, SIGN_LINK_SENT, PDF_READY, CANCELLED, RESCHEDULED, AMENDMENT), cartes interactives dans MessageBox, previews dans ConversationBox
- [✅] Planification EDL — date/time picker dans la conversation, `scheduledAt` sur Inspection, état "planifié" dans timeline
- [✅] Confirmation locataire — `tenantConfirmedAt`, bouton "Confirmer ma présence" sur carte SCHEDULED, message système CONFIRMED
- [✅] Rappels automatiques — cron J-1/Jour J (`app/api/cron/inspection-reminders/`), notification + push aux deux parties, message système REMINDER
- [✅] Annulation EDL — API `POST /cancel`, statut CANCELLED, `cancelledAt`, message système, notification tenant
- [✅] Reprogrammation EDL — API `POST /reschedule`, reset `tenantConfirmedAt`, message système RESCHEDULED avec bouton "Confirmer"
- [✅] Menu actions calendrier — bouton "..." sur cartes inspection DRAFT (Reprogrammer / Annuler), modal reschedule
- [✅] ConversationClient état CANCELLED — boutons masqués, timeline "EDL annulé" en rouge, re-planification possible
- [✅] Rectification post-signature — `InspectionAmendment` (PENDING/ACCEPTED/REJECTED), formulaire "Signaler un défaut" (locataire, 10 jours), accepter/refuser (bailleur), messages système, notifications
- [✅] Dashboard propriétaire — section EDL dans la page property, lien vers inspection en cours ou signée
- [✅] Calendrier — inspections affichées dans l'agenda (amber, statut badge), navigation par statut
- [✅] Auto-email PDF — envoi automatique aux deux parties après génération (`generate-pdf/route.ts` lignes 242-245), bouton "Renvoyer par email" via `/api/inspection/.../send-email`
- [✅] Widget dashboard propriétaire — section EDL dans `DashboardClient.tsx` avec "Reprendre l'EDL" (DRAFT) et "Renvoyer le lien" (PENDING_SIGNATURE), progression par pièces
- [✅] Intégration locataire — cards inspection dans `MyRentalClient.tsx` (statut, lien signature, téléchargement PDF)
- [✅] Section EDL dans l'édition de propriété — `EdlSection.tsx` dans `EditPropertyClient`, lien vers inspection en cours ou création
- [✅] Broadcast temps réel — `broadcastNewMessage` via Supabase sur `send-sign-link`, refresh automatique côté locataire
- [❌] EDL de sortie — diff avec EDL d'entrée (`entryInspectionId`), comparaison pièce par pièce

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
- [✅] Montants déductibles des impôts (`amountDeductibleCents`) — `FiscalService.ts` (calculateDeductible + generateFiscalSummary + generateAllPropertiesSummary), auto-calcul à la création/modification d'une dépense, DEDUCTIBILITY_RULES par catégorie (FULL/PARTIAL/NONE/MANUAL), API fiscal (`/api/fiscal/summary`, `/api/fiscal/summary-all`), page récap fiscal (`account/fiscal/FiscalClient.tsx`) avec sélecteur année/bien + tableau déclaration 2044, FiscalWidget dashboard (avril-juin), lien TaxReminders → `/account/fiscal`, indicateur déductible dans ExpensesClient
- [✅] Page rentals (`app/[locale]/rentals/`) — affiche les baux signés
- [✅] Simulateur fiscal propriétaire — `lib/fiscalRules.ts` (constantes 2025-2026 avec sources légales : barème IR 5 tranches, PS 17.2%, micro-foncier/réel, micro-BIC/réel LMNP, déficit foncier, seuils LMP), `TaxSimulatorService.ts` (8 méthodes : simuler, calculerMicroFoncier, calculerReelFoncier, calculerMicroBIC, calculerReelLMNP, calculerIR, detecterLMP, determinerRegimeOptimal), API POST+GET `/api/tax-simulator/` (simulation + pré-remplissage depuis biens existants), page `account/tax-simulator/TaxSimulatorClient.tsx` (formulaire multi-biens dynamique + résultats côte à côte + alertes + disclaimer), feature-gated `TAX_SIMULATOR` (Essentiel + Pro), intégré sidebar compte

### Banking & Paiements (Powens)
- [✅] Connexion bancaire (`BankConnection`, `app/lib/powens.ts`, `app/api/powens/`) — OAuth + sync
- [✅] Import de transactions (`BankTransaction`)
- [🔧] Matching paiement ↔ bail (`matchedLeaseId`) — champ existe, logique de matching à compléter
- [✅] Badge Payeur Vérifié — `PaymentVerificationService.ts` (analyse transactions bancaires, régularité + mois vérifiés, `regularityRate` remplace `badgeLevel` déprécié), champs TenantProfile (`badgeLevel` déprécié, `verifiedMonths`, `punctualityRate`, `lastVerifiedAt`, `verificationStatus`), API (`/api/profile/badge`, `/api/profile/verify-badge`), auto-analyse via Powens analyze, composant `PaymentBadge.tsx` ("Payeur vérifié — X mois" avec jauge progressive, pas de médailles), intégré dans `TenantProfilePreview` + conversation inbox + page tenant-profile
- [✅] Relance impayés automatique — model `RentPaymentTracking` (8 statuts), `RentCollectionService.ts` (génération mensuelle, détection paiements, workflow relance J+5/J+10/J+15/J+30), cron quotidien (`app/api/cron/rent-collection/`), API CRUD (`app/api/rent-tracking/`), rappel amiable via messagerie, section suivi loyers dans Rentals (`RentTrackingSection`), widget dashboard (`RentCollectionWidget`), mode manuel sans Powens
- [✅] Dashboard de suivi des paiements — `RentCollectionWidget` dans le dashboard + `RentTrackingSection` dans la page baux

### Dashboard & KPI
- [✅] Page dashboard (`app/[locale]/dashboard/`) — mode propriétaire + locataire
- [✅] Server actions : `getDashboardAlerts.ts`, `getOperationalStats.ts`, `analytics.ts`
- [✅] Rendement brut/net/net-net (calculé dans `analytics.ts`)
- [✅] Bénéfice net (calculé dans `analytics.ts`)
- [✅] Alertes (IRL, échéances, diagnostics) — `LegalRemindersWidget` dans le dashboard + `ReminderEngine` avec rappels automatiques
- [✅] Statut "Bail en signature" dans les cards propriétés — `PropertyStandardCard` + `PropertyColocationCard` affichent le statut `PENDING_SIGNATURE` (point bleu + label) en plus de Occupé/Vacant
- [✅] Refonte dashboard locataire — header personnalisé "Bonjour [Prénom]", stats rapides (candidatures + prochain RDV), Passeport Locatif card, accès rapides (Mon dossier, Quittances), Application Journey
- [✅] Card logement actuel dans le dashboard locataire — affichage du logement actif si bail signé

### Admin
- [✅] Dashboard admin (`app/[locale]/admin/`, `app/api/admin/`)
- [✅] Server action `getAdminDashboardStats.ts` (stats complètes + graphique 30 jours)
- [✅] Modération des annonces (approve/reject/archive endpoints + UI)
- [✅] Ban utilisateurs (`isBanned` — PATCH endpoint)
- [✅] Signalements (`Report` — model + admin status update)
- [✅] KPIs avancés (`getAdminAdvancedStats.ts`) — users actifs, taux rétention, répartition modes, top annonces, métriques abonnements
- [✅] API stats avancées (`app/api/admin/advanced-stats/`) — endpoint centralisé pour le dashboard
- [✅] Gestion utilisateurs enrichie (`app/[locale]/admin/users/`, `UserManagementClient.tsx`) — table avec badges plan/statut/mode, filtres (plan, statut abo, mode), recherche, tri, pagination
- [✅] Fiche utilisateur détaillée (`app/[locale]/admin/users/[userId]/`, `UserDetailClient.tsx`) — identité, abonnement actuel, timeline abonnements, stats activité, biens/annonces
- [✅] API détail utilisateur (`app/api/admin/users/[userId]/detail/`) — données complètes avec stats agrégées
- [✅] Offrir un abonnement (`app/api/admin/users/[userId]/gift-subscription/`) — création abo + notification + email + facture auto
- [✅] Changer le plan d'un utilisateur (`app/api/admin/users/[userId]/change-plan/`) — avec annulation des abos actifs si downgrade
- [✅] Widget KPIs abonnements dans le dashboard (`SubscriptionMetrics.tsx`) — actifs, MRR, churn, offerts, expirations, breakdown par plan

### Abonnements & Facturation
- [✅] Model Prisma `Subscription` (plan, status ACTIVE/EXPIRED/CANCELLED/GIFTED, isGifted, giftedBy, giftReason, dates)
- [✅] Model Prisma `Invoice` (amountCents, description, status PAID/PENDING/FAILED, pdfUrl)
- [✅] Enum `SubscriptionStatus` (ACTIVE, EXPIRED, CANCELLED, GIFTED)
- [✅] Helper centralisé `lib/plan-features.ts` — PLAN_INFO (FREE/PLUS/PRO avec prix, features, highlights) + ALL_FEATURES (18 fonctionnalités)
- [✅] API utilisateur `GET /api/account/subscription` — plan actuel, progression, historique, features incluses, factures
- [✅] Page abonnement utilisateur (`app/[locale]/account/subscription/`) — résumé plan, barre de progression, factures, moyen de paiement (placeholder Stripe), features (accordéon), historique (accordéon), actions
- [✅] Lien sidebar compte mis à jour vers `/account/subscription`
- [✅] Cron expiration (`app/api/cron/check-subscriptions/`) — expire les abos passés, downgrade FREE, alertes J-7 et J-1 (notification + email)
- [✅] Email cadeau d'abonnement via `EmailTemplate` + Resend
- [✅] Facture auto à 0€ lors d'un cadeau d'abonnement
- [✅] Annulation d'abonnement côté utilisateur (`POST /api/account/subscription/cancel`) — marque CANCELLED, notification, l'abo reste actif jusqu'à endDate
- [✅] Intégration Stripe V1 — `SubscriptionService.ts` (checkout, portal, webhook), `lib/stripe.ts` (Stripe SDK v20 clover), `lib/features.ts` (hasFeature, getMaxProperties, getUserFeatures), 4 modèles Prisma (Feature, SubscriptionPlan, PlanFeature, UserSubscription), webhook Stripe (`app/api/webhooks/stripe/`), API subscription (`checkout`, `portal`, `status`, `plans`), page pricing dynamique, `FeatureGate.tsx` + `useFeature` hook, gates sur: LEASE_GENERATION, AUTO_RECEIPTS, LEGAL_REMINDERS, RENT_TRACKING, maxProperties, admin Plans & Features management (`app/[locale]/admin/plans/`), fallback legacy plan
- [❌] Génération PDF de factures

---

## LOCATAIRE

### Profil & Dossier
- [✅] Profil locataire (`TenantProfile` : emploi, salaire, APL, bio)
- [✅] Garants multiples (`Guarantor` : famille, Visale, Garantme, Cautionner, tiers)
- [✅] Revenus additionnels (`Income`)
- [✅] Server action `getTenantProfile.ts`
- [🔧] Lissage salaire freelance — champs existent (netSalary + partnerNetSalary), logique de lissage non visible
- [✅] Dossier unique réutilisable — `generateDossierHtml`, TenantProfilePreview auto dans conversations, intégration DossierFacile OAuth
- [✅] Passeport Locatif V1 — `PassportService.ts` (10+ méthodes : getPassport, computeScore, submitLandlordReview, exportPassport JSON/PDF, onLeaseSigned auto-backfill), 4 modèles Prisma (RentalHistory, LandlordReview, LandlordReviewScore, PassportSettings), 10 routes API (`/api/passport/*`), hook webhook Yousign, score composite 0-100 **privé locataire** (Régularité 40% + Ancienneté 20% + Évaluations 25% + Complétude 15%), confiance LOW/MEDIUM/HIGH, évaluations structurées **4 critères** (PAYMENT_REGULARITY, PROPERTY_CONDITION, COMMUNICATION, WOULD_RECOMMEND — anti-discrimination: pas de texte libre), badge "Payeur vérifié — X mois" avec jauge progressive (pas de médailles Bronze/Silver/Gold), opt-in RGPD, page tenant (`account/passport/PassportClient.tsx` : jauge SVG, timeline historique, toggles partage, export), `PassportPreview.tsx` (vue compacte propriétaire — données factuelles uniquement, jamais le score), `LandlordReviewForm.tsx` (formulaire 4 questions), page review standalone (`/passport/review/[id]`), intégré dans `TenantProfilePreview`, notification in-app au locataire à réception d'une évaluation (type `PASSPORT_REVIEW` avec ville), script backfill baux existants (`scripts/backfill-rental-history.ts` — dry-run + live)

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
- [✅] Badges statut bail dans la boîte de réception — priorité leaseStatus sur applicationStatus (`Bail signé` vert, `Bail en signature` bleu, `Sélectionné`, `Finaliste`, `Présélectionné`)
- [✅] Traduction des messages système dans l'aperçu ConversationBox — `LEASE_SENT_FOR_SIGNATURE` → "Bail envoyé pour signature", `INVITATION_VISITE` → "Invitation à une visite", etc.
- [✅] Timeline enrichie dans le récapitulatif conversation — étapes dynamiques : Candidature reçue → Visite (proposée/confirmée) → Candidature retenue → Bail envoyé pour signature → Bail signé, avec états completed/pending

### Notifications
- [✅] Notifications in-app (`Notification`, polling 60s, `NotificationCenter.tsx`)
- [✅] Push notifications (`PushSubscription`, `PushNotificationManager.tsx`, `sw.js`) — conditionnel HTTPS/localhost
- [✅] Préférences par type + DND (`NotificationsClient.tsx`, `/api/settings/notifications`) — toggles par type, rappels légaux (landlord), mode Ne Pas Déranger
- [✅] Realtime (`hooks/useRealtimeNotifications.ts`) — Supabase Broadcast, intégré dans `ConversationList` + `ConversationClient`
- [✅] Centre de notifications (`components/navbar/NotificationCenter.tsx`) — dropdown + non lus

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
- [✅] Install prompt (`components/pwa/InstallPrompt.tsx`) — beforeinstallprompt + cooldown 24h, intégré dans layout.tsx

### UI & Navigation
- [✅] Bottom bar mobile : "Profil" → "Réglages" — icône `Settings` (engrenage), label `t('settings')`, lien vers `/account`
- [✅] Refonte sidebar réglages (`AccountSidebar`) — catégories restructurées (Général, Logement, Financier, Sécurité), icônes cohérentes
- [✅] PhoneInput avec préfixe +33 — composant dédié avec formatage automatique, validation, flag français
- [✅] Passeport Locatif progressive disclosure — `PassportExplainerModal` carousel multi-étapes (explication du concept avant activation), intégré dans `PassportClient`
- [✅] Font Boldonse — correction chargement custom font dans `layout.tsx`

### Signalements
- [✅] Report annonce ou utilisateur (`Report`, `components/reports/ReportButton.tsx`) — modal avec raison/détails
- [✅] API (`app/api/reports/`) — création + admin status update

### Sondages communautaires (V2 — globaux, 3 options, géolocalisation auto)
- [✅] Model `NeighborhoodPoll` avec `option1/option2/option3` (plus de neighborhood/city sur le poll)
- [✅] Model `PollResponse` avec `selectedOption` (1-3) + `latitude/longitude` + `neighborhood/city/zipCode` (géoloc contextuelle depuis l'annonce consultée, fallback profil utilisateur)
- [✅] API admin (`app/api/admin/polls/`) — CRUD avec option1/2/3
- [✅] API vote (`app/api/polls/[pollId]/respond/`) — selectedOption + géoloc depuis body (listing context) avec fallback profil + résultats par zone (zipCode → city → global)
- [✅] API sondages actifs (`app/api/polls/active/`) — global, sondage non répondu par l'utilisateur (fonctionne aussi sans auth)
- [✅] API résultats par zone (`app/api/polls/results/`) — agrégation par zipCode/city avec seuil minimum (≥10 pour zipCode)
- [✅] PollBanner (`components/listings/PollBanner.tsx`) — 3 boutons vote, barres de pourcentage, prop `locationContext` (latitude/longitude/neighborhood/city/zipCode), intégré dans HomeClient + ListingClient
- [✅] PollResults (`components/listings/PollResults.tsx`) — résultats zone en lecture seule sur les annonces
- [✅] Page admin sondages (`app/[locale]/admin/polls/PollManagementClient.tsx`) — formulaire + table avec options

---

## ❌ À FAIRE (features non encore implémentées)

### Priorité haute (avant lancement)
- [x] ~~Quittances automatiques (génération PDF mensuelle)~~ (fait)
- [x] ~~Rappels légaux automatiques (échéances bail, diagnostics)~~ (fait)
- [x] ~~Relances automatiques visites non confirmées~~ (fait)
- [x] ~~Annulation auto visites non confirmées~~ (fait)
- [x] ~~Relance impayés automatique~~ (fait)
- [x] ~~Badge Payeur Exemplaire (logique + UI)~~ (fait)
- [x] ~~Intégration Stripe (paiement abonnements, renouvellement auto, moyen de paiement)~~ (fait — SubscriptionService, FeatureGate, Plans dynamiques)

### Priorité moyenne
- [x] ~~Alertes dashboard avancées (IRL, échéances, impayés)~~ (fait — LegalRemindersWidget + RentCollectionWidget)
- [x] ~~Matching automatique paiement ↔ bail (logique)~~ (fait — RentCollectionService.checkPayments)
- [x] ~~Dashboard suivi des paiements complet~~ (fait — RentTrackingSection + RentCollectionWidget)
- [ ] Suggestions de prix
- [ ] Anonymisation renforcée dans les candidatures côté UI
- [x] ~~Logique fiscale pour montants déductibles~~ (fait)
- [x] ~~Sondages V2 (globaux, 3 options, géolocalisation auto)~~ (fait)
- [ ] Génération PDF de factures

### Pistes futures
- [x] ~~Module fiscal (aide déclaration revenus fonciers)~~ (fait — Simulateur fiscal V1, comparaison micro/réel, déficit foncier, LMNP)
- [ ] Intégration GLI (Garantie Loyers Impayés)
- [ ] Vérification de pièces d'identité
- [ ] Mix bail 9 mois étudiant + été saisonnier
- [x] ~~Scoring fiabilité avancé~~ (fait — Passeport Locatif V1)
- [ ] B2B2C : partenariats (assurance, déménagement)
- [x] ~~Recommandation d'ancien propriétaire~~ (fait — Passeport Locatif V1, LandlordReview structuré)
- [ ] Lissage salaire freelance (calcul avancé)

---

## ⚠️ Notes déploiement

- **Cron jobs activés** : 7 crons configurés dans `vercel.json` (tous daily — contrainte Vercel Hobby) : `check-alerts` (8h), `visit-reminders` (9h), `check-subscriptions` (3h), `generate-receipts` (4h le 5), `legal-reminders` (5h), `rent-collection` (6h), `inspection-reminders` (7h).

---

## 🐛 Bugs connus / corrigés

- [x] ~~Recap fiscal : NaN € dans les cards + boutons propriétés vides~~ (corrigé — mismatch noms de champs entre FiscalService et FiscalClient, mapping ajouté dans les API routes `/api/fiscal/summary` et `/api/fiscal/summary-all`)
- [x] ~~React key warning dans FiscalClient~~ (corrigé — ajout `key="all"` sur le bouton statique "Tous les biens")
- [x] ~~Build Vercel échoue : STRIPE_SECRET_KEY not defined~~ (corrigé — `lib/stripe.ts` lazy init via Proxy, plus de throw au top-level)
- [x] ~~applicationId null côté locataire dans la conversation~~ (corrigé — `page.tsx` cherchait `candidateScope.creatorUserId: otherUser.id` mais otherUser = propriétaire qui ne crée pas de scope → changé en `{ in: [otherUser.id, currentUser.id] }`)
- [x] ~~Property cards affichent "Vacant" quand bail en signature~~ (corrigé — `getProperties.ts` ne récupérait que `leaseStatus: 'SIGNED'`, changé en `{ in: ['SIGNED', 'PENDING_SIGNATURE'] }`)
- [x] ~~Inbox affiche "En attente" au lieu du statut bail~~ (corrigé — priorité leaseStatus sur applicationStatus dans ConversationBox)
- [x] ~~Message système LEASE_SENT_FOR_SIGNATURE sans bouton d'action~~ (corrigé — ajout bouton "Signer le bail" / "Consulter le bail" dans MessageBox)
- [x] ~~Lease viewer locataire : pas de bouton pour signer~~ (corrigé — récupération `signature_link` Yousign + bouton "Signer le bail" dans LeaseViewerClient)
- [x] ~~Message système INSPECTION_SIGN_LINK_SENT affiché en texte brut~~ (corrigé — `send-sign-link/route.ts` n'appelait pas `broadcastNewMessage`, le locataire ne recevait pas le refresh temps réel → ajout broadcast Supabase + nettoyage cache `.next`)
- [x] ~~iOS Safari : `-webkit-fill-available` casse le positionnement fixed~~ (corrigé — remplacement par `min-height: 100dvh` dans globals.css)
- [x] ~~Tailwind v4 : utilitaires custom silencieusement ignorés en production~~ (corrigé — migration de `@layer utilities` vers `@utility` pour `pt-safe`, `pb-safe`, etc.)
- [x] ~~22 erreurs TypeScript à travers 8 fichiers~~ (corrigé — types Prisma, params async, imports manquants)
