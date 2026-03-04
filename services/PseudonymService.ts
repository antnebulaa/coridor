import prisma from '@/libs/prismadb';
import { generatePseudonym, type Pseudonym } from '@/lib/pseudonym';

const PseudonymService = {
  /**
   * Génère un pseudonyme unique (vérifie en base qu'il n'existe pas déjà).
   * Fallback avec suffixes II, III... si collisions multiples.
   */
  async generateUniquePseudonym(): Promise<Pseudonym> {
    const maxAttempts = 20;

    for (let i = 0; i < maxAttempts; i++) {
      const pseudonym = generatePseudonym();
      const existing = await prisma.user.findUnique({
        where: { pseudonymFull: pseudonym.full },
      });
      if (!existing) return pseudonym;
    }

    // Fallback : ajouter un suffixe numérique discret
    const base = generatePseudonym();
    const suffixes = ['II', 'III', 'IV', 'V', 'VI', 'VII'];

    for (const suffix of suffixes) {
      const candidate: Pseudonym = {
        ...base,
        text: `${base.text} ${suffix}`,
        full: `${base.full} ${suffix}`,
      };
      const exists = await prisma.user.findUnique({
        where: { pseudonymFull: candidate.full },
      });
      if (!exists) return candidate;
    }

    // Dernier recours (ne devrait jamais arriver avec 1.6M+ combinaisons)
    const uid = Date.now().toString(36).slice(-4);
    return {
      ...base,
      text: `${base.text} #${uid}`,
      full: `${base.full} #${uid}`,
    };
  },

  /**
   * Génère et attribue un pseudonyme unique à un utilisateur.
   * Utilisé uniquement lors de l'onboarding / première attribution.
   */
  async generateAndAssign(userId: string) {
    const pseudonym = await this.generateUniquePseudonym();

    await prisma.user.update({
      where: { id: userId },
      data: {
        pseudonymEmoji: pseudonym.emoji,
        pseudonymText: pseudonym.text,
        pseudonymFull: pseudonym.full,
        pseudonymPattern: pseudonym.pattern,
      },
    });

    return pseudonym;
  },

  /**
   * Détermine si l'identité doit être révélée au propriétaire
   */
  isRevealed(applicationStatus?: string | null, leaseStatus?: string | null): boolean {
    if (!applicationStatus) return false;

    const revealStatuses = ['SELECTED', 'ACCEPTED'];
    const revealLeaseStatuses = ['PENDING_SIGNATURE', 'SIGNED'];

    return revealStatuses.includes(applicationStatus)
      || revealLeaseStatuses.includes(leaseStatus || '');
  },
};

export default PseudonymService;
