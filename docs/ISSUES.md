# Issues & Bugs à corriger

> Fichier de suivi des issues détectées lors des reviews (shazam) ou du développement.
> Quand une issue est corrigée, la déplacer dans la section "Corrigées" en bas.

---

## En attente

### Dark mode — SubscriptionClient
- **Fichier** : `app/[locale]/account/subscription/SubscriptionClient.tsx`
- **Sévérité** : MEDIUM
- **Détail** : La page abonnement a 90+ classes Tailwind de couleurs (bg-white, text-neutral-900, border-neutral-200, etc.) mais aucun variant `dark:`. En dark mode, la page est quasiment illisible (fond blanc sur fond sombre, mauvais contrastes).
- **Fix** : Ajouter les variants `dark:bg-neutral-900 dark:border-neutral-700 dark:text-white` etc. sur toutes les cards, textes et badges, comme sur les autres pages account.

### Dark mode — InvoicePdfDocument (locale hardcodée)
- **Fichier** : `components/documents/InvoicePdfDocument.tsx`
- **Sévérité** : LOW
- **Détail** : Les dates du PDF sont toujours en français (`locale: fr` de date-fns hardcodé). Un utilisateur anglophone recevra une facture avec des dates en français ("14 mars 2026" au lieu de "March 14, 2026").
- **Fix** : Accepter un `locale` en prop dans `InvoicePdfData` et l'utiliser pour le formatage date-fns.

### Type safety — `as any` casts pour role admin
- **Fichiers** : `app/api/invoices/[invoiceId]/generate-pdf/route.ts`, `app/api/applications/[applicationId]/advance/route.ts`
- **Sévérité** : LOW
- **Détail** : `(currentUser as any).role === 'ADMIN'` contourne le typage TypeScript. Si le champ `role` est renommé ou supprimé, le bug ne sera pas détecté à la compilation.
- **Fix** : Ajouter `role` au type `SafeUser` ou créer un guard `isAdmin(user)`.

### Upload preset Cloudinary hardcodé
- **Fichier** : `app/api/invoices/[invoiceId]/generate-pdf/route.ts`
- **Sévérité** : LOW
- **Détail** : `'airbnb-clone'` est hardcodé comme upload preset. C'est le même preset que partout dans l'app, mais idéalement ce serait une constante ou env var.
- **Fix** : Extraire dans une constante `CLOUDINARY_UPLOAD_PRESET` ou env var.

### EditPropertyClient — type mismatch SafeListing
- **Fichier** : `app/[locale]/properties/[listingId]/edit/page.tsx`
- **Sévérité** : LOW
- **Détail** : Le type `SafeListing` ne correspond pas exactement au type attendu par le formulaire d'édition, probablement à cause de la sérialisation `cardData` JSONB.
- **Fix** : Vérifier que le Prisma select correspond au type attendu.

---

## Corrigées (cette session)

### Deposit API — `property.title` inexistant ✅
- **Fichiers** : 7 fichiers deposit (export-timeline, formal-notice, route, alerts, DepositService, CDCDossierService, page)
- **Détail** : Les queries Prisma sélectionnaient `title: true` sur `Property` alors que `title` est sur `Listing`. Causait des erreurs TypeScript et des crashes runtime.
- **Fix** : Déplacé `title` du select Property vers le select Listing, mis à jour les références.

### Cloudinary upload — pas de validation `secure_url` ✅
- **Fichier** : `app/api/invoices/[invoiceId]/generate-pdf/route.ts`
- **Détail** : Si Cloudinary retournait une erreur dans un 200 OK (pas de `secure_url`), `undefined` était stocké en base.
- **Fix** : Ajout d'un check `if (!uploadData.secure_url)` avec erreur 500.

### LegalInfoSection — undefined params dans `t()` ✅
- **Fichier** : `app/[locale]/properties/[listingId]/edit/components/LegalInfoSection.tsx`
- **Détail** : `rentControlInfo.territory` et les champs numériques pouvaient être `undefined`, causant des erreurs de type avec `t()`.
- **Fix** : Ajout null coalescing (`?? ''`, `?? 0`).

### InvoicePdfDocument — `formatAmount` NaN ✅
- **Fichier** : `components/documents/InvoicePdfDocument.tsx`
- **Détail** : Si `amountCents` était `NaN` ou `Infinity`, le PDF affichait "NaN €".
- **Fix** : Guard `Number.isFinite(cents)` avec fallback `'0,00'`.

### CategorySection — smart/curly quotes ✅
- **Fichier** : `app/[locale]/properties/[listingId]/edit/components/CategorySection.tsx`
- **Détail** : Des guillemets courbes Unicode (U+2018/U+2019) au lieu de guillemets droits cassaient le parser SWC/Turbopack.
- **Fix** : Remplacé par des guillemets droits ASCII.
