import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import ListingCard from "@/components/listings/ListingCard";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import { SafeUser } from "@/types";

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<any> }) {
  const resolvedParams = await searchParams;
  const listings = await getListings(resolvedParams);
  const currentUser = await getCurrentUser();

  if (listings.length === 0) {
    return (
      <EmptyState showReset />
    )
  }

  return (
    <Container>
      <div className="
        grid
        grid-cols-1
        sm:grid-cols-2
        gap-8
      ">
        {listings.map((listing: any) => (
          <ListingCard
            currentUser={currentUser}
            key={listing.id}
            data={listing}
          />
        ))}
      </div>
    </Container >
  );
}
