/**
 * Unified rent control (encadrement des loyers) lookup module.
 *
 * Supports local client-side lookup for commune-based zone cities
 * (Lille, Bordeaux, Pays Basque, Est Ensemble) and flags cities
 * that need API calls (Paris, Lyon, Montpellier, Grenoble).
 */

import lilleData from './data/rent-control/lille.json';
import bordeauxData from './data/rent-control/bordeaux.json';
import paysBasqueData from './data/rent-control/pays-basque.json';
import estEnsembleData from './data/rent-control/est-ensemble.json';
import lyonData from './data/rent-control/lyon.json';
import montpellierData from './data/rent-control/montpellier.json';
import grenobleData from './data/rent-control/grenoble.json';

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

export interface RentControlResult {
  isEligible: boolean;
  source: 'official_api' | 'official_data' | 'none';
  territory?: string;
  referenceRent?: number;         // €/m²
  referenceRentMax?: number;      // €/m² majoré
  referenceRentMin?: number;      // €/m² minoré
  maxRent?: number;               // € total (majoré × surface)
  zone?: string;
  zoneRequired?: boolean;
  availableZones?: string[];
  zoneDescriptions?: Record<string, string>;
  needsApi?: boolean;             // true if only the API can resolve (Paris geospatial)
  message?: string;
}

interface RentControlEntry {
  zone: string;
  roomCount: number;
  era: string;
  isFurnished: boolean;
  referenceRent: number;
  referenceRentMax: number;
  referenceRentMin: number;
  propertyType?: string;
}

interface RentControlDataset {
  territory: string;
  year: number;
  source: string;
  zoneMapping?: Record<string, string>;
  irisToZone?: Record<string, string>;
  zoneType?: string;
  zoneRequired?: boolean;
  availableZones?: string[];
  zoneDescriptions?: Record<string, string>;
  entries: RentControlEntry[];
}

interface LookupParams {
  city: string;
  zipCode: string;
  roomCount: number;
  buildYear: number;
  isFurnished: boolean;
  surface: number;
  rentControlZone?: string;
}

// ────────────────────────────────────────────────────────
// City name normalization
// ────────────────────────────────────────────────────────

function normalizeCity(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ────────────────────────────────────────────────────────
// Era mapping
// ────────────────────────────────────────────────────────

function getEra(buildYear: number, territory?: TerritoryKey): string {
  if (buildYear < 1946) return 'avant 1946';
  if (buildYear <= 1970) return '1946-1970';
  if (buildYear <= 1990) return '1971-1990';
  // Lyon uses 5 eras with a split at 2005
  if (territory === 'lyon') {
    if (buildYear <= 2005) return '1991-2005';
    return 'après 2005';
  }
  return 'après 1990';
}

// ────────────────────────────────────────────────────────
// Territory detection
// ────────────────────────────────────────────────────────

type TerritoryKey = 'paris' | 'lyon' | 'lille' | 'montpellier' | 'bordeaux' | 'pays-basque' | 'grenoble' | 'est-ensemble';

const DATASETS: Record<Exclude<TerritoryKey, 'paris'>, RentControlDataset> = {
  'lille': lilleData as RentControlDataset,
  'bordeaux': bordeauxData as RentControlDataset,
  'pays-basque': paysBasqueData as RentControlDataset,
  'est-ensemble': estEnsembleData as RentControlDataset,
  'lyon': lyonData as RentControlDataset,
  'montpellier': montpellierData as RentControlDataset,
  'grenoble': grenobleData as RentControlDataset,
};

// Quick detection from zip code prefix
function detectTerritoryFromZip(zipCode: string): TerritoryKey | null {
  if (zipCode.startsWith('75')) return 'paris';
  // Other territories need city name matching
  return null;
}

// Full detection using city name against all zone mappings
function detectTerritory(city: string, zipCode: string): TerritoryKey | null {
  // Paris detection
  const normalizedCity = normalizeCity(city);
  if (
    normalizedCity === 'paris' ||
    normalizedCity.startsWith('paris ') ||
    zipCode.startsWith('75')
  ) {
    return 'paris';
  }

  // Check each dataset's zone mapping for the city
  for (const [key, dataset] of Object.entries(DATASETS)) {
    if (!dataset.zoneMapping) continue;
    const zoneKeys = Object.keys(dataset.zoneMapping);
    const match = zoneKeys.find(k => normalizeCity(k) === normalizedCity);
    if (match) return key as TerritoryKey;
  }

  // Zip-code-based fallback for broader coverage
  // Lyon area
  if (zipCode.startsWith('690') || zipCode.startsWith('691')) {
    // Check if it's in Lyon/Villeurbanne metro
    const lyonMapping = DATASETS['lyon'].zoneMapping;
    if (lyonMapping) {
      const match = Object.keys(lyonMapping).find(k => normalizeCity(k) === normalizedCity);
      if (match) return 'lyon';
    }
    // Lyon uses IRIS zones, might need API even if not in mapping
    if (normalizedCity.includes('lyon') || normalizedCity.includes('villeurbanne')) return 'lyon';
  }

  // Grenoble area
  if (zipCode.startsWith('380') || zipCode.startsWith('381')) {
    if (normalizedCity.includes('grenoble') || normalizedCity.includes('echirolles') ||
        normalizedCity.includes('saint martin d heres') || normalizedCity.includes('fontaine') ||
        normalizedCity.includes('meylan')) return 'grenoble';
  }

  // Bordeaux area
  if (zipCode.startsWith('330')) {
    if (normalizedCity.includes('bordeaux')) return 'bordeaux';
  }

  // Montpellier area
  if (zipCode.startsWith('340')) {
    if (normalizedCity.includes('montpellier')) return 'montpellier';
    const mtpMapping = DATASETS['montpellier'].zoneMapping;
    if (mtpMapping) {
      const match = Object.keys(mtpMapping).find(k => normalizeCity(k) === normalizedCity);
      if (match) return 'montpellier';
    }
  }

  return null;
}

// ────────────────────────────────────────────────────────
// Lookup logic
// ────────────────────────────────────────────────────────

function lookupInDataset(
  dataset: RentControlDataset,
  zone: string,
  roomCount: number,
  era: string,
  isFurnished: boolean,
): RentControlEntry | null {
  const cappedRooms = Math.min(Math.max(roomCount, 1), 4);

  // Try exact era match first, then fall back to closest
  const match = dataset.entries.find(e =>
    e.zone === zone &&
    e.roomCount === cappedRooms &&
    e.era === era &&
    e.isFurnished === isFurnished
  );

  return match || null;
}

// ────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────

export function lookupRentControl(params: LookupParams): RentControlResult {
  const { city, zipCode, roomCount, buildYear, isFurnished, surface, rentControlZone } = params;

  const territory = detectTerritory(city, zipCode);

  if (!territory) {
    return {
      isEligible: false,
      source: 'none',
      message: "Ce logement n'est pas situé dans une zone soumise à l'encadrement des loyers.",
    };
  }

  // Paris: always needs the geospatial API
  if (territory === 'paris') {
    return {
      isEligible: true,
      source: 'official_api',
      territory: 'Paris',
      needsApi: true,
      message: "Paris — données disponibles via l'API officielle opendata.paris.fr.",
    };
  }

  const dataset = DATASETS[territory];
  if (!dataset) {
    return { isEligible: false, source: 'none', message: 'Données non disponibles.' };
  }

  // Determine zone
  let zone: string | undefined = rentControlZone;

  if (!zone && dataset.zoneMapping) {
    // Try to auto-detect zone from city name
    const normalizedCity = normalizeCity(city);
    const matchKey = Object.keys(dataset.zoneMapping).find(
      k => normalizeCity(k) === normalizedCity
    );
    if (matchKey) {
      zone = dataset.zoneMapping[matchKey];
    }
  }

  // If zone still not determined and zone selection is required
  if (!zone && dataset.zoneRequired) {
    return {
      isEligible: true,
      source: 'official_data',
      territory: dataset.territory,
      zoneRequired: true,
      availableZones: dataset.availableZones || [],
      zoneDescriptions: dataset.zoneDescriptions,
      message: `${dataset.territory} — sélectionnez votre zone pour obtenir les loyers de référence.`,
    };
  }

  if (!zone) {
    // City not found in the zone mapping — might be outside the encadrement territory
    return {
      isEligible: false,
      source: 'none',
      territory: dataset.territory,
      message: `${city} n'est pas soumise à l'encadrement des loyers dans le territoire ${dataset.territory}.`,
    };
  }

  // Perform lookup
  const era = getEra(buildYear, territory);
  const entry = lookupInDataset(dataset, zone, roomCount, era, isFurnished);

  if (!entry) {
    return {
      isEligible: true,
      source: 'official_data',
      territory: dataset.territory,
      zone: `Zone ${zone}`,
      message: `Données non trouvées pour ce type de bien (${roomCount} pièces, ${era}, ${isFurnished ? 'meublé' : 'non meublé'}).`,
    };
  }

  const maxRent = Math.round(surface * entry.referenceRentMax * 100) / 100;

  return {
    isEligible: true,
    source: 'official_data',
    territory: dataset.territory,
    referenceRent: entry.referenceRent,
    referenceRentMax: entry.referenceRentMax,
    referenceRentMin: entry.referenceRentMin,
    maxRent: Math.round(maxRent),
    zone: `Zone ${zone} (${dataset.territory})`,
    message: `Loyer de référence majoré : ${entry.referenceRentMax} €/m² (${isFurnished ? 'Meublé' : 'Non meublé'}, ${roomCount >= 4 ? '4+' : roomCount} pièce${roomCount > 1 ? 's' : ''}, ${era}).`,
  };
}

/**
 * Get list of all supported rent control territories.
 */
export function getSupportedTerritories(): string[] {
  return ['Paris', ...Object.values(DATASETS).map(d => d.territory)];
}
