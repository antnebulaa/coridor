# Vision Produit — Coridor

Webapp (mobile + desktop) de location immobilière entre particuliers orientée France.
Combine : mise en location + gestion locative + automatisation + signaux de fiabilité + pilotage financier.

**Promesse** : moins de charge mentale pour le propriétaire + plus de transparence et d'équité pour le locataire, sans passer par une agence.

**Formule** : "Airbnb-like UX" + "gestion locative" + "fiabilité candidats", orienté propriétaires particuliers.

## Problèmes résolus

### Côté propriétaire
- Temps perdu et charge mentale : messages, tri candidats, visites, relances, documents
- Risque locatif : mauvais payeurs, dossiers falsifiés, impayés, dégradations
- Outils éclatés : annonces d'un côté, calendriers de l'autre, tableur pour le suivi
- Discrimination involontaire : difficulté à rester juste quand on voit trop d'infos trop tôt
- Manque de lisibilité financière : savoir si un bien performe, combien il rapporte vraiment

### Côté locataire
- Candidature chronophage : dossiers multiples, pièces à fournir, répétition, stress
- Inégalité de traitement : certains profils favorisés, manque de transparence
- Difficulté à prouver sa fiabilité (indépendants, étudiants, nouveaux arrivants)
- Expérience frustrante : messages sans réponse, visites difficiles à caler, opacité

## Comment Coridor résout ces problèmes

### A) Automatisation opérationnelle
- Visites type "créneaux" (logique Calendly/Doctolib adaptée location) : slots, limites, confirmations, annulations, relances
- Pipeline candidat : suivi des étapes (contact → visite → dossier → sélection), actions rapides
- Centralisation : annonce, messages, documents, décisions, calendrier, au même endroit

### B) Fiabilité et signaux de confiance
- Badge "Payeur Exemplaire" : régularité de paiement vérifiée via Powens + mise en avant candidatures
- Recommandation d'ancien propriétaire : preuve sociale vérifiable (À FAIRE)
- Vérifications (piste) : contrôle pièces, cohérence revenus, scoring fiabilité

### C) Équité et anti-discrimination
- Anonymisation initiale : identité masquée, avatars gradient, identifiants neutres
- Process standardisé : mêmes étapes, mêmes pièces, mêmes délais pour tous

### D) Pilotage & optimisation
- Dashboard KPI : rendement brut/net/net-net, bénéfice net, charges, évolution, alertes
- Aide à la décision (piste) : statut fiscal optimal, recommandations, révision IRL
- Communication propriétaire ↔ locataire encadrée
- Prévention des erreurs coûteuses pour les propriétaires

## Positionnement concurrentiel

| Concurrent | Ce qu'ils font | Différenciation Coridor |
|-----------|---------------|------------------------|
| LeBonCoin / SeLoger / PAP | Diffusion + messagerie basique | Gestion complète de la recherche au bail |
| Agences | Service complet | Moins cher, plus moderne, propriétaire garde le contrôle |
| Rentila / Matera | Gestion administrative | + acquisition candidats + visites + fiabilité |
| Airbnb | Location courte durée | Longue durée + conformité France + gestion locative |

**Différenciation clé** :
1. "De la recherche au bail" + gestion dans un même flux
2. Fiabilité candidats comme produit central (badges + reco + signaux)
3. UX moderne type Airbnb/Revolut
4. Conformité France : IRL, GLI, anti-discrimination

## Modèle économique

### Abonnement Propriétaire (paliers)
- **FREE** : mise en location basique
- **PLUS** : gestion (suivi, documents, KPI, automatisations)
- **PRO** : vérifications avancées, analytics, multi-biens

### Revenus locataire
- Achat/activation badge Payeur Exemplaire
- Pack "dossier renforcé / vérifications"

### Pistes B2B2C
- Partenariats : assurance GLI, garanties, services déménagement
- (attention conformité/neutralité)

> Note : le modèle "locataire paie pour le badge" est un levier de différenciation, mais cadrer éthique + conformité + éviter "pay-to-win".

## Personas

### Marie, propriétaire active (35 ans)
- 2 appartements à Paris (1 meublé, 1 nu), job prenant
- Actuellement : agence ou gestion à l'arrache (messages/Excel)
- Objectif : louer vite, sans stress, limiter les risques
- Douleurs : trop de candidats, visites = enfer, peur impayés, pas envie d'y passer ses soirées
- Convaincue par : visites automatisées + pipeline clair + signaux de fiabilité + zéro friction

### Nicolas, investisseur colocation (42 ans)
- 4 à 10 lots, dont colocations étudiantes (rotation régulière)
- Actuellement : outils dispersés (gestion/CRM)
- Objectif : optimiser remplissage + limiter turnover + piloter la perf
- Douleurs : rotation dossiers/entrées/sorties, qualité candidats variable, perf financière floue
- Convaincu par : multi-biens + KPI avancés + process standardisé + badges/reco

### Sara, locataire profil atypique (29 ans)
- Indépendante/freelance, revenus variables mais solides
- Actuellement : galère à rassurer, se fait zapper sans explication
- Objectif : prouver sa fiabilité, obtenir des réponses, gagner du temps
- Douleurs : dossier répété partout, peu de retours, impression d'injustice
- Convaincue par : dossier unique + badge fiabilité + reco ancien proprio + suivi transparent

## Features — Propriétaire

- Création et gestion d'annonces structurées (tous types de baux)
- Gestion des biens (architecture 3-tiers : Property → RentalUnit → Listing)
- Vérification conformité meublé (check-list décret)
- Gestion des candidatures : tri, pipeline, actions rapides
- Gestion des photos par pièces (salon, chambres)
- Gestion colocation : chaque chambre louable et gérable individuellement
- Génération de baux + signature en ligne (YouSign)
- Gestionnaire dépenses/charges avec KPIs
- Régularisation annuelle des charges
- Révision des loyers automatique (IRL)
- Suivi des paiements (Powens) + relance impayés
- Rappels légaux
- Quittances automatiques
- Messagerie centralisée (tabs de tri, résumé dossier candidat dans la conversation)
- Planification des visites : jours libres → créneaux auto (durée selon taille du bien), proposition dans conversation, confirmation candidat, annulation si non confirmé, relances, 2 candidats par créneau possible
- Gestionnaire de visites : résumé du jour + agenda + accès rapide dossiers + messagerie
- Dashboard KPI : revenus, dépenses, bénéfice net, rendement brut/net/net-net, indices IRL, alertes
- (Pistes) : suggestions de prix, optimisation, intégration GLI, module fiscal

## Features — Locataire

- Profil locataire + dossier unique (pièces, infos, garanties)
- Anti-discrimination : anonymisation initiale, avatars gradient, identifiants neutres
- Signaux de fiabilité : badge Payeur Exemplaire (Powens), reco ancien proprio (À FAIRE), lissage salaire freelance
- Candidature en 1 clic
- Suivi état candidature (via messagerie)
- Réservation de visites sur créneaux
- Messagerie avec propriétaire (cadre standardisé)
- Recherche classique OU par temps de trajet autour d'une zone + lieux favoris
- Gestion des favoris par albums (wishlists)
- Système de like
- Affichage métro le plus proche sur les annonces
- Map split-screen sur desktop
- Annonces en modale/scindé (pas de changement de page, rétréci pour retrouver la map)
- Alertes par critère + gestionnaire d'alertes
- Dernière recherche proposée avant chaque liste d'annonces
- (Pistes) : vérification de pièces, mise en avant profil fiable, protection anti-discrimination renforcée

## Features communes

- Comptes / profils / onboarding
- Messagerie in-app
- Calendrier & événements (visites)
- Notifications in-app (résumé d'activités) + push + email
- Gestion de documents (upload, checklist, statuts)
- Avatars/identifiants (anonymisation + UX)
- Historique & traçabilité des actions (litiges / transparence)
- Système de contacts par code alphanumérique / QR code
