# Backlog Coridor — État d'avancement

> Dernière mise à jour : 13 mars 2026
> Légende : ✅ = done, 🔧 = en cours / partiel, ❌ = à faire / pas commencé

---

## PROPRIÉTAIRE

### Annonces & Biens
- [✅] Architecture 3-tiers Property → RentalUnit → Listing (schema + CRUD)
- [✅] Création/édition d'annonces (`app/[locale]/listings/`, `app/api/listings/`)
- [✅] Workflow de modération (DRAFT → PENDING_REVIEW → PUBLISHED → REJECTED → ARCHIVED) — enum + admin approve/reject/archive routes + UI
- [✅] Types de bail (LONG_TERM, STUDENT, COLOCATION)
- [✅] Baux spéciaux — opt-in par annonce : bail étudiant 9 mois (`acceptsStudentLease`, meublé uniquement) + bail mobilité 1-10 mois (`acceptsMobilityLease`, meublé uniquement, motif obligatoire), validation candidature côté API, refonte `LeaseTypeSection` (3 cards : nue/meublée/coloc + toggles spéciaux), `ApplicationModal` enrichi (choix type bail + motif mobilité), validation pré-génération bail dans `LeaseService`
- [✅] Gestion des photos par pièces (`Room` + `PropertyImage` avec liens Property/RentalUnit/Room)
- [✅] Gestion avancée des photos — iOS Photos-style : mode sélection "Modifier" avec checkboxes animées (framer-motion), suppression multi-albums (PhotoTour) et multi-photos (AllPhotosModal) avec confirmation overlay, déplacement de photos entre pièces (MovePhotoModal bottom sheet fintech avec thumbnails), drag handle (GripVertical) pour réordonnancement mobile sans bloquer le scroll iOS Safari, fix `syncListingCardData` tri par `order` pour couverture annonce, fix `Modal.tsx` overflow iOS
- [✅] Colocation : chaque chambre = RentalUnit louable individuellement
- [✅] Caractéristiques du bien (DPE, GES, équipements, étage, orientation...)
- [✅] Google Maps / Mapbox : autocomplete adresse, coordonnées, quartier, transports
- [✅] Vérification conformité meublé : check-list (model `Furniture` — 13 éléments obligatoires + optionnels)
- [✅] Adjectif marketing pour l'annonce (`propertyAdjective`) — utilisé dans ListingCard + RentModal
- [✅] Badge DPE sur les ListingCards — pill en forme de flèche (arrondie à gauche, pointe à droite) avec couleur officielle A→G (vert→rouge), affichée après la pill meublé/non meublé, sur les deux variants (horizontal + vertical)
- [✅] Profil propriétaire sur les annonces — `LandlordProfileService.ts` (agrégation stats propriétaire : nombre de biens, locataires, taux de réponse, ancienneté, dépôts restitués dans les délais), `LandlordProfileCard.tsx` (carte de confiance avec avatar gradient, stats, badges) intégré dans `ListingClient`, `LandlordProfileMini.tsx` (version compacte dans `ListingCard` + `ListingPreview`), `LandlordAvatar.tsx` (avatar gradient propriétaire), données enrichies dans `getListingById` et `syncListingCardData`, cron `refresh-landlord-stats` (mise à jour périodique), settings propriétaire pour visibilité profil (`app/api/settings/`)

### Zone Tendue & Encadrement des Loyers
- [✅] Détection zone tendue officielle — 3 689 communes (décret 22/12/2025), lookup JSON preprocessé depuis CSV data.gouv.fr (`lib/zoneTendue.ts`, `lib/data/zones-tendues.json`), désambiguïsation par nom de ville pour codes postaux mixtes (`lib/data/postal-insee-mapping.json`)
- [✅] Script de prétraitement `scripts/preprocess-zones-tendues.ts` — télécharge CSV officiels (data.gouv.fr + La Poste), croise codes INSEE ↔ codes postaux, gère arrondissements Paris/Lyon/Marseille
- [✅] Module unifié encadrement des loyers `lib/rentControl.ts` — lookup multi-territoires, architecture hybride local + API
- [✅] Données encadrement des loyers — 8 territoires : Paris (API opendata.paris.fr), Lyon (données officielles Grand Lyon WFS, 5 zones, 5 époques, 233 IRIS), Lille (MEL, 4 zones, 49 communes), Montpellier (4 zones, 68 quartiers/communes), Bordeaux (données officielles data.gouv.fr, 4 zones, 88 IRIS), Pays Basque (3 zones, 24 communes), Grenoble (4 zones), Est Ensemble (2 zones, 9 communes 93)
- [✅] API `/api/rent-control` — lookup local pour villes avec zones par commune + API Paris géospatiale, plus aucune donnée fictive
- [✅] LegalInfoSection — sélecteur de zone d'encadrement (Lyon, Montpellier, Grenoble, Bordeaux), affichage données officielles, champ `rentSupplementJustification` (obligatoire art. 140 VI loi ELAN), détection zone tendue avec ville
- [✅] RentModal — hybride local/API (`lookupRentControl` puis fallback API si `needsApi`)
- [✅] Champ Prisma `rentControlZone String?` sur Property + API legal PATCH
- [✅] Suppression complète des données fictives (`CITY_RATES` dans `utils/rentUtils.ts`)
- [🔧] Données Lille et Montpellier — valeurs estimées (API/CSV officiels indisponibles au moment du téléchargement). Structure et zones correctes, valeurs à vérifier quand les sources redeviennent accessibles : Lille (`opendata.lillemetropole.fr/api/.../encadrement-des-loyers-donnees-mel`), Montpellier (`data.montpellier3m.fr`)

### Estimateur de Loyer
- [✅] Modèle `RentMarketData` — 139 600 lignes (34 900 communes × 4 types), données ANIL 2025 (SeLoger + LeBonCoin), champs : medianRentPerSqm, q1/q3, observations, rSquared, lowerBound/upperBound
- [✅] Champ `communeCode` sur Property — enrichi via api-adresse.data.gouv.fr à la sélection d'adresse (MapboxAddressSelect), stocké à la création du listing
- [✅] Script d'import ANIL — `scripts/import-rent-data.ts`, 4 CSV (appart all/T1-T2/T3+, maison all), encodage Latin-1, batch upsert 500, flexible column matching
- [✅] Service d'estimation — `services/RentEstimatorService.ts`, fallback 3 niveaux (commune exacte → commune "all" → département SQL AVG), conversion CC→HC (charges 2,5€/m² appart, 1€/m² maison), 7 ajustements multiplicatifs (meublé +11%, DPE A→G, étage, parking +80€, balcon +4%, construction), confiance HIGH/MEDIUM/LOW
- [✅] Constantes d'ajustement — `lib/rentEstimatorConstants.ts`, tous les facteurs centralisés et documentés
- [✅] API POST `/api/rent-estimate` — communeCode ou zipCode + surface + caractéristiques → fourchette HC/CC + ajustements + confiance + attribution ANIL
- [✅] Hook `useRentEstimate` — SWR + debounce 500ms, clé de cache JSON, `dedupingInterval: 5000`
- [✅] Widget `RentEstimator` — barre de fourchette Q1-Q3, badge confiance, comparaison prix (vert/orange/rouge/bleu), bouton "Appliquer", détails dépliables, attribution ANIL
- [✅] Intégration RentModal (step PRICE) — estimation temps réel, auto-fill prix si vide, couplé avec encadrement des loyers
- [✅] Intégration PriceSection (page édition) — respecte `isLocked` (bail actif), skip colocation, conversion buildYear→constructionPeriod
- [✅] Rappels admin annuels — `AdminReminders.ts` (1er oct ANIL + 1er juil encadrement), intégrés dans `ReminderEngine`, email à `ADMIN_EMAIL`

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
- [✅] Rappels légaux V2 — taxes & obligations propriétaire : 11 nouveaux types (PROPERTY_TAX_DEADLINE, TEOM_RECOVERY, VACANT_PROPERTY_TAX, SECONDARY_RESIDENCE_TAX, CFE_DEADLINE, SOCIAL_CONTRIBUTIONS_INFO, OCCUPANCY_DECLARATION, PNO_INSURANCE_RENEWAL, BOILER_MAINTENANCE_CHECK, ENERGY_BAN_DEADLINE, SMOKE_DETECTOR_CHECK), calculateurs purs (`services/reminders/TaxAndPropertyReminders.ts`), sync batch N+1-free (`TaxAndPropertyReminderSync.ts`), 11 champs Prisma sur Property (vacantSince, propertyTaxAmountCents, teomAmountCents, pnoInsuranceExpiryDate, pnoInsuranceProvider, lastBoilerMaintenanceDate, smokeDetectorInstalledAt, smokeDetectorCheckedAt, heatingSystem, dpe, isZoneTendue), intégré dans `ReminderEngine.dailyCronJob()`, page reminders enrichie avec icônes par type
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
- [✅] EDL de sortie — type `EXIT` sur Inspection, champ `entryInspectionId` (FK vers EDL d'entrée), flow création avec sélection EDL d'entrée, comparaison pièce par pièce (diff côte à côte entrée/sortie dans le hub pièces et l'inspection par pièce), pré-remplissage des pièces/éléments/compteurs depuis l'EDL d'entrée, badge "Sortie" vs "Entrée" dans l'UI, section EDL sortie dans `EdlSection.tsx` (bouton "Créer l'EDL de sortie" si EDL d'entrée SIGNED), intégré dans le calendrier et la conversation

### Dépôt de Garantie
- [✅] SecurityDeposit + DepositEvent — modèles Prisma lifecycle complet (status machine AWAITING_PAYMENT → PAID → HELD → EXIT_INSPECTION → RETENTIONS_PROPOSED → FULLY_RELEASED/PARTIALLY_RELEASED/DISPUTED → RESOLVED), DepositEventType enum (22 types), relations RentalApplication + DepositResolution (FK direct `depositResolutionId`), champs User (`depositsTotal`, `depositsReturnedOnTime`)
- [✅] DepositService — `services/DepositService.ts`, state machine avec transitions validées, chaînage PAID→HELD automatique (pas d'état zombie), deadline légal (1 mois conforme / 2 mois sinon), pénalité art. 22 al. 2 (10% loyer/mois), rappels J-7 + Jour J + J+15, détection Powens, badge proprio, injection messages conversation (pipe-delimited `DEPOSIT_EVENT|{eventType}|{amountCents}|{applicationId}`), validation montants (warning si retenues > dépôt, pas de blocage)
- [✅] Logique métier pure — `lib/depositRules.ts` (zéro dépendances), types + state machine + calcul pénalité + validation retenues + deadline légal + calcul montant dépôt, testable sans Prisma
- [✅] Tests unitaires — 68 tests vitest (`__tests__/services/DepositService.test.ts`), couverture : transitions valides/invalides, états transient/terminal, calcul pénalité, validation retenues, deadline légal, calcul montant, complétude state machine
- [✅] Emails transactionnels — emails Resend via `EmailTemplate` pour : J-7 rappel deadline (proprio + locataire), deadline dépassée (proprio + locataire), J+15 second rappel + suggestion mise en demeure, retenues proposées (locataire)
- [✅] Intégration écosystème — hooks Yousign (initializeDeposit à la signature bail), hooks deposit-resolution (lien depositResolutionId + transitions), cron enrichi (J-7, overdue, J+15)
- [✅] API deposit — `app/api/deposit/[applicationId]/` GET/PATCH, timeline, formal-notice, export-timeline, cdc-dossier
- [✅] Hook useSecurityDeposit — SWR hook avec computed (isOverdue, daysUntilDeadline, penaltyAmount, progress)
- [✅] Page dépôt — `app/[locale]/deposit/[applicationId]/page.tsx`, header + DepositTimeline + bloc action conditionnel + section retenues (warning si > dépôt) + boutons actions
- [✅] DepositTimeline — timeline verticale avec cercles passé/actuel/futur, couleurs par statut (vert/rouge/orange)
- [✅] Mise en demeure PDF — `FormalNoticeDocument.tsx` (@react-pdf/renderer), lettre recommandée AR, rappel art. 22 loi 89-462, pénalité chiffrée, API POST/PATCH (générer + marquer envoyée)
- [✅] Export Timeline PDF — `DepositTimelineDocument.tsx`, tableau chronologique Date|Événement|Acteur|Détails
- [✅] Dossier CDC — `CDCDossierService.ts`, PDF multi-sections (page de garde, chronologie, EDL entrée/sortie + diff, retenues, échanges, arguments, **lettre de saisine type** — pas de Cerfa officiel pour la CDC), auth locataire uniquement
- [✅] Dashboard widgets — `DepositAlertWidget.tsx` (proprio : jours restants/pénalité, locataire : proposition reçue/retard), intégré DashboardClient
- [✅] Widget page bien — `DepositSection.tsx` dans `EditPropertyClient` (onglet Location), mini-timeline dépôt + badge statut + lien suivi complet, visible si SecurityDeposit existe
- [✅] Messages système conversation — DEPOSIT_EVENT rendering dans MessageBox (7 eventTypes avec cards colorées + CTA), previews dans ConversationBox
- [✅] Badge propriétaire — "Dépôts restitués dans les délais : X/Y" (préparatoire Passeport Proprio)

### Gestion financière
- [✅] Gestionnaire dépenses/charges (`Expense`, `app/api/expenses/`) — CRUD complet (GET/POST/PATCH/DELETE)
- [✅] Filtres dépenses client-side (année, mois, catégorie multi-select, récupérable/non-récupérable)
- [✅] Édition d'une dépense existante (tap → modale pré-remplie, PATCH API)
- [✅] Indicateurs résumé au-dessus de la liste (total, récupérable, non-récupérable, barre de progression)
- [✅] Refonte page dépenses & charges — filtres cumulables checkbox (Set<string>), KPIs dynamiques par période (mois+année), icônes Lucide monochrome, fréquences par défaut par catégorie, garde-fous récupérable verrouillé (taxe foncière, assurance), pré-remplissage montant récupérable, pills radio récupérable/non récupérable, répartition des charges filtrée par mois, widget "À venir" collapsed par défaut, FAB "Ajouter une dépense" avec texte
- [✅] Property Switcher Glass Morphism — dropdown verre dépoli pour naviguer entre biens depuis la page dépenses, cover photo par bien, montants filtrés par année sélectionnée, scroll interne max-height 60vh, z-index au-dessus navbar, animation stagger items, lien "Ajouter un bien", données chargées server-side (images + expenses par bien)
- [✅] Catégories de charges (eau froide/chaude, électricité, ascenseur, assurance, etc.) — enum ExpenseCategory complet
- [✅] Charges récupérables vs non-récupérables avec ratio (`isRecoverable` + `recoverableRatio`)
- [✅] Régularisation annuelle (`ReconciliationHistory`, `services/RegularizationService.ts`, `components/documents/RegularizationDocument.tsx`)
- [✅] Refonte régularisation des charges — flow pédagogique 7 étapes (WELCOME → GUIDE → SELECT → BALANCE → EXPENSES → SEND → DONE), modale plein écran mobile / centrée desktop, guide 5 slides explicatifs, sélection bail+année avec cards, revue dépenses avec toggles checkbox et recalcul temps réel, envoi avec génération PDF + upload Cloudinary + notification in-app/push/email, historique des régularisations dans /finances, annulation régularisation (unlock dépenses + delete history), gardes serveur : `isFinalized` empêche suppression/double comptage, `enforceRecoverability` serveur par catégorie (`categoryRules.ts`), duplicate guard `commitRegularization`, ownership verification, colocation shareRatio 1/N, année bissextile
- [✅] Server action `regularization.ts` (preview + commit + eligible leases + cancel + history + sendMessage enrichi + updateReportUrl)
- [✅] Révision IRL automatique (`RentIndex`, `calculateRevision.ts` — formule Loyer × NouvelIndice/AncienIndice)
- [✅] Historique financier du bail (`LeaseFinancials` : loyer + charges par période)
- [✅] Montants déductibles des impôts (`amountDeductibleCents`) — `FiscalService.ts` (calculateDeductible + generateFiscalSummary + generateAllPropertiesSummary), auto-calcul à la création/modification d'une dépense, DEDUCTIBILITY_RULES par catégorie (FULL/PARTIAL/NONE/MANUAL), API fiscal (`/api/fiscal/summary`, `/api/fiscal/summary-all`), page récap fiscal (`account/fiscal/FiscalClient.tsx`) avec sélecteur année/bien + tableau déclaration 2044, FiscalWidget dashboard (avril-juin), lien TaxReminders → `/account/fiscal`, indicateur déductible dans ExpensesClient
- [✅] Récap fiscal 2044 — détail cliquable par ligne : chaque ligne du formulaire 2044 ouvre un BottomSheet avec le détail (loyers par locataire l.211, assurances avec dates l.223, charges copro l.221, forfait gestion l.222, travaux l.224, taxes foncières l.227, sous-totaux l.230, résultat l.420), `FiscalService` enrichi avec `LineDetailItem[]` par ligne, API routes passent les details, BottomSheet scrollable
- [✅] Page rentals (`app/[locale]/rentals/`) — affiche les baux signés avec suivi des paiements et quittances
- [✅] Simulateur fiscal propriétaire — `lib/fiscalRules.ts` (constantes 2025-2026 avec sources légales : barème IR 5 tranches, PS 17.2%, micro-foncier/réel, micro-BIC/réel LMNP, déficit foncier, seuils LMP), `TaxSimulatorService.ts` (8 méthodes : simuler, calculerMicroFoncier, calculerReelFoncier, calculerMicroBIC, calculerReelLMNP, calculerIR, detecterLMP, determinerRegimeOptimal), API POST+GET `/api/tax-simulator/` (simulation + pré-remplissage depuis biens existants), page `account/tax-simulator/TaxSimulatorClient.tsx` (formulaire multi-biens dynamique + résultats côte à côte + alertes + disclaimer), feature-gated `TAX_SIMULATOR` (Essentiel + Pro), intégré sidebar compte
- [✅] Simulateur d'investissement locatif — `lib/simulatorDefaults.ts` (constantes France 2026 documentées : notaire, crédit, vacance, fiscalité, plus-value CGI art. 150 VC, surtaxe art. 1609 nonies G), `services/InvestmentSimulatorService.ts` (moteur complet : rendement brut/net/net-net, cash-flow mensuel, TRI Newton-Raphson, VAN, amortissement crédit, plus-value avec abattements IR/PS par durée + surtaxe, comparaison placements Livret A/AV/S&P 500, projection annuelle, délégation fiscalité au `TaxSimulatorService`), model Prisma `InvestmentSimulation` (inputs/results JSON, `isPublic`, `shareToken`), API simulateur (`POST /api/simulator` calcul, `POST/GET /api/simulator/save` sauvegarde auth, `GET/PATCH/DELETE /api/simulator/save/[id]`, `POST /api/simulator/save/[id]/share` partage public, `GET /api/simulator/shared/[shareToken]` vue partagée, `POST /api/simulator/export-pdf` rapport PDF), `hooks/useInvestmentSimulator.ts` (simulate/save/reset), page simulateur (`app/[locale]/simulateur/SimulatorClient.tsx` formulaire 6 sections : achat, crédit, location, fiscalité, projection, charges), `components/simulator/SimulatorResults.tsx` (6 KPI cards, graphique cash-flow Recharts, amortissement, plus-value avec slider année, comparaison placements, export PDF), `components/simulator/CashflowProjectionChart.tsx` (ComposedChart bars+lines), `components/documents/InvestmentReportDocument.tsx` (rapport PDF @react-pdf multi-pages), page simulations sauvegardées (`app/[locale]/account/simulations/SimulationsClient.tsx` liste + suppression + chargement), page partagée (`app/[locale]/simulateur/shared/[shareToken]`), navigation sidebar (`AccountSidebar` 2 liens landlord) + CTA dashboard (widget amber), intégré i18n FR/EN
- [✅] Simulateur V2.2 — Design & UX Polish (10 phases, 0 changement moteur) : palette ambre + fond chaud `#FAF9F6` (dark `#0F0F0F`) scopée `.simulator-page`, font DM Serif Display (`--font-serif-sim`) pour titres, `StoryBar.tsx` stepper connecté avec résumés dynamiques + progression ambre, `CalculationLoader.tsx` animation transition 1.8s fullscreen avec SVG eye logo animé (4 étapes staggerées + barre progression), `useCountUp.ts` hook animation numérique rAF, verdict émotionnel serif (`VerdictBadge.tsx` phrase + badge pill + check SVG animé), `EssentialSummary.tsx` shadow cards + border-l-4 colorée + hover + countUp, scroll narratif remplaçant les onglets (`ScrollSpyNav.tsx` scroll-based detection + rounded-full pills + header dark transition via `data-[dark=true]`), `ScrollReveal.tsx` fade-up triggerOnce, `CostTab.tsx` effort positif = "Aucun effort d'épargne / 0€/mois" + surplus vert, effort négatif = gris chaud `--sim-effort` (rouge seulement >500€/mois) + astuce dynamique, `ProfitabilityTab.tsx` courbe patrimoine ambre + tooltip dark + titre dynamique placements + S&P 500 nominal 10.5% + note inflation, `FiscalImpactTab.tsx` contraste SANS/AVEC + border-l-4, `LoanTab.tsx` carte bleutée, `ResaleTab.tsx` slider avec milestone markers sur la piste + sub-text Row + countUp gain total, `ExpertSection.tsx` heatmap rouge/vert cashflow + mode condensé (années 1,5,10,15,20,N) + AnimatePresence, boutons Sauvegarder/PDF toujours visibles (extraits de ExpertSection), `PaywallOverlay.tsx` blur(8px) + CTA si non connecté, `SignupBanner.tsx` bandeau CTA post-résultats, `TeasingPreview.tsx` estimation patrimoine floutée progressive pendant la saisie, `YearSlider.tsx` dots ambre, pills ambre formulaire, inputs focus ambre + tabular-nums, disclaimer stylisé, responsive mobile (dots stepper, scroll horizontal nav, table sticky), dark mode complet, header layout transition dark synchronisée avec section fiscalité
- [✅] Location saisonnière (Airbnb) — champs optionnels `seasonalRentalIncome` + `isSeasonalClassified` dans `InvestmentInput`, abattements micro-BIC séparés par portion (longue durée 50%, courte durée classé 50%, courte durée non classé 30%), double seuil d'éligibilité, projection annuelle indexée, UI conditionnelle dans `SimulatorForm` (si meublé + vacance > 0), toggle classé/non classé, warnings dépassement seuil micro-BIC + LMP, charges (gestion, GLI) calculées sur longue durée uniquement, revenus total pour yields et réel LMNP
- [✅] Export comptable — `components/documents/FiscalReportDocument.tsx` (rapport fiscal PDF 2 pages : synthèse + déclaration 2044 + détail dépenses), API `GET /api/accounting/export` (format=pdf|csv, year, propertyId, auth required), CSV BOM + séparateur point-virgule (compatibilité Excel FR, 3 sections : synthèse, déclaration 2044, dépenses), boutons export dans `FiscalClient.tsx` (header) + `FinancialDashboard.tsx` (onglets année)

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
- [✅] Refonte dashboard propriétaire — action-first, mobile-first layout : `DashboardHeader` ("Bonjour [Prénom]" + message contextuel dynamique basé sur les actions prioritaires + stats inline + bouton ajouter), `ActionCards` (cards URGENT/ACTION/INFO conditionnelles avec resend EDL, max 5 visibles, stagger animation), `MonthlyKPIs` (3 cards animées : revenus count-up, loyers X/Y avec barre de progression, dépenses — scroll horizontal snap mobile, grid-cols-3 desktop), `PropertyStatusList` (cards compactes par bien avec thumbnail, statut occupation pastille colorée, statut loyer, prochaine action, 2 colonnes si >4 biens), `FinanceSection` (wrapper dépliable fermé par défaut pour KPICards + CashflowChart existants + operations summary), `getOperationalStats` enrichi (10 queries parallèles : MonthlyKPIs + PropertyStatusItem[] + ActionItem[] agrégés depuis loyers, rappels légaux, dépôts, EDL, candidatures, baux, visites), widgets existants conservés (DepositAlertWidget, LegalRemindersWidget, RentCollectionWidget, FiscalWidget), skeleton adapté

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
- [✅] Lissage revenus freelance — `FreelanceIncomeService.ts` (détection auto virements pro→perso via Powens, normalisation libellés, match néobanques/formes juridiques/nom, confiance HIGH/MEDIUM/LOW), 7 champs TenantProfile, API `GET/POST /api/profile/freelance-income`, hook Powens analyze, `FreelanceIncomeCard.tsx` (barres 12 mois + badge vérifié + actualiser) dans PassportClient, vue propriétaire simplifiée (TenantProfilePreview + PassportPreview), priorité solvabilité si confiance ≠ LOW
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
- [🔧] Filtres avancés SearchModal — vérifier chaque filtre (meublé/nu, type de bail, type de bien, étage, DPE, caractéristiques, chauffage, etc.), bugs signalés à corriger

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
- [✅] OAuth providers optionnels — `libs/auth.ts` gère gracieusement les env vars manquantes (GitHub, Google, Apple, DossierFacile), providers instanciés uniquement si credentials configurées
- [✅] Gestion erreurs OAuth — toast d'erreur dans LoginModal/RegisterModal en cas d'échec de connexion sociale
- [✅] Normalisation email — `toLowerCase()` sur le credentials provider pour éviter les bugs de casse

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
- [✅] Système de documents intégré — modèle `ConversationDocument` (indexation fichiers échangés), `DocumentService.ts` (CRUD), API `GET/POST /api/conversations/[id]/documents` + `GET /api/documents/[id]/download` (auth participant), `useConversationDocuments` hook SWR, `DocumentBanner.tsx` (bandeau fichier inline avec icône/nom/taille/téléchargement + "Voir dans Documents"), `DocumentsPanel.tsx` (panneau latéral avec recherche, filtres Tous/PDF/Images/Coridor, groupement par mois, scroll vers message), `DocumentsButton.tsx` (header conversation, compteur badge, compact mobile), `MessageForm.tsx` enrichi (staged file preview avec libellé optionnel avant envoi), navigation bidirectionnelle conversation↔panel (highlight amber 2s), animation framer-motion slide-in + backdrop mobile, safe area iOS (`pt-safe`), images + fichiers indexés automatiquement via `messages/route.ts`
- [✅] Intégration auto-documents Coridor — indexation automatique quittances (cron), baux signés (webhook Yousign), EDL (generate-pdf), mises en demeure (formal-notice) via `DocumentService.createCoridorDocument()`, messages système `CORIDOR_DOCUMENT|type|label|url` avec cards colorées dans MessageBox, preview dans ConversationBox, utilitaire `findConversationByListingAndUsers`

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
- [✅] Install prompt (`components/pwa/InstallPrompt.tsx`) — beforeinstallprompt + cooldown 24h, intégré dans layout.tsx, guard natif Capacitor

### App Mobile (Capacitor)
- [✅] Capacitor installé et configuré — remote URL mode (WebView → `https://coridor.fr`), `capacitor.config.ts`, 10 plugins (app, status-bar, splash-screen, keyboard, haptics, browser, camera, share, network, push-notifications)
- [✅] Projets natifs générés — `android/` (Android Studio) + `ios/` (Xcode), 5 scripts npm (`cap:sync`, `cap:android`, `cap:ios`, `cap:android:run`, `cap:ios:run`, `cap:dev:android`, `cap:dev:ios`)
- [✅] Détection plateforme SSR-safe — `lib/platform.ts` (isNative, isAndroid, isIOS, isWeb, nativeOnly)
- [✅] Initialisation native — `components/native/CapacitorInit.tsx` (StatusBar light #FAF7F2, SplashScreen hide, Keyboard listeners, Push init, Deep links listener)
- [✅] Bouton retour Android — `components/native/BackButtonHandler.tsx` (history.back si canGoBack, exitApp sinon), cleanup on unmount
- [✅] Push notifications natives (Firebase) — `PushToken` model Prisma (userId+platform unique), `lib/pushNotifications.ts` (client FCM init, permission, token registration, notification tap routing), `app/api/push/register/route.ts` (upsert token), `services/PushService.ts` (Firebase Admin SDK, envoi via sendEach, nettoyage tokens invalides, méthodes notifyNewApplication/notifyMessage/notifyVisit/notifyLeaseReady)
- [✅] Caméra native — `hooks/useNativeCamera.ts` (takePhoto + pickFromGallery, base64, fallback null sur web)
- [✅] Partage natif — `hooks/useNativeShare.ts` (Share plugin → navigator.share → clipboard fallback)
- [✅] Détection réseau — `hooks/useNetworkStatus.ts` (Network plugin natif + navigator.onLine web), `components/native/OfflineBanner.tsx` (bandeau rouge fixe)
- [✅] Haptics — `lib/haptics.ts` (hapticLight/Medium/Success/Error, SSR-safe, try/catch, no-op web), intégré dans LikeButton, SaveListingMenu, ApplicationModal, VisitSlotSelector, MobileMenu, MessageForm, LeaseViewerClient
- [✅] Deep links — `public/.well-known/assetlinks.json` (Android, placeholder SHA256), `public/.well-known/apple-app-site-association` (iOS, placeholder TEAM_ID), intent filter `autoVerify` dans AndroidManifest.xml, listener `appUrlOpen` dans CapacitorInit
- [✅] Assets app — icônes source 1024×1024 (icon-only, foreground, background #FAF7F2), splash screens 2732×2732 (light ivoire + dark #1A1A1A, logo cuivre centré), 88 assets générés via `@capacitor/assets` (74 Android + 7 iOS + 7 PWA)
- [✅] Guard InstallPrompt — n'affiche pas le prompt d'installation PWA en contexte natif Capacitor
- [✅] CSS clavier — `body.keyboard-open #bottom-nav { display: none }` cache MobileMenu quand clavier ouvert
- [🔧] Deep links placeholders — `assetlinks.json` nécessite le SHA256 fingerprint de la clé de signature Android, `apple-app-site-association` nécessite le TEAM_ID Apple Developer
- [❌] Publication Google Play — compte, fiche store, signature APK/AAB, test interne, release
- [❌] Publication App Store — compte Apple Developer, build Xcode, TestFlight, soumission review

### UI & Navigation
- [✅] Bottom bar mobile : "Profil" → "Réglages" — icône `Settings` (engrenage), label `t('settings')`, lien vers `/account`
- [✅] Refonte sidebar réglages (`AccountSidebar`) — catégories restructurées (Général, Logement, Financier, Sécurité), icônes cohérentes
- [✅] PhoneInput avec préfixe +33 — composant dédié avec formatage automatique, validation, flag français
- [✅] Passeport Locatif progressive disclosure — `PassportExplainerModal` carousel multi-étapes (explication du concept avant activation), intégré dans `PassportClient`
- [✅] Font Boldonse — correction chargement custom font dans `layout.tsx`
- [✅] FAB mobile "Louer mon bien" sur la home — bouton flottant centré avec texte complet, se transforme en rond "+" à droite au scroll down, revient au texte complet au scroll up, ouvre le RentModal, masqué sur desktop (`md:hidden`), animation spring framer-motion + CSS transition pour la position
- [✅] SearchModal — catégories redesignées en boutons full-width verticaux (un par ligne) avec icône + label, toggle noir/blanc, remplace les pills `CategoryInput` compactes
- [✅] Bookmark icon sur les ListingCards — remplace le bouton favori heart/check par une icône Bookmark simple (remplie si sauvegardée), sans conteneur rond
- [✅] Refonte navigation navbar + sidebar — réorganisation menus propriétaire/locataire (Navbar + UserMenu + MobileMenu + AccountSidebar), section "Finances" dans la sidebar (Mes finances, Récap fiscal, Simulateur fiscal, Simulateur investissement, Mes simulations), section "Confidentialité" ajoutée, lien "Quittances" locataire dans sidebar, suppression du Container wrapper sur les pages account (respect `AccountClientLayout` grid)
- [✅] Refonte page finances — layout fintech avec `FinancesHeader` (titre + message contextuel), `NetResultCard` (résultat net mensuel avec Sparkline 12 mois), `MetricRow` (3 KPIs : revenus/dépenses/cashflow avec tendances), `PropertyTimeline` (timeline par bien avec revenus/dépenses/cashflow), `PropertyCostSection` (répartition des coûts avec barres proportionnelles), `FiscalSection` (résumé fiscal avec lien récap), `QuickLinks` (accès rapides : quittances, dépenses, suivi loyers, déclaration fiscale, obligations légales, régularisations), `InsightCard` (insights IA contextuels), `Sparkline` SVG, server action `getFinancialReport` (données agrégées multi-biens), API `/api/finances/report`, skeleton loading adapté
- [✅] Régularisation des charges depuis la page finances — `RegularizationModal` rendu optionnel (`propertyId?`), `getEligibleLeases` étendu pour charger tous les baux signés du propriétaire quand pas de propertyId, `propertyId` injecté depuis le bail sélectionné, bouton "Régularisations de charges" dans QuickLinks ouvre la modale directement
- [✅] Calendrier agenda enrichi — `getLandlordCalendarData` étendu avec suivi loyers (RentPaymentTracking), échéances fiscales (taxe foncière, déclaration revenus, CFE, TEOM), fix champs Prisma (rentalApplication, periodMonth/periodYear, expectedAmountCents, expectedDate)
- [✅] Récap fiscal mobile — layout catégories empilé (label + montant en ligne, barre de progression en dessous) pour visibilité sur petit écran
- [✅] Données patrimoine & calculs financiers V1 — champs investissement/emprunt sur Property (`purchasePrice`, `purchaseDate`, `estimatedCurrentValue`, `estimatedValueDate`, `loanAmount`, `loanRate`, `loanStartDate`, `loanEndDate`, `loanMonthlyPayment`, `loanBank`, `acquisitionMode`), collecte progressive via DataInviteCard sur /finances (4 priorités : prix → valeur estimée → date → crédit), PropertyDataSheet (bottom sheet responsive : drawer mobile / modale desktop), API PATCH `/api/properties/[propertyId]/investment`, mapping dépenses → lignes 2044 (`expenseTo2044Mapping.ts`), calcul plus-value avec abattements IR/PS via `InvestmentSimulatorService`, calcul capital restant dû, intérêts d'emprunt (ligne 250), rendement net
- [✅] Données patrimoine V2 — refonte collecte progressive : flow acquisition 2 étapes (Étape 1 : Achat/Héritage/Donation en 3 boutons, Étape 2 : labels adaptatifs par mode — "Prix d'achat" vs "Valeur déclarée dans la succession/donation" avec texte explicatif), P2 valeur estimée, P3 crédit avec option "Non, pas de crédit" (`hasNoLoan` flag sur Property), `CollectableField` simplifié (`acquisition` | `estimatedValue` | `loan`), fallback `loanStartDate` → `purchaseDate` pour calculs amortissement
- [✅] Page suivi loyers — `/finances/suivi-loyers/` avec `getRentTracking` server action, `RentTrackingClient`, composants : `RentSummaryCard`, `PropertyGroup`, `TenantLine`, `StatusPill`, `MonthNav`, `ViewToggle`, `FlatListView`, `RentDetailSheet`, `PowensUpsellCard`
- [✅] Refonte account layout — `AccountClientLayout` refonte avec `useAccountHeader` hook, `PageHeader` unifié, récap fiscal (FiscalClient) refonte avec catégories empilées mobile amélioré

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

### Performance & Optimisation
- [✅] Skeleton loaders (loading.tsx) — 7 routes principales (dashboard, inbox, conversation, properties, favorites, account, home), composant `Skeleton.tsx` réutilisable, feedback visuel instantané au clic
- [✅] Parallélisation des requêtes serveur — `Promise.all` sur dashboard (4 queries landlord, 3 tenant), home (listings + user), conversation (6 queries en 2 batches), calendar, favorites, properties
- [✅] Navigation avec prefetch — migration `router.push()` → `<Link>` dans MobileMenu, standardisation imports `@/i18n/navigation` sur 9 composants de navigation haute fréquence
- [✅] Optimisation requêtes Prisma — `getConversations` (dernier message seulement au lieu de tous, `take: 1`), `getOperationalStats` (queries `count` directes), `getMessages` (select minimal sender/seen), `getProperties` (select minimal applications)
- [✅] Lazy-loading modales — `dynamic(() => import(...), { ssr: false })` pour LoginModal, RegisterModal, SearchModal, RentModal, CommuteModal, ApplicationModal, SearchAlertModal
- [✅] Suppression `force-dynamic` sur la home page — permet le cache Next.js
- [✅] Suppression `ClientOnly` wrappers inutiles — élimine le flash blanc post-hydration sur dashboard, properties, favorites, calendar
- [✅] Dénormalisation `getListings` — 7 colonnes indexées (`dnCity`, `dnZipCode`, `dnLatitude`, `dnLongitude`, `dnCategory`, `dnOwnerId`, `dnSurface`) + `cardData` JSONB sur Listing, élimine les includes 4 niveaux (Listing → RentalUnit → Property → Owner/Images/Rooms), `syncListingCardData` fire-and-forget branché sur 14 routes CRUD, backfill script, requête PostGIS commute sans JOIN

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

### Priorité haute (terminé)
- [x] ~~Dépôt de garantie Phase 1~~ (fait — SecurityDeposit state machine, DepositService, timeline, rappels J-7/J/J+15, pénalité art. 22, mise en demeure PDF, dossier CDC, emails transactionnels, 68 tests unitaires, intégration conversation/dashboard/page bien)

### Priorité moyenne
- [x] ~~Alertes dashboard avancées (IRL, échéances, impayés)~~ (fait — LegalRemindersWidget + RentCollectionWidget)
- [x] ~~Matching automatique paiement ↔ bail (logique)~~ (fait — RentCollectionService.checkPayments)
- [x] ~~Dashboard suivi des paiements complet~~ (fait — RentTrackingSection + RentCollectionWidget)
- [x] ~~Suggestions de prix~~ (fait — Estimateur de loyer ANIL 2025, 139 600 lignes, fallback commune→département, 7 ajustements, intégré RentModal + PriceSection)
- [ ] Anonymisation renforcée dans les candidatures côté UI
- [x] ~~Logique fiscale pour montants déductibles~~ (fait)
- [x] ~~Sondages V2 (globaux, 3 options, géolocalisation auto)~~ (fait)
- [ ] Génération PDF de factures

### Pistes futures
- [x] ~~Module fiscal (aide déclaration revenus fonciers)~~ (fait — Simulateur fiscal V1, comparaison micro/réel, déficit foncier, LMNP)
- [x] ~~Simulateur d'investissement locatif~~ (fait — moteur complet rendement/cash-flow/TRI/VAN/plus-value, sauvegarde/partage, export PDF, comparaison placements)
- [x] ~~Export comptable (PDF + CSV)~~ (fait — rapport fiscal PDF, CSV Excel-compatible, intégré récap fiscal + dashboard financier)
- [ ] Intégration GLI (Garantie Loyers Impayés)
- [ ] Vérification de pièces d'identité
- [x] ~~Mix bail 9 mois étudiant + été saisonnier~~ (fait — bail étudiant + bail mobilité opt-in par annonce, validation API + UI)
- [x] ~~Scoring fiabilité avancé~~ (fait — Passeport Locatif V1)
- [ ] B2B2C : partenariats (assurance, déménagement)
- [x] ~~Recommandation d'ancien propriétaire~~ (fait — Passeport Locatif V1, LandlordReview structuré)
- [x] ~~Lissage salaire freelance (calcul avancé)~~ (fait — FreelanceIncomeService, analyse Powens auto, confiance 3 niveaux)
- [ ] Backfill communeCode propriétés existantes — script géocodage via api-adresse.data.gouv.fr pour enrichir les Property existantes (communeCode=null) et passer du fallback département à la donnée commune exacte
- [ ] Estimateur charges affiné — remplacer le taux fixe (2,5€/m² appart, 1€/m² maison) par des données réelles issues des régularisations de charges des utilisateurs Coridor
- [ ] App mobile : publication Google Play (compte, fiche store, signature, test interne)
- [ ] App mobile : publication App Store (compte Apple Developer, Xcode, TestFlight)
- [ ] App mobile : remplacer assets placeholder par des icônes/splash HD depuis Affinity

---

## ⚠️ Notes déploiement

- **Cron jobs activés** : 8 crons configurés dans `vercel.json` (tous daily — contrainte Vercel Hobby) : `check-alerts` (8h), `visit-reminders` (9h), `check-subscriptions` (3h), `generate-receipts` (4h le 5), `legal-reminders` (5h), `rent-collection` (6h), `inspection-reminders` (7h), `refresh-landlord-stats` (2h).
- **Données encadrement des loyers** : fichiers JSON statiques dans `lib/data/rent-control/`. Mise à jour annuelle recommandée (arrêtés préfectoraux publiés entre juin et août). Relancer `npx ts-node scripts/preprocess-zones-tendues.ts` si le décret zone tendue est modifié. Données Lille et Montpellier à vérifier quand les API officielles redeviennent disponibles.
- **Capacitor (app mobile)** : Remote URL mode (WebView → `coridor.fr`). Projets `android/` et `ios/` versionnés. 10 plugins. Firebase push : 3 env vars requises (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). Deep links : remplir SHA256 dans `assetlinks.json` + TEAM_ID dans `apple-app-site-association` avant publication. Assets source dans `assets/` — relancer `npx capacitor-assets generate` si les icônes/splash changent. Dev local : `CAPACITOR_SERVER_URL=http://IP:3000 npm run cap:dev:android`.

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
- [x] ~~Zone tendue : 627 codes postaux hardcodés incomplets et sur-inclusifs~~ (corrigé — remplacé par 3 689 communes officielles via CSV data.gouv.fr, avec désambiguïsation par ville)
- [x] ~~Encadrement des loyers : 34 villes avec taux fictifs (CITY_RATES)~~ (corrigé — remplacé par données officielles pour 8 territoires, suppression complète de CITY_RATES)
- [x] ~~RentModal utilise des données fictives au lieu de l'API~~ (corrigé — hybride lookupRentControl local + API pour Paris)
- [x] ~~LegalInfoSection : pas de champ rentSupplementJustification~~ (corrigé — textarea conditionnel + mention légale art. 140 VI loi ELAN)
- [x] ~~LegalInfoSection : checkZoneTendue ne passe pas le nom de ville~~ (corrigé — `checkZoneTendue(zipCode, city)` pour désambiguïsation)
- [x] ~~Simulateur : champ apport personnel impossible à vider/modifier~~ (corrigé — remplacement du `<input>` brut avec `parseFloat(e.target.value) || 0` par `InputField` avec local state + onBlur reset, permettant de vider et retaper une valeur)
- [x] ~~HomeClient : `listing.rentalUnit.images` toujours vide après dénormalisation~~ (corrigé — les images sont pré-agrégées dans `listing.images` via cardData, les stubs relation sont vides par design → changé en `listing.images?.[0]?.url`)
- [x] ~~6 routes API sans sync cardData après modification~~ (corrigé — ajout `syncListingCardData`/`syncPropertyListings` sur PATCH listing status, admin reject/archive, rooms create/delete, transit update)
- [x] ~~Google OAuth `TypeError: Invalid URL, input: '[object Object]'`~~ (corrigé — `onClick={loginModal.onOpen}` passait le `MouseEvent` comme `callbackUrl` au store Zustand → NextAuth recevait `[object Object]` comme URL. Fix : filtrage des arguments non-string dans `useLoginModal.ts` et `useRegisterModal.ts`)
- [x] ~~Powens redirect_uri toujours en http en production~~ (corrigé — `powens.ts` utilisait `http://` au lieu de détecter HTTPS via `x-forwarded-proto` ou `NEXTAUTH_URL`. Fix : helper `getBaseUrl()` avec détection proto + fallback NEXTAUTH_URL)
- [x] ~~Powens redirect_uri échoue sur IP privées (preview Vercel)~~ (corrigé — détection élargie des ranges IP privées `10.x`, `172.16-31.x`, `192.168.x` en plus de `localhost`/`127.0.0.1` pour forcer http en local uniquement)
- [x] ~~iOS Safari : scroll bloqué dans la gestion des photos (4 causes)~~ (corrigé — 1. `touch-none` sur SortablePhoto bloquait le scroll tactile → retiré, 2. TouchSensor dnd-kit interceptait les events au document level → remplacé par drag handle, 3. `window.confirm()` natif cassait la restauration touch iOS → remplacé par overlay React, 4. `Modal.tsx` `overflow: 'unset'` interférait avec les conteneurs scroll → changé en `''`)
- [x] ~~getLandlordCalendarData PrismaClientValidationError~~ (corrigé — champs RentPaymentTracking incorrects : `lease` → `rentalApplication`, `month`/`year` → `periodMonth`/`periodYear`, `amountCents` → `expectedAmountCents`, `dueDate` → `expectedDate`)
- [x] ~~Récap fiscal : barres de pourcentage invisibles sur mobile~~ (corrigé — layout catégories empilé : label+montant en ligne, barre en dessous sur toute la largeur)
- [x] ~~Pages account wrappées dans Container~~ (corrigé — suppression Container/max-w sur 12 pages account qui doublonnaient avec le grid `AccountClientLayout`)
- [x] ~~Couverture annonce ne change pas après réordonnancement des photos~~ (corrigé — `syncListingCardData` concaténait les images par source sans tri final → ajout `.sort((a, b) => a.order - b.order)` après déduplication)
- [x] ~~Page édition propriété : scroll desktop bloqué~~ (corrigé — grid CSS implicit `auto` row sizing empêchait `overflow-y-auto` → ajout `md:grid-rows-[1fr]`)
