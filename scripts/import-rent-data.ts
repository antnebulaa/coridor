/**
 * Import ANIL Carte des Loyers CSV into RentMarketData table.
 *
 * The ANIL publishes 4 separate CSV files:
 *   - Appartements (ensemble)     → propertyType: "apartment", typology: "all"
 *   - Appartements T1-T2          → propertyType: "apartment", typology: "t1_t2"
 *   - Appartements T3+            → propertyType: "apartment", typology: "t3_plus"
 *   - Maisons (ensemble)          → propertyType: "house",     typology: "all"
 *
 * Usage:
 *   npx tsx scripts/import-rent-data.ts                          # imports all 4 files from data/anil/
 *   npx tsx scripts/import-rent-data.ts <csv> <type> <typology>  # import a single file
 *
 * Examples:
 *   npx tsx scripts/import-rent-data.ts
 *   npx tsx scripts/import-rent-data.ts data/anil/appart_all.csv apartment all
 *
 * CSV columns (semicolon-separated, quoted, French decimals):
 *   INSEE_C, LIBGEO, DEP, loypredm2, lwr.IPm2, upr.IPm2, nbobs_com, R2_adj
 *
 * Run manually ~1x/year when ANIL publishes new data (typically Q4).
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const BATCH_SIZE = 500;
const DATA_YEAR = 2025;

// ── Default file mapping ──────────────────────────────────────────

const DEFAULT_FILES = [
  { file: 'appart_all.csv', propertyType: 'apartment', typology: 'all' },
  { file: 'appart_t1t2.csv', propertyType: 'apartment', typology: 't1_t2' },
  { file: 'appart_t3plus.csv', propertyType: 'apartment', typology: 't3_plus' },
  { file: 'maison_all.csv', propertyType: 'house', typology: 'all' },
];

// ── Helpers ───────────────────────────────────────────────────────

function extractDepartmentCode(communeCode: string): string {
  if (communeCode.startsWith('2A') || communeCode.startsWith('2B')) {
    return communeCode.substring(0, 2);
  }
  if (communeCode.startsWith('97')) {
    return communeCode.substring(0, 3);
  }
  return communeCode.substring(0, 2);
}

function parseNum(val: string | undefined): number | null {
  if (!val || val.trim() === '' || val.trim() === 'NA') return null;
  const n = parseFloat(val.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function parseInt_(val: string | undefined): number | null {
  if (!val || val.trim() === '' || val.trim() === 'NA') return null;
  const n = parseInt(val.replace(',', '.'), 10);
  return isNaN(n) ? null : n;
}

interface CsvRow {
  communeCode: string;
  communeName: string;
  departmentCode: string;
  propertyType: string;
  typology: string;
  medianRentPerSqm: number;
  q1RentPerSqm: number;
  q3RentPerSqm: number;
  observations: number;
  rSquared: number;
  lowerBound: number | null;
  upperBound: number | null;
}

// ── Column finder ─────────────────────────────────────────────────

function findCol(columns: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = columns.findIndex(
      (c) => c.toLowerCase().replace(/[."]/g, '') === alias.toLowerCase().replace(/[."]/g, '')
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

// ── Import one CSV file ───────────────────────────────────────────

async function importFile(
  csvPath: string,
  propertyType: string,
  typology: string
): Promise<number> {
  if (!fs.existsSync(csvPath)) {
    console.error(`  File not found: ${csvPath}`);
    return 0;
  }

  console.log(`\n📄 Importing: ${path.basename(csvPath)} → ${propertyType} / ${typology}`);

  // ANIL CSVs are ISO-8859-1 (Latin-1) encoded — read as buffer and convert
  const buf = fs.readFileSync(csvPath);
  const raw = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
    ? buf.subarray(3).toString('utf-8') // UTF-8 BOM
    : buf.toString('latin1');           // ANIL default encoding
  const content = raw;
  const lines = content.split('\n').filter((l) => l.trim());

  if (lines.length < 2) {
    console.error('  CSV is empty or has only a header');
    return 0;
  }

  // Detect separator & parse header
  const header = lines[0];
  const sep = header.includes(';') ? ';' : ',';
  const columns = header.split(sep).map((c) => c.trim().replace(/"/g, ''));

  console.log(`  ${lines.length - 1} data rows, separator: "${sep}"`);

  // Map column indices (flexible aliases for ANIL format)
  const iCode = findCol(columns, ['INSEE_C', 'CODGEO', 'codgeo', 'Code_commune_INSEE']);
  const iName = findCol(columns, ['LIBGEO', 'libgeo', 'Nom_commune']);
  const iDep = findCol(columns, ['DEP', 'dep', 'departement']);
  const iMedian = findCol(columns, ['loypredm2', 'loy_pred_m2', 'median_rent']);
  const iLwr = findCol(columns, ['lwr.IPm2', 'lwrIPm2', 'lwr_IPpredm2', 'lwr_ip', 'lower_bound']);
  const iUpr = findCol(columns, ['upr.IPm2', 'uprIPm2', 'upr_IPpredm2', 'upr_ip', 'upper_bound']);
  const iObs = findCol(columns, ['nbobs_com', 'nbobs', 'observations', 'nb_obs']);
  const iR2 = findCol(columns, ['R2_adj', 'R2adj', 'R2', 'r2', 'r_squared']);

  if (iCode === -1 || iMedian === -1) {
    console.error(`  Could not find required columns (INSEE_C/CODGEO, loypredm2). Found: ${columns.join(', ')}`);
    return 0;
  }

  // Parse rows
  const rows: CsvRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim().replace(/"/g, ''));

    const codgeo = cells[iCode]?.trim();
    const libgeo = iName !== -1 ? cells[iName]?.trim() : '';
    const dep = iDep !== -1 ? cells[iDep]?.trim() : '';
    const median = parseNum(cells[iMedian]);
    const lwr = iLwr !== -1 ? parseNum(cells[iLwr]) : null;
    const upr = iUpr !== -1 ? parseNum(cells[iUpr]) : null;
    const obs = parseInt_(cells[iObs]);
    const r2 = parseNum(cells[iR2]);

    if (!codgeo || median == null) {
      skipped++;
      continue;
    }

    // Use prediction intervals as Q1/Q3 range
    // If no intervals, use median ±15% as fallback range
    const q1 = lwr ?? median * 0.85;
    const q3 = upr ?? median * 1.15;

    rows.push({
      communeCode: codgeo,
      communeName: libgeo || codgeo,
      departmentCode: dep || extractDepartmentCode(codgeo),
      propertyType,
      typology,
      medianRentPerSqm: median,
      q1RentPerSqm: q1,
      q3RentPerSqm: q3,
      observations: obs ?? 0,
      rSquared: r2 ?? 0,
      lowerBound: lwr,
      upperBound: upr,
    });
  }

  console.log(`  Parsed ${rows.length} valid rows, skipped ${skipped}`);

  // Batch upsert
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((row) =>
        prisma.rentMarketData.upsert({
          where: {
            communeCode_propertyType_typology_dataYear: {
              communeCode: row.communeCode,
              propertyType: row.propertyType,
              typology: row.typology,
              dataYear: DATA_YEAR,
            },
          },
          update: {
            communeName: row.communeName,
            departmentCode: row.departmentCode,
            medianRentPerSqm: row.medianRentPerSqm,
            q1RentPerSqm: row.q1RentPerSqm,
            q3RentPerSqm: row.q3RentPerSqm,
            observations: row.observations,
            rSquared: row.rSquared,
            lowerBound: row.lowerBound,
            upperBound: row.upperBound,
          },
          create: {
            communeCode: row.communeCode,
            communeName: row.communeName,
            departmentCode: row.departmentCode,
            propertyType: row.propertyType,
            typology: row.typology,
            medianRentPerSqm: row.medianRentPerSqm,
            q1RentPerSqm: row.q1RentPerSqm,
            q3RentPerSqm: row.q3RentPerSqm,
            observations: row.observations,
            rSquared: row.rSquared,
            lowerBound: row.lowerBound,
            upperBound: row.upperBound,
            dataYear: DATA_YEAR,
          },
        })
      )
    );

    const progress = Math.min(i + BATCH_SIZE, rows.length);
    process.stdout.write(`\r  Imported ${progress}/${rows.length}...`);
  }

  console.log(' ✓');
  return rows.length;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  const arg1 = process.argv[2];

  let totalImported = 0;

  if (!arg1 || arg1 === '--all') {
    // Auto-import all 4 files from data/anil/
    const dataDir = path.resolve(process.cwd(), 'data/anil');
    console.log(`🚀 Importing all ANIL files from ${dataDir}`);

    for (const entry of DEFAULT_FILES) {
      const filePath = path.join(dataDir, entry.file);
      totalImported += await importFile(filePath, entry.propertyType, entry.typology);
    }
  } else {
    // Single file mode: <csv> <propertyType> <typology>
    const propertyType = process.argv[3];
    const typology = process.argv[4];

    if (!propertyType || !typology) {
      console.error('Usage:');
      console.error('  npx tsx scripts/import-rent-data.ts                          # auto-import all');
      console.error('  npx tsx scripts/import-rent-data.ts <csv> <type> <typology>  # single file');
      console.error('');
      console.error('Types: apartment, house');
      console.error('Typologies: all, t1_t2, t3_plus');
      process.exit(1);
    }

    totalImported = await importFile(arg1, propertyType, typology);
  }

  // Final stats
  const total = await prisma.rentMarketData.count({ where: { dataYear: DATA_YEAR } });
  const communes = await prisma.rentMarketData.groupBy({
    by: ['communeCode'],
    where: { dataYear: DATA_YEAR },
  });
  const types = await prisma.rentMarketData.groupBy({
    by: ['propertyType', 'typology'],
    where: { dataYear: DATA_YEAR },
    _count: true,
  });

  console.log(`\n✅ Done! ${totalImported} rows imported this run.`);
  console.log(`📊 Database: ${total} total rows, ${communes.length} communes`);
  console.log('📋 Breakdown:');
  for (const t of types) {
    console.log(`   ${t.propertyType} / ${t.typology}: ${t._count} rows`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
