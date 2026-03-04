// ──────────────────────────────────────────────────────────
// Filtre anti-combinaisons gênantes
// À revoir par un humain avant mise en production
// ──────────────────────────────────────────────────────────

// Noms retirés complètement du dictionnaire
export const BLACKLIST_NOUNS: string[] = [
  'Boudin', 'Singe', 'Porc', 'Cochon', 'Vermine',
  'Vautour', 'Hyène', 'Cafard', 'Parasite',
  'Navet', 'Courge', 'Dinde', 'Âne',
];

// Adjectifs retirés complètement
export const BLACKLIST_ADJECTIVES: string[] = [
  'Humide', 'Visqueux', 'Gluant', 'Moite', 'Suintant',
  'Fourbe', 'Sournois', 'Vicieux', 'Pervers', 'Louche',
  'Puant', 'Nauséabond', 'Répugnant', 'Abject',
  'Stupide', 'Idiot', 'Débile', 'Crétin',
  'Laid', 'Moche', 'Hideux', 'Affreux',
  'Gros', 'Obèse', 'Maigre', 'Rachitique',
  'Sauvage',
];

// Paires nom + adjectif interdites (vérification sur la forme masculine)
const BLACKLIST_PAIRS: Record<string, string[]> = {
  'Concombre': ['Glissant'],
  'Olive': ['Glissant'],
  'Cornichon': ['Glissant'],
  'Brioche': ['Gonflé'],
  'Tortue': ['Lent'],
};

/**
 * Vérifie si une combinaison nom + adjectif est dans la blacklist
 * @param noun Le nom
 * @param masculineAdj La forme masculine de l'adjectif (clé de référence pour les paires)
 */
export function isBlacklisted(noun: string, masculineAdj: string): boolean {
  // Vérifier les noms bannis
  if (BLACKLIST_NOUNS.includes(noun)) return true;

  // Vérifier les adjectifs bannis (forme masculine = clé de référence)
  if (BLACKLIST_ADJECTIVES.includes(masculineAdj)) return true;

  // Vérifier les paires interdites (toujours vérifiées avec la forme masculine)
  const forbiddenAdj = BLACKLIST_PAIRS[noun];
  if (forbiddenAdj && forbiddenAdj.includes(masculineAdj)) return true;

  return false;
}
