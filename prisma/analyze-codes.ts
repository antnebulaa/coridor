import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

const FILE = path.join(process.cwd(), 'prisma', 'seeds', 'bpe_data.csv');

async function main() {
    console.log(`CWD: ${process.cwd()}`);
    const seedsDir = path.join(process.cwd(), 'prisma', 'seeds');
    if (fs.existsSync(seedsDir)) {
        console.log(`Contents of ${seedsDir}:`, fs.readdirSync(seedsDir));
    } else {
        console.log(`Seeds dir not found: ${seedsDir}`);
    }

    console.log(`Reading ${FILE}...`);
    if (!fs.existsSync(FILE)) {
        console.error('File not found!');
        return;
    }

    const parser = fs.createReadStream(FILE).pipe(parse({
        delimiter: ';',
        columns: true,
        to: 200000 // Read 200k lines
    }));

    const codes: Record<string, number> = {};
    const samples: Record<string, string[]> = {};

    for await (const record of parser) {
        const type = record.TYPEQU;
        codes[type] = (codes[type] || 0) + 1;

        if (!samples[type]) samples[type] = [];
        if (samples[type].length < 3) samples[type].push(record.NOMRS || record.LIBCOM); // Use Name or City
    }

    console.log('Top codes:');
    const sorted = Object.entries(codes).sort((a, b) => b[1] - a[1]);

    // Print top 50 with samples
    for (const [code, count] of sorted.slice(0, 50)) {
        console.log(`${code}: ${count} - Examples: ${samples[code].join(', ')}`);
    }

    // Check specific codes we care about
    const targets = ['A504', 'B203', 'D301', 'D201', 'F101', 'A501', 'A502', 'C101', 'C104'];
    console.log('\nTarget codes:');
    for (const t of targets) {
        console.log(`${t}: ${codes[t] || 0}`);
    }
}

main();
