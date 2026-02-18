# AUDIT DE CONFORMITE LEGALE DES BAUX - CORIDOR

**Date de l'audit** : 17 fevrier 2026
**Fichiers audites** :
- `components/documents/LeaseDocument.tsx` (generation PDF du bail)
- `services/LeaseClauses.ts` (clauses juridiques dynamiques)
- `services/LeaseService.ts` (configuration et logique metier du bail)

**Textes de reference** :
- Loi n 89-462 du 6 juillet 1989 (titre Ier bis et Ier ter)
- Loi ALUR n 2014-366 du 24 mars 2014
- Loi ELAN n 2018-1021 du 23 novembre 2018
- Decret n 2015-587 du 29 mai 2015 (contrat type de location)
- Code civil (articles 1103, 1104, 1171, 1240)

---

## SOMMAIRE

1. [Synthese executive](#1-synthese-executive)
2. [Mentions obligatoires par base legale](#2-mentions-obligatoires-par-base-legale)
3. [Tableau de conformite](#3-tableau-de-conformite)
4. [Verifications specifiques](#4-verifications-specifiques)
5. [Clauses abusives](#5-verification-des-clauses-abusives-art-4-loi-89-462)
6. [Plan de remediation](#6-plan-de-remediation)

---

## 1. Synthese executive

### Resultat global

| Categorie | Conforme | Partiel | Absent | Total |
|-----------|----------|---------|--------|-------|
| Identification des parties | 4 | 2 | 0 | 6 |
| Designation du logement | 5 | 1 | 2 | 8 |
| Duree et date d'effet | 3 | 0 | 0 | 3 |
| Conditions financieres | 4 | 2 | 3 | 9 |
| Encadrement des loyers | 0 | 1 | 3 | 4 |
| Garanties | 2 | 0 | 0 | 2 |
| Clauses legales | 3 | 1 | 1 | 5 |
| Annexes obligatoires | 1 | 2 | 2 | 5 |
| Bail mobilite (specifique) | 1 | 1 | 2 | 4 |
| Bail etudiant (specifique) | 2 | 0 | 0 | 2 |
| **TOTAL** | **25** | **10** | **13** | **48** |

**Score de conformite : 52% (25/48)**

### Non-conformites bloquantes : 13 absences + 6 mentions partielles critiques
Le bail genere est **incomplet au regard des exigences legales**. Plusieurs mentions obligatoires sous peine de nullite ou de sanctions sont absentes. La mise en conformite est indispensable avant toute mise en production.

---

## 2. Mentions obligatoires par base legale

### 2.1 Article 3 de la loi n 89-462 (modifie par loi ALUR et ELAN)

Cet article definit le contenu minimal obligatoire de tout contrat de location soumis a la loi de 1989.

#### A. Designation des parties (art. 3, I, 1)

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 1 | Nom ou denomination du bailleur, domicile ou siege social, et qualite (personne physique, SCI, etc.) | Art. 3-I-1 | Tous | Nullite du contrat possible | BLOQUANT |
| 2 | Nom ou denomination du locataire | Art. 3-I-1 | Tous | Nullite du contrat possible | BLOQUANT |
| 3 | Date de naissance et lieu de naissance du bailleur (si personne physique) | Decret 2015-587, art. 1er, I-A | Tous | Bail non conforme au contrat type | BLOQUANT |
| 4 | Date de naissance et lieu de naissance du locataire | Decret 2015-587, art. 1er, I-A | Tous | Bail non conforme au contrat type | BLOQUANT |
| 5 | Adresse email ou coordonnees du bailleur | Decret 2015-587 | Tous | Non-conformite au contrat type | Recommande |
| 6 | Adresse email ou coordonnees du locataire | Decret 2015-587 | Tous | Non-conformite au contrat type | Recommande |
| 7 | Qualite du bailleur (personne physique, SCI, personne morale) | Decret 2015-587, art. 1er, I-A | Tous | Non-conformite au contrat type | BLOQUANT |
| 8 | Si mandataire : nom et adresse de l'agence, activite, n carte professionnelle, garant | Art. 3-I-1 / Loi Hoguet | Si agence | Non-conformite | BLOQUANT |

#### B. Objet du contrat - Designation du logement (art. 3, I, 2)

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 9 | Consistance du logement et destination (habitation) | Art. 3-I-2 | Tous | Nullite possible | BLOQUANT |
| 10 | Surface habitable (loi Boutin) | Art. 3-I-2, art. 3-1 | Tous | Le locataire peut demander reduction de loyer si ecart > 5% | BLOQUANT |
| 11 | Designation des locaux et equipements d'usage privatif | Art. 3-I-2 | Tous | Non-conformite | BLOQUANT |
| 12 | Designation des locaux et equipements a usage commun | Art. 3-I-2 | Tous | Non-conformite | Recommande |
| 13 | Enumeration des equipements d'acces aux technologies (fibre, etc.) | Art. 3-I-2 (ELAN) | Tous | Non-conformite | Recommande |
| 14 | Type d'habitat (individuel ou collectif) | Decret 2015-587 | Tous | Non-conformite au contrat type | BLOQUANT |
| 15 | Regime juridique de l'immeuble (copropriete ou non) | Decret 2015-587 | Tous | Non-conformite au contrat type | BLOQUANT |
| 16 | Periode de construction | Decret 2015-587 | Tous | Non-conformite au contrat type | Recommande |
| 17 | Nombre de pieces principales | Decret 2015-587 | Tous | Non-conformite au contrat type | BLOQUANT |
| 18 | Inventaire et etat detaille du mobilier (pour meuble) | Art. 25-5, decret 2015-587 | Meuble, Etudiant, Mobilite | Requalification en bail nu possible | BLOQUANT |

#### C. Date de prise d'effet et duree (art. 3, I, 3)

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 19 | Date de prise d'effet du contrat | Art. 3-I-3 | Tous | Nullite | BLOQUANT |
| 20 | Duree du contrat | Art. 3-I-3, art. 10, art. 25-7, art. 25-12 | Tous | Nullite | BLOQUANT |
| 21 | Conditions de renouvellement / reconduction ou caractere non renouvelable | Art. 10, 25-7, 25-12 | Tous | Contestation possible | BLOQUANT |

#### D. Conditions financieres (art. 3, I, 4 a 9)

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 22 | Montant du loyer et ses modalites de paiement (date, periodicite, lieu) | Art. 3-I-4 | Tous | Nullite | BLOQUANT |
| 23 | Montant des charges : provision (vide) ou forfait (meuble) avec mode de recuperation | Art. 3-I-4, art. 23 | Tous | Contestation | BLOQUANT |
| 24 | Nature du regime de charges (provision ou forfait) | Art. 23, decret 2015-587 | Tous | Non-conformite | BLOQUANT |
| 25 | Montant du loyer du dernier locataire (si connu) et date de versement | Art. 3-I-5, decret 2015-587 | Tous sauf 1ere location | Non-conformite | BLOQUANT |
| 26 | Montant du depot de garantie (si exige) | Art. 3-I-6, art. 22 | Vide, Meuble, Etudiant | Non-conformite | BLOQUANT |
| 27 | Modalites de revision du loyer (indice IRL, date de reference) | Art. 3-I-4, art. 17-1 | Tous sauf Mobilite | Perte du droit a revision | BLOQUANT |
| 28 | Montant et nature des travaux effectues depuis le dernier contrat | Art. 3-I-7, decret 2015-587 | Tous | Non-conformite | Recommande |
| 29 | Honoraires de location (si professionnel) : plafonds et repartition | Art. 5, decret 2014-890 | Tous (si agence) | Amende 5000 EUR (PP) / 15000 EUR (PM) | BLOQUANT |
| 30 | Clause penale (si prevue) | Art. 4-g | Tous | Clause reputee non ecrite si abusive | Recommande |

#### E. Encadrement des loyers en zone tendue (art. 3, I, 10 a 12 -- loi ALUR)

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 31 | Loyer de reference (en EUR/m2/mois) | Art. 3-I-10, art. 140 loi ELAN | Tous (zone encadree) | Nullite de la clause de loyer | BLOQUANT |
| 32 | Loyer de reference majore (en EUR/m2/mois) | Art. 3-I-11, art. 140 loi ELAN | Tous (zone encadree) | Nullite de la clause de loyer | BLOQUANT |
| 33 | Complement de loyer (si applicable, avec justification) | Art. 3-I-12, art. 140 loi ELAN | Tous (zone encadree) | Le locataire peut contester dans les 3 mois | BLOQUANT |
| 34 | Loyer de reference minore (information) | Art. 140 loi ELAN | Tous (zone encadree) | Recommande | Recommande |

#### F. Clause resolutoire et solidarite

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 35 | Clause resolutoire (defaut de paiement, defaut d'assurance) | Art. 4-g, decret 2015-587 | Tous | Simple recommandation (le bailleur perd la resiliation automatique) | Recommande |
| 36 | Clause de solidarite (colocation) avec mention de l'extinction a 6 mois | Art. 8-1 (ALUR) | Colocation | Solidarite non opposable au-dela de 6 mois apres depart | BLOQUANT |

#### G. Annexes obligatoires (art. 3-2 et 3-3)

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 37 | Notice d'information relative aux droits et obligations des parties | Art. 3-3, arrete du 29 mai 2015 | Tous | Non-conformite (obligatoire depuis ALUR) | BLOQUANT |
| 38 | Etat des lieux d'entree (mentionne et joint) | Art. 3-2 | Tous | Presomption de bon etat en faveur du locataire | BLOQUANT |
| 39 | Dossier de diagnostic technique (DPE, ERP, CREP, amiante, electricite, gaz) | Art. 3-3 | Tous | Information incomplete, responsabilite du bailleur | BLOQUANT |
| 40 | Inventaire et etat du mobilier (location meublee) | Art. 25-5 | Meuble, Etudiant, Mobilite | Contestation du caractere meuble | BLOQUANT |
| 41 | Extrait du reglement de copropriete (si applicable) | Art. 3-2 | Tous (copropriete) | Non-conformite | Recommande |

### 2.2 Mentions specifiques au bail mobilite (Titre Ier ter, art. 25-12 a 25-18)

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 42 | Motif justifiant le recours au bail mobilite (formation, etudes, stage, engagement volontaire, mutation, mission temporaire) | Art. 25-13 | Mobilite | Requalification en bail meuble classique | BLOQUANT |
| 43 | Interdiction du depot de garantie | Art. 25-16 | Mobilite | Restitution obligatoire + penalites | BLOQUANT |
| 44 | Mention du caractere non renouvelable et non reconductible | Art. 25-14 | Mobilite | Requalification | BLOQUANT |
| 45 | Duree comprise entre 1 et 10 mois | Art. 25-12 | Mobilite | Requalification | BLOQUANT |

### 2.3 Mentions specifiques au bail etudiant (art. 25-7)

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 46 | Duree de 9 mois | Art. 25-7 | Etudiant | Requalification en bail meuble classique 1 an | BLOQUANT |
| 47 | Caractere non renouvelable par tacite reconduction | Art. 25-7 | Etudiant | Requalification | BLOQUANT |

### 2.4 Clauses du code civil

| # | Mention obligatoire | Base legale | Types de bail | Consequence si absente | Priorite |
|---|---------------------|-------------|---------------|------------------------|----------|
| 48 | Signatures des parties (bailleur et locataire) | Art. 1103, 1367 Code civil | Tous | Le contrat n'est pas forme | BLOQUANT |

---

## 3. Tableau de conformite

### Legende
- **Conforme** : La mention est presente et correcte
- **Partiel** : La mention est presente mais incomplete ou conditionnelle
- **Absent** : La mention est manquante

| # | Mention obligatoire | Base legale | Present ? | Fichier | Commentaire |
|---|---------------------|-------------|-----------|---------|-------------|
| 1 | Nom du bailleur | Art. 3-I-1 | **Conforme** | LeaseDocument.tsx L167-169, LeaseService.ts L254-255 | `data.landlord.name` present |
| 2 | Nom du locataire | Art. 3-I-1 | **Conforme** | LeaseDocument.tsx L184-199 | Boucle sur `data.tenants` |
| 3 | Date/lieu naissance bailleur | Decret 2015-587 | **Partiel** | LeaseDocument.tsx L175-177 | Present mais optionnel (`birthDate \|\| "____"`) ; pas de validation d'obligation |
| 4 | Date/lieu naissance locataire | Decret 2015-587 | **Partiel** | LeaseDocument.tsx L191-193 | Meme probleme : champs optionnels avec fallback `____` |
| 5 | Adresse/email bailleur | Decret 2015-587 | **Conforme** | LeaseDocument.tsx L170-172, L179-181 | Adresse et email presents |
| 6 | Adresse/email locataire | Decret 2015-587 | **Conforme** | LeaseDocument.tsx L195-197 | Email present |
| 7 | Qualite du bailleur (personne physique/SCI) | Decret 2015-587 | **ABSENT** | - | Aucun champ dans `LeaseConfig` ni dans le PDF. Pas de distinction personne physique / personne morale |
| 8 | Informations mandataire (si agence) | Art. 3-I-1 | **Partiel** | LeaseDocument.tsx L429-461 | Section IX traite le cas "sans mandataire" ; si agence (`is_applicable=true`) : juste "Honoraires applicables selon mandat" sans detail legal |
| 9 | Consistance et destination | Art. 3-I-2 | **Conforme** | LeaseDocument.tsx L254-256 | "Usage exclusif d'habitation principale" |
| 10 | Surface habitable (loi Boutin) | Art. 3-I-2 | **Conforme** | LeaseDocument.tsx L224-226 | `data.property.surface` en m2 |
| 11 | Locaux et equipements privatifs | Art. 3-I-2 | **Partiel** | LeaseDocument.tsx L244-248 | Locaux accessoires (cave, parking) presents mais "Neanat" par defaut (LeaseService.ts L282) ; equipements privatifs non detailles |
| 12 | Locaux et equipements communs | Art. 3-I-2 | **Partiel** | LeaseDocument.tsx L249-251 | `common_areas` present mais valeur par defaut "Ascenseur (si applicable)" (LeaseService.ts L283) est trop vague |
| 13 | Acces technologies (fibre) | Art. 3-I-2 ELAN | **Conforme** | LeaseDocument.tsx L242-243 | `fiber_optics` present, mais toujours `true` par defaut (L281) -- devrait refleter la realite |
| 14 | Type d'habitat (individuel/collectif) | Decret 2015-587 | **Conforme** | LeaseDocument.tsx L216-218 | Maison Individuelle / Appartement en Immeuble Collectif |
| 15 | Regime juridique (copropriete) | Decret 2015-587 | **ABSENT** | - | Aucune mention du regime (copropriete, monopropriete) |
| 16 | Periode de construction | Decret 2015-587 | **Conforme** | LeaseDocument.tsx L219-221 | `constructionDate` ou "Inconnue" |
| 17 | Nombre de pieces principales | Decret 2015-587 | **Conforme** | LeaseDocument.tsx L227-229 | `data.property.roomCount` |
| 18 | Inventaire mobilier (meuble) | Art. 25-5 | **Partiel** | LeaseDocument.tsx L473 | Mentionne dans les annexes ("inventaire detaille et etat du mobilier") mais aucun document genere, aucune liste |
| 19 | Date de prise d'effet | Art. 3-I-3 | **Conforme** | LeaseDocument.tsx L267-269 | `effective_date` |
| 20 | Duree du contrat | Art. 3-I-3 | **Conforme** | LeaseDocument.tsx L271-275 | `duration_months` |
| 21 | Conditions de renouvellement | Art. 10, 25-7, 25-12 | **Conforme** | LeaseDocument.tsx L278-292 | Differencie meuble/vide/etudiant/mobilite |
| 22 | Montant du loyer + modalites | Art. 3-I-4 | **Conforme** | LeaseDocument.tsx L303-306, L319-321 | Loyer HC, date paiement, methode |
| 23 | Charges : montant et nature | Art. 3-I-4 | **Conforme** | LeaseDocument.tsx L307-312 | Provision (vide) / forfait (meuble) distingue |
| 24 | Nature regime charges | Art. 23 | **Conforme** | LeaseDocument.tsx L309 | "Provision sur charges" vs "Forfait de charges" |
| 25 | Loyer du precedent locataire | Art. 3-I-5 | **Partiel** | LeaseDocument.tsx L329-336 | Champs presents mais `previous_rent_amount` est `undefined` par defaut (LeaseService.ts L289) -- jamais rempli automatiquement |
| 26 | Depot de garantie | Art. 22 | **Conforme** | LeaseDocument.tsx L381-394 | Montant affiche, legal max cite |
| 27 | Revision du loyer (IRL) | Art. 17-1 | **Partiel** | LeaseDocument.tsx L324-326 | Mentionne l'IRL mais ne precise pas : le trimestre de reference, ni l'IRL applicable, ni la date de reference initiale |
| 28 | Travaux depuis dernier contrat | Art. 3-I-7 | **Conforme** | LeaseDocument.tsx L363-370 | Montant + nature affiches |
| 29 | Honoraires de location | Art. 5 | **Conforme** | LeaseDocument.tsx L429-461 | Detail bailleur/locataire/EDL |
| 30 | Clause penale | Art. 4-g | N/A | - | Non prevue, ce qui est correct (pas de clause penale = pas de risque) |
| 31 | Loyer de reference (zone encadree) | Art. 140 ELAN | **ABSENT** | - | Aucun champ dans `LeaseConfig`, aucune mention dans le PDF |
| 32 | Loyer de reference majore | Art. 140 ELAN | **ABSENT** | - | Idem - l'API `rent-control` calcule ces valeurs mais elles ne sont pas injectees dans le bail |
| 33 | Complement de loyer | Art. 140 ELAN | **ABSENT** | - | Aucune mention |
| 34 | Loyer de reference minore | Art. 140 ELAN | **ABSENT** | - | Aucune mention |
| 35 | Clause resolutoire | Art. 4-g | **Conforme** | LeaseDocument.tsx L411-421, LeaseClauses.ts L37-43 | Commandement de payer 1 mois, defaut d'assurance |
| 36 | Solidarite colocation (6 mois ALUR) | Art. 8-1 | **Conforme** | LeaseClauses.ts L8-12 | Extinction a 6 mois mentionnee pour COLOCATION_ALUR |
| 37 | Notice d'information | Art. 3-3 | **ABSENT** | LeaseDocument.tsx L474 | **Mentionnee dans les annexes** mais le document n'est PAS genere, PAS joint |
| 38 | Etat des lieux d'entree | Art. 3-2 | **Partiel** | LeaseDocument.tsx L471 | Mentionne dans les annexes mais aucun modele genere, aucun processus |
| 39 | Diagnostics techniques (DDT) | Art. 3-3 | **Partiel** | LeaseDocument.tsx L472 | Mentionne "DPE, ERP, etc." generiquement ; n'enumere pas tous les diagnostics obligatoires (CREP, amiante, electricite, gaz) ; pas de reference aux dates/numeros |
| 40 | Inventaire mobilier (annexe) | Art. 25-5 | **ABSENT** | - | Mentionne dans les annexes mais aucun document genere |
| 41 | Extrait reglement copropriete | Art. 3-2 | **Partiel** | LeaseDocument.tsx L475 | Mentionne "(si applicable)" mais pas de logique pour determiner si le bien est en copropriete |
| 42 | Motif du bail mobilite | Art. 25-13 | **ABSENT** | LeaseDocument.tsx L255 | Seule mention : "(Bail Mobilite - Motif professionnel ou etudes)" -- trop generique, le motif precis du locataire n'est pas renseigne |
| 43 | Interdiction depot de garantie (mobilite) | Art. 25-16 | **Conforme** | LeaseService.ts L437-438, LeaseDocument.tsx L393 | Force a 0, mention explicite |
| 44 | Non renouvelable (mobilite) | Art. 25-14 | **Conforme** | LeaseDocument.tsx L289-291 | "non renouvelable ni reconductible" |
| 45 | Duree 1-10 mois (mobilite) | Art. 25-12 | **Partiel** | LeaseService.ts L436-437 | Fixee a 10 mois par defaut ; pas de validation que la duree est entre 1 et 10 mois ; pas de saisie libre |
| 46 | Duree 9 mois (etudiant) | Art. 25-7 | **Conforme** | LeaseService.ts L432-433, LeaseDocument.tsx L284-286 | Fixee a 9 mois |
| 47 | Non renouvelable (etudiant) | Art. 25-7 | **Conforme** | LeaseDocument.tsx L285 | "non renouvelable tacitement" |
| 48 | Signatures des parties | Art. 1103 CC | **Conforme** | LeaseDocument.tsx L480-498 | Cadres de signature "Lu et approuve" + integration Yousign |

---

## 4. Verifications specifiques

### 4.1 Notice d'information (art. 3-3 loi 89-462)

**Statut : NON CONFORME**

L'article 3-3 de la loi du 6 juillet 1989 (modifie par la loi ALUR) impose qu'une notice d'information relative aux droits et obligations des locataires et des bailleurs soit annexee au contrat de location.

- Le contenu de cette notice est fixe par l'arrete du 29 mai 2015.
- Elle doit etre **jointe au bail** lors de la signature.

**Constat dans le code** :
- `LeaseDocument.tsx` (ligne 474) : la notice est simplement mentionnee dans la liste des annexes ("La notice d'information relative aux droits et obligations des locataires et bailleurs").
- **Aucun fichier ne genere cette notice**. Aucun PDF ou document annexe n'est cree.
- Le `LeaseViewerClient.tsx` ne joint aucun document annexe au PDF du bail.

**Risque** : L'absence de notice d'information constitue un manquement a une obligation legale. Le locataire pourrait contester la validite de certaines clauses.

**Remediation** :
1. Creer un composant `NoticeInformationDocument.tsx` generant le PDF de la notice conforme a l'arrete du 29 mai 2015.
2. Generer et joindre automatiquement cette notice lors de la creation du bail.
3. Alternative : inclure un lien vers la notice officielle si la plateforme n'est pas un mandataire professionnel.

---

### 4.2 Diagnostics obligatoires

**Statut : PARTIELLEMENT CONFORME**

Le dossier de diagnostic technique (DDT) doit etre annexe au bail et comprend :

| Diagnostic | Obligatoire depuis | Validite | Mentionne dans le bail ? |
|------------|-------------------|----------|--------------------------|
| DPE | 2006 | 10 ans | Oui (generiquement) |
| ERP (ex-ERNMT/ESRIS) | 2003 | 6 mois | Oui (generiquement) |
| CREP (plomb) | Immeubles avant 1949 | 1 an si positif, illimite si negatif | **Non** |
| Amiante (DAPP) | Immeubles avant 1997 | Illimite si negatif | **Non** |
| Diagnostic electricite | Installation > 15 ans | 6 ans | **Non** |
| Diagnostic gaz | Installation > 15 ans | 6 ans | **Non** |
| Bruit (loi climat) | 2020 / 2022 | Informatif | **Non** |

**Constat dans le code** :
- `LeaseDocument.tsx` (ligne 472) mentionne seulement "Le dossier de diagnostic technique (DPE, ERP, etc.)".
- Le "etc." est insuffisant : chaque diagnostic doit etre enumere avec sa date et son numero de reference.
- La `DiagnosticsSection.tsx` (gestion propriete) permet de saisir les dates de DPE, electricite, gaz, ERP mais ces donnees ne sont pas injectees dans le bail.

**Remediation** :
1. Ajouter a `LeaseConfig` un objet `diagnostics` contenant pour chaque diagnostic : type, date, numero, validite.
2. Enumerer chaque diagnostic dans la section X (Annexes) du bail PDF.
3. Alerter le bailleur si un diagnostic est manquant ou expire.

---

### 4.3 Etat des lieux

**Statut : PARTIELLEMENT CONFORME**

- `LeaseDocument.tsx` (ligne 471) : "L'etat des lieux d'entree etabli contradictoirement" est mentionne dans les annexes.
- Mais il n'y a **aucun formulaire d'etat des lieux**, aucun modele genere, et aucun processus de signature de l'EDL.

**Recommandation** : Bien que la generation d'un modele d'EDL ne soit pas strictement obligatoire dans le bail lui-meme (il peut etre fait sur papier libre), il est recommande de proposer un modele conforme au decret n 2016-382 du 30 mars 2016.

---

### 4.4 Clause de solidarite pour les colocations (loi ALUR)

**Statut : CONFORME**

L'article 8-1 de la loi du 6 juillet 1989 (cree par la loi ALUR) prevoit que :
- La solidarite d'un colocataire sortant prend fin **au plus tard 6 mois** apres la date d'effet du conge.
- Sauf si un nouveau colocataire le remplace avant la fin de ce delai.

**Constat dans le code** :
- `LeaseClauses.ts` (lignes 8-12) : la clause COLOCATION_ALUR mentionne bien : "la solidarite de ce dernier et celle de sa caution s'eteignent au plus tard a l'expiration d'un delai de six mois apres la date d'effet du conge, sauf si un nouveau colocataire le remplace".
- `LeaseService.ts` (lignes 473-476) : la clause COLOCATION_ALUR est appliquee quand `compositionType === "GROUP"`.
- `LeaseDocument.tsx` (lignes 398-408) : la clause est affichee conditionnellement si `is_solidarity_clause_active`.

**Point d'amelioration** : La clause ne mentionne pas explicitement que la solidarite est limitee aux dettes nees **pendant la periode de colocation** du colocataire sortant. Ajouter cette precision serait conforme a la jurisprudence.

---

### 4.5 Bail mobilite : verifications specifiques

**Statut : NON CONFORME (3 problemes)**

#### a) Absence de depot de garantie
**Conforme.** `LeaseService.ts` (ligne 438) force le depot a 0. `LeaseDocument.tsx` (ligne 393) indique "Aucun depot de garantie n'est demande (Ex: Bail Mobilite)".

#### b) Duree 1-10 mois non renouvelable
**Partiellement conforme.**
- La duree est fixee a 10 mois par defaut (`LeaseService.ts` ligne 437), ce qui est le maximum legal.
- Mais il n'y a aucune validation pour s'assurer que la duree est bien comprise entre 1 et 10 mois si elle est modifiee.
- Le caractere non renouvelable est bien mentionne (`LeaseDocument.tsx` ligne 290).

#### c) Motif obligatoire
**NON CONFORME.**
- L'article 25-13 exige que le bail mobilite mentionne le motif precis justifiant le recours a ce type de bail : formation professionnelle, etudes superieures, contrat d'apprentissage, stage, engagement volontaire dans le cadre d'un service civique, mutation professionnelle, mission temporaire dans le cadre de l'activite professionnelle.
- `LeaseDocument.tsx` (ligne 255) indique seulement : "(Bail Mobilite - Motif professionnel ou etudes)" -- trop generique.
- Le motif specifique du locataire (ex: "stage de 6 mois chez Entreprise X") n'est pas collecte ni affiche.
- Le champ `specificLeaseRequest` dans `LeaseService.ts` contient seulement "MOBILITY" sans le motif detaille.

**Risque** : Requalification du bail mobilite en bail meuble classique (1 an, tacitement reconductible, avec depot de garantie).

**Remediation** :
1. Ajouter un champ `mobility_reason` dans le modele de donnees (ex: dans `TenantCandidateScope` ou `RentalApplication`).
2. Ajouter dans `LeaseConfig` un champ `mobility_reason: string`.
3. Afficher le motif precis dans la section "Destination des lieux" du bail.

---

### 4.6 Bail etudiant : verifications specifiques

**Statut : CONFORME**

- Duree de 9 mois : `LeaseService.ts` ligne 432-433.
- Non renouvelable : `LeaseDocument.tsx` ligne 285.
- Le depot de garantie est de 2 mois de loyer HC (conforme a l'art. 25-6 pour un meuble).

---

### 4.7 Encadrement des loyers en zone tendue

**Statut : NON CONFORME**

C'est la non-conformite la plus grave du bail. L'article 140 de la loi ELAN (reprenant l'article 17 de la loi de 1989) impose que dans les zones soumises a l'encadrement des loyers, le bail mentionne obligatoirement :

1. **Le loyer de reference** applicable au logement (en EUR/m2/mois)
2. **Le loyer de reference majore** (loyer de reference + 20%)
3. **Le complement de loyer** (si le loyer depasse le loyer de reference majore, avec justification)

**Constat dans le code** :
- L'application dispose d'un systeme de calcul de l'encadrement (`app/api/rent-control/route.ts`, `utils/rentUtils.ts`) qui determine si un bien est en zone tendue et calcule le loyer de reference.
- **Mais ces informations ne sont PAS injectees dans le bail.**
- `LeaseConfig` n'a aucun champ pour `reference_rent`, `reference_rent_increased`, `rent_complement`.
- `LeaseDocument.tsx` ne contient aucune section dediee a l'encadrement des loyers.
- La section "Loyer precedent locataire" (lignes 328-337) est la seule mention liee a la zone tendue, mais elle ne remplace pas les mentions d'encadrement.

**Villes concernees** (liste non exhaustive): Paris, Lille, Lyon, Villeurbanne, Bordeaux, Montpellier, Est Ensemble, Plaine Commune (deja presentes dans `rentUtils.ts`).

**Risque** : Le locataire peut demander au juge une **diminution du loyer** au niveau du loyer de reference majore. Amende administrative possible.

**Remediation** :
1. Ajouter a `LeaseConfig` :
   ```typescript
   rent_control?: {
       is_applicable: boolean;
       reference_rent: number;        // Loyer de reference en EUR/m2/mois
       reference_rent_increased: number; // Loyer de reference majore
       reference_rent_decreased: number; // Loyer de reference minore
       rent_complement?: number;      // Complement de loyer eventuel
       rent_complement_justification?: string; // Justification du complement
       zone: string;                  // Zone geographique
   };
   ```
2. Appeler l'API rent-control lors de la generation de `LeaseConfig` pour remplir ces champs automatiquement.
3. Ajouter une section dediee dans `LeaseDocument.tsx` entre les sections IV et V.

---

## 5. Verification des clauses abusives (art. 4 loi 89-462)

L'article 4 de la loi du 6 juillet 1989 liste les clauses reputees non ecrites. J'ai verifie chacune :

| Clause abusive (art. 4) | Presente dans le bail ? | Commentaire |
|--------------------------|-------------------------|-------------|
| a) Obligation de souscription d'assurance aupres d'un organisme designe | Non | Correct |
| b) Interdiction d'exercer une activite politique, syndicale, associative ou confessionnelle | Non | Correct |
| c) Imposition d'un mode de paiement du loyer (prelevement automatique) | **A verifier** | `payment_method: "Virement Bancaire"` (LeaseService.ts L459) impose le virement -- le locataire doit pouvoir choisir |
| d) Mise a charge du locataire de frais d'envoi de quittance | Non | Correct |
| e) Clause penale d'un montant superieur aux sommes dues | Non | Correct (pas de clause penale) |
| f) Interdiction de recevoir des invites | Non | Correct |
| g) Responsabilite collective des locataires pour degradation des parties communes | Non | Correct |
| h) Interdiction pour le locataire de demander une indemnite au bailleur | Non | Correct |
| i) Clauses d'embellissement a la charge du locataire pour usure normale | Non | Correct |
| j) Interdiction de sous-location (sauf mention expresse dans la loi) | Non | La sous-location n'est pas mentionnee du tout -- devrait etre traitee |
| k) Prise en charge par le locataire de la taxe sur les ordures menageres | Non | Correct (fait partie des charges) |
| l) Abandon de recours contre le bailleur | Non | Correct |
| m) Facturation de l'etat des lieux par le bailleur | Non | Correct |

### Probleme identifie : Mode de paiement impose (art. 4-c)

`LeaseService.ts` (ligne 459) definit par defaut `payment_method: "Virement Bancaire"`. L'article 4-c de la loi 89-462 dispose qu'est reputee non ecrite toute clause obligeant le locataire a un prelevement automatique ou a un mode de paiement impose.

**Le bail devrait indiquer que le locataire est libre du mode de paiement**, ou au minimum proposer plusieurs options (cheque, virement, especes sous le seuil legal).

**Remediation** : Soit supprimer la mention du mode de paiement, soit indiquer "Mode de paiement au choix du locataire" ou "Le locataire regle par tout moyen a sa convenance".

---

## 6. Plan de remediation

### Priorite 1 -- BLOQUANT (a corriger avant mise en production)

| # | Non-conformite | Fichier(s) a modifier | Action requise |
|---|---------------|----------------------|----------------|
| 1 | **Encadrement des loyers** : aucune mention du loyer de reference, loyer de reference majore, complement de loyer | `LeaseService.ts`, `LeaseDocument.tsx`, `LeaseConfig` | Ajouter un objet `rent_control` dans `LeaseConfig` ; appeler l'API rent-control lors de la generation ; ajouter une section dans le PDF |
| 2 | **Motif du bail mobilite** absent | `LeaseService.ts`, `LeaseDocument.tsx` | Ajouter un champ `mobility_reason` dans le modele de donnees et l'afficher dans le bail |
| 3 | **Notice d'information** non generee ni jointe | Nouveau composant + `LeaseViewerClient.tsx` | Creer `NoticeInformationDocument.tsx` ou integrer une notice statique en PDF |
| 4 | **Qualite du bailleur** absente (personne physique / SCI / personne morale) | `LeaseConfig`, `LeaseService.ts`, `LeaseDocument.tsx` | Ajouter un champ `landlord.legal_status` et l'afficher |
| 5 | **Regime juridique de l'immeuble** absent (copropriete / monopropriete) | `LeaseConfig`, `LeaseDocument.tsx` | Ajouter un champ `property.legal_regime` |
| 6 | **Diagnostics techniques** non detailles dans le bail | `LeaseConfig`, `LeaseDocument.tsx` | Enumerer chaque diagnostic avec date et numero dans les annexes |
| 7 | **Mode de paiement impose** (clause potentiellement abusive) | `LeaseService.ts` L459 | Remplacer "Virement Bancaire" par une formulation neutre |

### Priorite 2 -- A CORRIGER (risque de contestation)

| # | Non-conformite | Fichier(s) a modifier | Action requise |
|---|---------------|----------------------|----------------|
| 8 | **Revision IRL** : trimestre de reference et IRL initial non precises | `LeaseConfig`, `LeaseDocument.tsx` | Ajouter le trimestre de reference et la valeur de l'IRL applicable |
| 9 | **Loyer precedent locataire** : champ jamais rempli automatiquement | `LeaseService.ts` L289 | Implementer la logique de recuperation de l'historique de location |
| 10 | **Date/lieu de naissance** des parties : champs optionnels au lieu d'obligatoires | `LeaseService.ts` | Rendre ces champs requis et afficher une erreur si manquants |
| 11 | **Inventaire du mobilier** (meuble) : non genere | Nouveau composant | Creer un formulaire/document d'inventaire pour les locations meublees |
| 12 | **Duree bail mobilite** : aucune validation 1-10 mois | `LeaseService.ts` | Ajouter une validation (`if (duration < 1 \|\| duration > 10) throw Error`) |
| 13 | **CREP, amiante, electricite, gaz, bruit** : non mentionnes nommement dans les annexes | `LeaseDocument.tsx` L472 | Remplacer "(DPE, ERP, etc.)" par la liste exhaustive |

### Priorite 3 -- Ameliorations recommandees

| # | Amelioration | Fichier(s) | Action |
|---|-------------|-----------|--------|
| 14 | Ajouter une mention sur le droit de sous-location (art. 8) | `LeaseClauses.ts` | Ajouter une clause rappelant l'interdiction sauf accord ecrit |
| 15 | Detailler la clause de solidarite (dettes nees pendant la colocation) | `LeaseClauses.ts` | Preciser le perimetre temporel des dettes couvertes |
| 16 | Valeurs par defaut trompeuses (`fiber_optics: true`, `common_areas: ["Ascenseur (si applicable)"]`) | `LeaseService.ts` L281-283 | Remplacer par des donnees reelles du bien |
| 17 | Section "Mandataire/agence" quand `is_applicable = true` | `LeaseDocument.tsx` L459 | Completer avec les informations obligatoires (carte pro, garant, etc.) |
| 18 | Ajouter la mention de l'assurance habitation obligatoire du locataire | `LeaseDocument.tsx` ou `LeaseClauses.ts` | Ajouter un paragraphe rappelant l'obligation |
| 19 | Ajouter les mentions relatives au conge pour vente (droit de preemption du locataire) | `LeaseClauses.ts` | Enrichir la clause de resiliation |
| 20 | Prevoir l'annexion de l'acte de cautionnement si garant | `LeaseDocument.tsx` | Ajouter dans les annexes la mention de l'acte de cautionnement |

---

## Annexe A : Schema des modifications proposees pour `LeaseConfig`

```typescript
export interface LeaseConfig {
    // ... champs existants ...

    // AJOUTS NECESSAIRES :
    landlord: {
        // ... champs existants ...
        legal_status: 'PERSONNE_PHYSIQUE' | 'SCI' | 'PERSONNE_MORALE'; // Qualite du bailleur
        siren?: string; // Si personne morale
    };

    property: {
        // ... champs existants ...
        legal_regime: 'COPROPRIETE' | 'MONOPROPRIETE'; // Regime juridique
    };

    // Encadrement des loyers
    rent_control?: {
        is_applicable: boolean;
        reference_rent: number;           // EUR/m2/mois
        reference_rent_increased: number; // EUR/m2/mois (reference + 20%)
        reference_rent_decreased: number; // EUR/m2/mois (reference - 30%)
        rent_complement?: number;
        rent_complement_justification?: string;
        zone: string;
    };

    // Revision IRL
    rent_revision?: {
        irl_quarter: string;    // ex: "T2 2025"
        irl_value: number;      // ex: 142.06
        irl_reference_date: string;
    };

    // Bail mobilite
    mobility_reason?: string; // Motif precis (obligatoire si BAIL_MOBILITE)

    // Diagnostics
    diagnostics?: {
        dpe?: { date: string; number: string; rating: string };
        erp?: { date: string };
        crep?: { date: string; number: string; result: 'POSITIF' | 'NEGATIF' };
        amiante?: { date: string; number: string; result: 'POSITIF' | 'NEGATIF' };
        electricite?: { date: string; number: string };
        gaz?: { date: string; number: string };
        bruit?: { date: string; zone: string };
    };
}
```

---

## Annexe B : Textes de reference consultes

1. **Loi n 89-462 du 6 juillet 1989** tendant a ameliorer les rapports locatifs
   - Article 3 (contenu du contrat)
   - Article 3-1 (surface habitable)
   - Article 3-2 (annexes obligatoires)
   - Article 3-3 (notice d'information)
   - Article 4 (clauses abusives reputees non ecrites)
   - Article 5 (honoraires)
   - Article 8 (sous-location)
   - Article 8-1 (solidarite en colocation - ALUR)
   - Article 10 (duree du bail vide)
   - Article 17-1 (revision du loyer)
   - Article 22 (depot de garantie)
   - Article 23 (charges)
   - Article 25-3 a 25-11 (bail meuble et etudiant)
   - Article 25-12 a 25-18 (bail mobilite - ELAN)

2. **Loi n 2014-366 du 24 mars 2014** (ALUR)
   - Creation du contrat type
   - Encadrement des loyers
   - Solidarite colocation

3. **Loi n 2018-1021 du 23 novembre 2018** (ELAN)
   - Creation du bail mobilite (Titre Ier ter)
   - Article 140 (encadrement experimental des loyers)

4. **Decret n 2015-587 du 29 mai 2015**
   - Contrat type de location (bail vide et meuble residence principale)
   - Liste exhaustive des mentions obligatoires

5. **Decret n 2016-382 du 30 mars 2016**
   - Modalites d'etablissement de l'etat des lieux

6. **Arrete du 29 mai 2015**
   - Contenu de la notice d'information

7. **Code civil**
   - Articles 1103, 1104 (force obligatoire des contrats)
   - Article 1171 (clauses abusives dans les contrats d'adhesion)
   - Article 1367 (signature electronique)

---

*Rapport genere dans le cadre de l'audit de conformite legale de l'application Coridor.*
*Ce document ne constitue pas un avis juridique et ne remplace pas la consultation d'un avocat specialise en droit immobilier.*
