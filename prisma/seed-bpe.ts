import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import axios from 'axios';
import proj4 from 'proj4';

const prisma = new PrismaClient() as any;

// Define projections
const lambert93 = '+proj=lcc +lat_1=44 +lat_2=49 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

// URL for BPE 2023 (latest available usually) - Ensemble
// This is a direct link to a likely location, but might need update.
// If this fails, user should download "bpe23_ensemble_xy.csv" from INSEE and place it in prisma/seeds/
const BPE_URL = "https://www.insee.fr/fr/statistiques/fichier/8201247/bpe23_ensemble_xy.csv";
const LOCAL_FILE = path.join(process.cwd(), 'prisma', 'seeds', 'bpe_data.csv');

// Equipment codes to filter
const RELEVANT_TYPES = {
    'A504': 'GROCERY',     // Alimentation générale (includes small supermarkets/groceries)
    'B105': 'SUPERMARKET', // Supermarché
    'A501': 'SUPERMARKET', // Hypermarket
    'A502': 'SUPERMARKET', // Supermarket
    'B207': 'BAKERY',      // Boulangerie
    'D307': 'PHARMACY',    // Pharmacie
    'D265': 'DOCTOR',      // Médecin généraliste
    'F101': 'BAR',         // Bar / Café
    'C101': 'SCHOOL',      // École maternelle
    'C104': 'SCHOOL',      // École élémentaire
    'C108': 'SCHOOL',      // École primaire
    // Add others as needed
};

async function downloadFile(url: string, dest: string) {
    const writer = fs.createWriteStream(dest);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
    });
}

async function main() {
    console.log('🌱 Starting BPE Seeding...');

    // Ensure seeds directory exists
    const seedDir = path.dirname(LOCAL_FILE);
    if (!fs.existsSync(seedDir)) {
        fs.mkdirSync(seedDir, { recursive: true });
    }

    // Check for manual file first
    const potentialFiles = ['BPE24.csv', 'bpe_data.csv'];
    let foundFile = '';

    for (const file of potentialFiles) {
        const filePath = path.join(seedDir, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size > 0) {
                foundFile = filePath;
                console.log(`✅ Found valid BPE file: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                break;
            } else {
                console.log(`⚠️ Found ${file} but it is empty (0 bytes). Skipping.`);
            }
        }
    }

    if (foundFile) {
        // Use the found file
    } else {
        console.log('⬇️ Attempting to download BPE CSV...');
        try {
            await downloadFile(BPE_URL, LOCAL_FILE);
            console.log('✅ Download complete.');
            foundFile = LOCAL_FILE;
        } catch (error) {
            console.error('\n❌ ECHEC DU TÉLÉCHARGEMENT AUTOMATIQUE');
            console.error('👉 Veuillez télécharger le fichier "bpe23_ensemble_xy.csv" (ou similaire) depuis le site de l\'INSEE.');
            console.error('👉 Placez-le dans : prisma/seeds/BPE24.csv');
            console.error('👉 Puis relancez la commande.\n');
            return;
        }
    }

    console.log('🧹 Clearing old amenities...');
    await prisma.amenity.deleteMany();

    console.log(`📖 Reading and parsing CSV from ${path.basename(foundFile)}...`);
    const parser = fs.createReadStream(foundFile).pipe(parse({
        delimiter: ';',
        columns: true,
        trim: true
    }));

    const batchSize = 1000;
    let batch: any[] = [];
    let count = 0;
    let totalProcessed = 0;

    for await (const record of parser) {
        // BPE 2024 columns: AN;NOMRS;...;TYPEQU;...;LAMBERT_X;LAMBERT_Y;LONGITUDE;LATITUDE;...

        const rawType = record.TYPEQU;
        if (!RELEVANT_TYPES[rawType as keyof typeof RELEVANT_TYPES]) continue;

        let lat: number | null = null;
        let lng: number | null = null;

        // Try to use GPS coordinates directly if available
        if (record.LATITUDE && record.LONGITUDE) {
            lat = parseFloat(record.LATITUDE);
            lng = parseFloat(record.LONGITUDE);
        }
        // Fallback to Lambert 93 conversion if GPS is missing but Lambert is present
        else if (record.LAMBERT_X && record.LAMBERT_Y) {
            const x = parseFloat(record.LAMBERT_X);
            const y = parseFloat(record.LAMBERT_Y);
            if (!isNaN(x) && !isNaN(y)) {
                const [convertedLng, convertedLat] = proj4(lambert93, wgs84, [x, y]);
                lat = convertedLat;
                lng = convertedLng;
            }
        }

        if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) continue;

        totalProcessed++;

        const recordType = record.TYPEQU as keyof typeof RELEVANT_TYPES;
        let type = RELEVANT_TYPES[recordType];

        // Refine A504 (Alimentation générale) which contains groceries and restaurants
        if (record.TYPEQU === 'A504') {
            const name = (record.NOMRS || '').toUpperCase();
            if (name.includes('RESTAURANT') || name.includes('RESTO') || name.includes('PIZZA') || name.includes('BURGER')) {
                type = 'RESTAURANT';
            } else {
                type = 'GROCERY';
            }
        }

        if (!type) continue;

        batch.push({
            type: type,
            latitude: lat,
            longitude: lng,
            name: record.LIBCOM, // Using city name as name for now, or NOMRS if available?
            city: record.LIBCOM,
            zipCode: record.CODPOS || record.DEPCOM, // Use CODPOS if available, else DEPCOM
            sourceId: `${record.DEPCOM}_${type}_${totalProcessed}`
        });

        if (batch.length >= batchSize) {
            await prisma.amenity.createMany({ data: batch });
            count += batch.length;
            batch = [];
            console.log(`Saved ${count} amenities...`);
        }
    }

    if (batch.length > 0) {
        await prisma.amenity.createMany({ data: batch });
        count += batch.length;
    }

    console.log(`✅ Seeding finished. ${count} amenities imported.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
