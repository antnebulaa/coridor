'use client';

import Container from "@/components/Container";
import StatsCard from "./components/StatsCard";
import Link from "next/link";
import RecentActivity from "./components/RecentActivity";
import { HiOutlineBanknotes, HiOutlineHome, HiOutlineTicket } from "react-icons/hi2";
import { AlertTriangle } from "lucide-react";

interface DashboardClientProps {
    stats: {
        totalListings: number;
        totalRevenue: number;
        totalBookings: number;
        recentReservations: any[];
        listingsWithoutSlots?: any[];
    }
}

const DashboardClient: React.FC<DashboardClientProps> = ({
    stats
}) => {
    return (
        <Container>
            <div className="pb-20">
                <div className="mb-8">
                    <h1 className="text-2xl font-medium">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Overview of your rental business</p>
                </div>

                {stats.listingsWithoutSlots && stats.listingsWithoutSlots.length > 0 && (
                    <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-4 items-start">
                        <AlertTriangle className="text-orange-500 shrink-0 mt-1" />
                        <div className="flex flex-col gap-2">
                            <h3 className="font-medium text-orange-800">Configuration des visites requise</h3>
                            <p className="text-sm text-orange-700">
                                Vous devez définir vos disponibilités pour les annonces suivantes afin de recevoir des demandes de visite :
                            </p>
                            <div className="flex flex-col gap-1 mt-1">
                                {stats.listingsWithoutSlots.map((l: any) => (
                                    <Link key={l.id} href={`/properties/${l.id}/edit?section=visits`} className="text-sm font-medium text-orange-900 underline hover:no-underline">
                                        {l.title}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatsCard
                        label="Total Revenue"
                        value={`$${stats.totalRevenue}`}
                        icon={HiOutlineBanknotes}
                        description="Lifetime earnings"
                    />
                    <StatsCard
                        label="Total Bookings"
                        value={stats.totalBookings}
                        icon={HiOutlineTicket}
                        description="Confirmed reservations"
                    />
                    <StatsCard
                        label="Active Listings"
                        value={stats.totalListings}
                        icon={HiOutlineHome}
                        description="Properties currently live"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RecentActivity reservations={stats.recentReservations} />
                    {/* Placeholder for future chart or other widget */}
                    <div className="
            bg-card
            rounded-xl 
            border-[1px] 
            border-border
            p-6
            shadow-sm
            flex
            items-center
            justify-center
            text-muted-foreground
          ">
                        Chart coming soon...
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default DashboardClient;
