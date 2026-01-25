import EmptyState from "@/components/EmptyState";
import HomeClient from "./HomeClient";
import LandlordCalendarClient from "./components/calendar/LandlordCalendarClient";
import getLandlordCalendarData from "./actions/getLandlordCalendarData";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings"; // Fixed
import getLikes from "@/app/actions/getLikes";

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<IListingsParams> }) {
  const resolvedParams = await searchParams;
  const listings = await getListings(resolvedParams);
  const currentUser = await getCurrentUser();
  const likes = await getLikes();

  if (listings.length === 0) {
    return (
      <EmptyState showReset />
    )
  }

  // Landlord Mode: Show Calendar
  if (currentUser?.userMode === 'LANDLORD') {
    const calendarData = await getLandlordCalendarData();
    if (calendarData) {
      return (
        <LandlordCalendarClient
          data={calendarData}
          currentUser={currentUser}
        />
      );
    }
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
