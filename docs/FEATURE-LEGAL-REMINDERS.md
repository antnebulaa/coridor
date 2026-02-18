# Obligations legales du proprietaire bailleur en France -- Inventaire complet

> Derniere mise a jour : 16 fevrier 2026
> Version : 1.0
> Sources : Loi n89-462 du 6 juillet 1989, Loi ALUR (2014), Loi ELAN (2018), Loi Climat et Resilience (2021), Code civil, Code de la construction et de l'habitation (CCH), decrets d'application

---

## 1. Introduction

Ce document recense de maniere **exhaustive** l'ensemble des obligations legales, echeances et rappels recurrents qu'un proprietaire bailleur doit respecter en France dans le cadre de la location d'un logement (vide ou meuble).

**Objectif** : servir de base a l'implementation d'un systeme de rappels automatises dans Coridor, afin de prevenir les oublis pouvant entrainer des sanctions financieres, la nullite de clauses ou des litiges avec les locataires.

**Perimetre** : location de logement a usage d'habitation principale (loi du 6 juillet 1989). Ne couvre pas la location commerciale ou professionnelle.

---

## 2. Tableau recapitulatif

| # | Obligation | Categorie | Frequence / Echeance | Priorite | Automatisable |
|---|-----------|-----------|---------------------|----------|---------------|
| 1 | DPE (Diagnostic Performance Energetique) | Diagnostics | Tous les 10 ans / avant chaque nouvelle location | Critique | Oui |
| 2 | Interdiction location DPE G | Diagnostics | 1er janvier 2025 | Critique | Oui |
| 3 | Interdiction location DPE F | Diagnostics | 1er janvier 2028 | Critique | Oui |
| 4 | Interdiction location DPE E | Diagnostics | 1er janvier 2034 | Critique | Oui |
| 5 | Diagnostic amiante (DAPP) | Diagnostics | Illimite si negatif / 3 ans si positif | Critique | Oui |
| 6 | Diagnostic plomb (CREP) | Diagnostics | Illimite si negatif / 6 ans si positif | Critique | Oui |
| 7 | Diagnostic electricite | Diagnostics | 6 ans | Critique | Oui |
| 8 | Diagnostic gaz | Diagnostics | 6 ans | Critique | Oui |
| 9 | Etat des Risques et Pollutions (ERP) | Diagnostics | 6 mois | Critique | Oui |
| 10 | Diagnostic termites | Diagnostics | 6 mois (zones arretees) | Important | Oui |
| 11 | Diagnostic bruit | Diagnostics | Pas d'expiration / a chaque bail | Important | Oui |
| 12 | Diagnostic assainissement non collectif | Diagnostics | 3 ans | Important | Oui |
| 13 | Mesurage surface habitable (Boutin) | Diagnostics | Pas d'expiration sauf travaux | Critique | Non |
| 14 | Duree minimale du bail | Bail | A la signature | Critique | Oui |
| 15 | Conge bailleur (non-renouvellement) | Bail | 6 mois avant echeance (vide) / 3 mois (meuble) | Critique | Oui |
| 16 | Conge locataire | Bail | 3 mois (vide) / 1 mois (meuble/zone tendue) | Important | Oui |
| 17 | Renouvellement / tacite reconduction | Bail | A chaque echeance du bail | Important | Oui |
| 18 | Offre de renouvellement nouveau loyer | Bail | 6 mois avant echeance (vide) | Important | Oui |
| 19 | Revision annuelle du loyer (IRL) | Loyer | Annuel (date anniversaire bail) | Critique | Oui |
| 20 | Encadrement des loyers (zone tendue) | Loyer | A chaque signature / renouvellement | Critique | Oui |
| 21 | Gel des loyers DPE F/G | Loyer | Permanent depuis 24 aout 2022 | Critique | Oui |
| 22 | Quittance de loyer | Loyer | Mensuel (si demandee) | Important | Oui |
| 23 | Regularisation annuelle des charges | Charges | Annuel (apres cloture exercice) | Critique | Oui |
| 24 | Communication justificatifs charges | Charges | 1 mois avant regularisation | Important | Oui |
| 25 | Prescription regularisation charges | Charges | 3 ans max | Critique | Oui |
| 26 | Restitution depot de garantie | Depot garantie | 1 ou 2 mois apres sortie | Critique | Oui |
| 27 | Attestation assurance locataire | Assurances | Annuel | Important | Oui |
| 28 | Assurance PNO (copropriete) | Assurances | Annuel (renouvellement) | Important | Oui |
| 29 | Criteres de decence du logement | Decence | Permanent / a chaque location | Critique | Non |
| 30 | Seuil performance energetique (decence) | Decence | Progressif 2023-2034 | Critique | Oui |
| 31 | Etat des lieux d'entree | EDL | Jour de remise des cles | Critique | Oui |
| 32 | Etat des lieux de sortie | EDL | Jour de restitution des cles | Critique | Oui |
| 33 | Declaration revenus fonciers | Fiscalite | Annuel (mai-juin) | Critique | Oui |
| 34 | Taxe fonciere | Fiscalite | Annuel (octobre) | Critique | Oui |
| 35 | Declaration IFI | Fiscalite | Annuel (si applicable) | Important | Oui |
| 36 | Declaration debut activite LMNP | Fiscalite | 15 jours apres debut location | Critique | Oui |
| 37 | AG copropriete | Copropriete | Annuel | Important | Oui |
| 38 | Appels de fonds copropriete | Copropriete | Trimestriel | Important | Oui |
| 39 | Permis de louer | Autres | Avant mise en location (communes concernees) | Critique | Oui |
| 40 | Declaration meuble de tourisme | Autres | Avant mise en location | Critique | Oui |
| 41 | Limite 120 jours Airbnb (residence principale) | Autres | Annuel (1er janv - 31 dec) | Critique | Oui |
| 42 | Treve hivernale | Autres | 1er novembre - 31 mars | Critique | Oui |
| 43 | Notice d'information jointe au bail | Autres | A chaque signature de bail | Critique | Oui |
| 44 | DPE collectif copropriete | Copropriete | Selon taille copro (progressif 2024-2026) | Important | Oui |

---

## 3. Fiches detaillees par categorie

---

### 3.1 Diagnostics obligatoires

Le Dossier de Diagnostic Technique (DDT) doit etre annexe au bail lors de sa signature (article 3-3 de la loi du 6 juillet 1989, modifie par la loi ALUR puis ELAN).

---

#### 3.1.1 DPE -- Diagnostic de Performance Energetique

| Champ | Detail |
|-------|--------|
| **Quoi** | Evaluation de la consommation energetique du logement et des emissions de gaz a effet de serre. Classement de A (excellent) a G (passoire thermique). Depuis le 1er juillet 2021, le DPE est devenu opposable (et non plus seulement informatif). |
| **Quand** | Validite 10 ans. A realiser avant la mise en location et a renouveler si expire. **Attention** : les DPE realises entre le 1er janvier 2013 et le 31 decembre 2017 ne sont plus valides depuis le 1er janvier 2023. Ceux realises entre le 1er janvier 2018 et le 30 juin 2021 sont valides jusqu'au 31 decembre 2024. |
| **Base legale** | Articles L126-26 a L126-33 du CCH. Decret n2006-1147 du 14 septembre 2006. Loi Climat et Resilience n2021-1104 du 22 aout 2021 (art. 148 et suivants). |
| **Risque si oublie** | Annulation possible du bail ou reduction du loyer par le juge. Amende de 3 000 EUR (personne physique) ou 15 000 EUR (personne morale) pour absence de DPE dans l'annonce. Le locataire peut demander des dommages-interets. |
| **Donnees necessaires** | Date de realisation du DPE, classe energetique (A-G), date d'expiration, date de construction du logement |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel X mois avant expiration des 10 ans |

---

#### 3.1.2 Interdictions de location liees au DPE (Loi Climat et Resilience)

| Champ | Detail |
|-------|--------|
| **Quoi** | Interdiction progressive de mettre en location les logements les plus energivores (passoires thermiques). Les logements concernes ne peuvent plus faire l'objet d'un nouveau bail ni d'un renouvellement. |
| **Calendrier** | **DPE G** : interdiction depuis le **1er janvier 2025** (seuil : consommation > 450 kWh/m2/an en energie finale). **DPE F** : interdiction a partir du **1er janvier 2028**. **DPE E** : interdiction a partir du **1er janvier 2034**. |
| **Base legale** | Article 160 de la loi Climat et Resilience n2021-1104 du 22 aout 2021. Article 6 de la loi du 6 juillet 1989 (critere de decence energetique). Decret n2023-796 du 18 aout 2023. |
| **Risque si oublie** | Le logement est considere comme **indecent**. Le locataire peut saisir le juge pour obtenir : mise en conformite, reduction de loyer, dommages-interets, suspension du loyer jusqu'aux travaux. Le juge peut aussi interdire la location. |
| **Donnees necessaires** | Classe DPE actuelle, consommation en kWh/m2/an, date du DPE |
| **Priorite** | Critique |
| **Automatisable** | Oui -- alerte basee sur la classe DPE et les dates butoirs |

---

#### 3.1.3 Diagnostic amiante (DAPP -- Dossier Amiante Parties Privatives)

| Champ | Detail |
|-------|--------|
| **Quoi** | Reperage des materiaux contenant de l'amiante dans les parties privatives du logement. Obligatoire pour tout immeuble dont le permis de construire a ete delivre **avant le 1er juillet 1997**. |
| **Quand** | Si le diagnostic est **negatif** (aucune trace d'amiante) : duree de validite **illimitee**. Si **positif** : un controle periodique est necessaire dans un **delai de 3 ans** apres le diagnostic. Les diagnostics realises avant le 1er avril 2013 doivent etre renouveles. |
| **Base legale** | Articles R1334-14 a R1334-29 du Code de la sante publique. Decret n2011-629 du 3 juin 2011. Arrete du 12 decembre 2012. |
| **Risque si oublie** | Mise en danger de la sante du locataire : jusqu'a 2 ans de prison et 75 000 EUR d'amende pour mise en danger d'autrui (article 223-1 du Code penal). Responsabilite civile du bailleur pour prejudice de sante. Amende de 1 500 EUR pour non-communication du diagnostic. |
| **Donnees necessaires** | Date du permis de construire, date du dernier diagnostic amiante, resultat (positif/negatif) |
| **Priorite** | Critique |
| **Automatisable** | Oui -- si permis avant 1997 et resultat positif, rappel 3 ans apres dernier controle |

---

#### 3.1.4 Diagnostic plomb (CREP -- Constat de Risque d'Exposition au Plomb)

| Champ | Detail |
|-------|--------|
| **Quoi** | Detection de la presence de plomb (peintures, revetements) dans les logements construits **avant le 1er janvier 1949**. Obligatoire a annexer au bail. |
| **Quand** | Si le diagnostic est **negatif** (aucune concentration superieure a 1 mg/cm2) : duree de validite **illimitee**. Si **positif** : duree de validite **6 ans** pour la location. |
| **Base legale** | Articles L1334-5 et L1334-6 du Code de la sante publique. Articles R1334-10 a R1334-12 du CSP. Article 3-3 de la loi du 6 juillet 1989. |
| **Risque si oublie** | Le bailleur engage sa responsabilite pour vice cache et mise en danger. Obligation de travaux de suppression du risque. Dommages-interets au locataire. Amende de 1 500 EUR (3 000 EUR en recidive) pour non-annexion au bail. En cas de saturnisme avere : poursuites penales. |
| **Donnees necessaires** | Date de construction de l'immeuble, date du dernier CREP, resultat (positif/negatif avec concentrations) |
| **Priorite** | Critique |
| **Automatisable** | Oui -- si immeuble avant 1949 et resultat positif, rappel 6 ans apres |

---

#### 3.1.5 Diagnostic electricite

| Champ | Detail |
|-------|--------|
| **Quoi** | Evaluation de l'etat de l'installation interieure d'electricite si elle a plus de **15 ans**. Le diagnostic porte sur l'appareil general de commande, les dispositifs differentiels, la protection contre les surintensites, la liaison equipotentielle, etc. |
| **Quand** | Validite : **6 ans** pour la location. A refaire avant chaque nouveau bail si expire. |
| **Base legale** | Articles L134-7 et R134-10 du CCH. Decret n2016-1105 du 11 aout 2016. Arrete du 28 septembre 2017. Article 3-3 de la loi du 6 juillet 1989. |
| **Risque si oublie** | Le locataire peut invoquer un vice cache. En cas d'accident electrique : responsabilite penale et civile du bailleur (manquement a l'obligation de securite). Amende de 1 500 EUR pour non-annexion au bail. |
| **Donnees necessaires** | Age de l'installation electrique (ou date de derniere mise en conformite), date du diagnostic |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel 6 ans apres le dernier diagnostic |

---

#### 3.1.6 Diagnostic gaz

| Champ | Detail |
|-------|--------|
| **Quoi** | Evaluation de l'etat de l'installation interieure de gaz si elle a plus de **15 ans**. Concerne les tuyauteries, raccordements, ventilation, combustion. |
| **Quand** | Validite : **6 ans** pour la location. A refaire avant chaque nouveau bail si expire. |
| **Base legale** | Articles L134-6 et R134-6 a R134-9 du CCH. Decret n2016-1104 du 11 aout 2016. Article 3-3 de la loi du 6 juillet 1989. |
| **Risque si oublie** | Responsabilite penale et civile du bailleur en cas d'accident (intoxication au monoxyde de carbone, explosion). Amende de 1 500 EUR pour non-annexion au bail. Mise en danger de la vie d'autrui. |
| **Donnees necessaires** | Age de l'installation gaz, date du diagnostic |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel 6 ans apres le dernier diagnostic |

---

#### 3.1.7 Etat des Risques et Pollutions (ERP)

| Champ | Detail |
|-------|--------|
| **Quoi** | Information sur les risques naturels (inondation, seisme, mouvement de terrain), miniers, technologiques, radon et de pollution des sols auxquels le logement est expose. Informe egalement si le bien est situe dans le perimetre d'un plan de prevention des risques. |
| **Quand** | Validite : **6 mois** seulement. Doit etre date de moins de 6 mois au moment de la signature du bail. A refaire a chaque nouvelle location ou renouvellement si expire. |
| **Base legale** | Articles L125-5 et R125-23 a R125-27 du Code de l'environnement. Article 3-3 de la loi du 6 juillet 1989. Arrete du 13 octobre 2005 modifie. |
| **Risque si oublie** | Le locataire peut demander la **resolution du bail** ou une **diminution du loyer** (article L125-5 du Code de l'environnement). Amende de 300 000 EUR et 2 ans d'emprisonnement pour information mensongere. |
| **Donnees necessaires** | Adresse du logement, commune, zone de risque, date de realisation de l'ERP |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel systematique 1 mois avant expiration des 6 mois / avant chaque signature |

---

#### 3.1.8 Diagnostic termites

| Champ | Detail |
|-------|--------|
| **Quoi** | Reperage de la presence de termites et autres insectes xylophages. Obligatoire uniquement dans les **zones declarees par arrete prefectoral** (principalement Sud-Ouest, facade atlantique, DOM-TOM). |
| **Quand** | Validite : **6 mois**. A refaire a chaque nouvelle mise en location si expire et si le bien est en zone concernee. |
| **Base legale** | Articles L126-21 a L126-25 du CCH (anciennement L133-6). Article 3-3 de la loi du 6 juillet 1989 (en zone arretee). |
| **Risque si oublie** | Vice cache potentiel. Responsabilite civile du bailleur pour les dommages causes par les termites. En cas de vente ulterieure, le diagnostic est imperatif. |
| **Donnees necessaires** | Adresse du bien, zone d'arrete prefectoral (oui/non), date du diagnostic |
| **Priorite** | Important (uniquement en zone arretee) |
| **Automatisable** | Oui -- si en zone arretee, rappel avant chaque nouveau bail |

---

#### 3.1.9 Diagnostic bruit (plan d'exposition au bruit)

| Champ | Detail |
|-------|--------|
| **Quoi** | Information du locataire sur l'existence de nuisances sonores aeriennes. Obligatoire si le logement est situe dans une zone d'exposition au bruit definie par un **plan d'exposition au bruit (PEB)** d'un aerodrome (article L112-11 du Code de l'urbanisme). |
| **Quand** | Pas de duree de validite specifiee. Doit etre fourni a chaque nouvelle signature de bail. Le diagnostic est un formulaire type indicatif. |
| **Base legale** | Article 94 de la loi ELAN n2018-1021 du 23 novembre 2018. Article L112-11 du Code de l'urbanisme. Decret n2020-1310 du 29 octobre 2020. |
| **Risque si oublie** | Pas de sanction specifique prevue par la loi, mais le locataire peut invoquer un defaut d'information precontractuelle (dol, erreur) et demander des dommages-interets ou la resolution du bail. |
| **Donnees necessaires** | Adresse du bien, proximite aeroport, zone PEB (A, B, C, D) |
| **Priorite** | Important (uniquement en zone PEB) |
| **Automatisable** | Oui -- basee sur l'adresse et la zone PEB |

---

#### 3.1.10 Diagnostic assainissement non collectif

| Champ | Detail |
|-------|--------|
| **Quoi** | Controle de l'installation d'assainissement non collectif (fosse septique, etc.) par le SPANC (Service Public d'Assainissement Non Collectif). Concerne les logements **non raccordes au tout-a-l'egout**. |
| **Quand** | Validite : **3 ans**. Le controle est effectue par le SPANC de la commune. |
| **Base legale** | Article L1331-11-1 du Code de la sante publique. Article L2224-8 du Code general des collectivites territoriales. Article 3-3 de la loi du 6 juillet 1989. |
| **Risque si oublie** | Non-conformite pouvant entrainer une obligation de mise aux normes sous 1 an. Amende de 75 EUR a 150 EUR par jour de retard (selon la commune). Pollution des sols et des nappes phreatiques : responsabilite environnementale. |
| **Donnees necessaires** | Type d'assainissement (collectif/non collectif), date du dernier controle SPANC |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappel 3 ans apres le dernier controle |

---

#### 3.1.11 Surface habitable (mesurage loi Boutin)

| Champ | Detail |
|-------|--------|
| **Quoi** | Mention obligatoire de la surface habitable du logement dans le bail. La surface habitable est definie a l'article R111-2 du CCH : surface de plancher construite, apres deduction des surfaces occupees par les murs, cloisons, marches, cages d'escalier, gaines, embrasures de portes et fenetres. Sont exclus les combles non amenages, caves, sous-sols, remises, garages, terrasses, loggias, balcons, sechers, verandas, locaux communs, dependances, et les pieces dont la hauteur sous plafond est inferieure a 1,80 m. |
| **Quand** | Pas de duree d'expiration. A effectuer une seule fois sauf si travaux modifiant la surface. Doit figurer dans chaque nouveau bail. |
| **Base legale** | Article 3 de la loi du 6 juillet 1989. Article 78 de la loi ALUR (sanction en cas d'erreur). Article R111-2 du CCH. |
| **Risque si oublie** | **Absence** : le locataire peut mettre en demeure le bailleur de fournir la surface sous 1 mois, a defaut le juge peut reduire le loyer. **Erreur superieure a 5%** : le locataire peut demander une reduction proportionnelle du loyer (action prescrite dans les 4 mois et 6 jours apres la prise d'effet du bail -- delai juge tres court par la jurisprudence). |
| **Donnees necessaires** | Surface habitable mesuree, date du mesurage, surface indiquee dans le bail |
| **Priorite** | Critique |
| **Automatisable** | Non (mesurage physique) -- mais rappel de verification possible avant chaque bail |

---

### 3.2 Bail et duree

---

#### 3.2.1 Duree minimale du bail

| Champ | Detail |
|-------|--------|
| **Quoi** | La loi impose des durees minimales de bail selon le type de location. |
| **Durees** | **Location vide** : 3 ans minimum (6 ans si le bailleur est une personne morale). **Location meublee** : 1 an minimum. **Bail etudiant** : 9 mois (meuble uniquement). **Bail mobilite** : 1 a 10 mois (non renouvelable, non reconductible). |
| **Base legale** | Articles 10, 25-7, 25-12 a 25-18 de la loi du 6 juillet 1989. Loi ELAN articles 107 a 115 (bail mobilite). |
| **Risque si oublie** | Une duree inferieure a la duree legale est **reputee non ecrite** : le bail est automatiquement reconduit a la duree legale. Le bailleur ne peut pas expulser le locataire avant la fin de la duree legale. |
| **Donnees necessaires** | Type de bail (vide, meuble, etudiant, mobilite), qualite du bailleur (personne physique/morale), date de debut du bail |
| **Priorite** | Critique |
| **Automatisable** | Oui -- calcul de la date de fin de bail a partir du type et de la date de debut |

---

#### 3.2.2 Conge du bailleur (non-renouvellement)

| Champ | Detail |
|-------|--------|
| **Quoi** | Le bailleur peut donner conge au locataire pour l'echeance du bail, mais uniquement pour 3 motifs limitatifs : **reprise pour habiter** (le bailleur ou un proche), **vente du logement**, ou **motif legitime et serieux** (faute du locataire). Le conge doit etre notifie par LRAR, acte d'huissier, ou remise en main propre contre emargement. |
| **Quand** | **Location vide** : conge a donner au moins **6 mois avant l'echeance du bail**. **Location meublee** : conge a donner au moins **3 mois avant l'echeance du bail**. Le delai court a compter de la reception de la lettre. |
| **Base legale** | Articles 15 (vide) et 25-8 (meuble) de la loi du 6 juillet 1989. Loi ALUR pour les precisions sur le conge pour vente (droit de preemption du locataire). |
| **Risque si oublie** | Si le conge n'est pas donne dans les delais, le bail est **automatiquement reconduit** pour la meme duree (3 ans vide, 1 an meuble). Le bailleur ne peut pas expulser le locataire et devra attendre la prochaine echeance. **Conge frauduleux** (faux motif de reprise) : amende jusqu'a 6 000 EUR (personne physique) ou 30 000 EUR (personne morale), plus dommages-interets au locataire. |
| **Donnees necessaires** | Type de bail, date d'echeance du bail, motif de conge, identite du beneficiaire (si reprise) |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel a J-7 mois (vide) ou J-4 mois (meuble) avant echeance pour laisser le temps de preparer le courrier |

---

#### 3.2.3 Conge du locataire

| Champ | Detail |
|-------|--------|
| **Quoi** | Le locataire peut donner conge a tout moment (pas seulement a l'echeance). Le conge prend effet a l'expiration du delai de preavis. |
| **Quand** | **Location vide** : preavis de **3 mois** (reduit a **1 mois** en zone tendue, en cas de mutation, perte d'emploi, nouvel emploi suite a perte d'emploi, beneficiaire RSA/AAH, etat de sante, ou si le logement est en zone tendue). **Location meublee** : preavis de **1 mois**. **Bail mobilite** : preavis de **1 mois**. |
| **Base legale** | Article 15-I de la loi du 6 juillet 1989. Decret n2015-1437 du 5 novembre 2015 (liste des zones tendues). Loi ALUR (reduction du preavis en zone tendue). |
| **Risque si oublie** | Pas de risque pour le bailleur (c'est une initiative du locataire), mais le bailleur doit connaitre les delais pour planifier la relocation et ne pas exiger un preavis plus long que celui legalement du. |
| **Donnees necessaires** | Type de bail, zone tendue (oui/non), motif de depart du locataire |
| **Priorite** | Important |
| **Automatisable** | Oui -- calcul de la date de fin de preavis a reception du conge |

---

#### 3.2.4 Renouvellement et tacite reconduction

| Champ | Detail |
|-------|--------|
| **Quoi** | A defaut de conge donne dans les delais, le bail est reconduit **tacitement** pour la meme duree (3 ans vide / 1 an meuble). Le bailleur peut aussi proposer un **renouvellement** avec de nouvelles conditions (notamment un nouveau loyer). **Le bail etudiant (9 mois)** ne se reconduit PAS tacitement. **Le bail mobilite** ne se reconduit PAS et ne peut PAS etre renouvele. |
| **Quand** | A la date d'echeance du bail si aucun conge n'a ete donne. |
| **Base legale** | Articles 10 et 25-9 de la loi du 6 juillet 1989. |
| **Risque si oublie** | Aucun risque legal direct (le bail se reconduit automatiquement), mais le bailleur peut rater l'opportunite de donner conge ou de renegocier les conditions. |
| **Donnees necessaires** | Date d'echeance du bail, type de bail, conge donne (oui/non) |
| **Priorite** | Important |
| **Automatisable** | Oui -- notification a l'approche de l'echeance |

---

#### 3.2.5 Offre de renouvellement avec nouveau loyer

| Champ | Detail |
|-------|--------|
| **Quoi** | Si le bailleur estime que le loyer est manifestement sous-evalue, il peut proposer un nouveau loyer au locataire lors du renouvellement du bail. L'offre doit indiquer le nouveau loyer propose et au moins 3 references de loyers pratiques dans le voisinage pour des logements comparables, ou 6 references en zone tendue ou a Paris. |
| **Quand** | L'offre doit parvenir au locataire au moins **6 mois avant l'echeance** du bail (location vide). Au moins **3 mois avant l'echeance** (location meublee). |
| **Base legale** | Article 17-2 de la loi du 6 juillet 1989. Decret n90-780 du 31 aout 1990. |
| **Risque si oublie** | Si l'offre n'est pas faite dans les delais, le bail est reconduit aux memes conditions de loyer. Le bailleur ne peut pas augmenter le loyer (en dehors de la revision annuelle IRL). |
| **Donnees necessaires** | Date d'echeance du bail, loyer actuel, references de loyers comparables, zone tendue (oui/non) |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappel 7 mois avant echeance |

---

### 3.3 Loyer

---

#### 3.3.1 Revision annuelle du loyer (IRL)

| Champ | Detail |
|-------|--------|
| **Quoi** | Le bailleur peut reviser le loyer une fois par an si une clause du bail le prevoit. La revision se fait sur la base de l'**Indice de Reference des Loyers (IRL)** publie par l'INSEE chaque trimestre. Formule : `nouveau loyer = loyer actuel x (nouvel IRL / ancien IRL)`. L'IRL de reference est celui du trimestre mentionne dans le bail (ou a defaut, le dernier IRL publie a la date de signature). |
| **Quand** | A la **date anniversaire du bail** (ou a la date prevue dans le bail). **Prescription** : la revision ne peut pas etre appliquee retroactivement au-dela d'**1 an** (loi ALUR, article 17-1 modifie). Si le bailleur oublie de reviser pendant plus d'un an, il perd le droit pour la periode ecoulee. |
| **Base legale** | Article 17-1 de la loi du 6 juillet 1989. Loi ALUR n2014-366 du 24 mars 2014 (limitation de la retroactivite a 1 an). |
| **Risque si oublie** | Perte financiere : le bailleur ne peut pas rattraper plus d'un an de revision non appliquee. L'augmentation non demandee est definitivement perdue. Sur plusieurs annees, la perte cumulee peut etre significative. |
| **Donnees necessaires** | Loyer actuel (hors charges), date anniversaire du bail (ou date de revision prevue), trimestre IRL de reference, indice IRL actuel et precedent |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel 1 mois avant la date anniversaire avec calcul automatique du nouveau loyer |

---

#### 3.3.2 Encadrement des loyers en zone tendue

| Champ | Detail |
|-------|--------|
| **Quoi** | Dans les communes en **zone tendue** (28 agglomerations definies par decret), le loyer ne peut pas depasser le dernier loyer applique au precedent locataire, sauf travaux importants ou loyer manifestement sous-evalue. A Paris, Lyon, Lille, Montpellier, Bordeaux, et dans les communes de Plaine Commune, Est Ensemble, et d'autres EPCI ayant pris un arrete, un **encadrement strict** s'applique avec des loyers de reference (median, majore, minore) fixes par arrete prefectoral, par quartier, type de logement, nombre de pieces et epoque de construction. |
| **Quand** | A chaque **nouveau bail** (nouveau locataire ou renouvellement). Le complement de loyer est autorise uniquement si le logement presente des caracteristiques exceptionnelles (localisation, confort, equipements). |
| **Base legale** | Articles 17, 18 et 25-9 de la loi du 6 juillet 1989. Loi ELAN article 140 (relance de l'encadrement a titre experimental). Decret n2015-650 du 10 juin 2015 (zone tendue). |
| **Risque si oublie** | En zone d'encadrement strict : le locataire peut contester le loyer dans les **3 mois** suivant la signature du bail. Si le loyer depasse le loyer de reference majore sans complement de loyer justifie, le juge ordonne la **diminution du loyer** et le **remboursement du trop-percu**. Amende administrative : jusqu'a 5 000 EUR (personne physique) ou 15 000 EUR (personne morale). |
| **Donnees necessaires** | Adresse du bien, commune, zone tendue (oui/non), encadrement strict (oui/non), loyer de reference applicable, complement de loyer, nombre de pieces, epoque de construction, type de location |
| **Priorite** | Critique |
| **Automatisable** | Oui -- verification automatique si le loyer respecte les plafonds (necessit integration des arretes prefectoraux) |

---

#### 3.3.3 Gel des loyers pour logements DPE F et G

| Champ | Detail |
|-------|--------|
| **Quoi** | Depuis le **24 aout 2022**, les logements classes F ou G au DPE ne peuvent plus faire l'objet d'une **augmentation de loyer**, que ce soit lors d'un renouvellement de bail, d'un changement de locataire, ou d'une revision annuelle (IRL). Le loyer est **gele** a son montant actuel. |
| **Quand** | Permanent, depuis le 24 aout 2022, pour toute la duree ou le logement reste en classe F ou G. |
| **Base legale** | Loi Climat et Resilience n2021-1104 du 22 aout 2021, article 159. Decret n2022-1079 du 29 juillet 2022. Modifie les articles 17 et 18 de la loi du 6 juillet 1989. |
| **Risque si oublie** | Si le bailleur augmente le loyer malgre le gel : le locataire peut demander le remboursement du trop-percu et la reduction du loyer au montant gele. L'augmentation est reputee non ecrite. |
| **Donnees necessaires** | Classe DPE du logement |
| **Priorite** | Critique |
| **Automatisable** | Oui -- si DPE F ou G, bloquer automatiquement toute proposition de revision ou augmentation |

---

#### 3.3.4 Quittance de loyer

| Champ | Detail |
|-------|--------|
| **Quoi** | Le bailleur est tenu de delivrer gratuitement une quittance de loyer au locataire qui en fait la demande. La quittance doit mentionner le detail des sommes versees : loyer et charges, avec distinction. Si le locataire a effectue un paiement partiel, le bailleur doit delivrer un recu. Depuis la loi ALUR, la quittance peut etre transmise par voie dematerialisee si le locataire y consent. |
| **Quand** | **A chaque paiement de loyer** si le locataire le demande. Aucun delai precis n'est fixe par la loi, mais une emission mensuelle est l'usage. |
| **Base legale** | Article 21 de la loi du 6 juillet 1989. |
| **Risque si oublie** | Le refus de delivrer une quittance peut etre sanctionne par des dommages-interets si le locataire subit un prejudice (par ex. impossibilite de faire valoir ses droits pour une aide au logement, une demande de bail dans un autre logement, etc.). |
| **Donnees necessaires** | Montant du loyer, montant des charges, date de paiement, identite du locataire |
| **Priorite** | Important |
| **Automatisable** | Oui -- generation automatique mensuelle apres enregistrement du paiement |

---

### 3.4 Charges et regularisation

---

#### 3.4.1 Regularisation annuelle des charges

| Champ | Detail |
|-------|--------|
| **Quoi** | Les charges locatives sont versees sous forme de **provisions mensuelles** (avances). Une fois par an, le bailleur doit proceder a une **regularisation** : comparaison entre les provisions versees et les depenses reelles. Si les provisions excedent les depenses reelles, le bailleur doit rembourser le trop-percu. Si elles sont inferieures, il peut reclamer le complement. |
| **Quand** | **1 fois par an**, apres la cloture de l'exercice comptable de la copropriete (ou de l'annee civile pour un immeuble en monopropriete). Le decompte doit etre communique au locataire **1 mois avant la regularisation**. |
| **Base legale** | Article 23 de la loi du 6 juillet 1989. Decret n87-713 du 26 aout 1987 (liste des charges recuperables). |
| **Risque si oublie** | **Prescription de 3 ans** : passe ce delai, le bailleur ne peut plus reclamer les charges au locataire (article 7-1 de la loi du 6 juillet 1989). Le locataire peut egalement demander le remboursement du trop-percu sur 3 ans. **Si regularisation tardive** (plus d'un an apres l'exercice) : le locataire peut demander un echelonnement des eventuels complements sur 12 mois. |
| **Donnees necessaires** | Date de cloture de l'exercice comptable, provisions versees, depenses reelles, decompte detaille |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel apres reception du decompte de charges de copropriete |

---

#### 3.4.2 Communication des justificatifs de charges

| Champ | Detail |
|-------|--------|
| **Quoi** | Le bailleur doit communiquer au locataire le **decompte des charges par nature** (eau, ascenseur, chauffage, entretien...) et le mode de repartition entre les locataires. Les pieces justificatives (factures, contrats) doivent etre tenues a la disposition du locataire pendant **6 mois** apres l'envoi du decompte. Depuis la loi ALUR, dans les coproprietes de 10 lots ou moins, un **recapitulatif des charges** doit etre transmis au locataire. |
| **Quand** | Le decompte doit etre envoye **1 mois avant la regularisation**. Les justificatifs doivent etre consultables pendant **6 mois** a compter de l'envoi du decompte. |
| **Base legale** | Article 23 de la loi du 6 juillet 1989 (modifie par la loi ALUR). |
| **Risque si oublie** | Le locataire peut contester la regularisation et demander le remboursement des charges dont la justification n'a pas ete fournie. Inversion de la charge de la preuve en faveur du locataire. |
| **Donnees necessaires** | Date d'envoi du decompte, nature des charges, pieces justificatives disponibles |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappel automatique 1 mois apres reception du decompte de copropriete |

---

#### 3.4.3 Charges recuperables vs. non recuperables

| Champ | Detail |
|-------|--------|
| **Quoi** | Seules les charges figurant dans la **liste limitative** du decret du 26 aout 1987 sont recuperables aupres du locataire. Les principales categories sont : ascenseur et monte-charge, eau froide/chaude et chauffage collectif, entretien et menues reparations des parties communes, taxes et redevances (enlevement ordures menageres, assainissement), antenne collective. Les charges **non recuperables** incluent : ravalement, gros travaux (article 606 du Code civil), honoraires du syndic, assurance de l'immeuble (sauf locaux de service), frais de gestion du bailleur. |
| **Base legale** | Decret n87-713 du 26 aout 1987 (annexe). Article 23 de la loi du 6 juillet 1989. |
| **Risque si oublie** | Si le bailleur repercute des charges non recuperables au locataire, celui-ci peut en demander le remboursement (action prescrite sur 3 ans). |
| **Donnees necessaires** | Nature des charges de copropriete, classification recuperable/non recuperable |
| **Priorite** | Important |
| **Automatisable** | Partiellement -- aide a la classification des charges |

---

### 3.5 Depot de garantie

---

#### 3.5.1 Montant maximum du depot de garantie

| Champ | Detail |
|-------|--------|
| **Quoi** | Le montant du depot de garantie est plafonne par la loi. **Location vide** : maximum **1 mois** de loyer hors charges. **Location meublee** : maximum **2 mois** de loyer hors charges. **Bail mobilite** : aucun depot de garantie autorise (**0 EUR**). Le depot ne peut pas etre revise en cours de bail, meme en cas de renouvellement, sauf si le montant est inferieur au plafond legal. |
| **Base legale** | Article 22 de la loi du 6 juillet 1989. Article 25-6 (meuble). Article 25-16 (bail mobilite). |
| **Risque si oublie** | Si un depot superieur au plafond est exige, le locataire peut en demander la restitution partielle. Si un depot est exige pour un bail mobilite, il est repute non ecrit. |
| **Donnees necessaires** | Type de bail, montant du loyer hors charges |
| **Priorite** | Critique |
| **Automatisable** | Oui -- verification automatique a la creation du bail |

---

#### 3.5.2 Delai de restitution du depot de garantie

| Champ | Detail |
|-------|--------|
| **Quoi** | Le bailleur doit restituer le depot de garantie dans un delai strict apres la remise des cles par le locataire. **1 mois** si l'etat des lieux de sortie est **conforme** a l'etat des lieux d'entree (pas de degradation). **2 mois** si l'etat des lieux de sortie revele des **differences** (degradations, reparations necessaires). Le bailleur peut retenir une partie du depot pour couvrir : les reparations locatives, les charges impayees, les loyers impayes. En copropriete, le bailleur peut conserver une provision de **maximum 20%** du depot jusqu'a la regularisation annuelle des charges, avec restitution du solde dans le mois suivant la regularisation. |
| **Quand** | Le delai court a partir de la **remise des cles** par le locataire. |
| **Base legale** | Article 22 de la loi du 6 juillet 1989 (modifie par la loi ALUR). |
| **Risque si oublie** | **Majoration de 10% du loyer mensuel par mois de retard** commence. Cette penalite est automatique et s'applique par mois de retard entame. Exemple : pour un loyer de 800 EUR et 3 mois de retard, la penalite est de 240 EUR (3 x 80 EUR). Le locataire peut saisir le juge en procedure acceleree. |
| **Donnees necessaires** | Date de remise des cles, etat des lieux de sortie (conforme/non conforme), montant du depot, montant des retenues eventuelles, copropriete (oui/non) |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel immediat a la date de sortie avec compte a rebours 1 mois/2 mois |

---

### 3.6 Assurances

---

#### 3.6.1 Attestation d'assurance habitation du locataire

| Champ | Detail |
|-------|--------|
| **Quoi** | Le locataire a l'obligation de souscrire une assurance contre les risques locatifs (au minimum : incendie, degat des eaux, explosion). Le bailleur a le droit de demander l'attestation d'assurance a la **signature du bail** puis **chaque annee** a la date anniversaire du contrat. Si le locataire ne fournit pas l'attestation apres mise en demeure par LRAR restee sans effet pendant **1 mois**, le bailleur peut : soit resilier le bail, soit souscrire une assurance pour le compte du locataire et en repercuter le cout majore de 10% sur le loyer. |
| **Quand** | A la signature du bail, puis **annuellement**. |
| **Base legale** | Articles 7-g et 7-h de la loi du 6 juillet 1989. Article L215-2 du Code des assurances. Loi ALUR (possibilite de souscrire pour le compte du locataire). |
| **Risque si oublie** | Si le locataire n'est pas assure et qu'un sinistre survient, le bailleur n'est pas directement responsable, mais il peut perdre la possibilite de se retourner contre le locataire pour les dommages. Le bailleur perd un motif de resiliation du bail s'il ne relance pas le locataire. |
| **Donnees necessaires** | Date anniversaire du bail, date de la derniere attestation recue |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappel annuel a la date anniversaire du bail |

---

#### 3.6.2 Assurance PNO (Proprietaire Non Occupant)

| Champ | Detail |
|-------|--------|
| **Quoi** | L'assurance PNO couvre le proprietaire bailleur pour sa responsabilite civile en tant que proprietaire. **Obligatoire** pour les logements situes en **copropriete** (loi ALUR). **Fortement recommandee** (mais pas legalement obligatoire) pour les logements hors copropriete. Couvre les dommages aux tiers, les defauts d'entretien, les vices de construction, les periodes de vacance locative. |
| **Quand** | Souscription avant la mise en location. Renouvellement annuel (tacite reconduction du contrat d'assurance). |
| **Base legale** | Article 9-1 de la loi n65-557 du 10 juillet 1965 (loi copropriete, modifie par la loi ALUR). Article L215-1 du Code des assurances. |
| **Risque si oublie** | En copropriete : le syndic peut souscrire une assurance pour le compte du coproprietaire defaillant et en repercuter le cout. Hors copropriete : le proprietaire assume seul les dommages en cas de sinistre. |
| **Donnees necessaires** | Copropriete (oui/non), date de souscription, date d'echeance du contrat |
| **Priorite** | Important (critique en copropriete) |
| **Automatisable** | Oui -- rappel avant echeance du contrat d'assurance |

---

#### 3.6.3 Garantie des Loyers Impayes (GLI)

| Champ | Detail |
|-------|--------|
| **Quoi** | Assurance facultative qui couvre le bailleur en cas de loyers impayes, de degradations locatives, et des frais de contentieux (procedure d'expulsion). **Non cumulable** avec un cautionnement (garant physique), sauf si le locataire est etudiant ou apprenti. |
| **Quand** | Souscription avant la signature du bail. Declaration du sinistre generalement dans les 3 mois suivant le premier impaye. Renouvellement annuel. |
| **Base legale** | Article 22-1 de la loi du 6 juillet 1989 (non-cumul garant/GLI). Code des assurances (contrat d'assurance classique). |
| **Risque si oublie** | Pas de sanction legale (assurance facultative), mais risque financier majeur en cas d'impayes (procedure d'expulsion pouvant durer 18 a 36 mois, loyers perdus). |
| **Donnees necessaires** | Date de souscription, date d'echeance, conditions de la garantie, delai de carence |
| **Priorite** | Recommande |
| **Automatisable** | Oui -- rappel avant echeance du contrat |

---

### 3.7 Decence et habitabilite

---

#### 3.7.1 Criteres de decence du logement

| Champ | Detail |
|-------|--------|
| **Quoi** | Le bailleur doit delivrer un logement **decent** repondant a des criteres precis. Le logement ne doit pas presenter de risques manifestes pour la securite physique ou la sante des occupants. Les criteres incluent : **structure** (clos, couvert, etanche, protege contre les infiltrations), **surface minimum** (au moins **9 m2** de surface habitable et **20 m3** de volume habitable, ou une hauteur sous plafond d'au moins **2,20 m**), **equipements obligatoires** (installation de chauffage, alimentation en eau potable, evacuation des eaux usees, coin cuisine avec evier, installation sanitaire interieure avec WC separe de la cuisine et de la piece principale, reseau electrique suffisant). |
| **Quand** | **Permanent** -- le logement doit etre decent a chaque instant de la location, pas uniquement a l'entree dans les lieux. |
| **Base legale** | Article 6 de la loi du 6 juillet 1989. Decret n2002-120 du 30 janvier 2002 (criteres de decence). |
| **Risque si oublie** | Le locataire peut saisir le juge pour obtenir : **mise en conformite** sous astreinte, **reduction du loyer** proportionnelle, **dommages-interets**. La **CAF/MSA** peut suspendre le versement des aides au logement et obliger le bailleur a faire les travaux sous peine de devoir rembourser les aides. Le juge peut **suspendre le paiement du loyer** jusqu'a execution des travaux. |
| **Donnees necessaires** | Surface habitable, volume habitable, equipements du logement, etat du gros oeuvre |
| **Priorite** | Critique |
| **Automatisable** | Non (verification physique necessaire) -- mais checklist automatisee possible |

---

#### 3.7.2 Performance energetique minimum (critere de decence energetique)

| Champ | Detail |
|-------|--------|
| **Quoi** | Depuis la loi Climat et Resilience, le critere de decence inclut un **seuil de performance energetique** progressif. Le logement doit avoir une consommation en dessous des seuils suivants pour etre considere decent : **Depuis le 1er janvier 2023** : consommation inferieure a 450 kWh/m2/an en energie finale (concerne les logements les plus energivores en classe G). **Depuis le 1er janvier 2025** : tous les logements classes G sont consideres indecents. **A compter du 1er janvier 2028** : les logements classes F seront consideres indecents. **A compter du 1er janvier 2034** : les logements classes E seront consideres indecents. |
| **Base legale** | Article 160 de la loi n2021-1104 du 22 aout 2021 (Climat et Resilience). Decret n2023-796 du 18 aout 2023. Modifie le decret n2002-120 du 30 janvier 2002. |
| **Risque si oublie** | Identique aux criteres de decence (cf. supra) : mise en conformite, reduction de loyer, dommages-interets, suspension des aides. De plus, le bail ne peut pas etre renouvele tant que le logement ne respecte pas le seuil. |
| **Donnees necessaires** | Classe DPE, consommation en kWh/m2/an, date du DPE |
| **Priorite** | Critique |
| **Automatisable** | Oui -- alertes basees sur la classe DPE et les dates butoirs |

---

### 3.8 Etat des lieux

---

#### 3.8.1 Etat des lieux d'entree

| Champ | Detail |
|-------|--------|
| **Quoi** | L'etat des lieux d'entree est un document **contradictoire** (signe par les deux parties) qui decrit l'etat du logement au moment de la remise des cles. Il doit etre etabli sur un **formulaire type** conforme au decret d'application. Il decrit piece par piece l'etat des murs, sols, plafonds, equipements, relevés de compteurs. L'etat des lieux est **annexe au bail**. Le locataire peut demander un complement dans les **10 jours** suivant l'etat des lieux d'entree. Pour le chauffage, il dispose d'un delai supplementaire pour signaler des anomalies pendant le **premier mois de la periode de chauffe**. |
| **Quand** | Le jour de la remise des cles (ou juste avant). |
| **Base legale** | Article 3-2 de la loi du 6 juillet 1989. Decret n2016-382 du 30 mars 2016 (contenu et modalites). |
| **Risque si oublie** | **Si pas d'EDL d'entree** : presomption que le logement a ete remis en bon etat (article 1731 du Code civil). Le bailleur ne pourra pas reclamer de reparations locatives en fin de bail. C'est un risque **tres important** pour le bailleur. |
| **Donnees necessaires** | Date d'entree, identites des parties, description du logement piece par piece |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel automatique a la date d'entree prevue |

---

#### 3.8.2 Etat des lieux de sortie

| Champ | Detail |
|-------|--------|
| **Quoi** | L'etat des lieux de sortie decrit l'etat du logement au moment de la restitution des cles. Il est compare a l'etat des lieux d'entree pour determiner les eventuelles degradations imputables au locataire (en tenant compte de la **vetuste normale**). En cas de desaccord, les parties peuvent faire appel a un huissier dont les frais sont partages par moitie. |
| **Quand** | Le jour de la restitution des cles (ou dans les jours precedents par accord). |
| **Base legale** | Article 3-2 de la loi du 6 juillet 1989. Decret n2016-382 du 30 mars 2016. |
| **Risque si oublie** | **Si pas d'EDL de sortie** : le bailleur ne peut pas prouver l'existence de degradations et devra restituer l'integralite du depot de garantie. Perte totale du droit a retenue. |
| **Donnees necessaires** | Date de sortie, etat des lieux d'entree (pour comparaison), grille de vetuste |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel automatique a la date de fin de preavis |

---

#### 3.8.3 Grille de vetuste

| Champ | Detail |
|-------|--------|
| **Quoi** | La grille de vetuste permet de determiner la part de degradation imputable au locataire et la part due a l'usure normale du logement. Elle fixe une duree de vie theorique et un taux d'abattement annuel pour chaque element (peintures, revetements de sol, equipements). Si une grille de vetuste est choisie, elle doit etre **annexee a l'etat des lieux d'entree**. La loi ALUR encourage l'utilisation de grilles de vetuste mais ne la rend pas obligatoire. |
| **Base legale** | Article 3-2 de la loi du 6 juillet 1989. Loi ALUR (encouragement). Accord collectif du 16 mars 2005 (grille de vetuste type). |
| **Priorite** | Recommande |
| **Automatisable** | Oui -- application automatique de la vetuste lors du calcul des retenues |

---

### 3.9 Fiscalite

---

#### 3.9.1 Declaration des revenus fonciers

| Champ | Detail |
|-------|--------|
| **Quoi** | Le proprietaire bailleur doit declarer ses revenus locatifs chaque annee. **Regime micro-foncier** : applicable si les revenus fonciers bruts annuels ne depassent pas **15 000 EUR** et que le proprietaire n'a pas opte pour le regime reel. Abattement forfaitaire de **30%**. Declaration sur le formulaire 2042 (case 4BE). **Regime reel** : obligatoire au-dessus de 15 000 EUR ou sur option. Deduction des charges reelles (travaux, interets d'emprunt, assurance, frais de gestion...). Declaration sur le formulaire **2044** (ou 2044-SPE pour les dispositifs speciaux). Pour les **locations meublees** : regime **micro-BIC** (abattement 50% si recettes < 77 700 EUR) ou regime reel (formulaire 2031 + liasses fiscales). |
| **Quand** | Declaration annuelle en **mai-juin** (la date exacte depend du departement et du mode de declaration). Generalement : departements 01-19 : fin mai, 20-54 : debut juin, 55-976 : mi-juin. |
| **Base legale** | Articles 14 a 33 quinquies du Code general des impots (revenus fonciers). Articles 35 bis et 50-0 du CGI (meuble micro-BIC). |
| **Risque si oublie** | Majoration de **10%** de l'impot du pour declaration tardive spontanee. Majoration de **20%** apres mise en demeure restee sans effet sous 30 jours. Majoration de **40%** apres mise en demeure si plus de 30 jours de retard. Interets de retard de **0,20%** par mois. |
| **Donnees necessaires** | Montant des loyers percus, charges deductibles, type de regime fiscal, formulaires a remplir, date limite de declaration |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel en avril/mai avec recapitulatif des loyers percus |

---

#### 3.9.2 Taxe fonciere

| Champ | Detail |
|-------|--------|
| **Quoi** | Impot local du annuellement par le proprietaire au 1er janvier de l'annee d'imposition. La taxe fonciere n'est **pas recuperable** aupres du locataire (sauf la **TEOM** -- Taxe d'Enlevement des Ordures Menageres -- qui est une charge recuperable). |
| **Quand** | Avis d'imposition recu en **septembre-octobre**. Date limite de paiement : generalement **mi-octobre** (15 octobre). Possibilite de mensualisation. |
| **Base legale** | Articles 1380 a 1391 du Code general des impots. |
| **Risque si oublie** | Majoration de **10%** en cas de non-paiement a la date limite. Poursuites du Tresor public. |
| **Donnees necessaires** | Adresse du bien, valeur locative cadastrale, taux communaux |
| **Priorite** | Critique |
| **Automatisable** | Oui -- rappel annuel en septembre |

---

#### 3.9.3 IFI (Impot sur la Fortune Immobiliere)

| Champ | Detail |
|-------|--------|
| **Quoi** | L'IFI s'applique aux personnes dont le patrimoine immobilier net est superieur a **1 300 000 EUR** au 1er janvier de l'annee. Comprend les biens immobiliers detenus directement ou indirectement (SCI, SCPI, OPCI). L'abattement de 30% s'applique a la residence principale. Les dettes liees aux biens immobiliers sont deductibles. |
| **Quand** | Declaration en meme temps que la declaration de revenus (mai-juin). |
| **Base legale** | Articles 964 a 983 du Code general des impots (crees par la loi de finances 2018). |
| **Risque si oublie** | Memes majorations que pour la declaration de revenus. Risque de redressement fiscal avec penalites de 40% pour insuffisance de declaration. |
| **Donnees necessaires** | Valeur venale des biens immobiliers au 1er janvier, dettes deductibles |
| **Priorite** | Important (si applicable) |
| **Automatisable** | Oui -- rappel en mai si patrimoine immobilier renseigne |

---

#### 3.9.4 Declaration de debut d'activite LMNP/LMP

| Champ | Detail |
|-------|--------|
| **Quoi** | Toute personne qui commence une activite de location meublee doit faire une declaration de debut d'activite (immatriculation) aupres du **guichet unique des formalites des entreprises** (remplace le Greffe du Tribunal de Commerce depuis le 1er janvier 2023). Le proprietaire obtient un numero SIRET. **LMNP** (Loueur en Meuble Non Professionnel) : recettes < 23 000 EUR/an ET recettes < revenus professionnels du foyer fiscal. **LMP** (Loueur en Meuble Professionnel) : recettes >= 23 000 EUR/an ET recettes > revenus professionnels. |
| **Quand** | Dans les **15 jours** suivant le debut de l'activite de location meublee. |
| **Base legale** | Article 50-0 du Code general des impots. Article L526-22 du Code de commerce (guichet unique). |
| **Risque si oublie** | Absence de numero SIRET : impossibilite de declarer correctement les revenus meublés. Amende pour defaut d'immatriculation. Redressement fiscal possible. |
| **Donnees necessaires** | Date de debut de la location meublee, recettes prevues, revenus professionnels du foyer |
| **Priorite** | Critique (pour la location meublee) |
| **Automatisable** | Oui -- rappel a la creation d'un bail meuble si pas de SIRET renseigne |

---

#### 3.9.5 CFE (Cotisation Fonciere des Entreprises) -- LMNP/LMP

| Champ | Detail |
|-------|--------|
| **Quoi** | Les loueurs en meuble (LMNP et LMP) sont assujettis a la **CFE** (composante de la CET -- Contribution Economique Territoriale). La CFE est calculee sur la valeur locative du bien utilise pour l'activite. Possibilite d'exoneration dans certaines communes ou si recettes < 5 000 EUR. |
| **Quand** | Declaration initiale avant le **31 decembre** de l'annee de debut d'activite. Paiement annuel en **decembre** (15 decembre). |
| **Base legale** | Articles 1447 a 1478 du Code general des impots. |
| **Risque si oublie** | Majoration de 10% pour retard de paiement. Redressement. |
| **Donnees necessaires** | Numero SIRET, valeur locative, commune |
| **Priorite** | Important (location meublee) |
| **Automatisable** | Oui -- rappel annuel en novembre |

---

### 3.10 Copropriete

---

#### 3.10.1 Assemblee Generale annuelle de copropriete

| Champ | Detail |
|-------|--------|
| **Quoi** | Le syndic convoque une AG au moins une fois par an pour voter le budget previsionnel, approuver les comptes, decider des travaux, elire ou renouveler le conseil syndical. Le proprietaire bailleur doit voter ou se faire representer. Les decisions prises en AG peuvent avoir un impact direct sur les charges locatives et les travaux a realiser. |
| **Quand** | Au moins **1 fois par an** (date fixee par le syndic, generalement au printemps). Convocation envoyee au moins **21 jours** avant l'AG (article 9 du decret du 17 mars 1967). |
| **Base legale** | Articles 7 et 14-1 de la loi n65-557 du 10 juillet 1965. Decret n67-223 du 17 mars 1967. |
| **Risque si oublie** | Impossibilite de voter des decisions importantes (travaux d'amelioration, budget). Le proprietaire peut se retrouver avec des charges votees en son absence sans possibilite de contestation (sauf conditions strictes de contestation dans les 2 mois, article 42 de la loi de 1965). |
| **Donnees necessaires** | Date de l'AG, adresse de la copropriete, ordre du jour |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappel a reception de la convocation |

---

#### 3.10.2 Appels de fonds trimestriels

| Champ | Detail |
|-------|--------|
| **Quoi** | Le syndic appelle des fonds aupres des coproprietaires chaque trimestre pour couvrir les charges courantes (budget previsionnel). Des appels complementaires peuvent etre effectues pour des travaux votes en AG. |
| **Quand** | **Trimestriels** (1er janvier, 1er avril, 1er juillet, 1er octobre -- selon les coproprietes). |
| **Base legale** | Article 14-1 de la loi du 10 juillet 1965. |
| **Risque si oublie** | Mise en demeure par le syndic. Interets de retard. Action en justice pour recouvrement. Inscription de privilege. Le coproprietaire defaillant peut aussi perdre le droit de vote en AG. |
| **Donnees necessaires** | Montant des appels, dates d'echeance, copropriete concernee |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappels trimestriels |

---

#### 3.10.3 DPE collectif obligatoire

| Champ | Detail |
|-------|--------|
| **Quoi** | La loi Climat et Resilience rend progressivement obligatoire le **DPE collectif** pour les immeubles en copropriete. C'est le syndic qui doit l'inscrire a l'ordre du jour de l'AG. Le DPE collectif couvre le batiment entier (enveloppe, chauffage collectif, etc.) et peut remplacer les DPE individuels. |
| **Calendrier** | **Depuis le 1er janvier 2024** : coproprietes de plus de **200 lots**. **Depuis le 1er janvier 2025** : coproprietes de **50 a 200 lots**. **A compter du 1er janvier 2026** : coproprietes de **moins de 50 lots**. |
| **Base legale** | Article 158 de la loi n2021-1104 (Climat et Resilience). Articles L126-31 et suivants du CCH. |
| **Risque si oublie** | Pas de sanction directe pour le coproprietaire individuel, mais absence d'information sur la performance energetique de l'immeuble. Peut bloquer la vente ou la location individuelle si aucun DPE n'est disponible. |
| **Donnees necessaires** | Nombre de lots de la copropriete, date de l'AG, existence d'un DPE collectif |
| **Priorite** | Important |
| **Automatisable** | Oui -- alerte selon la taille de la copropriete et les echeances |

---

### 3.11 Autres obligations

---

#### 3.11.1 Notice d'information jointe au bail

| Champ | Detail |
|-------|--------|
| **Quoi** | Depuis la loi ALUR, une **notice d'information** relative aux droits et obligations des locataires et des bailleurs doit etre annexee au bail. Cette notice est un document type reproduisant les dispositions legales. Elle est definie par arrete ministeriel. |
| **Quand** | A chaque **signature de bail** (initial ou renouvellement). |
| **Base legale** | Article 3 de la loi du 6 juillet 1989 (modifie par la loi ALUR). Arrete du 29 mai 2015 (contenu de la notice). |
| **Risque si oublie** | Pas de sanction specifique prevue, mais peut etre invoque par le locataire pour defaut d'information. |
| **Donnees necessaires** | Type de bail |
| **Priorite** | Important |
| **Automatisable** | Oui -- annexion automatique lors de la generation du bail |

---

#### 3.11.2 Informations precontractuelles obligatoires

| Champ | Detail |
|-------|--------|
| **Quoi** | Avant la signature du bail, l'annonce de mise en location doit mentionner certaines informations obligatoires : montant du loyer, montant des charges (ou leur mode de calcul), surface habitable, commune, classe energetique (DPE et GES), montant du depot de garantie, honoraires du mandataire (si applicable), et en zone d'encadrement : les loyers de reference et le complement de loyer eventuel. |
| **Quand** | Des la publication de l'annonce et avant la signature du bail. |
| **Base legale** | Article 5 de la loi du 6 juillet 1989. Decret n2012-894 du 20 juillet 2012 (mentions obligatoires des annonces). Loi ALUR (complement). |
| **Risque si oublie** | Amende administrative jusqu'a **5 000 EUR** (personne physique) ou **15 000 EUR** (personne morale) pour absence des mentions relatives a l'encadrement des loyers. Le locataire peut invoquer un dol ou une erreur pour obtenir l'annulation du bail. |
| **Donnees necessaires** | Toutes les donnees de l'annonce |
| **Priorite** | Critique |
| **Automatisable** | Oui -- verification automatique a la publication de l'annonce |

---

#### 3.11.3 Permis de louer (declaration ou autorisation prealable de mise en location)

| Champ | Detail |
|-------|--------|
| **Quoi** | Certaines communes ont instaure un **permis de louer** : le proprietaire doit soit effectuer une **declaration de mise en location** (a posteriori, dans les 15 jours suivant la signature du bail), soit obtenir une **autorisation prealable de mise en location** (avant la signature du bail). Le but est de lutter contre l'habitat indigne. Le dispositif est instaure par deliberation de l'EPCI ou du conseil municipal, dans des zones definies. |
| **Quand** | **Declaration** : dans les **15 jours** suivant la conclusion du bail. **Autorisation prealable** : avant la signature du bail (delai de reponse de l'administration : 1 mois, silence vaut acceptation). |
| **Base legale** | Articles L634-1 a L634-6 et L635-1 a L635-11 du CCH. Crees par la loi ALUR. |
| **Risque si oublie** | Amende de **5 000 EUR** maximum en cas de non-declaration. **15 000 EUR** maximum en cas de mise en location sans autorisation prealable (la ou elle est requise). Le prefet peut aussi declarer l'habitat insalubre. |
| **Donnees necessaires** | Adresse du bien, commune, existence d'un dispositif permis de louer dans la commune |
| **Priorite** | Critique (dans les communes concernees) |
| **Automatisable** | Oui -- verification automatique selon l'adresse du bien |

---

#### 3.11.4 Declaration de meuble de tourisme en mairie

| Champ | Detail |
|-------|--------|
| **Quoi** | Tout proprietaire mettant en location un **meuble de tourisme** (type Airbnb, Booking) doit en faire la declaration prealable en mairie au moyen du formulaire CERFA n14004*04. Dans certaines communes (>200 000 hab, petite couronne parisienne, communes en zone tendue), un **enregistrement** avec numero d'enregistrement est obligatoire et doit figurer dans l'annonce. A Paris et dans certaines villes, une **autorisation de changement d'usage** est necessaire pour la location touristique d'un logement autre que la residence principale. |
| **Quand** | **Avant** la mise en location touristique. Renouvellement eventuel selon la reglementation communale. |
| **Base legale** | Article L324-1-1 du Code du tourisme. Loi ELAN article 145 (enregistrement). Loi pour la confiance dans l'economie numerique. |
| **Risque si oublie** | Amende civile jusqu'a **10 000 EUR** pour defaut de declaration. **50 000 EUR** pour defaut d'enregistrement ou fausse declaration. Annulation de l'annonce par la plateforme. A Paris : amende de **50 000 EUR** par logement pour changement d'usage sans autorisation. |
| **Donnees necessaires** | Adresse du bien, commune, type de location (residence principale/secondaire), numero d'enregistrement |
| **Priorite** | Critique |
| **Automatisable** | Oui -- verification a la creation d'une annonce touristique |

---

#### 3.11.5 Limite de 120 jours pour la location touristique de la residence principale

| Champ | Detail |
|-------|--------|
| **Quoi** | La location saisonniere de la **residence principale** du proprietaire est limitee a **120 jours par an** (sauf obligations professionnelles, raisons de sante ou cas de force majeure). Au-dela, le logement est considere comme change d'usage. Les plateformes de location (Airbnb, etc.) ont l'obligation de bloquer automatiquement les reservations au-dela de 120 jours dans les communes ayant mis en place l'enregistrement. |
| **Quand** | Compteur annuel : du **1er janvier au 31 decembre** de chaque annee. Remise a zero chaque annee. |
| **Base legale** | Article L324-1-1 III du Code du tourisme. Loi ELAN article 145. |
| **Risque si oublie** | Amende civile de **10 000 EUR** par annonce. Si le logement n'est pas la residence principale : les sanctions pour changement d'usage sans autorisation s'appliquent (50 000 EUR a Paris). Transmission des donnees par les plateformes aux municipalites. |
| **Donnees necessaires** | Nombre de jours deja loues dans l'annee, residence principale (oui/non) |
| **Priorite** | Critique |
| **Automatisable** | Oui -- compteur de jours avec alerte a l'approche du seuil |

---

#### 3.11.6 Treve hivernale

| Champ | Detail |
|-------|--------|
| **Quoi** | Pendant la treve hivernale, il est **interdit de proceder a l'expulsion** d'un locataire, meme si une decision de justice d'expulsion a ete prononcee. La treve s'applique egalement aux coupures d'electricite, de gaz et de chauffage par les fournisseurs pour impayes. **Exception** : la treve ne s'applique pas si un relogement est assure dans des conditions suffisantes, ou en cas de squatteurs (depuis la loi ASAP de 2020). |
| **Quand** | Du **1er novembre** au **31 mars** de chaque annee. |
| **Base legale** | Article L412-6 du Code des procedures civiles d'execution. Loi Dalo n2007-290 du 5 mars 2007. |
| **Risque si oublie** | Toute expulsion realisee pendant la treve hivernale est **nulle**. Le bailleur s'expose a des poursuites penales pour violation de domicile. Dommages-interets au profit du locataire. |
| **Donnees necessaires** | Dates fixes (pas de calcul necessaire) |
| **Priorite** | Critique |
| **Automatisable** | Oui -- alerte automatique si une procedure d'expulsion est en cours a l'approche du 1er novembre |

---

#### 3.11.7 Entretien annuel de la chaudiere

| Champ | Detail |
|-------|--------|
| **Quoi** | L'entretien annuel de la chaudiere (gaz, fioul, bois, etc.) dont la puissance est comprise entre 4 et 400 kW est **obligatoire**. L'entretien est a la charge du **locataire** (charge locative), mais le bailleur doit s'assurer que l'installation est entretenue. L'attestation d'entretien doit etre conservee 2 ans. |
| **Quand** | **1 fois par an**. |
| **Base legale** | Decret n2009-649 du 9 juin 2009. Arrete du 15 septembre 2009. |
| **Risque si oublie** | En cas de sinistre (incendie, intoxication au CO), l'absence d'entretien peut entrainer la decheance de garantie de l'assurance. Responsabilite du bailleur si l'installation est defectueuse (obligation de delivrer un logement en bon etat). |
| **Donnees necessaires** | Type de chauffage, date du dernier entretien |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappel annuel a la date du dernier entretien |

---

#### 3.11.8 Entretien des detecteurs de fumee

| Champ | Detail |
|-------|--------|
| **Quoi** | Depuis le 8 mars 2015, chaque logement doit etre equipe d'au moins un **detecteur autonome avertisseur de fumee (DAAF)**. L'installation initiale est a la charge du **bailleur**. L'entretien (verification, changement de pile) est a la charge du **locataire** (sauf logement meuble ou saisonnier). |
| **Quand** | Installation : avant la mise en location. Entretien : **annuel** (verification du bon fonctionnement). Remplacement : selon la duree de vie du detecteur (generalement 5 a 10 ans). |
| **Base legale** | Loi n2010-238 du 9 mars 2010. Decret n2011-36 du 10 janvier 2011. Arrete du 5 fevrier 2013. |
| **Risque si oublie** | En cas d'incendie, la responsabilite du bailleur peut etre engagee s'il n'a pas installe le DAAF. La garantie de l'assurance peut etre affectee. |
| **Donnees necessaires** | Date d'installation du DAAF, duree de vie, date du dernier controle |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappel annuel |

---

#### 3.11.9 Ramonage de la cheminee

| Champ | Detail |
|-------|--------|
| **Quoi** | Le ramonage des conduits de fumee doit etre effectue regulierement par un professionnel qualifie. La frequence varie selon le combustible et le reglement sanitaire departemental : generalement **2 fois par an** dont **1 fois pendant la periode de chauffe** pour le bois/charbon, et **1 fois par an** pour le gaz/fioul. La charge incombe au **locataire**. |
| **Quand** | 1 a 2 fois par an selon le combustible et le departement. |
| **Base legale** | Reglement Sanitaire Departemental Type (article 31). Arrete municipal selon les communes. |
| **Risque si oublie** | Amende de **450 EUR** (contravention de 3eme classe). En cas de sinistre : decheance potentielle de la garantie incendie. |
| **Donnees necessaires** | Type de combustible, departement, date du dernier ramonage |
| **Priorite** | Important |
| **Automatisable** | Oui -- rappel selon la frequence applicable |

---

## 4. Recommandations d'implementation

### Phase 1 -- MVP (Rappels critiques et automatisables)

Ce sont les obligations les plus risquees et les plus faciles a automatiser. A implementer en priorite.

| # | Rappel | Declencheur | Donnees requises | Complexite |
|---|--------|-------------|-----------------|------------|
| 1 | **Expiration DPE** | 10 ans apres la date de realisation (ou dates d'obsolescence anticipee pour DPE anciens) | Date du DPE, classe energetique | Faible |
| 2 | **Interdiction location DPE G/F/E** | Dates fixes (01/01/2025, 01/01/2028, 01/01/2034) croisees avec la classe DPE | Classe DPE | Faible |
| 3 | **Gel des loyers DPE F/G** | Detection au moment de la revision IRL | Classe DPE | Faible |
| 4 | **Conge bailleur** | 7 mois (vide) / 4 mois (meuble) avant l'echeance du bail | Date echeance bail, type bail | Faible |
| 5 | **Revision annuelle IRL** | 1 mois avant la date anniversaire du bail | Date anniversaire bail, loyer, trimestre IRL | Moyenne (integration donnees INSEE) |
| 6 | **Restitution depot de garantie** | Jour de la remise des cles | Date remise cles, conformite EDL | Faible |
| 7 | **Regularisation annuelle des charges** | Apres reception du decompte de copropriete | Date cloture exercice, provisions, depenses reelles | Moyenne |
| 8 | **Expiration diagnostics (electricite, gaz)** | 6 ans apres la date de realisation | Date du diagnostic | Faible |
| 9 | **Expiration ERP** | 6 mois apres la date de realisation / avant chaque signature | Date ERP | Faible |
| 10 | **Etat des lieux d'entree et de sortie** | Date d'entree / date de fin de preavis | Dates entree/sortie | Faible |
| 11 | **Declaration revenus fonciers** | Avril-mai de chaque annee | Loyers percus, charges | Faible (rappel simple) |
| 12 | **Taxe fonciere** | Septembre de chaque annee | Adresse du bien | Faible (rappel simple) |
| 13 | **Treve hivernale** | 1er novembre et 31 mars | Procedures en cours | Faible |

### Phase 2 -- Rappels importants

| # | Rappel | Declencheur | Donnees requises | Complexite |
|---|--------|-------------|-----------------|------------|
| 14 | **Attestation assurance locataire** | Date anniversaire du bail | Date bail | Faible |
| 15 | **Renouvellement assurance PNO** | Date echeance contrat | Date echeance | Faible |
| 16 | **Quittance de loyer mensuelle** | Chaque mois apres paiement | Paiement enregistre | Faible |
| 17 | **Communication justificatifs charges** | 1 mois avant regularisation | Date regularisation prevue | Faible |
| 18 | **Expiration diagnostic plomb (si positif)** | 6 ans apres realisation | Date CREP, resultat | Faible |
| 19 | **Expiration diagnostic amiante (si positif)** | 3 ans apres realisation | Date DAPP, resultat | Faible |
| 20 | **AG copropriete** | A reception de la convocation | Date AG | Faible |
| 21 | **Entretien chaudiere annuel** | 1 an apres dernier entretien | Date dernier entretien | Faible |
| 22 | **Permis de louer** | Avant mise en location / 15 jours apres bail | Commune, existence du dispositif | Moyenne |
| 23 | **Notice d'information au bail** | A chaque generation de bail | Type de bail | Faible |
| 24 | **Offre renouvellement loyer** | 7 mois avant echeance bail (vide) | Date echeance, loyer, references | Moyenne |
| 25 | **Expiration diagnostic assainissement** | 3 ans apres realisation | Date diagnostic | Faible |
| 26 | **DPE collectif copropriete** | Selon taille copropriete et echeances legales | Nombre de lots | Faible |

### Phase 3 -- Recommandes / Nice-to-have

| # | Rappel | Declencheur | Donnees requises | Complexite |
|---|--------|-------------|-----------------|------------|
| 27 | **Encadrement des loyers -- verification** | A chaque creation de bail | Adresse, loyers de reference | Elevee (integration donnees prefectorales) |
| 28 | **Compteur 120 jours location touristique** | Incremente a chaque reservation | Jours loues | Moyenne |
| 29 | **Declaration meuble de tourisme** | A la creation d'une annonce touristique | Commune, type de bien | Faible |
| 30 | **Rappel ramonage cheminee** | 6 mois / 1 an apres dernier ramonage | Type combustible, date | Faible |
| 31 | **Detecteur de fumee (DAAF)** | 1 an apres installation / dernier controle | Date installation | Faible |
| 32 | **CFE (LMNP)** | Novembre de chaque annee | Statut LMNP | Faible |
| 33 | **Declaration debut activite LMNP** | A la creation du premier bail meuble | Presence SIRET | Faible |
| 34 | **IFI** | Mai de chaque annee (si patrimoine > seuil) | Valeur patrimoine immobilier | Faible |
| 35 | **Grille de vetuste automatique** | A l'EDL de sortie | EDL entree, duree bail, grille | Moyenne |
| 36 | **Diagnostic termites** | 6 mois apres realisation (si zone arretee) | Zone arretee, date diagnostic | Faible |
| 37 | **Diagnostic bruit** | Avant chaque nouveau bail (si zone PEB) | Zone PEB | Faible |

---

## 5. Notes techniques -- Evenements declencheurs (triggers)

### 5.1 Triggers lies au cycle de vie du bail

| Evenement | Rappels declenches |
|-----------|-------------------|
| **Creation d'un nouveau bail** | Verification DDT complet (DPE, ERP, electricite, gaz, amiante, plomb, surface Boutin), notice d'information, encadrement loyers, permis de louer, EDL entree, attestation assurance locataire |
| **Date anniversaire du bail** | Revision IRL (si clause), demande attestation assurance locataire |
| **X mois avant echeance du bail** | Conge bailleur (6 mois vide / 3 mois meuble), offre renouvellement loyer (6 mois vide / 3 mois meuble) |
| **Echeance du bail** | Renouvellement tacite (si pas de conge), nouveau bail eventuel |
| **Reception d'un conge locataire** | Calcul date fin preavis, preparation EDL sortie, preparation relocation, verification diagnostics pour prochain bail |
| **Remise des cles (entree)** | EDL entree, relevé compteurs |
| **Remise des cles (sortie)** | EDL sortie, calcul restitution depot de garantie (compte a rebours 1 ou 2 mois) |

### 5.2 Triggers lies aux diagnostics

| Evenement | Rappels declenches |
|-----------|-------------------|
| **Date de realisation d'un diagnostic** | Programmation du rappel d'expiration (DPE: 10 ans, electricite/gaz: 6 ans, ERP: 6 mois, amiante positif: 3 ans, plomb positif: 6 ans, assainissement: 3 ans, termites: 6 mois) |
| **Changement de reglementation DPE** | Alerte sur les logements dont la classe DPE tombe sous le nouveau seuil d'interdiction |
| **Travaux de renovation energetique** | Recommandation de refaire le DPE |
| **Travaux electriques ou gaz** | RAZ du compteur de 15 ans pour le diagnostic correspondant |

### 5.3 Triggers lies aux finances

| Evenement | Rappels declenches |
|-----------|-------------------|
| **Enregistrement d'un paiement de loyer** | Generation quittance (si automatisee) |
| **Reception decompte charges copropriete** | Lancement regularisation charges locataire (envoi decompte 1 mois avant, puis regularisation) |
| **Cloture exercice copropriete** | Rappel regularisation dans les 12 mois |
| **Avril de chaque annee** | Rappel declaration revenus fonciers |
| **Septembre de chaque annee** | Rappel taxe fonciere |
| **Novembre de chaque annee** | Rappel CFE (si LMNP) |

### 5.4 Triggers lies aux dates fixes

| Date | Rappels declenches |
|------|-------------------|
| **1er janvier** | RAZ compteur 120 jours location touristique |
| **1er janvier 2025** | Interdiction location DPE G (en vigueur) |
| **1er janvier 2028** | Interdiction location DPE F |
| **1er janvier 2034** | Interdiction location DPE E |
| **1er novembre** | Debut treve hivernale (alerte si procedure d'expulsion en cours) |
| **31 mars** | Fin treve hivernale |
| **24 aout 2022** | Gel des loyers DPE F/G (en vigueur) |

### 5.5 Triggers lies a l'etat du logement

| Evenement | Rappels declenches |
|-----------|-------------------|
| **DPE classe F ou G renseigne** | Alerte gel des loyers, alerte interdiction de location (actuelle ou future), recommandation travaux |
| **Age installation electrique > 15 ans** | Rappel diagnostic electricite obligatoire |
| **Age installation gaz > 15 ans** | Rappel diagnostic gaz obligatoire |
| **Date construction < 1949** | Rappel diagnostic plomb obligatoire |
| **Date permis construire < 1997** | Rappel diagnostic amiante obligatoire |
| **Assainissement non collectif** | Rappel diagnostic assainissement |
| **Zone arrete termites** | Rappel diagnostic termites |
| **Zone PEB aerodrome** | Rappel diagnostic bruit |
| **Surface habitable < 9m2** | Alerte logement potentiellement indecent |

---

## 6. Schema de donnees suggerees

Pour alimenter le systeme de rappels, voici les champs cles a stocker par bien immobilier :

### Bien immobilier (Property)

```
- dateConstruction: Date           # Pour diagnostics plomb (<1949), amiante (<1997)
- datePermisConstruire: Date       # Amiante
- surfaceHabitable: Number         # Loi Boutin, critere decence
- volumeHabitable: Number          # Critere decence (>20m3)
- classDPE: Enum(A-G)             # Interdictions, gel loyers
- consommationEnergetique: Number  # kWh/m2/an
- typeChauffage: Enum              # Entretien chaudiere
- typeAssainissement: Enum         # Collectif / Non collectif
- ageInstallationElectrique: Number # Diagnostic electricite (>15 ans)
- ageInstallationGaz: Number       # Diagnostic gaz (>15 ans)
- zoneArreteeTermites: Boolean     # Diagnostic termites
- zonePEB: Enum(A,B,C,D,null)     # Diagnostic bruit
- zoneTendue: Boolean              # Encadrement loyers, preavis reduit
- encadrementStrict: Boolean       # Loyers de reference
- copropriete: Boolean             # PNO, charges, AG
- nombreLotsCopro: Number          # DPE collectif
- communePermisLouer: Boolean      # Permis de louer
- adresse: String                  # Geolocalisation, commune
```

### Diagnostics (PropertyDiagnostic)

```
- type: Enum(DPE, AMIANTE, PLOMB, ELECTRICITE, GAZ, ERP, TERMITES, BRUIT, ASSAINISSEMENT)
- dateRealisation: Date
- dateExpiration: Date             # Calculee automatiquement
- resultat: Enum(POSITIF, NEGATIF, null)  # Pour amiante et plomb
- classeDPE: Enum(A-G)            # Specifique DPE
- diagnostiqueur: String           # Nom du professionnel
- numeroRapport: String
- documentUrl: String              # Lien vers le PDF
```

### Bail (Lease)

```
- type: Enum(VIDE, MEUBLE, ETUDIANT, MOBILITE)
- dateDebut: Date
- dateFin: Date                    # Calculee a partir du type et de la duree
- duree: Number                    # En mois
- loyerHC: Number                  # Hors charges
- provisions Charges: Number       # Provision mensuelle
- trimestreIRL: String             # Ex: "T2 2024"
- dateRevision: Date               # Date anniversaire ou date prevue
- depotGarantie: Number
- qualiteBailleur: Enum(PHYSIQUE, MORALE)
- congeDonne: Boolean
- dateConge: Date
- motifConge: Enum(REPRISE, VENTE, MOTIF_LEGITIME)
```

### Locataire (Tenant)

```
- dateAttestationAssurance: Date   # Derniere attestation recue
- dateEntree: Date
- dateSortie: Date
- dateRemiseCles: Date             # Pour calcul restitution depot
- edlEntreeConforme: Boolean
- edlSortieConforme: Boolean
```

---

## 7. Annexe -- References legislatives completes

| Reference | Sujet |
|-----------|-------|
| Loi n89-462 du 6 juillet 1989 | Loi fondamentale sur les rapports locatifs |
| Loi n2014-366 du 24 mars 2014 (ALUR) | Acces au logement et urbanisme renove |
| Loi n2018-1021 du 23 novembre 2018 (ELAN) | Evolution du logement et amenagement numerique |
| Loi n2021-1104 du 22 aout 2021 (Climat et Resilience) | Lutte contre le dereglement climatique |
| Decret n2002-120 du 30 janvier 2002 | Criteres de decence du logement |
| Decret n87-713 du 26 aout 1987 | Liste des charges recuperables |
| Decret n2016-382 du 30 mars 2016 | Etat des lieux type |
| Decret n2016-1104 et 2016-1105 du 11 aout 2016 | Diagnostics gaz et electricite pour la location |
| Decret n2006-1147 du 14 septembre 2006 | DPE |
| Decret n2023-796 du 18 aout 2023 | Critere de performance energetique (decence) |
| Decret n2022-1079 du 29 juillet 2022 | Gel des loyers DPE F/G |
| Decret n2015-650 du 10 juin 2015 | Zones tendues |
| Decret n2015-1437 du 5 novembre 2015 | Liste des communes en zone tendue |
| Articles L126-26 a L126-33 du CCH | DPE |
| Articles L134-6 et L134-7 du CCH | Diagnostics gaz et electricite |
| Articles L634-1 a L635-11 du CCH | Permis de louer |
| Articles L324-1-1 du Code du tourisme | Location meublee touristique |
| Articles R1334-14 a R1334-29 du Code sante publique | Amiante |
| Articles L1334-5 et L1334-6 du Code sante publique | Plomb |
| Articles L125-5 et R125-23 du Code environnement | ERP |
| Article L412-6 du Code procedures civiles d'execution | Treve hivernale |
| Articles 14 a 33 quinquies du CGI | Revenus fonciers |
| Articles 964 a 983 du CGI | IFI |
| Loi n65-557 du 10 juillet 1965 | Copropriete |

---

> **Avertissement** : Ce document est fourni a titre informatif et ne constitue pas un avis juridique. Les informations sont basees sur la legislation en vigueur au moment de la redaction. La legislation evolue regulierement ; il est recommande de verifier les textes en vigueur aupres de sources officielles (Legifrance, service-public.fr) et de consulter un professionnel du droit si necessaire.
