'use client';

import { useState, useCallback } from "react";
import { SafeListing, SafeUser } from "@/types";
import Container from "@/components/Container";
import EditPropertySidebar from "@/components/properties/EditPropertySidebar";
import Heading from "@/components/Heading";
import TitleSection from "./components/TitleSection";
import LocationSection from "./components/LocationSection";
import CategorySection from "./components/CategorySection";
import AmenitiesSection from "./components/AmenitiesSection";
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
    | 'availability'
    | 'photos'
    | 'lease'
    | 'price'
    | 'tenant'
    | 'application'
    | 'status'
    | 'delete';

import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
        availability: 'Disponibilité',
        photos: 'Gestion des photos',
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
            case 'availability':
                return <div>Availability Form Placeholder</div>;
            case 'photos':
                return <div>Photos Form Placeholder</div>;
            case 'lease':
                return <div>Lease Form Placeholder</div>;
            case 'price':
                return <div>Price Form Placeholder</div>;
            case 'tenant':
                return <div>Tenant Profile Form Placeholder</div>;
            case 'application':
                return <div>Application Settings Form Placeholder</div>;
            case 'status':
                return <div>Status Form Placeholder</div>;
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
                            pt-4
                            pb-2
                        ">
                            <button
                                onClick={handleBack}
                                className="
                                    p-2
                                    border-[1px]
                                    border-neutral-300
                                    rounded-full
                                    hover:shadow-md
                                    transition
                                    w-fit
                                    bg-white
                                "
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                            </button>
                        </div>

                        {/* Mobile Header: Title (Not Sticky) */}
                        <div className="md:hidden mb-6">
                            <h2 className="text-2xl font-bold">
                                {sectionTitles[activeSection]}
                            </h2>
                        </div>
                        {renderContent()}
                    </div>
                </div>
            </div>
        </Container>
    );
}

export default EditPropertyClient;
