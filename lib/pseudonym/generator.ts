import { NOUNS, ADJECTIVES, PREPOSITION_COMPLEMENTS, type NounEntry, type AdjectiveEntry } from './dictionary';
import { isBlacklisted } from './blacklist';

export interface Pseudonym {
  emoji: string;
  text: string;   // "Concombre Captivant"
  full: string;   // "🥒 Concombre Captivant"
  pattern: 'A' | 'B';
}

function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Sélectionne la forme correcte de l'adjectif selon le genre du nom
 */
function getGenderedAdjective(adj: AdjectiveEntry, gender: 'M' | 'F'): string {
  return gender === 'F' ? adj.feminine : adj.masculine;
}

/**
 * Génère un pseudonyme aléatoire
 * Pattern A (70%) : emoji + nom + adjectif
 * Pattern B (30%) : emoji + nom + préposition + complément
 * L'emoji est lié au nom pour garantir la cohérence (🦊 = Renard, 🥒 = Concombre)
 */
export function generatePseudonym(): Pseudonym {
  const maxAttempts = 50;

  for (let i = 0; i < maxAttempts; i++) {
    const noun: NounEntry = randomPick(NOUNS);
    const emoji = noun.emoji;
    const usePatternB = Math.random() < 0.3;

    let text: string;
    let pattern: 'A' | 'B';

    if (usePatternB) {
      const complement = randomPick(PREPOSITION_COMPLEMENTS);
      text = `${noun.word} ${complement}`;
      pattern = 'B';
    } else {
      const adj: AdjectiveEntry = randomPick(ADJECTIVES);
      const genderedAdj = getGenderedAdjective(adj, noun.gender);

      // Vérifier la blacklist avec la forme masculine (clé de référence)
      if (isBlacklisted(noun.word, adj.masculine)) {
        continue;
      }

      text = `${noun.word} ${genderedAdj}`;
      pattern = 'A';
    }

    return {
      emoji,
      text,
      full: `${emoji} ${text}`,
      pattern,
    };
  }

  // Fallback safe — ajouter un suffixe unique pour éviter les doublons
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return {
    emoji: '⭐',
    text: `Étoile Mystérieuse ${suffix}`,
    full: `⭐ Étoile Mystérieuse ${suffix}`,
    pattern: 'A',
  };
}
