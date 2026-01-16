import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import ListingCard from "@/components/listings/ListingCard";
import HomeClient from "./HomeClient";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings"; // Fixed
import getLikes from "@/app/actions/getLikes";
import { SafeUser } from "@/types";

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<any> }) {
  const resolvedParams = await searchParams;
  const listings = await getListings(resolvedParams);
  const currentUser = await getCurrentUser();
  const likes = await getLikes();

  if (listings.length === 0) {
    return (
      <EmptyState showReset />
    )
  }

  const isSearchActive = Object.keys(resolvedParams).length > 0;

  return (
    <HomeClient
      listings={listings}
      currentUser={currentUser}
      isSearchActive={isSearchActive}
      likes={likes}
    />
  );
}
