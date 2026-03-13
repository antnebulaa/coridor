# PATCH Import Annonce — Remplacer Claude Haiku par GPT-4o Mini

## Contexte

Le prompt PROMPT-IMPORT-ANNONCE-EXTERNE a été implémenté avec Claude Haiku (API Anthropic). Or Coridor n'a pas de clé API Anthropic — mais a déjà une clé OpenAI (`OPENAI_API_KEY`) utilisée pour Whisper (reconnaissance audio dans l'EDL).

Ce patch remplace l'appel Anthropic par un appel OpenAI. Le prompt d'extraction et tout le reste du code ne changent pas.

---

## Modifications

### 1. Remplacer l'appel API dans `services/ListingImportService.ts`

Remplacer l'import et l'appel Anthropic :

```typescript
// ❌ SUPPRIMER
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic();

// ✅ REMPLACER PAR
import OpenAI from 'openai';
const openai = new OpenAI();
```

Remplacer la fonction d'appel :

```typescript
// ❌ SUPPRIMER l'appel anthropic.messages.create(...)

// ✅ REMPLACER PAR
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  max_tokens: 1024,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
    { role: 'user', content: buildExtractionPrompt(cleanedHtml, sourceUrl) },
  ],
});

const text = response.choices[0]?.message?.content || '';
const parsed = JSON.parse(text);
```

Le `response_format: { type: 'json_object' }` force GPT-4o Mini à retourner un JSON valide — plus besoin de nettoyer les backticks markdown.

### 2. Supprimer la dépendance Anthropic

```bash
# Si @anthropic-ai/sdk a été installé pour cette feature, le retirer
npm uninstall @anthropic-ai/sdk

# Vérifier que openai est déjà installé (il devrait l'être pour Whisper)
npm list openai
```

### 3. Variables d'environnement

Aucune nouvelle variable nécessaire. Réutiliser `OPENAI_API_KEY` qui est déjà dans l'env Vercel pour Whisper.

Si une variable `ANTHROPIC_API_KEY` a été ajoutée pour cette feature, elle peut être retirée.

---

## Vérifications

- [ ] `import OpenAI from 'openai'` (pas `@anthropic-ai/sdk`)
- [ ] Modèle = `gpt-4o-mini` (pas `gpt-4o`, pas `gpt-4`)
- [ ] `response_format: { type: 'json_object' }` présent dans l'appel
- [ ] Le prompt d'extraction (`EXTRACTION_SYSTEM_PROMPT`) est inchangé — il est agnostique du modèle
- [ ] Le parsing de la réponse utilise `response.choices[0]?.message?.content`
- [ ] Pas de `@anthropic-ai/sdk` dans `package.json`
- [ ] `OPENAI_API_KEY` réutilisée (pas de nouvelle clé)
- [ ] `npm run build` → 0 erreurs
