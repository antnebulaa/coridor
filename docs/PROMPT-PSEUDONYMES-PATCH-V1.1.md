# Patch v1.1 — Pseudonymes Anonymes

## Corrections à appliquer sur l'implémentation existante des pseudonymes.

---

## CORRECTION 1 — Unicité globale du pseudonyme

Le pseudonyme (`pseudonymFull`) doit être unique en base. Deux utilisateurs ne peuvent pas avoir le même pseudo.

### Prisma : ajouter une contrainte unique

```prisma
model User {
  // ... champs existants ...

  pseudonymEmoji    String?
  pseudonymText     String?
  pseudonymFull     String?   @unique   // ← AJOUTER @unique
  pseudonymPattern  String?
}
```

Migration : `npx prisma migrate dev --name pseudonym-unique-constraint`

### Générateur : vérifier l'unicité avant attribution

Modifier `services/PseudonymService.ts` (ou le code équivalent qui attribue le pseudonyme) :

```typescript
async function generateUniquePseudonym(): Promise<Pseudonym> {
  const maxAttempts = 20;

  for (let i = 0; i < maxAttempts; i++) {
    const pseudonym = generatePseudonym(); // la fonction existante

    // Vérifier qu'il n'est pas déjà pris
    const existing = await prisma.user.findUnique({
      where: { pseudonymFull: pseudonym.full },
    });

    if (!existing) {
      return pseudonym;
    }
  }

  // Fallback : ajouter un suffixe numérique discret
  // Ex: "🥒 Concombre Captivant II", "🥒 Concombre Captivant III"
  const base = generatePseudonym();
  const suffixes = ['II', 'III', 'IV', 'V', 'VI', 'VII'];

  for (const suffix of suffixes) {
    const candidate = {
      ...base,
      text: `${base.text} ${suffix}`,
      full: `${base.full} ${suffix}`,
    };

    const exists = await prisma.user.findUnique({
      where: { pseudonymFull: candidate.full },
    });

    if (!exists) return candidate;
  }

  // Dernier recours (ne devrait jamais arriver avec 1.6M combinaisons)
  const uuid = Date.now().toString(36).slice(-4);
  return {
    ...base,
    text: `${base.text} #${uuid}`,
    full: `${base.full} #${uuid}`,
  };
}
```

Remplacer tous les appels à `generatePseudonym()` lors de l'attribution par `generateUniquePseudonym()`.

---

## CORRECTION 2 — Pas de régénération après l'inscription

Le pseudonyme se choisit une seule fois, pendant le flow d'inscription (onboarding). Après validation ("C'est moi !"), il est verrouillé définitivement. C'est l'identité Coridor du locataire.

**Raisons :**
- Un proprio qui a vu "Concombre Captivant" en visite doit pouvoir le retrouver
- Des proprios peuvent se recommander des locataires entre eux par leur pseudo
- Le pseudo devient une identité de confiance qui se construit dans le temps (comme un pseudo forum ou un gamertag)
- Changer de pseudo casserait la traçabilité et la continuité

### Supprimer l'API de régénération

Supprimer le fichier `app/api/pseudonym/generate/route.ts` — cette API ne doit plus exister.

Ou si l'API est utilisée aussi pour la génération initiale (pendant l'onboarding), la modifier pour refuser les régénérations post-inscription :

```typescript
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pseudonymFull: true, onboardingCompleted: true },
  });

  // Si l'utilisateur a déjà un pseudo ET a terminé l'onboarding → refuser
  if (user?.pseudonymFull && user?.onboardingCompleted) {
    return NextResponse.json(
      { error: 'Votre pseudonyme est définitif et ne peut plus être changé.' },
      { status: 403 }
    );
  }

  // Sinon : génération ou régénération pendant l'onboarding
  const pseudonym = await generateUniquePseudonym();
  
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      pseudonymEmoji: pseudonym.emoji,
      pseudonymText: pseudonym.text,
      pseudonymFull: pseudonym.full,
      pseudonymPattern: pseudonym.pattern,
    },
  });

  return NextResponse.json(pseudonym);
}
```

**Note :** Si le modèle User n'a pas de champ `onboardingCompleted`, utiliser une autre condition. Par exemple : vérifier si le locataire a déjà postulé au moins une fois, ou simplement vérifier si le pseudonyme existe déjà et que le compte a plus de 24h. L'important c'est que la régénération ne soit possible que pendant la phase initiale de choix.

### Modifier le PseudonymGenerator.tsx

Le composant `PseudonymGenerator` ne doit apparaître que dans le flow d'onboarding. S'il est accessible depuis le profil, le retirer du profil.

Dans la page profil du locataire, afficher le pseudonyme en lecture seule :

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Votre identité Coridor                                  │
│                                                          │
│           🥒 Concombre Captivant                         │
│                                                          │
│  Votre pseudonyme est votre identité anonyme sur         │
│  Coridor. Il est visible par les propriétaires           │
│  jusqu'à ce qu'ils vous sélectionnent.                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Pas de bouton "Générer un autre". Pas de bouton "Modifier". C'est définitif.

---

## VÉRIFICATIONS

- [ ] Migration Prisma : contrainte `@unique` sur `pseudonymFull` appliquée
- [ ] Génération : si le pseudo existe déjà, un autre est généré automatiquement
- [ ] Génération : fonctionne même en cas de collisions multiples (suffixes II, III...)
- [ ] Onboarding : le locataire peut régénérer autant de fois qu'il veut AVANT de valider
- [ ] Onboarding : après "C'est moi !", le pseudo est sauvegardé et verrouillé
- [ ] Post-onboarding : l'API de régénération retourne 403
- [ ] Post-onboarding : aucun bouton "Modifier" ou "Régénérer" visible dans le profil
- [ ] Profil : le pseudo est affiché en lecture seule
- [ ] npm run build → 0 erreurs
