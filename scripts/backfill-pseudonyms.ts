/**
 * Backfill pseudonyms for existing users who don't have one yet
 * Usage: npx ts-node scripts/backfill-pseudonyms.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

// Inline the generator to avoid path alias issues in scripts
function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateSimplePseudonym() {
  const emojis = ['🦊', '🦉', '🐧', '🐸', '🐨', '🦋', '🐝', '🦈', '🐬', '🦀', '🥒', '🍋', '🥐', '🍉', '🥑', '🎺', '🧊', '🔮', '🎪', '🪁', '⛸️', '🏄', '🚀', '🎭', '🌿', '🌸', '🍀', '🌊', '⭐', '🚂', '🏰', '💎'];
  const nouns = [
    { w: 'Renard', g: 'M' }, { w: 'Hibou', g: 'M' }, { w: 'Panda', g: 'M' }, { w: 'Colibri', g: 'M' },
    { w: 'Tortue', g: 'F' }, { w: 'Loutre', g: 'F' }, { w: 'Concombre', g: 'M' }, { w: 'Citron', g: 'M' },
    { w: 'Brioche', g: 'F' }, { w: 'Noisette', g: 'F' }, { w: 'Trompette', g: 'F' }, { w: 'Boussole', g: 'F' },
    { w: 'Volcan', g: 'M' }, { w: 'Aurore', g: 'F' }, { w: 'Cascade', g: 'F' }, { w: 'Capitaine', g: 'M' },
    { w: 'Explorateur', g: 'M' }, { w: 'Pirate', g: 'M' }, { w: 'Étoile', g: 'F' }, { w: 'Galaxie', g: 'F' },
    { w: 'Glaçon', g: 'M' }, { w: 'Nuage', g: 'M' }, { w: 'Fusée', g: 'F' }, { w: 'Phare', g: 'M' },
  ];
  const adjectives = [
    { m: 'Captivant', f: 'Captivante' }, { m: 'Audacieux', f: 'Audacieuse' }, { m: 'Cosmique', f: 'Cosmique' },
    { m: 'Mystérieux', f: 'Mystérieuse' }, { m: 'Épique', f: 'Épique' }, { m: 'Légendaire', f: 'Légendaire' },
    { m: 'Flamboyant', f: 'Flamboyante' }, { m: 'Serein', f: 'Sereine' }, { m: 'Intrépide', f: 'Intrépide' },
    { m: 'Espiègle', f: 'Espiègle' }, { m: 'Doré', f: 'Dorée' }, { m: 'Stellaire', f: 'Stellaire' },
    { m: 'Grognon', f: 'Grognonne' }, { m: 'Lunaire', f: 'Lunaire' }, { m: 'Passionné', f: 'Passionnée' },
  ];

  const emoji = randomPick(emojis);
  const noun = randomPick(nouns);
  const adj = randomPick(adjectives);
  const genderedAdj = noun.g === 'F' ? adj.f : adj.m;
  const text = `${noun.w} ${genderedAdj}`;
  return {
    emoji,
    text,
    full: `${emoji} ${text}`,
    pattern: 'A',
  };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();

  try {
    const usersWithoutPseudonym = await prisma.user.findMany({
      where: { pseudonymFull: null },
      select: { id: true, name: true, email: true },
    });

    console.log(`Found ${usersWithoutPseudonym.length} users without pseudonyms${isDryRun ? ' (DRY RUN)' : ''}`);

    let updated = 0;
    for (const user of usersWithoutPseudonym) {
      const pseudo = generateSimplePseudonym();

      if (isDryRun) {
        console.log(`  [DRY] ${user.email || user.name} → ${pseudo.full}`);
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pseudonymEmoji: pseudo.emoji,
            pseudonymText: pseudo.text,
            pseudonymFull: pseudo.full,
            pseudonymPattern: pseudo.pattern,
          },
        });
        console.log(`  ✓ ${user.email || user.name} → ${pseudo.full}`);
      }
      updated++;
    }

    console.log(`\n${isDryRun ? 'Would update' : 'Updated'} ${updated} users`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
