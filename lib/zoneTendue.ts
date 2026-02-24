/**
 * Zone tendue detection based on official data from data.gouv.fr.
 * Source: décret n°2013-392 du 10 mai 2013, modifié par décret du 22/12/2025.
 *
 * Uses preprocessed JSON data matching postal codes to zone tendue status.
 * For ambiguous postal codes (multiple communes), city name disambiguation is used.
 *
 * Run `npx tsx scripts/preprocess-zones-tendues.ts` to regenerate the data files.
 */

import zoneTendueData from './data/zones-tendues.json';
import postalInseeMapping from './data/postal-insee-mapping.json';

const ztData = zoneTendueData as Record<string, boolean>;
const mappingData = postalInseeMapping as Record<string, Array<{ insee: string; name: string; zoneTendue: boolean }>>;

function normalizeCity(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a location is in zone tendue.
 * @param zipCode - The postal code (code postal)
 * @param city - Optional city name for disambiguation when a postal code covers multiple communes
 * @returns true if the location is in zone tendue
 */
export function checkZoneTendue(zipCode: string | null | undefined, city?: string | null): boolean {
  if (!zipCode) return false;
  const normalized = zipCode.trim();

  // Fast path: direct lookup by postal code
  if (normalized in ztData) {
    const status = ztData[normalized];

    // If true and there's ambiguous mapping data + city name, try to disambiguate
    if (status && city && normalized in mappingData) {
      const communes = mappingData[normalized];
      const normalizedCity = normalizeCity(city);
      const match = communes.find(c => normalizeCity(c.name) === normalizedCity);
      if (match) return match.zoneTendue;
      // No exact match: conservative — true if any commune is zone tendue
      return communes.some(c => c.zoneTendue);
    }

    return status;
  }

  // Postal code not in our data: check ambiguous mapping
  if (city && normalized in mappingData) {
    const communes = mappingData[normalized];
    const normalizedCity = normalizeCity(city);
    const match = communes.find(c => normalizeCity(c.name) === normalizedCity);
    if (match) return match.zoneTendue;
    return communes.some(c => c.zoneTendue);
  }

  return false;
}
