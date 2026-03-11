import { redirect } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import HomeClient from "./HomeClient";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings";

export default async function Home({ searchParams }: { searchParams: Promise<IListingsParams> }) {
  const resolvedParams = await searchParams;
  const [listings, currentUser] = await Promise.all([
    getListings(resolvedParams),
    getCurrentUser(),
  ]);

  // Landlord Mode: redirect to dashboard
  if (currentUser?.userMode === 'LANDLORD') {
    redirect('/dashboard');
  }

  if (listings.length === 0) {
    return (
      <EmptyState showReset />
    )
  }

  const isSearchActive = Object.keys(resolvedParams).filter(k => !['error', 'code', 'state'].includes(k)).length > 0;

  return (
    <HomeClient
      listings={listings}
      currentUser={currentUser}
      isSearchActive={isSearchActive}
    />
  );
}
