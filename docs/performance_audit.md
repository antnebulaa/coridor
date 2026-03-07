# Rapport d'Audit de Performance : Coridor

Ce rapport présente une analyse approfondie des performances de l'application Coridor. L'objectif est d'identifier les goulots d'étranglement potentiels, les sous-optimisations et de proposer des pistes d'amélioration méthodiques, sans modifier le code actuel.

## 1. Architecture Next.js & Rendu (App Router)

### 🔴 Problème : Rendu `force-dynamic` sur la page d'accueil
Dans `app/[locale]/page.tsx`, la directive `export const dynamic = 'force-dynamic';` est utilisée.
- **Impact** : Cela force un rendu côté serveur (SSR) à *chaque* requête utilisateur, annulant complètement les bénéfices du cache statique (SSG) ou de la régénération incrémentale (ISR) de Next.js. Le serveur doit interroger la base de données et re-rendre la page pour chaque visiteur.
- **Solution recommandée** : Retirer `force-dynamic` et utiliser les paramètres de recherche (`searchParams`) de manière dynamique uniquement quand c'est nécessaire. Si possible, utiliser l'ISR (`revalidate`) pour mettre en cache les annonces pendant quelques minutes.

## 2. Base de données & Requêtes (Prisma)

### 🔴 Problème 1 : Giga-requête avec `include` imbriqués (`getListings.ts`)
Dans l'action `getListings.ts`, la requête Prisma pour récupérer les annonces inclut une arborescence très profonde (plus de 6 niveaux) :
`listing -> rentalUnit -> property -> owner / images / rooms (avec leurs images) / targetRoom (avec ses images)`.
- **Impact** : Prisma génère soit des jointures SQL massives, soit de multiples sous-requêtes. Cela ramène une énorme quantité de données en mémoire Node.js (V8) pour chaque annonce, y compris toutes les URLs d'images de tout le bâtiment, avant même le filtrage.
- **Solution recommandée** : Limiter le `select` aux données strictement nécessaires pour la "Card" de l'annonce (ex: nom, prix, ville, et uniquement la *première* image ou les 5 premières images maximum).

### 🔴 Problème 2 : Traitement en mémoire (Data Mapping) lourd (`getListings.ts`)
Après la requête Prisma, un grand `.map()` itère sur chaque annonce pour filtrer les images ("Chambre 1", etc.) et "aplatir" l'objet (`safeListings`).
- **Impact** : Filtrer des tableaux d'images en JS pour des dizaines d'annonces bloque l'Event Loop de Node.js, ce qui augmente le TTFB (Time To First Byte).
- **Solution recommandée** : Gérer ce filtrage d'images directement en SQL via une vue ou des requêtes spécifiques, ou dénormaliser les "Top 5 images" directement sur l'entité `Listing`.

### 🔴 Problème 3 : N+1 Query dans la boucle de 'Commute' (`getListings.ts`)
Aux lignes 85-127 de `getListings.ts`, il y a une boucle `for (const point of commutePoints)` qui exécute `await prisma.$queryRaw` à chaque itération.
- **Impact** : Multiplie les allers-retours vers la base de données. Si un utilisateur a 5 lieux favoris, le serveur fait 5 requêtes séquentielles avant de commencer la requête principale.
- **Solution recommandée** : Utiliser une requête spatiale PostGIS `UNION` ou `OR` pour vérifier tous les isochrones en une seule requête SQL.

## 3. Performance Client (React & UI)

### 🔴 Problème 1 : Perte du Code-Splitting sur les Modales (`layout.tsx`)
Dans `app/[locale]/layout.tsx`, toutes les modales (`SearchModal`, `CommuteModal`, `RegisterModal`, `LoginModal`, etc.) sont importées de manière statique au niveau racine.
- **Impact** : Même si vous utilisez `dynamic` à l'intérieur de certains composants, le fait d'importer ces immenses modales directement dans le `layout` racine force Next.js à inclure leur code JavaScript (y compris `framer-motion`, les requêtes Maps, etc.) dans le "bundle" initial de *toutes* les pages. Cela ralentit considérablement le First Contentful Paint (FCP) et le Time to Interactive (TTI).
- **Solution recommandée** : Importer toutes ces modales via `next/dynamic` dans le `layout.tsx` pour qu'elles ne soient chargées que lorsqu'elles sont déclenchées par l'utilisateur.

### 🟡 Problème 2 : Optimisation d'images redondante
Dans `ListingCardCarousel.tsx`, le composant `Image` natif de Next.js est combiné avec `getCloudinaryThumbnail()`.
- **Impact** : Potentielle double-optimisation. Le serveur Next.js télécharge et "re-compresse" une image Cloudinary qui est souvent déjà optimisée, consommant du CPU sur le serveur et potentiellement de la bande passante sans gain visuel.
- **Solution recommandée** : Configurer la propriété `loader` de `next/image` ou s'assurer que si Cloudinary est utilisé pour le redimensionnement, Next.js sert directement l'URL sans passer par son propre proxy d'optimisation d'image, via l'attribut `unoptimized={true}`.

## 4. Synthèse & Plan d'Action Recommandé

L'application souffre actuellement de problèmes structurels typiques des débuts de projets Next.js (App Router), où la simplicité de développement a pris le pas sur les optimisations serveur :

1. **Urgence Absolue (Serveur/DB)** : 
   - Résoudre les appels N+1 (boucle `commute` dans `getListings.ts`).
   - Alléger l'énorme instruction `include` dans `getListings`. Remplacer la logique JS lourde (filtrage d'images avec des boucles `.map()`) par des requêtes optimisées à la base de données.
2. **Priorité Haute (Next.js)** : 
   - Supprimer `force-dynamic` sur la page d'accueil. Tant qu'il sera présent, le site entera en souffrance au moindre pic de trafic. Mettre en place un ISR (ex: `revalidate: 60`).
3. **Priorité Moyenne (Frontend)** :
   - Charger les Modales globale en asynchrone (Lazy Loading via `next/dynamic`) depuis le `layout.tsx` pour diviser la taille initiale du JavaScript par 2 ou 3.
