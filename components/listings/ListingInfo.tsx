'use client';

import { LucideIcon } from 'lucide-react';
// import Avatar from '../Avatar'; // I don't have Avatar yet. I'll use a placeholder.
import { useMemo } from 'react';

interface ListingInfoProps {
    user: any;
    description: string;
    guestCount: number;
    roomCount: number;
    bathroomCount: number;
    category: {
        icon: LucideIcon;
        label: string;
        description: string;
    } | undefined;
    locationValue: string;
}

const ListingInfo: React.FC<ListingInfoProps> = ({
    user,
    description,
    guestCount,
    roomCount,
    bathroomCount,
    category,
    locationValue,
}) => {
    return (
        <div className="col-span-4 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <div className="text-xl font-medium flex flex-row items-center gap-2">
                    <div>Hosted by {user?.name || 'Host'}</div>
                    <div className="h-[30px] w-[30px] rounded-full bg-gray-500" />
                </div>
                <div className="flex flex-row items-center gap-4 font-light text-neutral-500">
                    <div>{guestCount} guests</div>
                    <div>{roomCount} rooms</div>
                    <div>{bathroomCount} bathrooms</div>
                </div>
            </div>
            <hr />
            {category && (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-row items-center gap-4">
                        <category.icon size={40} className="text-neutral-600" />
                        <div className="flex flex-col">
                            <div className="text-lg font-medium">
                                {category.label}
                            </div>
                            <div className="text-neutral-500 font-light">
                                {category.description}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <hr />
            <div className="text-lg font-light text-neutral-500">
                {description}
            </div>
            <hr />
            {/* Map placeholder */}
            <div className="h-[200px] w-full bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-500">
                Map Placeholder
            </div>
        </div>
    );
};

export default ListingInfo;
