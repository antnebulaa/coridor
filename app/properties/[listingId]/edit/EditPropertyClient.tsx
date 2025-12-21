'use client';

import { useState, useCallback } from "react";
import { SafeListing, SafeUser } from "@/types";
import Container from "@/components/Container";
import EditPropertySidebar from "@/components/properties/EditPropertySidebar";
import Heading from "@/components/Heading";

import DescriptionSection from "./components/DescriptionSection";
import PillButton from "@/components/ui/PillButton";
import CircleButton from "@/components/ui/CircleButton";
import PageBody from "@/components/ui/PageBody";
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

    // Detailed Photo Navigation State
    const [activeView, setActiveView] = useState<'global' | 'unassigned' | 'room'>('global');
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

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
                    activeView={activeView}
                    setActiveView={setActiveView}
                    activeRoomId={activeRoomId}
                    setActiveRoomId={setActiveRoomId}
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
            <div className="md:pt-0 grid grid-cols-1 md:grid-cols-4 gap-10">
                {/* Sidebar - Hidden on mobile if content is shown */}
                <div className={`col-span-1 ${showContent ? 'hidden md:block' : 'block'} pt-4 md:pt-0`}>
                    <EditPropertySidebar
                        activeTab={activeTab}
                        activeSection={activeSection}
                        onChangeTab={handleTabChange}
                        onChangeSection={handleSectionChange}
                    />
                </div>

                {/* Content - Hidden on mobile if content is NOT shown */}
                <div className={`col-span-3 ${!showContent ? 'hidden md:block' : 'block'}`}>
                    <div className="md:border-[1px] md:rounded-xl md:shadow-sm relative bg-white dark:bg-neutral-900 dark:border-neutral-800 min-h-[50vh] -mx-4 md:mx-0">
                        {/* Mobile Header: Back Button (Sticky) */}
                        <div className="
                            md:hidden 
                            sticky 
                            h-16
                            z-50 
                            bg-white dark:bg-neutral-900
                            px-6
                            border-b dark:border-neutral-800
                            flex
                            items-center
                            justify-between
                        ">
                            <button
                                onClick={handleBack}
                                className="
                                    w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition
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
                                    <PillButton
                                        label="Toutes les photos"
                                        onClick={() => {
                                            setActiveView('global');
                                            setActiveRoomId(null);
                                            setIsAllPhotosOpen(true);
                                        }}
                                        className="h-10 px-4 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                    />
                                    <CircleButton
                                        icon={Plus}
                                        onClick={() => setIsAddRoomModalOpen(true)}
                                        className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Content Wrapper with Padding - Standardized via PageBody */}
                        <PageBody padVertical={false} className="px-6 md:px-8 py-6 md:py-8">
                            {/* Mobile Header: Title (Not Sticky) */}
                            {activeSection !== 'photos' && activeSection !== 'visits' && (
                                <div className="md:hidden mb-6">
                                    <h2 className="text-2xl font-bold">
                                        {sectionTitles[activeSection]}
                                    </h2>
                                </div>
                            )}
                            {renderContent()}
                        </PageBody>
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default EditPropertyClient;
