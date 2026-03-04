/**
 * Détermine si l'identité doit être révélée au propriétaire
 * Utilisable côté client (pas de dépendance serveur)
 */
export function shouldRevealIdentity(
  applicationStatus?: string | null,
  leaseStatus?: string | null,
): boolean {
  if (!applicationStatus) return false;

  const revealStatuses = ['SELECTED', 'ACCEPTED'];
  const revealLeaseStatuses = ['PENDING_SIGNATURE', 'SIGNED'];

  return revealStatuses.includes(applicationStatus)
    || revealLeaseStatuses.includes(leaseStatus || '');
}
