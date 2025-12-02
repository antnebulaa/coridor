'use client';

import Avatar from "@/components/Avatar";
import { format } from "date-fns";

interface RecentActivityProps {
    reservations: any[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({
    reservations
}) => {
    return (
        <div className="
      bg-white 
      rounded-xl 
      border-[1px] 
      border-neutral-200 
      p-6
      shadow-sm
    ">
            <div className="text-lg font-medium mb-4">
                Recent Activity
            </div>
            <div className="flex flex-col gap-4">
                {reservations.length === 0 ? (
                    <div className="text-neutral-500 text-sm">
                        No recent activity.
                    </div>
                ) : (
                    reservations.map((reservation) => (
                        <div key={reservation.id} className="flex items-center gap-4 border-b-[1px] pb-4 last:border-0 last:pb-0">
                            <Avatar src={reservation.user?.image} seed={reservation.user?.email || reservation.user?.name} />
                            <div className="flex flex-col flex-1">
                                <div className="text-sm font-medium">
                                    {reservation.user?.name || 'Guest'} reserved {reservation.listingTitle}
                                </div>
                                <div className="text-xs text-neutral-500">
                                    {format(new Date(reservation.createdAt), 'PP')}
                                </div>
                            </div>
                            <div className="text-sm font-medium text-green-600">
                                +${reservation.totalPrice}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default RecentActivity;
