/**
 * Script de prétraitement des zones tendues.
 *
 * Télécharge les données officielles de data.gouv.fr et La Poste,
 * puis génère les fichiers JSON utilisés par l'application.
 *
 * Usage: npx tsx scripts/preprocess-zones-tendues.ts
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const ZONE_TENDUE_CSV_URL =
  'https://static.data.gouv.fr/resources/liste-des-communes-selon-le-zonage-tlv-1/20251230-094759/zonage-tlv-decret-22-dec-2025.csv';

const POSTAL_INSEE_CSV_URL =
  'https://datanova.laposte.fr/data-fair/api/v1/datasets/laposte-hexasmal/metadata-attachments/base-officielle-codes-postaux.csv';

const OUTPUT_DIR = join(__dirname, '..', 'lib', 'data');

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

function parseCSV(text: string, separator = ','): Record<string, string>[] {
  // Remove BOM if present
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });
}

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
// Main
// ────────────────────────────────────────────────────────

async function main() {
  console.log('=== Preprocessing Zones Tendues ===\n');

  // 1. Download zone tendue CSV
  console.log('1. Downloading zone tendue CSV from data.gouv.fr...');
  const ztResponse = await fetch(ZONE_TENDUE_CSV_URL);
  if (!ztResponse.ok) throw new Error(`Failed to download zone tendue CSV: ${ztResponse.status}`);
  const ztText = await ztResponse.text();
  const ztRows = parseCSV(ztText, ';');
  console.log(`   → ${ztRows.length} communes parsed`);

  // 2. Build set of zone tendue INSEE codes
  const zoneTendueInsee = new Set<string>();
  let ztCount = 0;

  // Find the correct column name (may have accents)
  const sampleRow = ztRows[0];
  const zonageKey = Object.keys(sampleRow).find(k =>
    k.toLowerCase().includes('zonage tlv post')
  ) || '';
  console.log(`   Column used: "${zonageKey}"`);

  for (const row of ztRows) {
    const codgeo = row['CODGEO25'] || row['CODGEO'] || '';
    const zonage = zonageKey ? row[zonageKey] : '';

    // "1. Zone tendue" or "2. Zone touristique et tendue" → zone tendue
    // "3. Non tendue" → not zone tendue
    if (zonage.includes('tendue') && !zonage.includes('Non tendue')) {
      zoneTendueInsee.add(codgeo);
      ztCount++;
    }
  }
  console.log(`   → ${ztCount} communes en zone tendue\n`);

  // 3. Download La Poste postal code mapping
  console.log('2. Downloading La Poste postal code mapping...');
  const postalResponse = await fetch(POSTAL_INSEE_CSV_URL);
  if (!postalResponse.ok) throw new Error(`Failed to download postal CSV: ${postalResponse.status}`);
  const postalText = await postalResponse.text();
  const postalRows = parseCSV(postalText, ',');
  console.log(`   → ${postalRows.length} entries parsed\n`);

  // 4. Build postal → INSEE mapping
  console.log('3. Cross-referencing postal codes with zone tendue status...');

  // Special cases: Paris (75056), Lyon (69123), Marseille (13055)
  // These "commune nouvelle" codes encompass all arrondissements.
  // La Poste uses arrondissement-level INSEE codes (75101-75120, 69381-69389, 13201-13216)
  // but the zone tendue CSV uses the global commune code.
  // We map arrondissement INSEE codes to their parent commune code for lookup.
  const ARRONDISSEMENT_PARENT: Record<string, string> = {};

  // Paris: 75101-75120 → 75056
  for (let i = 1; i <= 20; i++) {
    ARRONDISSEMENT_PARENT[`751${i.toString().padStart(2, '0')}`] = '75056';
  }
  // Lyon: 69381-69389 → 69123
  for (let i = 1; i <= 9; i++) {
    ARRONDISSEMENT_PARENT[`6938${i}`] = '69123';
  }
  // Marseille: 13201-13216 → 13055
  for (let i = 1; i <= 16; i++) {
    ARRONDISSEMENT_PARENT[`132${i.toString().padStart(2, '0')}`] = '13055';
  }

  // Map<postalCode, Array<{insee, name, zoneTendue}>>
  const postalToCommunes = new Map<string, Array<{ insee: string; name: string; zoneTendue: boolean }>>();

  for (const row of postalRows) {
    const postalCode = row['code_postal'] || '';
    const insee = row['code_commune_insee'] || '';
    const name = row['nom_de_la_commune'] || '';

    if (!postalCode || !insee) continue;

    if (!postalToCommunes.has(postalCode)) {
      postalToCommunes.set(postalCode, []);
    }

    // Check zone tendue: first direct INSEE, then parent commune for arrondissements
    const parentInsee = ARRONDISSEMENT_PARENT[insee];
    const isZT = zoneTendueInsee.has(insee) || (parentInsee ? zoneTendueInsee.has(parentInsee) : false);
    const communes = postalToCommunes.get(postalCode)!;

    // Avoid duplicate INSEE codes for the same postal code
    if (!communes.some(c => c.insee === insee)) {
      communes.push({ insee, name, zoneTendue: isZT });
    }
  }

  // 5. Generate zones-tendues.json
  // For each postal code:
  // - If ALL communes are zone tendue → true
  // - If NO communes are zone tendue → false
  // - If MIXED → true (conservative) + entry in mapping for disambiguation
  const zonesTendues: Record<string, boolean> = {};
  const ambiguousPostal: Record<string, Array<{ insee: string; name: string; zoneTendue: boolean }>> = {};

  let allZT = 0, noneZT = 0, mixedZT = 0;

  for (const [postal, communes] of postalToCommunes) {
    const ztCommunes = communes.filter(c => c.zoneTendue);

    if (ztCommunes.length === communes.length) {
      // All zone tendue
      zonesTendues[postal] = true;
      allZT++;
    } else if (ztCommunes.length === 0) {
      // None zone tendue — don't include (absence = false)
      noneZT++;
    } else {
      // Mixed — mark as true but store mapping for disambiguation
      zonesTendues[postal] = true;
      ambiguousPostal[postal] = communes;
      mixedZT++;
    }
  }

  console.log(`   → ${allZT} postal codes fully in zone tendue`);
  console.log(`   → ${noneZT} postal codes not in zone tendue`);
  console.log(`   → ${mixedZT} postal codes with mixed communes\n`);

  // 6. Write output files
  console.log('4. Writing output files...');

  const ztPath = join(OUTPUT_DIR, 'zones-tendues.json');
  writeFileSync(ztPath, JSON.stringify(zonesTendues, null, 0));
  const ztSize = JSON.stringify(zonesTendues).length;
  console.log(`   → ${ztPath} (${Object.keys(zonesTendues).length} entries, ${Math.round(ztSize / 1024)}KB)`);

  const mappingPath = join(OUTPUT_DIR, 'postal-insee-mapping.json');
  writeFileSync(mappingPath, JSON.stringify(ambiguousPostal, null, 0));
  const mappingSize = JSON.stringify(ambiguousPostal).length;
  console.log(`   → ${mappingPath} (${Object.keys(ambiguousPostal).length} ambiguous codes, ${Math.round(mappingSize / 1024)}KB)`);

  // 7. Sanity checks
  console.log('\n5. Sanity checks:');
  console.log(`   Paris 75001: ${zonesTendues['75001'] === true ? 'OK (zone tendue)' : 'FAIL'}`);
  console.log(`   Lille 59000: ${zonesTendues['59000'] === true ? 'OK (zone tendue)' : 'FAIL'}`);
  console.log(`   Lyon 69001:  ${zonesTendues['69001'] === true ? 'OK (zone tendue)' : 'FAIL'}`);

  // Check Dunkerque (should NOT be zone tendue in the latest decree)
  const dunkerqueStatus = zonesTendues['59140'];
  console.log(`   Dunkerque 59140: ${dunkerqueStatus === undefined ? 'OK (not zone tendue)' : dunkerqueStatus ? 'WARNING (marked zone tendue)' : 'OK (not zone tendue)'}`);

  console.log('\n=== Done! ===');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
