'use client';

import { SafeListing } from "@/types";
import PhotoTour from "./photos/PhotoTour";
import Heading from "@/components/Heading";

interface PhotosSectionProps {
    listing: SafeListing & {
        rooms?: any[];
    };
    isAllPhotosOpen: boolean;
    setIsAllPhotosOpen: (value: boolean) => void;
    isAddRoomModalOpen: boolean;
    setIsAddRoomModalOpen: (value: boolean) => void;

    // Lifted State
    activeView: 'global' | 'unassigned' | 'room';
    setActiveView: (view: 'global' | 'unassigned' | 'room') => void;
    activeRoomId: string | null;
    setActiveRoomId: (id: string | null) => void;
}

const PhotosSection: React.FC<PhotosSectionProps> = ({
    listing,
    isAllPhotosOpen,
    setIsAllPhotosOpen,
    isAddRoomModalOpen,
    setIsAddRoomModalOpen,
    activeView,
    setActiveView,
    activeRoomId,
    setActiveRoomId
}) => {
    // Filter unassigned images (those where roomId is null)
    const unassignedImages = listing.images.filter(img => !img.roomId);

    return (
        <div className="flex flex-col gap-8">
            <PhotoTour
                listingId={listing.id}
                rooms={listing.rooms || []}
                unassignedImages={unassignedImages}
                allImages={listing.images}
                isAllPhotosOpen={isAllPhotosOpen}
                setIsAllPhotosOpen={setIsAllPhotosOpen}
                isAddRoomModalOpen={isAddRoomModalOpen}
                setIsAddRoomModalOpen={setIsAddRoomModalOpen}
                activeView={activeView}
                setActiveView={setActiveView}
                activeRoomId={activeRoomId}
                setActiveRoomId={setActiveRoomId}
            />
        </div>
    );
}

export default PhotosSection;
