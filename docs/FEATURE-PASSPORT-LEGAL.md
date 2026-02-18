# Analyse juridique : Passeport Locatif

> Auteur : Legal Research (Claude)
> Date : 17 fevrier 2026
> Statut : Recherche juridique / Cadrage reglementaire
> Avertissement : Ce document constitue une analyse juridique informative. Il ne se substitue pas a un avis d'avocat specialise. Une validation par un conseil juridique est recommandee avant mise en production.

---

## Table des matieres

1. [Presentation du Passeport Locatif](#1-presentation-du-passeport-locatif)
2. [RGPD et donnees locatives](#2-rgpd-et-donnees-locatives)
3. [Evaluation entre particuliers](#3-evaluation-entre-particuliers)
4. [Loi Informatique et Libertes — Scoring et fichiers](#4-loi-informatique-et-libertes--scoring-et-fichiers)
5. [Portabilite et interoperabilite](#5-portabilite-et-interoperabilite)
6. [Open banking et verification bancaire (Powens/DSP2)](#6-open-banking-et-verification-bancaire-powensdsp2)
7. [Bonnes pratiques et risques](#7-bonnes-pratiques-et-risques)
8. [Recommandations pour l'implementation](#8-recommandations-pour-limplementation)
9. [Synthese reglementaire](#9-synthese-reglementaire)

---

## 1. Presentation du Passeport Locatif

Le Passeport Locatif est un historique locatif verifiable et portable permettant au locataire de constituer et partager un dossier de confiance aupres de futurs proprietaires. Il comprend :

| Composante | Description | Source des donnees |
|------------|-------------|-------------------|
| Historique des baux | Duree, ville, type de bien | Declaratif + verification documentaire |
| Badge Payeur Exemplaire | Score Bronze/Silver/Gold de regularite de paiement | Verification bancaire via Powens (DSP2) |
| Evaluation factuelle | Questionnaire structure rempli par l'ancien proprietaire en fin de bail | Proprietaire sortant |
| Controle par le locataire | Le locataire choisit ce qu'il partage | Mecanisme de consentement granulaire |

**Principe fondamental** : le locataire reste maitre de ses donnees et decide ce qu'il rend visible.

---

## 2. RGPD et donnees locatives

### 2.1 Textes applicables

- **Reglement (UE) 2016/679 (RGPD)** — l'ensemble du reglement, en particulier :
  - Article 5 : principes relatifs au traitement (licite, finalite, minimisation, exactitude, limitation de conservation, integrite)
  - Article 6 : bases legales du traitement
  - Article 9 : interdiction de traitement des donnees sensibles
  - Article 13-14 : obligation d'information
  - Article 15-22 : droits des personnes (acces, rectification, effacement, portabilite, opposition)
  - Article 22 : decision individuelle automatisee et profilage
  - Article 25 : protection des donnees des la conception (privacy by design)
  - Article 35 : analyse d'impact relative a la protection des donnees (AIPD)
- **Loi n° 78-17 du 6 janvier 1978** (Loi Informatique et Libertes), modifiee
- **Loi n° 89-462 du 6 juillet 1989** (loi sur les rapports locatifs) — article 22-2 : liste limitative des documents exigibles du candidat locataire
- **Decret n° 2015-1437 du 5 novembre 2015** fixant la liste des pieces justificatives pouvant etre demandees au candidat a la location

### 2.2 Donnees collectables et partageables

#### Documents et informations autorisees (art. 22-2 loi du 6 juillet 1989 + decret 2015-1437)

La loi ALUR (2014) et son decret d'application fixent une **liste exhaustive et limitative** des pieces exigibles d'un candidat locataire. Le proprietaire ne peut demander QUE :

- Une piece d'identite
- Un justificatif de domicile (ou attestation d'hebergement)
- Un ou plusieurs justificatifs d'activite professionnelle
- Un ou plusieurs justificatifs de ressources
- Un avis d'imposition ou de non-imposition

**Ce qui est explicitement INTERDIT** (art. 22-2 al. 2) :
- Photo d'identite (hors piece d'identite)
- Carte vitale / numero de securite sociale
- Copie de releve de compte bancaire
- Attestation de bonne tenue de compte
- Attestation d'absence de credit en cours
- Autorisation de prelevement automatique
- Jugement de divorce
- Dossier medical
- Extrait de casier judiciaire
- Informations relatives a l'appartenance syndicale, politique, religieuse, ethnique

#### Donnees du Passeport Locatif : analyse par composante

| Donnee | Qualification | Base legale RGPD | Risque |
|--------|--------------|-----------------|--------|
| Historique des baux (duree, ville, type) | Donnee personnelle non sensible | Consentement (art. 6.1.a) ou interet legitime (art. 6.1.f) | Faible si declaratif et controle par le locataire |
| Badge Payeur Exemplaire | Resultat d'un traitement automatise / profilage | Consentement explicite (art. 6.1.a + art. 22.2.c) | Moyen — necessite une AIPD |
| Evaluation factuelle du proprietaire | Donnee personnelle relative a un tiers | Interet legitime (art. 6.1.f) avec balance des interets | Moyen — risque de subjectivite |
| Donnees bancaires (via Powens) | Donnees financieres sensibles | Consentement explicite (art. 6.1.a) | Eleve — cadre DSP2 strict |

**Point crucial** : le Passeport Locatif est un outil **volontaire** du locataire. Il ne constitue pas un document exigible au sens de l'article 22-2. Le locataire choisit de le constituer et de le partager. Cette distinction est fondamentale : on ne demande pas au candidat de fournir ces informations — il choisit de les presenter comme un signal de confiance supplementaire.

### 2.3 Bases legales du traitement

Pour le Passeport Locatif, plusieurs bases legales coexistent :

**a) Consentement (art. 6.1.a RGPD)**
- Base legale principale pour l'ensemble du dispositif
- Le consentement doit etre : libre, specifique, eclaire et univoque
- Le locataire doit pouvoir retirer son consentement a tout moment
- Le consentement ne doit pas conditionner l'utilisation du service Coridor

**b) Execution du contrat (art. 6.1.b RGPD)**
- Applicable pour les donnees strictement necessaires a la gestion du bail en cours sur Coridor
- Non applicable pour le partage avec de futurs proprietaires (finalite distincte)

**c) Interet legitime (art. 6.1.f RGPD)**
- Potentiellement applicable pour l'evaluation factuelle par le proprietaire sortant
- Necessite une balance des interets documentee (test de proportionnalite)
- L'interet du proprietaire entrant (reduire le risque locatif) vs. les droits du locataire (vie privee, non-discrimination)

**Recommandation** : privilegier le consentement comme base legale principale pour l'ensemble du Passeport, avec un consentement granulaire par composante (historique / badge / evaluation).

### 2.4 Durees de conservation

Les durees suivantes sont recommandees en accord avec les referentiels CNIL et la prescription civile :

| Donnee | Duree de conservation active | Archivage intermediaire | Fondement |
|--------|------------------------------|------------------------|-----------|
| Historique des baux | Duree de la relation contractuelle + 3 ans | Jusqu'a 5 ans apres fin du bail | Prescription civile (art. 2224 Code civil) |
| Badge Payeur Exemplaire | Valable 12 mois, renouvelable | Suppression a l'expiration ou au retrait du consentement | Principe de minimisation (art. 5.1.e RGPD) |
| Evaluation factuelle | 3 ans apres fin du bail evalue | Suppression au-dela | Proportionnalite + utilite pour le locataire |
| Donnees bancaires brutes (Powens) | Non stockees — traitement en temps reel | Aucun archivage des donnees brutes | Minimisation — seul le resultat (badge) est conserve |
| Consentements | 5 ans apres le dernier consentement | Conservation en base d'archivage | Preuve du consentement (charge de la preuve, art. 7.1 RGPD) |
| Compte utilisateur inactif | 3 ans apres derniere connexion | Anonymisation ou suppression | Recommandation CNIL (deliberation 2005-213) |

**Regle d'or** : ne jamais conserver les donnees bancaires brutes. Powens transmet les informations, Coridor calcule le score et ne conserve que le resultat (Bronze/Silver/Gold) et la date de verification, jamais les releves bancaires.

### 2.5 Droit a l'effacement vs. interet legitime

**Article 17 RGPD — Droit a l'effacement ("droit a l'oubli")**

Le locataire peut demander l'effacement de ses donnees. Cependant, des exceptions existent :

- **Le droit a l'effacement s'applique pleinement** pour :
  - Le Badge Payeur Exemplaire (base consentement — retrait = suppression)
  - L'historique des baux partage volontairement
  - Les evaluations si le consentement est retire

- **Le droit a l'effacement peut etre limite** pour :
  - Les donnees necessaires a l'execution d'un contrat en cours (bail actif)
  - Les donnees necessaires au respect d'une obligation legale (ex : quittances de loyer conservees pour obligation fiscale)
  - Les donnees necessaires a la constatation, l'exercice ou la defense de droits en justice (contentieux locatif)

**Implementation recommandee** :
1. Le locataire peut supprimer son Passeport a tout moment
2. La suppression entraine l'effacement du badge, de l'historique partage, et des evaluations
3. Les donnees liees a un bail actif ou a une obligation legale sont conservees separement
4. Delai de traitement : 1 mois maximum (art. 12.3 RGPD)

### 2.6 Consentement : quand est-il necessaire ?

| Action | Consentement requis | Type de consentement |
|--------|--------------------|--------------------|
| Creation du Passeport Locatif | Oui | Explicite, eclaire |
| Verification bancaire (Powens) | Oui | Explicite + consentement DSP2 specifique |
| Partage du Passeport avec un proprietaire | Oui | Actif (opt-in par proprietaire cible) |
| Reception d'une evaluation du proprietaire | Information prealable obligatoire | Le locataire doit etre informe mais ne peut bloquer l'evaluation factuelle (interet legitime) |
| Partage de l'evaluation | Oui | Le locataire decide de l'inclure ou non dans son Passeport |
| Transfert a DossierFacile | Oui | Consentement specifique de portabilite |

**Principe cle** : le consentement doit etre **granulaire**. Le locataire doit pouvoir consentir separement a chaque composante. Il ne doit jamais etre place dans une situation de "tout ou rien".

### 2.7 Droit d'opposition du locataire

**Article 21 RGPD — Droit d'opposition**

- Le locataire peut s'opposer au traitement fonde sur l'interet legitime (art. 6.1.f)
- Pour les traitements fondes sur le consentement : le retrait du consentement a le meme effet
- **Le locataire peut s'opposer au partage** de son Passeport a tout moment
- **Le locataire peut s'opposer a la creation meme** du Passeport et utiliser Coridor sans

**Consequence pratique** : Coridor doit fonctionner pleinement sans Passeport Locatif. Le Passeport est une fonctionnalite optionnelle qui apporte un avantage au locataire mais dont l'absence ne doit pas le penaliser dans le processus de candidature sur la plateforme.

---

## 3. Evaluation entre particuliers

### 3.1 Cadre juridique applicable

- **RGPD art. 6.1.f** : interet legitime (balance des interets)
- **Loi Informatique et Libertes art. 4** : traitement loyal et licite
- **Code civil art. 1240** : responsabilite civile delictuelle (en cas de propos diffamatoires)
- **Loi du 29 juillet 1881 sur la liberte de la presse** : diffamation et injure
- **Loi n° 2008-496 du 27 mai 2008** : prohibition des discriminations
- **CNIL, Deliberation n° 2018-303 du 6 septembre 2018** : lignes directrices sur le profilage
- **Code penal art. 225-1 et suivants** : discrimination

### 3.2 Legalite de la notation d'un locataire par un proprietaire

**Oui, un proprietaire peut evaluer factuellement un locataire, sous conditions strictes.**

La jurisprudence et la doctrine CNIL admettent les systemes d'evaluation entre particuliers (peer review) a condition de respecter les principes suivants :

#### Conditions de legalite

1. **Factuel et objectif** : l'evaluation doit porter sur des faits verifiables, pas sur des opinions subjectives
2. **Non discriminatoire** : aucune reference aux criteres proteges (art. 225-1 Code penal) : origine, sexe, situation de famille, grossesse, apparence physique, patronyme, lieu de residence, etat de sante, handicap, caracteristiques genetiques, moeurs, orientation sexuelle, identite de genre, age, opinions politiques, activites syndicales, capacite a s'exprimer dans une langue autre que le francais, appartenance ou non-appartenance a une ethnie, nation, race pretendue ou religion determinee
3. **Proportionnel** : seules les informations pertinentes pour la relation locative
4. **Transparent** : le locataire doit etre informe de l'evaluation et de son contenu

#### Le questionnaire structure : une protection juridique

Le choix d'un **questionnaire structure (pas de texte libre)** est une excellente decision juridique. Il offre :

- **Controle du contenu** : impossible de saisir des propos diffamatoires ou discriminatoires
- **Standardisation** : memes criteres pour tous les locataires = reduction du risque de discrimination
- **Factualite** : questions fermees = reponses factuelles, pas d'opinions
- **Previsibilite** : le locataire sait exactement sur quoi il sera evalue

#### Questions recommandees pour le questionnaire

Les questions suivantes sont juridiquement securisees :

| Question | Type de reponse | Fondement |
|----------|----------------|-----------|
| "Le loyer a-t-il ete paye dans les delais contractuels ?" | Oui / Non / Partiellement | Fait objectif, execution contractuelle |
| "Les charges ont-elles ete regularisees sans incident ?" | Oui / Non / Non applicable | Fait objectif |
| "L'etat des lieux de sortie est-il conforme a l'entree ?" | Conforme / Degradations mineures / Degradations significatives | Fait objectif documente (etats des lieux) |
| "Le preavis contractuel a-t-il ete respecte ?" | Oui / Non | Fait objectif |
| "La communication a-t-elle ete fluide durant le bail ?" | Oui / Non | Fait subjectif mais non discriminatoire |
| "Recommanderiez-vous ce locataire ?" | Oui / Non / Sans avis | Avis global non discriminatoire |

#### Questions INTERDITES

| Question interdite | Raison |
|-------------------|--------|
| "Le locataire avait-il des enfants ?" | Discrimination (situation de famille) |
| "Quelle etait l'origine du locataire ?" | Discrimination (origine) |
| "Le locataire recevait-il des aides ?" | Discrimination (situation economique, art. 22-1 loi 1989) |
| "Le locataire avait-il des animaux bruyants ?" | Subjectif, risque de litige |
| Tout champ de texte libre | Risque de propos diffamatoires ou discriminatoires |

### 3.3 Information et droit de contestation du locataire

#### Obligation d'information (art. 13-14 RGPD)

Le locataire DOIT etre informe :
- **Avant** : au moment de la signature du bail sur Coridor, que le proprietaire pourra remplir un questionnaire factuel a la fin du bail
- **Au moment de l'evaluation** : notification au locataire que l'evaluation a ete remplie
- **Apres** : acces integral au contenu de l'evaluation

#### Droit d'acces et de rectification (art. 15-16 RGPD)

- Le locataire a un **droit d'acces** a son evaluation (doit voir exactement ce que le proprietaire a repondu)
- Le locataire a un **droit de rectification** si les informations sont factuellement inexactes
  - Exemple : le proprietaire indique un retard de paiement, mais le locataire peut prouver (quittances) que les paiements etaient ponctuels
- En cas de contestation, Coridor doit prevoir une **procedure de mediation** :
  1. Le locataire signale l'inexactitude
  2. Le proprietaire est informe et peut modifier
  3. En cas de desaccord persistant, l'evaluation est suspendue ou marquee "contestee"
  4. Coridor peut trancher sur la base des documents factuels (quittances, etats des lieux)

#### Droit a l'effacement de l'evaluation

- Le locataire peut **exclure l'evaluation de son Passeport** (ne pas la partager)
- Le locataire peut demander la **suppression de l'evaluation** si elle est inexacte ou discriminatoire
- Le proprietaire conserve neanmoins un interet legitime a documenter la relation locative pour ses propres besoins

### 3.4 Comparaison avec les systemes existants

| Systeme | Qui evalue qui | Texte libre | Cadre legal | Analogie Passeport |
|---------|---------------|-------------|-------------|-------------------|
| **Google Avis** | Client → Entreprise | Oui | CGU + droit de reponse + RGPD | Non comparable (B2C) |
| **Airbnb** | Hote ↔ Voyageur | Oui (encadre) | CGU + moderation + RGPD | Proche mais avec texte libre |
| **Uber** | Passager ↔ Chauffeur | Non (note 1-5) | CGU + moderation algorithmique | Proche (notation sans texte) |
| **DossierFacile** | Auto-declaration + verification Etat | Non | Service public (DINUM) | Complementaire |
| **Passeport Locatif Coridor** | Proprietaire → Locataire | Non (questionnaire) | RGPD + loi 1989 + controle locataire | -- |

**Avantage du modele Coridor** : en eliminant le texte libre et en donnant le controle au locataire, le Passeport Locatif est juridiquement plus solide que les systemes d'avis classiques.

**Reference jurisprudentielle** : la Cour de cassation (Civ. 1re, 19 juin 2013, n° 12-17.591) a admis la legalite des systemes de notation en ligne a condition qu'ils respectent le droit de reponse et ne contiennent pas de propos diffamatoires. Le questionnaire structure de Coridor depasse cette exigence en eliminant tout risque de texte problematique.

---

## 4. Loi Informatique et Libertes — Scoring et fichiers

### 4.1 Le cadre reglementaire du scoring de personnes physiques

#### Textes applicables

- **Loi n° 78-17 du 6 janvier 1978 (Loi Informatique et Libertes)**, notamment :
  - Article 31 (ancien) / art. 46 (nouveau) : encadrement des traitements automatises
  - Article 10 (ancien) : "Aucune decision [...] ne peut etre prise sur le seul fondement d'un traitement automatise"
- **RGPD art. 22** : decision individuelle automatisee, y compris le profilage
- **Code monetaire et financier, art. L. 311-1 et suivants** : credit scoring (pour comparaison)
- **Code de la consommation, art. L. 312-1** : evaluation de la solvabilite pour le credit
- **CNIL, Deliberation n° 2018-303** : lignes directrices sur le profilage et la decision automatisee

#### La distinction fondamentale : scoring de credit vs. historique de paiement

| Critere | Score de solvabilite / credit scoring | Badge Payeur Exemplaire Coridor |
|---------|---------------------------------------|--------------------------------|
| **Objet** | Predire la capacite future de remboursement | Constater la regularite passee de paiement |
| **Nature** | Predictif (probabiliste) | Descriptif (factuel) |
| **Donnees** | Historique de credits, endettement, incidents | Paiement du loyer (ponctuel/en retard) |
| **Finalite** | Accorder ou refuser un credit | Informer un futur proprietaire (decision humaine) |
| **Reglementation** | Encadre strictement (agrements, Banque de France, FICP/FCC) | RGPD general + loi I&L |
| **Agrement requis** | Oui (etablissement de credit ou organisme agree) | Non, car ce n'est pas du credit scoring |
| **Decision automatisee** | Souvent (acceptation/refus automatique) | Non (le proprietaire decide humainement) |

**Conclusion** : le Badge Payeur Exemplaire **n'est pas un score de solvabilite** au sens du Code monetaire et financier. Il ne predit pas une capacite de remboursement ; il constate factuellement que le locataire a paye son loyer regulierement. Cette distinction est juridiquement significative.

### 4.2 Le Badge Payeur Exemplaire est-il legal ?

**Oui, sous conditions.** Voici l'analyse detaillee :

#### Arguments en faveur de la legalite

1. **Ce n'est pas du credit scoring** : pas de prediction, pas d'evaluation de solvabilite, pas d'acces au fichier des incidents de paiement (FICP/FCC)
2. **Base consentement** : le locataire initie volontairement la verification et choisit de partager le resultat
3. **Pas de decision automatisee** : le badge ne genere pas de decision automatique d'acceptation/refus ; le proprietaire prend la decision humainement
4. **Donnees minimisees** : seul le resultat (Bronze/Silver/Gold) est conserve, pas les donnees bancaires brutes
5. **Portabilite** : le locataire controle son badge et peut le retirer

#### Conditions a respecter impérativement

1. **Consentement explicite et specifique** pour la verification bancaire
2. **Information complete** sur le fonctionnement du badge (criteres, seuils, duree)
3. **Pas de conservation des donnees bancaires brutes** (principe de minimisation)
4. **Le badge ne doit pas etre la seule base de decision** : le proprietaire ne peut refuser un locataire sur le seul fondement de l'absence de badge
5. **AIPD obligatoire** (Analyse d'Impact relative a la Protection des Donnees, art. 35 RGPD) car le traitement implique :
   - Du profilage (meme si descriptif)
   - Des donnees financieres
   - Une evaluation systematique
6. **Pas de categorisation negative** : le badge est positif (Bronze/Silver/Gold) — il n'existe pas de badge "mauvais payeur"

#### Le systeme de niveaux (Bronze/Silver/Gold)

| Niveau | Signification recommandee | Risque juridique |
|--------|--------------------------|-----------------|
| **Bronze** | Paiements reguliers verifies sur 6 mois | Faible |
| **Silver** | Paiements reguliers verifies sur 12 mois | Faible |
| **Gold** | Paiements reguliers verifies sur 24+ mois | Faible |
| ~~Rouge / Alerte~~ | ~~Retards de paiement constates~~ | **INTERDIT** — categorie negative = fichier d'incidents |

**Regle absolue** : le badge est un systeme de **valorisation positive uniquement**. Aucun badge negatif, aucun signal de "mauvais payeur". L'absence de badge est neutre (le locataire n'a simplement pas active la fonctionnalite).

### 4.3 Risque de requalification en fichier d'incidents de paiement

Le risque principal est la **requalification du Badge en fichier assimilable au FICP** (Fichier des Incidents de remboursement des Credits aux Particuliers) ou au FCC (Fichier Central des Cheques).

**Pour eviter cette requalification** :
- Ne JAMAIS creer de categorie negative
- Ne JAMAIS repertorier ou stocker les retards de paiement
- Ne JAMAIS partager l'information "locataire sans badge" comme un signal negatif
- Ne JAMAIS centraliser les donnees de paiement de maniere a constituer un "fichier de mauvais payeurs"
- Le badge est TOUJOURS optionnel et initie par le locataire

**Reference CNIL** : la CNIL a sanctionne des pratiques de fichiers de locataires "indesirables" (fichier "Locataires Mauvais Payeurs" = illegal). Le Passeport Locatif de Coridor est l'inverse exact : il valorise les bons payeurs, il ne fiche pas les mauvais.

### 4.4 AIPD (Analyse d'Impact)

**L'AIPD est obligatoire** pour le Passeport Locatif (art. 35 RGPD) car le traitement :
- Porte sur des donnees financieres (via Powens)
- Implique une forme de profilage (badge)
- Concerne des personnes potentiellement vulnerables (locataires)
- Est susceptible d'engendrer une discrimination (meme involontaire)

L'AIPD doit couvrir :
1. Description systematique du traitement et de ses finalites
2. Evaluation de la necessite et de la proportionnalite
3. Evaluation des risques pour les droits et libertes des locataires
4. Mesures envisagees pour faire face aux risques
5. **Consultation prealable de la CNIL** si des risques residuels eleves persistent (art. 36 RGPD)

---

## 5. Portabilite et interoperabilite

### 5.1 Droit a la portabilite (art. 20 RGPD)

Le locataire beneficie du **droit a la portabilite** de ses donnees. Ce droit lui permet :

- De **recevoir** les donnees qu'il a fournies dans un format structure, couramment utilise et lisible par machine (JSON, CSV, XML)
- De **transmettre** ces donnees a un autre responsable de traitement sans que Coridor ne puisse s'y opposer
- De demander la **transmission directe** d'un responsable de traitement a un autre, lorsque c'est techniquement possible

#### Conditions d'application

Le droit a la portabilite s'applique :
- Aux donnees fournies par le locataire (historique declaratif, informations personnelles)
- Aux donnees generees par l'activite du locataire (historique des paiements sur Coridor)
- Aux donnees traitees sur la base du consentement (art. 6.1.a) ou du contrat (art. 6.1.b)

Le droit a la portabilite **ne s'applique pas** :
- Aux donnees inferees ou derivees (le badge Bronze/Silver/Gold en tant que tel est un resultat derive)
- Aux evaluations redigees par le proprietaire (donnees fournies par un tiers)
- Aux donnees traitees sur la base de l'interet legitime

**Nuance importante** : si le badge est considere comme un resultat derive, le locataire n'a pas un droit a la portabilite du badge lui-meme. En revanche, les donnees sous-jacentes (dates et montants des paiements verifies) sont portables.

### 5.2 Export du Passeport

#### Ce que le locataire peut exporter

| Donnee | Portable (art. 20) | Format recommande |
|--------|--------------------|--------------------|
| Informations personnelles | Oui | JSON |
| Historique des baux | Oui | JSON / PDF |
| Dates et montants de paiements verifies | Oui | JSON / CSV |
| Badge Payeur Exemplaire (Bronze/Silver/Gold) | Discutable (donnee derivee) | PDF attestation |
| Evaluations des proprietaires | Non strictement (donnee tierce) | PDF si inclus dans le Passeport |

**Recommandation** : proposer un export complet au format JSON (machine-readable) + un export PDF "lisible" (format passeport), meme si certains elements ne sont pas strictement couverts par l'art. 20. Aller au-dela de l'obligation legale renforce la confiance utilisateur.

### 5.3 Quid si le locataire quitte Coridor ?

**Obligations de Coridor** :
1. **Avant la suppression du compte** : proposer un export des donnees (art. 20 RGPD)
2. **Notifier** le locataire que la suppression du compte entrainera la perte de l'acces au Passeport
3. **Supprimer les donnees** dans le delai legal (1 mois, art. 17 + art. 12.3 RGPD), sauf obligations legales de conservation
4. **Conserver** les donnees necessaires aux obligations legales (fiscales, contractuelles) en base d'archivage separee

**Ce qui disparait** :
- Le badge (lie au service Coridor)
- L'acces en ligne au Passeport
- Les liens de partage actifs

**Ce qui est conserve** (archivage legal) :
- Les contrats de bail (obligation fiscale et contractuelle)
- Les quittances (obligation legale)
- Les consentements (preuve)

### 5.4 Interoperabilite avec DossierFacile

**DossierFacile** est un service public gratuit (DINUM / Ministere de la Transition ecologique et de la Cohesion des territoires) permettant de constituer un dossier de location verifie.

#### Cadre juridique de l'interoperabilite

- DossierFacile fournit une **API publique** et un mecanisme OAuth 2.0
- L'integration est explicitement encouragee par la DINUM (politique d'ouverture des donnees publiques)
- Le locataire donne son consentement via le flux OAuth pour partager son dossier DossierFacile avec Coridor
- **Article L. 311-3-1 du CRPA (Code des relations entre le public et l'administration)** : droit a la reutilisation des informations publiques

#### Architecture recommandee

```
[Locataire] → Consentement OAuth → [DossierFacile] → Donnees verifiees → [Coridor]
                                                                              ↓
[Locataire] → Consentement Passeport → [Coridor] → Passeport complet → [Proprietaire]
```

- Le Passeport Locatif **complete** DossierFacile, il ne le remplace pas
- DossierFacile couvre les pieces justificatives reglementaires
- Le Passeport ajoute l'historique locatif, le badge de paiement et les evaluations
- Les deux systemes sont complementaires et non concurrents

#### Points de vigilance

1. **Double consentement** : le locataire doit consentir a la fois au partage DossierFacile → Coridor et au partage Coridor → Proprietaire
2. **Coherence des donnees** : les donnees DossierFacile importees doivent rester a jour (mecanisme de rafraichissement)
3. **Mention de source** : indiquer clairement quelles informations proviennent de DossierFacile vs. de Coridor
4. **Respect des CGU DossierFacile** : ne pas detourner les donnees de leur finalite initiale

---

## 6. Open banking et verification bancaire (Powens/DSP2)

### 6.1 Cadre reglementaire

- **Directive (UE) 2015/2366 (DSP2 — Directive sur les Services de Paiement 2)**, transposee en droit francais par :
  - **Ordonnance n° 2017-1252 du 9 aout 2017**
  - **Code monetaire et financier, art. L. 522-1 et suivants** (prestataires de services de paiement)
- **Reglement delegue (UE) 2018/389** : normes techniques de reglementation (SCA, communication securisee)
- **ACPR (Autorite de Controle Prudentiel et de Resolution)** : supervision des prestataires agrees

### 6.2 Statut de Powens

Powens (anciennement Budget Insight) est un **Prestataire de Services d'Information sur les Comptes (PSIC / AISP)** agree par l'ACPR. A ce titre :

- Powens est **autorise** a acceder aux comptes bancaires des utilisateurs avec leur consentement
- Powens est soumis aux exigences de la DSP2 :
  - Authentification forte du client (SCA)
  - Communication securisee avec les banques (API dediees)
  - Protection des donnees de paiement
  - Interdiction de stocker les identifiants bancaires du client

### 6.3 Utilisation pour le Badge Payeur Exemplaire

#### Flux technique et juridique

```
1. [Locataire] → Consentement explicite (Coridor)
2. [Locataire] → Authentification forte (banque via Powens)
3. [Powens] → Acces lecture seule aux transactions → [Coridor]
4. [Coridor] → Analyse des paiements de loyer (algorithme)
5. [Coridor] → Generation du badge (Bronze/Silver/Gold)
6. [Coridor] → Suppression des donnees bancaires brutes
7. [Locataire] → Choix de partager ou non le badge
```

#### Donnees accessibles via Powens

| Donnee | Accessible (DSP2) | Utilisation Coridor | Conservation |
|--------|-------------------|--------------------|--------------|
| Historique des transactions | Oui (lecture seule) | Detection des paiements de loyer | Non conserve (traitement en temps reel) |
| Solde des comptes | Oui (lecture seule) | Non utilise | Non consulte |
| Identite du titulaire | Oui | Verification d'identite | Non conserve separement |
| Identifiants bancaires | Interdit (jamais transmis a Coridor) | Non applicable | Non applicable |

#### Obligations legales de Coridor en tant qu'utilisateur de Powens

1. **Consentement explicite et specifique** du locataire pour l'acces a ses comptes
2. **Finalite limitee** : seule l'analyse des paiements de loyer est autorisee (pas d'analyse de solvabilite globale, pas de consultation du solde pour evaluer la richesse)
3. **Minimisation** : ne consulter que les transactions correspondant a des paiements de loyer (identification par montant, beneficiaire, periodicite)
4. **Non-conservation** : les donnees bancaires brutes ne doivent pas etre stockees par Coridor
5. **Securite** : chiffrement des communications, acces restreint aux donnees
6. **Renouvellement du consentement** : la DSP2 impose un renouvellement du consentement tous les **90 jours** pour l'acces aux comptes

### 6.4 Risques specifiques a l'open banking

| Risque | Description | Mitigation |
|--------|-------------|------------|
| Analyse excessive | Consulter plus que les paiements de loyer | Filtrage strict des transactions par montant/beneficiaire |
| Conservation illicite | Stocker les releves bancaires | Architecture "zero stockage" des donnees brutes |
| Detournement de finalite | Utiliser les donnees pour evaluer la solvabilite globale | Limiter strictement l'algorithme a la regularite de paiement du loyer |
| Expiration du consentement | Acces expire apres 90 jours (DSP2) | Mecanisme de renouvellement avec notification |
| Faille de securite | Breach des donnees bancaires | Puisque les donnees ne sont pas stockees, le risque est limite au temps de traitement |

---

## 7. Bonnes pratiques et risques

### 7.1 Ce qui est OK

| Pratique | Fondement legal |
|----------|----------------|
| Stocker l'historique des baux avec consentement du locataire | RGPD art. 6.1.a (consentement) |
| Proposer un badge positif (Bronze/Silver/Gold) base sur les paiements verifies | RGPD art. 6.1.a + loi I&L (pas de fichier negatif) |
| Questionnaire structure d'evaluation (pas de texte libre) | RGPD art. 6.1.f (interet legitime) + principes de non-discrimination |
| Donner au locataire le controle total du partage | RGPD art. 7 (consentement) + art. 21 (droit d'opposition) |
| Proposer l'export du Passeport en JSON/PDF | RGPD art. 20 (portabilite) |
| S'integrer avec DossierFacile via OAuth | Politique d'ouverture DINUM + consentement utilisateur |
| Utiliser Powens pour la verification bancaire | DSP2 + agrement ACPR Powens |
| Informer le locataire de chaque evaluation recue | RGPD art. 13-14 (transparence) |
| Permettre la contestation d'une evaluation inexacte | RGPD art. 16 (rectification) |
| Ne conserver que le resultat du badge, pas les donnees bancaires | RGPD art. 5.1.c (minimisation) |
| Faire une AIPD avant le lancement | RGPD art. 35 |

### 7.2 Ce qui est INTERDIT

| Pratique interdite | Fondement legal | Sanction |
|-------------------|----------------|---------|
| Creer un badge "mauvais payeur" ou fichier negatif | Loi I&L + CNIL (fichiers d'incidents = monopole Banque de France) | Jusqu'a 20M EUR ou 4% CA (RGPD art. 83) |
| Conditionner l'utilisation de Coridor a l'activation du Passeport | RGPD art. 7.4 (consentement libre) | Nullite du consentement |
| Stocker les releves bancaires du locataire | RGPD art. 5.1.c (minimisation) + DSP2 | Sanction CNIL + ACPR |
| Permettre un champ de texte libre dans l'evaluation | Risque diffamation (loi 1881) + discrimination (Code penal art. 225-1) | Responsabilite civile et penale |
| Partager le Passeport sans le consentement actif du locataire | RGPD art. 6.1.a (absence de base legale) | Sanction CNIL |
| Inclure des donnees sensibles dans l'evaluation (sante, religion, origine...) | RGPD art. 9 + Code penal art. 225-1 | Sanction penale |
| Refuser un locataire uniquement parce qu'il n'a pas de badge | Discrimination (art. 225-1 Code penal) — critere economique | Sanction penale |
| Utiliser les donnees Powens pour autre chose que la verification de paiement du loyer | DSP2 (detournement de finalite) + RGPD art. 5.1.b | Sanction ACPR + CNIL |
| Conserver les donnees au-dela des durees definies | RGPD art. 5.1.e (limitation de conservation) | Sanction CNIL |
| Ne pas permettre l'effacement du Passeport | RGPD art. 17 (droit a l'effacement) | Sanction CNIL |

### 7.3 Risques juridiques principaux

#### Risque 1 : Requalification en fichier de "mauvais payeurs"

- **Probabilite** : Faible si le systeme est bien concu (positif uniquement)
- **Impact** : Tres eleve (sanctions CNIL, interdiction du service)
- **Mitigation** : Systeme positif uniquement, pas de categorie negative, AIPD prealable

#### Risque 2 : Discrimination indirecte

- **Probabilite** : Moyenne (les locataires sans badge pourraient etre desavantages en pratique)
- **Impact** : Eleve (contentieux, atteinte a l'image)
- **Mitigation** : Communication claire que l'absence de badge est neutre, interdiction pour les proprietaires sur Coridor de filtrer par "badge present", pas de mise en avant algorithmique privilegiant les candidats avec badge

#### Risque 3 : Evaluation diffamatoire ou discriminatoire

- **Probabilite** : Faible (questionnaire structure = controle fort)
- **Impact** : Moyen (contentieux individuel)
- **Mitigation** : Pas de texte libre, questions validees juridiquement, procedure de contestation

#### Risque 4 : Faille dans l'integration Powens

- **Probabilite** : Faible (Powens est agree ACPR)
- **Impact** : Eleve (donnees bancaires)
- **Mitigation** : Zero stockage des donnees brutes, chiffrement, audits de securite

#### Risque 5 : Non-conformite RGPD (manque de consentement, information insuffisante)

- **Probabilite** : Moyenne (risque operationnel classique)
- **Impact** : Eleve (amende CNIL)
- **Mitigation** : Consentement granulaire, mentions d'information completes, DPO designe, AIPD

#### Risque 6 : Conflit avec la liste limitative de l'art. 22-2 loi 1989

- **Probabilite** : Faible (le Passeport est volontaire, pas exige)
- **Impact** : Moyen (insecurite juridique)
- **Mitigation** : Communiquer clairement que le Passeport est une initiative du locataire, jamais une exigence du proprietaire. Un proprietaire ne peut JAMAIS demander le Passeport.

---

## 8. Recommandations pour l'implementation

### 8.1 Avant le lancement

| Action | Priorite | Responsable |
|--------|----------|-------------|
| Realiser une AIPD complete | Critique | DPO / Conseil juridique |
| Rediger la politique de confidentialite specifique au Passeport | Critique | Juridique |
| Concevoir les ecrans de consentement granulaire | Critique | Produit + Juridique |
| Valider le questionnaire d'evaluation avec un avocat | Haute | Juridique |
| Designer les mentions d'information (art. 13-14 RGPD) | Haute | Juridique + UX |
| Mettre en place l'architecture "zero stockage" pour les donnees bancaires | Critique | Engineering |
| Implementer les mecanismes d'export (JSON + PDF) | Haute | Engineering |
| Implementer le mecanisme de suppression/effacement | Haute | Engineering |
| Implementer la procedure de contestation d'evaluation | Haute | Produit + Engineering |
| Documenter les durees de conservation et les purges automatiques | Haute | Engineering + DPO |
| Verifier le contrat avec Powens (clauses RGPD, sous-traitance) | Critique | Juridique |

### 8.2 Consentement UX — Flux recommande

```
Etape 1 : Decouverte
  "Constituez votre Passeport Locatif pour valoriser votre profil"
  [En savoir plus] [Commencer]

Etape 2 : Information complete
  - Quelles donnees sont collectees
  - A quoi elles servent
  - Combien de temps elles sont conservees
  - Comment les supprimer
  [J'ai compris]

Etape 3 : Consentement granulaire
  [ ] Historique des baux
  [ ] Badge Payeur Exemplaire (necessite verification bancaire)
  [ ] Evaluations de mes anciens proprietaires
  [Chaque case decochable independamment]

Etape 4 : Verification bancaire (si badge selectionne)
  Redirection Powens → Authentification forte → Retour Coridor
  "Nous ne conservons jamais vos donnees bancaires"

Etape 5 : Passeport genere
  "Votre Passeport est pret. Vous pouvez le partager avec les proprietaires de votre choix."
  [Gerer mes partages] [Exporter mon Passeport]
```

### 8.3 Architecture technique recommandee

```
┌─────────────────────────────────────────────────┐
│                  LOCATAIRE                       │
│  - Consentement granulaire                       │
│  - Controle du partage                           │
│  - Export / Suppression                          │
└─────────────┬───────────────────────────────────┘
              │
              v
┌─────────────────────────────────────────────────┐
│              CORIDOR BACKEND                     │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ Passeport Service │  │ Consent Manager      │ │
│  │ - Historique      │  │ - Consentements      │ │
│  │ - Badge           │  │ - Dates / Revocations│ │
│  │ - Evaluations     │  │ - Preuves (audit log)│ │
│  └──────────────────┘  └──────────────────────┘ │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ Powens Adapter   │  │ Retention Engine     │ │
│  │ - Zero storage   │  │ - Purge automatique  │ │
│  │ - Badge compute  │  │ - Archivage legal    │ │
│  │ - 90-day renewal │  │ - Anonymisation      │ │
│  └──────────────────┘  └──────────────────────┘ │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ Evaluation Module│  │ Export Service        │ │
│  │ - Questionnaire  │  │ - JSON / CSV / PDF   │ │
│  │ - Contestation   │  │ - DossierFacile API  │ │
│  │ - Mediation      │  │ - Portabilite art.20 │ │
│  └──────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 8.4 Registre des traitements (art. 30 RGPD)

Le Passeport Locatif doit etre inscrit au registre des traitements avec :

| Champ | Contenu |
|-------|---------|
| Finalite | Constitution et partage d'un historique locatif verifiable |
| Base legale | Consentement (art. 6.1.a) + Interet legitime pour les evaluations (art. 6.1.f) |
| Categories de personnes | Locataires utilisateurs de Coridor |
| Categories de donnees | Identite, historique des baux, donnees de paiement (resultat uniquement), evaluations factuelles |
| Destinataires | Proprietaires choisis par le locataire, DossierFacile (si export), Powens (sous-traitant) |
| Transferts hors UE | A verifier selon l'hebergement de Powens |
| Duree de conservation | Cf. tableau section 2.4 |
| Mesures de securite | Chiffrement, controle d'acces, audit log, zero stockage donnees bancaires |

---

## 9. Synthese reglementaire

### Vue d'ensemble

| Composante | Legal ? | Conditions | Risque residuel |
|------------|---------|------------|-----------------|
| **Historique des baux** | Oui | Consentement + information + minimisation | Faible |
| **Badge Payeur Exemplaire** | Oui | Consentement explicite + zero stockage bancaire + positif uniquement + AIPD | Moyen (requalification) |
| **Evaluation factuelle** | Oui | Questionnaire structure + information locataire + contestation + pas de texte libre | Faible |
| **Controle par le locataire** | Obligatoire | Consentement granulaire + export + suppression | Faible |
| **Integration DossierFacile** | Oui | Double consentement + respect CGU DossierFacile | Faible |
| **Verification Powens** | Oui | Powens agree ACPR + consentement DSP2 + renouvellement 90j | Faible (Powens porte le risque reglementaire) |

### Textes de reference (recapitulatif)

| Texte | Articles pertinents |
|-------|-------------------|
| RGPD (Reglement UE 2016/679) | Art. 5, 6, 7, 9, 13-14, 15-17, 20-22, 25, 30, 35-36, 83 |
| Loi Informatique et Libertes (Loi 78-17) | Art. 4 (principes), art. 46 (traitements automatises) |
| Loi du 6 juillet 1989 (rapports locatifs) | Art. 22-2 (pieces exigibles) |
| Loi ALUR (2014) + Decret 2015-1437 | Liste limitative des justificatifs |
| DSP2 (Directive UE 2015/2366) | Cadre PSIC/AISP, consentement, SCA |
| Ordonnance 2017-1252 | Transposition DSP2 en droit francais |
| Code monetaire et financier | Art. L. 522-1 et s. (prestataires de paiement) |
| Code civil | Art. 1240 (responsabilite), art. 2224 (prescription) |
| Code penal | Art. 225-1 et s. (discrimination) |
| Loi 1881 (liberte de la presse) | Diffamation, injure |
| Loi 2008-496 | Prohibition des discriminations |
| Deliberation CNIL 2018-303 | Profilage et decision automatisee |

### Checklist pre-lancement

- [ ] AIPD realisee et documentee
- [ ] Politique de confidentialite mise a jour
- [ ] Consentement granulaire implemente et teste
- [ ] Mentions d'information art. 13-14 redigees
- [ ] Questionnaire d'evaluation valide juridiquement
- [ ] Architecture zero stockage bancaire validee
- [ ] Mecanisme d'export (JSON + PDF) operationnel
- [ ] Mecanisme d'effacement operationnel
- [ ] Procedure de contestation d'evaluation operationnelle
- [ ] Registre des traitements mis a jour (art. 30)
- [ ] Contrat sous-traitance Powens conforme (art. 28 RGPD)
- [ ] DPO informe / designe
- [ ] Purge automatique des donnees configuree
- [ ] Tests de non-discrimination effectues
- [ ] Revue juridique finale par un avocat specialise

---

> **Note finale** : le Passeport Locatif tel que concu par Coridor est juridiquement viable. Le design "positif uniquement" du badge, le questionnaire structure sans texte libre, et le controle total par le locataire sont des choix architecturaux qui securisent fortement le dispositif. Les principaux points de vigilance sont : (1) ne jamais deriver vers un fichier negatif, (2) realiser l'AIPD avant le lancement, (3) ne jamais stocker les donnees bancaires brutes. Avec ces precautions et une validation par un avocat specialise, le Passeport Locatif peut etre deploye en conformite avec le droit francais et europeen.
