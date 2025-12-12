'use client';

import { useState, useCallback } from "react";
import { SafeListing, SafeUser } from "@/types";
import Container from "@/components/Container";
import EditPropertySidebar from "@/components/properties/EditPropertySidebar";
import Heading from "@/components/Heading";

import DescriptionSection from "./components/DescriptionSection";
import TitleSection from "./components/TitleSection";
import LocationSection from "./components/LocationSection";
import CategorySection from "./components/CategorySection";
import AmenitiesSection from "./components/AmenitiesSection";
import FurnitureSection from "./components/FurnitureSection";
import PriceSection from "./components/PriceSection";
import PhotosSection from "./components/PhotosSection";
import VisitsSection from "./components/VisitsSection";
import StatusSection from "./components/StatusSection";
import { sidebarLinks } from "./constants";


interface EditPropertyClientProps {
    listing: SafeListing & {
        rooms?: any[];
    };
    currentUser: SafeUser;
}

export type TabType = 'logement' | 'location' | 'preferences';
export type SectionType =
    | 'title'
    | 'location'
    | 'category'
    | 'amenities'
    | 'furniture'
    | 'availability'
    | 'photos'
    | 'visits'
    | 'lease'
    | 'price'
    | 'tenant'
    | 'application'
    | 'status'
    | 'delete';

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

// ... imports

const EditPropertyClient: React.FC<EditPropertyClientProps> = ({
    listing,
    currentUser
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabType>('logement');
    const [activeSection, setActiveSection] = useState<SectionType>('title');
    const [showContent, setShowContent] = useState(false);

    // Photo Tour State (Lifted)
    const [isAllPhotosOpen, setIsAllPhotosOpen] = useState(false);
    const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
    const [photoViewMode, setPhotoViewMode] = useState<'global' | 'room'>('room');

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setActiveSection(sidebarLinks[tab][0].id as SectionType);
        setShowContent(false);
        router.push(pathname, { scroll: false });
    };

    const handleSectionChange = (section: SectionType) => {
        setActiveSection(section);
        setShowContent(true);
        router.push(`${pathname}?view=content`, { scroll: false });
    };

    const handleBack = () => {
        setShowContent(false);
        router.push(pathname, { scroll: false });
    };

    const sectionTitles: Record<SectionType, string> = {
        title: 'Titre de l\'annonce',
        location: 'Emplacement',
        category: 'Type de logement',
        amenities: 'Atouts',
        furniture: 'Équipements',
        availability: 'Disponibilité',
        photos: 'Gestion des photos',
        visits: 'Visites',
        lease: 'Bail',
        price: 'Loyer',
        tenant: 'Profil locataire',
        application: 'Paramètres de candidature',
        status: 'Statut de l\'annonce',
        delete: 'Supprimer l\'annonce',
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'title':
                return <TitleSection listing={listing} />;
            case 'location':
                return <LocationSection listing={listing} />;
            case 'category':
                return <CategorySection listing={listing} currentUser={currentUser} />;
            case 'amenities':
                return <AmenitiesSection listing={listing} />;
            case 'furniture':
                return <FurnitureSection listing={listing} />;
            case 'availability':
                return <div>Availability Form Placeholder</div>;
            case 'photos':
                return <PhotosSection
                    listing={listing}
                    isAllPhotosOpen={isAllPhotosOpen}
                    setIsAllPhotosOpen={setIsAllPhotosOpen}
                    isAddRoomModalOpen={isAddRoomModalOpen}
                    setIsAddRoomModalOpen={setIsAddRoomModalOpen}
                    photoViewMode={photoViewMode}
                    setPhotoViewMode={setPhotoViewMode}
                />;
            case 'visits':
                return <VisitsSection listing={listing} />;
            case 'lease':
                return <div>Lease Form Placeholder</div>;
            case 'price':
                return <PriceSection listing={listing} />;
            case 'tenant':
                return <div>Tenant Profile Form Placeholder</div>;
            case 'application':
                return <div>Application Settings Form Placeholder</div>;
            case 'status':
                return <StatusSection listing={listing} />;
            case 'delete':
                return <div>Delete Form Placeholder</div>;
            default:
                return <div>Select a section</div>;
        }
    };

    return (
        <Container>
            <div className="pt-4 md:pt-0 grid grid-cols-1 md:grid-cols-4 gap-10">
                {/* Sidebar - Hidden on mobile if content is shown */}
                <div className={`col-span-1 ${showContent ? 'hidden md:block' : 'block'}`}>
                    <EditPropertySidebar
                        activeTab={activeTab}
                        activeSection={activeSection}
                        onChangeTab={handleTabChange}
                        onChangeSection={handleSectionChange}
                    />
                </div>

                {/* Content - Hidden on mobile if content is NOT shown */}
                <div className={`col-span-3 ${!showContent ? 'hidden md:block' : 'block'}`}>
                    <div className="md:border-[1px] md:rounded-xl md:p-8 md:shadow-sm relative">
                        {/* Mobile Header: Back Button (Sticky) */}
                        <div className="
                            md:hidden 
                            sticky 
                            top-0 
                            z-50 
                            bg-white 
                            p-4
                            -mx-4
                            sm:-mx-2
                            border-b
                            flex
                            items-center
                            justify-between
                        ">
                            <button
                                onClick={handleBack}
                                className="
                                    w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition
                                "
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </button>

                            <div className="font-semibold text-sm truncate ml-3 flex-1">
                                {listing.title}
                            </div>

                            {activeSection === 'photos' && (
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => {
                                            setPhotoViewMode('global');
                                            setIsAllPhotosOpen(true);
                                        }}
                                        className="
                                            px-4 
                                            py-2 
                                            bg-neutral-100 
                                            hover:bg-neutral-200 
                                            rounded-full 
                                            font-semibold 
                                            text-xs 
                                            transition
                                            cursor-pointer
                                            whitespace-nowrap
                                        "
                                    >
                                        Toutes les photos
                                    </button>
                                    <button
                                        onClick={() => setIsAddRoomModalOpen(true)}
                                        className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition cursor-pointer"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Mobile Header: Title (Not Sticky) */}
                        {activeSection !== 'photos' && activeSection !== 'visits' && (
                            <div className="md:hidden mb-6">
                                <h2 className="text-2xl font-bold">
                                    {sectionTitles[activeSection]}
                                </h2>
                            </div>
                        )}
                        {renderContent()}
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default EditPropertyClient;
