'use client';

import { isNative } from '@/lib/platform';

export function useNativeShare() {

  const shareListing = async (listing: {
    title: string;
    address: string;
    rent: number;
    id: string;
  }) => {
    const url = `https://coridor.fr/fr/listings/${listing.id}`;
    const text = `${listing.title} — ${listing.rent}€/mois à ${listing.address}`;

    if (isNative()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: listing.title,
        text,
        url,
        dialogTitle: 'Partager cette annonce',
      });
    } else if (navigator.share) {
      await navigator.share({ title: listing.title, text, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return { shareListing };
}
