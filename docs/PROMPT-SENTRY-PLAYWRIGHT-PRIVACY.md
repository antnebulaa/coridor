# Monitoring Sentry + Tests E2E Playwright + Politique de confidentialité

## Contexte

Coridor est une app Next.js 16 massive (EDL, baux, messagerie, finances, Stripe, YouSign, Powens, push notifications) sans aucun monitoring d'erreurs ni tests automatisés. Quand un utilisateur tombe sur un bug en production, on ne le sait pas. Et quand on déploie une mise à jour, on n'a aucun filet de sécurité pour vérifier que les flows critiques fonctionnent encore.

Ce prompt installe :
1. **Sentry** — monitoring d'erreurs en temps réel (gratuit jusqu'à 5 000 erreurs/mois)
2. **Playwright** — tests E2E automatisés sur les flows critiques
3. **Mise à jour de la politique de confidentialité** — mention de Sentry comme sous-traitant

---

## ORGANISATION EN TEAM AGENTS

### Agent 1 — Sentry (monitoring)

**Mission :** Intégrer Sentry dans l'app Next.js pour capturer automatiquement toutes les erreurs client et serveur, avec identification de l'utilisateur connecté.

### Agent 2 — Playwright (tests E2E)

**Mission :** Installer Playwright, configurer la suite de tests, écrire les tests E2E pour les 8 flows critiques de Coridor.

### Agent 3 — Politique de confidentialité

**Mission :** Mettre à jour la politique de confidentialité pour mentionner Sentry et les données techniques collectées.

---

## AGENT 1 — SENTRY

### Installation

```bash
npx @sentry/wizard@latest -i nextjs
```

Le wizard va :
- Installer `@sentry/nextjs`
- Créer `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Créer `app/global-error.tsx` pour capturer les erreurs React
- Créer `instrumentation.ts` (si Next.js 16+)
- Modifier `next.config.ts` pour wrapper avec `withSentryConfig`
- Créer `.env.sentry-build-plugin` avec le token d'auth (ajouté au `.gitignore`)

Si le wizard ne fonctionne pas (problème de version), faire le setup manuel.

### Configuration

**sentry.client.config.ts :**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance : 10% des transactions en prod (suffisant pour détecter les problèmes)
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  
  // Session Replay : 10% des sessions normales, 100% des sessions avec erreur
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    Sentry.replayIntegration(),
  ],
  
  // Ne pas envoyer les PII par défaut
  sendDefaultPii: false,
  
  // Filtrer les erreurs bruyantes (extensions navigateur, etc.)
  ignoreErrors: [
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^Loading chunk \d+ failed/,
    /^Loading CSS chunk \d+ failed/,
  ],
  
  // Environnement
  environment: process.env.NODE_ENV,
});
```

**sentry.server.config.ts :**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN, // Pas NEXT_PUBLIC — côté serveur
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  environment: process.env.NODE_ENV,
});
```

**sentry.edge.config.ts :**

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### next.config.ts

Wrapper la config existante avec `withSentryConfig`. **Ne pas écraser la config actuelle** — l'envelopper :

```typescript
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  // ... config existante de Coridor (ne rien modifier)
};

export default withSentryConfig(nextConfig, {
  // Upload les source maps pour un debugging lisible dans Sentry
  silent: true,
  
  // Désactiver le telemetry Sentry
  telemetry: false,
  
  // Cacher les source maps en prod (ne pas les exposer publiquement)
  hideSourceMaps: true,
  
  // Annotation des composants React (utile pour Session Replay)
  reactComponentAnnotation: {
    enabled: true,
  },
  
  // Turbopack (si Next.js 16+)
  _experimental: {
    turbopackReactComponentAnnotation: {
      enabled: true,
    },
  },
});
```

### Global Error Handler

Créer `app/global-error.tsx` (si le wizard ne l'a pas fait) :

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h2>Une erreur est survenue</h2>
          <p>Notre équipe a été notifiée.</p>
          <button onClick={reset}>Réessayer</button>
        </div>
      </body>
    </html>
  );
}
```

### Identification utilisateur

Pour savoir QUEL utilisateur a eu le bug, ajouter `Sentry.setUser()` quand l'utilisateur se connecte.

**Côté client — dans le layout principal ou le AuthProvider :**

```typescript
// Dans le composant qui a accès à l'utilisateur connecté (ex: AuthProvider, layout.tsx client)
import * as Sentry from "@sentry/nextjs";

useEffect(() => {
  if (currentUser) {
    Sentry.setUser({
      id: currentUser.id,
      email: currentUser.email, // optionnel — si tu veux voir l'email dans Sentry
    });
  } else {
    Sentry.setUser(null);
  }
}, [currentUser]);
```

**Côté serveur — dans les server actions critiques :**

```typescript
// Dans les server actions qui pourraient échouer (ex: commitRegularization, generatePdf, etc.)
import * as Sentry from "@sentry/nextjs";

try {
  // ... logique
} catch (error) {
  Sentry.withScope((scope) => {
    scope.setUser({ id: userId });
    scope.setTag("feature", "regularization");
    scope.setContext("regularization", { applicationId, year });
    Sentry.captureException(error);
  });
  throw error;
}
```

### Variables d'environnement

Ajouter dans Vercel :

```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx   # Pour le client
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx                # Pour le serveur
SENTRY_AUTH_TOKEN=sntrys_xxx                                    # Pour l'upload des source maps (build time)
SENTRY_ORG=coridor                                              # Nom de l'org Sentry
SENTRY_PROJECT=coridor-web                                      # Nom du projet Sentry
```

**Pour obtenir ces valeurs :**
1. Créer un compte sur sentry.io (gratuit)
2. Créer un projet "Next.js"
3. Copier le DSN depuis Settings → Projects → coridor-web → Client Keys
4. Générer un auth token depuis Settings → Auth Tokens

### Supprimer la page de test

Le wizard crée une page `/sentry-example-page`. La supprimer après avoir vérifié que Sentry fonctionne :

```bash
rm -rf app/sentry-example-page
rm -rf app/api/sentry-example-api
```

### Vérifications Agent 1

- [ ] `@sentry/nextjs` installé
- [ ] 3 fichiers de config (client, server, edge)
- [ ] `next.config.ts` wrappé avec `withSentryConfig` sans casser la config existante
- [ ] `app/global-error.tsx` créé
- [ ] `Sentry.setUser()` appelé côté client quand l'utilisateur se connecte
- [ ] `Sentry.setUser(null)` quand l'utilisateur se déconnecte
- [ ] Variables d'env documentées (DSN, auth token, org, project)
- [ ] `.env.sentry-build-plugin` dans `.gitignore`
- [ ] `ignoreErrors` filtrant le bruit (ResizeObserver, chunks, etc.)
- [ ] Page de test Sentry supprimée
- [ ] `npm run build` → 0 erreurs
- [ ] Source maps uploadées (vérifier dans Sentry → Settings → Source Maps)

---

## AGENT 2 — PLAYWRIGHT (TESTS E2E)

### Installation

```bash
npm init playwright@latest
```

Répondre :
- TypeScript : Yes
- Tests directory : `e2e`
- GitHub Actions workflow : Yes
- Install Playwright browsers : Yes

### Configuration

**playwright.config.ts :**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Setup : authentification
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Tests desktop
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/landlord.json',
      },
      dependencies: ['setup'],
    },
    // Tests mobile
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        storageState: 'e2e/.auth/landlord.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Setup d'authentification

Créer `e2e/auth.setup.ts` pour se connecter une seule fois et réutiliser la session :

```typescript
import { test as setup, expect } from '@playwright/test';

const LANDLORD_EMAIL = process.env.TEST_LANDLORD_EMAIL || 'test-landlord@coridor.fr';
const LANDLORD_PASSWORD = process.env.TEST_LANDLORD_PASSWORD || 'TestPassword123!';

setup('authenticate as landlord', async ({ page }) => {
  // Naviguer vers la page de connexion
  await page.goto('/');
  
  // Trouver et cliquer sur le bouton de connexion
  // ADAPTER selon l'UI de connexion Coridor :
  await page.getByRole('button', { name: /connexion/i }).click();
  
  // Remplir le formulaire
  await page.getByLabel(/email/i).fill(LANDLORD_EMAIL);
  await page.getByLabel(/mot de passe/i).fill(LANDLORD_PASSWORD);
  await page.getByRole('button', { name: /se connecter/i }).click();
  
  // Attendre la redirection vers le dashboard
  await page.waitForURL('**/dashboard**');
  await expect(page.getByRole('heading')).toBeVisible();
  
  // Sauvegarder la session
  await page.context().storageState({ path: 'e2e/.auth/landlord.json' });
});
```

**IMPORTANT :** L'agent doit adapter le setup d'auth au système de Coridor (Supabase Auth). Grep le composant de connexion pour trouver les bons sélecteurs :

```bash
grep -rn "signIn\|login\|connexion" components/modals/LoginModal.tsx app/ --include="*.tsx" | head -20
```

### Ajouter au .gitignore

```
e2e/.auth/
test-results/
playwright-report/
```

### Scripts npm

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

### Les 8 tests E2E critiques

Écrire un test pour chaque flow critique de Coridor. Chaque test vérifie le happy path complet.

**Test 1 — Dashboard propriétaire (`e2e/dashboard.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test('dashboard loads with KPIs and properties', async ({ page }) => {
  await page.goto('/fr/dashboard');
  
  // Le dashboard s'affiche (pas de skeleton infini)
  await expect(page.getByText(/revenus|loyers/i)).toBeVisible({ timeout: 10000 });
  
  // Les KPIs sont visibles
  await expect(page.locator('[data-testid="kpi-card"]').first()).toBeVisible();
  
  // La liste des biens est visible
  await expect(page.locator('[data-testid="property-card"]').first()).toBeVisible();
});
```

**Test 2 — Navigation principales (`e2e/navigation.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test('main navigation works', async ({ page }) => {
  await page.goto('/fr/dashboard');
  
  // Naviguer vers les propriétés
  await page.getByRole('link', { name: /biens|propriétés/i }).click();
  await expect(page).toHaveURL(/properties/);
  
  // Naviguer vers les finances
  await page.getByRole('link', { name: /finances/i }).click();
  await expect(page).toHaveURL(/finances/);
  
  // Naviguer vers le calendrier
  await page.getByRole('link', { name: /agenda|calendrier/i }).click();
  await expect(page).toHaveURL(/calendar/);
  
  // Naviguer vers les messages
  await page.getByRole('link', { name: /messages/i }).click();
  await expect(page).toHaveURL(/inbox/);
  
  // Retour dashboard
  await page.getByRole('link', { name: /activités|dashboard/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});
```

**Test 3 — Page finances (`e2e/finances.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test('finances page loads with summary and sections', async ({ page }) => {
  await page.goto('/fr/finances');
  
  // Le résultat net s'affiche
  await expect(page.getByText(/résultat net|encaissé/i)).toBeVisible({ timeout: 10000 });
  
  // Les quick links sont visibles
  await expect(page.getByText(/quittances/i)).toBeVisible();
  await expect(page.getByText(/dépenses/i)).toBeVisible();
});
```

**Test 4 — Création d'annonce (`e2e/create-listing.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test('listing creation flow starts correctly', async ({ page }) => {
  await page.goto('/fr/properties');
  
  // Cliquer sur "Ajouter un bien" ou équivalent
  await page.getByRole('button', { name: /ajouter|créer|nouveau/i }).click();
  
  // La modale d'ajout s'ouvre avec le titre "Parlez-nous de votre logement"
  await expect(page.getByText(/parlez-nous|votre logement/i)).toBeVisible();
  
  // Le bouton "Commencer" est visible
  await expect(page.getByRole('button', { name: /commencer/i })).toBeVisible();
  
  // Le bouton "Importer" est visible (feature import annonce)
  await expect(page.getByText(/importer|annonce existante/i)).toBeVisible();
});
```

**Test 5 — Messagerie (`e2e/messaging.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test('messaging loads conversations', async ({ page }) => {
  await page.goto('/fr/inbox');
  
  // La liste des conversations s'affiche
  await expect(page.locator('[data-testid="conversation-item"]').first()).toBeVisible({ timeout: 10000 });
});
```

**Test 6 — Suivi des loyers (`e2e/rent-tracking.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test('rent tracking page loads with monthly view', async ({ page }) => {
  await page.goto('/fr/finances/suivi-loyers');
  
  // Le résumé s'affiche
  await expect(page.getByText(/encaissé/i)).toBeVisible({ timeout: 10000 });
  
  // Le navigateur de mois est visible
  await expect(page.getByText(/mois en cours|2026/i)).toBeVisible();
});
```

**Test 7 — Régularisation des charges (`e2e/regularization.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test('regularization flow opens with welcome screen', async ({ page }) => {
  await page.goto('/fr/finances');
  
  // Cliquer sur le lien régularisation
  await page.getByText(/régularisation/i).click();
  
  // L'écran d'accueil s'affiche
  await expect(page.getByText(/régularisation des charges/i)).toBeVisible();
  
  // Le guide est proposé
  await expect(page.getByText(/première fois|guide/i)).toBeVisible();
  
  // Le bouton "Commencer" est visible
  await expect(page.getByRole('button', { name: /commencer/i })).toBeVisible();
});
```

**Test 8 — Page EDL (`e2e/edl.spec.ts`)**

```typescript
import { test, expect } from '@playwright/test';

test('EDL page loads without errors', async ({ page }) => {
  // Ce test vérifie que la page EDL ne crash pas au chargement
  // On ne peut pas tester le flow complet (caméra, photos) en E2E
  // mais on vérifie que l'infrastructure est stable
  
  await page.goto('/fr/properties');
  
  // Vérifier qu'il n'y a pas d'erreur JavaScript non gérée
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  
  // Naviguer dans l'app pendant 5 secondes
  await page.waitForTimeout(2000);
  
  // Aucune erreur JS ne devrait être capturée
  expect(errors).toHaveLength(0);
});
```

### GitHub Actions

Le wizard Playwright crée `.github/workflows/playwright.yml`. Le vérifier et s'assurer qu'il :
- S'exécute sur chaque push et PR
- Installe les dépendances (`npm ci`)
- Installe les navigateurs (`npx playwright install --with-deps`)
- Lance les tests (`npx playwright test`)
- Upload le rapport en artifact si les tests échouent

**IMPORTANT :** Les tests E2E ont besoin d'un serveur Next.js qui tourne. En CI, utiliser la config `webServer` de `playwright.config.ts` qui lance `npm run dev` automatiquement. Les variables d'env de test (email/password du compte test) doivent être dans les secrets GitHub.

### Compte de test

Créer un compte propriétaire de test dans Supabase (ou via l'API d'inscription) :
- Email : `test-landlord@coridor.fr`
- Avec au moins 1 bien, 1 bail actif, quelques dépenses
- Ce compte ne doit jamais être supprimé

Les credentials sont dans les variables d'env CI :
```
TEST_LANDLORD_EMAIL=test-landlord@coridor.fr
TEST_LANDLORD_PASSWORD=TestPassword123!
```

### Vérifications Agent 2

- [ ] Playwright installé avec navigateurs
- [ ] `playwright.config.ts` configuré (baseURL, webServer, projects desktop + mobile)
- [ ] Setup d'auth fonctionnel (session réutilisée entre les tests)
- [ ] 8 tests E2E écrits et passants
- [ ] `.gitignore` mis à jour (auth state, reports)
- [ ] Scripts npm ajoutés (`test:e2e`, `test:e2e:ui`)
- [ ] GitHub Actions workflow configuré
- [ ] Les sélecteurs sont adaptés à l'UI réelle de Coridor (pas des sélecteurs inventés)
- [ ] `npm run test:e2e` → tous les tests passent en local

---

## AGENT 3 — POLITIQUE DE CONFIDENTIALITÉ

### Ce qu'il faut ajouter

Trouver le fichier de la politique de confidentialité dans le projet :

```bash
# Chercher la page politique de confidentialité
find app/ -name "*.tsx" -path "*privacy*" -o -name "*.tsx" -path "*confidentialite*" -o -name "*.tsx" -path "*legal*" | head -10

# Ou dans les pages statiques
find public/ -name "*privacy*" -o -name "*confidentialite*" | head -5

# Ou dans les traductions
grep -rn "confidentialit\|privacy\|donn.*personnelles" messages/fr.json | head -10
```

### Texte à ajouter

Ajouter une section dans la politique de confidentialité existante, dans la partie "Sous-traitants" ou "Services tiers" ou "Traitement des données" :

```markdown
### Monitoring et amélioration du service

Nous utilisons **Sentry** (Functional Software, Inc., San Francisco, États-Unis) pour détecter 
et corriger les erreurs techniques de l'application. 

**Données collectées automatiquement en cas d'erreur :**
- L'URL de la page où l'erreur s'est produite
- Le type de navigateur et d'appareil utilisé
- La trace technique de l'erreur (stack trace)
- Votre identifiant utilisateur (pour nous permettre de vous contacter si nécessaire)

**Données NON collectées :**
- Vos mots de passe
- Vos documents personnels (bail, EDL, pièces justificatives)
- Le contenu de vos messages
- Vos informations bancaires

**Finalité :** Améliorer la stabilité et la performance de l'application, corriger les bugs 
avant qu'ils n'affectent d'autres utilisateurs.

**Base légale :** Intérêt légitime (article 6.1.f du RGPD) — assurer le bon fonctionnement 
du service.

**Durée de conservation :** Les données d'erreur sont conservées 90 jours dans Sentry, 
puis supprimées automatiquement.

**Transfert hors UE :** Sentry est basé aux États-Unis. Le transfert est encadré par les 
clauses contractuelles types (SCC) de la Commission européenne, conformément au RGPD.

**Opt-out :** Les bloqueurs de publicités (uBlock Origin, etc.) bloquent automatiquement Sentry. 
Si vous utilisez un bloqueur, aucune donnée n'est envoyée.
```

### Ajouter Sentry dans la liste des sous-traitants

Si la politique de confidentialité a un tableau ou une liste de sous-traitants (Supabase, Vercel, Stripe, Cloudinary, etc.), ajouter :

| Sous-traitant | Finalité | Données | Pays | Garanties |
|---|---|---|---|---|
| Sentry (Functional Software, Inc.) | Monitoring d'erreurs | URL, navigateur, identifiant utilisateur, trace technique | États-Unis | Clauses contractuelles types (SCC) |

### i18n

Si la politique de confidentialité est traduite en anglais (`messages/en.json`), ajouter aussi la version anglaise du texte.

### Vérifications Agent 3

- [ ] Fichier de la politique de confidentialité trouvé et identifié
- [ ] Section Sentry ajoutée avec toutes les informations requises (données collectées, finalité, base légale, durée, transfert, opt-out)
- [ ] Sentry ajouté dans la liste des sous-traitants (si elle existe)
- [ ] Version anglaise ajoutée (si la politique est bilingue)
- [ ] Le texte est cohérent avec le reste de la politique (même ton, même structure)
- [ ] `npm run build` → 0 erreurs
