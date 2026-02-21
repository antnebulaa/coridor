'use client';

import { useState, useCallback, useEffect } from "react";
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
import RoomsConfigSection from "./components/RoomsConfigSection";
import LeaseTypeSection from "./components/LeaseTypeSection";
import LegalInfoSection from "./components/LegalInfoSection";
import LeaseConditionsSection from "./components/LeaseConditionsSection";
import DiagnosticsSection from "@/components/properties/DiagnosticsSection";
import EdlSection from "./components/EdlSection";
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
    | 'description'
    | 'location'
    | 'rooms'
    | 'category'
    | 'amenities'
    | 'furniture'
    | 'photos'
    | 'leaseType'
    | 'visits'
    | 'lease'
    | 'price'
    | 'tenant'
    | 'application'
    | 'status'
    | 'delete'
    | 'expenses'
    | 'legalInfo'
    | 'leaseConditions'
    | 'diagnostics'
    | 'edl';

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Plus, ArrowLeft } from "lucide-react";

const EditPropertyClient: React.FC<EditPropertyClientProps> = ({
    listing,
    currentUser
}) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Determine if this is a Room (not entire place)
    // Safe check covering nested rentalUnit.type or flattened rentalUnitType
    const isRoom = (listing.rentalUnit?.type && listing.rentalUnit.type !== 'ENTIRE_PLACE') ||
        ((listing as any).rentalUnitType && (listing as any).rentalUnitType !== 'ENTIRE_PLACE');

    const [activeTab, setActiveTab] = useState<TabType>('logement');
    const [activeSection, setActiveSection] = useState<SectionType>('title');
    const [showContent, setShowContent] = useState(false);

    // Deep link to section
    useEffect(() => {
        const sectionParam = searchParams?.get('section');
        if (sectionParam && sectionTitles[sectionParam as SectionType]) {
            setActiveSection(sectionParam as SectionType);
            setShowContent(true);
        }
    }, [searchParams]);

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
        if (section === 'expenses') {
            router.push(`/properties/${listing.id}/expenses`);
            return;
        }
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
        description: 'Description détaillée',
        rooms: 'Configuration des chambres',
        location: 'Emplacement',
        category: 'Type de logement',
        amenities: 'Atouts',
        furniture: 'Équipements',
        photos: 'Gestion des photos',
        leaseType: 'Mode de location',
        visits: 'Visites',
        lease: 'Bail',
        price: 'Loyer',
        tenant: 'Profil locataire',
        application: 'Paramètres de candidature',
        status: 'Statut de l\'annonce',
        delete: 'Supprimer l\'annonce',
        expenses: 'Dépenses & Charges',
        legalInfo: 'Informations Legales',
        leaseConditions: 'Conditions du Bail',
        diagnostics: 'Diagnostics Immobiliers',
        edl: 'États des lieux',
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'title':
                return <TitleSection listing={listing} />;
            case 'description':
                return <DescriptionSection listing={listing} />;
            case 'rooms':
                return <RoomsConfigSection listing={listing} currentUser={currentUser} setIsAddRoomModalOpen={setIsAddRoomModalOpen} />;
            case 'location':
                return <LocationSection listing={listing} />;
            case 'category':
                return <CategorySection listing={listing} currentUser={currentUser} />;
            case 'amenities':
                return <AmenitiesSection listing={listing} />;
            case 'furniture':
                return <FurnitureSection listing={listing} />;

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
            case 'leaseType':
                return <LeaseTypeSection listing={listing} currentUser={currentUser} />;
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
            case 'legalInfo':
                return <LegalInfoSection listing={listing} />;
            case 'leaseConditions':
                return <LeaseConditionsSection listing={listing} />;
            case 'diagnostics':
                return (
                    <DiagnosticsSection
                        propertyId={listing.rentalUnit?.property?.id || ''}
                        initialData={{
                            dpe: (listing as any).dpe,
                            dpeDate: (listing.rentalUnit?.property as any)?.dpeDate,
                            dpeExpiryDate: (listing.rentalUnit?.property as any)?.dpeExpiryDate,
                            electricalDiagnosticDate: (listing.rentalUnit?.property as any)?.electricalDiagnosticDate,
                            electricalInstallYear: (listing.rentalUnit?.property as any)?.electricalInstallYear,
                            gasDiagnosticDate: (listing.rentalUnit?.property as any)?.gasDiagnosticDate,
                            gasInstallYear: (listing.rentalUnit?.property as any)?.gasInstallYear,
                            hasGasInstallation: (listing.rentalUnit?.property as any)?.hasGasInstallation,
                            erpDate: (listing.rentalUnit?.property as any)?.erpDate,
                        }}
                    />
                );
            case 'edl':
                return <EdlSection listing={listing} />;
            case 'delete':
                return <div>Delete Form Placeholder</div>;
            default:
                return <div>Select a section</div>;
        }
    };

    return (
        <Container>
            <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-10 pt-0 md:pt-4">
                {/* Sidebar - Hidden on mobile if content is shown */}
                <div className={`col-span-1 ${showContent ? 'hidden md:block' : 'block'} md:pt-0`}>
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => router.push('/properties')}
                            className="
                                p-2 
                                rounded-full 
                                hover:bg-neutral-100 
                                transition 
                                cursor-pointer
                            "
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div className="text-2xl font-medium">
                            Modification d'annonce
                        </div>
                    </div>

                    <EditPropertySidebar
                        activeTab={activeTab}
                        activeSection={activeSection}
                        onChangeTab={handleTabChange}
                        onChangeSection={handleSectionChange}
                        customLinks={(() => {
                            const hasRooms = (listing.rentalUnit?.property?.rentalUnits || []).some((u: any) => u.type === 'PRIVATE_ROOM');
                            const isMainUnit = listing.rentalUnitType === 'ENTIRE_PLACE' || (!listing.rentalUnitType && listing.rentalUnit?.type === 'ENTIRE_PLACE');

                            if (isMainUnit && !hasRooms) {
                                return {
                                    ...sidebarLinks,
                                    logement: sidebarLinks.logement.filter(l => l.id !== 'rooms')
                                };
                            }
                            return undefined;
                        })()}
                        subtitles={{
                            rooms: (() => {
                                const rentalUnits = listing.rentalUnit?.property?.rentalUnits || [];
                                const count = rentalUnits
                                    .flatMap((unit: any) => (unit.listings || []).map((l: any) => ({ ...l, rentalUnit: unit })))
                                    .filter((l: any) => l.rentalUnit.type !== 'ENTIRE_PLACE' && l.id !== listing.id)
                                    .length;
                                return `${count} chambre${count > 1 ? 's' : ''} créée${count > 1 ? 's' : ''}`;
                            })(),
                            title: (() => {
                                if (listing.category && listing.propertyAdjective) {
                                    return `${listing.category} ${listing.propertyAdjective}`;
                                }
                                return listing.title;
                            })(),
                            location: listing.addressLine1
                                ? `${listing.addressLine1}, ${listing.city}`
                                : listing.city || '',
                            price: (() => {
                                const rentalUnits = listing.rentalUnit?.property?.rentalUnits || [];
                                const roomListings = rentalUnits
                                    .flatMap((unit: any) => (unit.listings || []).map((l: any) => ({ ...l, rentalUnit: unit })))
                                    .filter((l: any) => l.rentalUnit.type !== 'ENTIRE_PLACE' && l.id !== listing.id);

                                if (roomListings.length > 0) {
                                    const totalRent = roomListings.reduce((acc: number, l: any) => acc + (l.price || 0), 0);
                                    const totalCharges = roomListings.reduce((acc: number, l: any) => acc + ((l.charges as any)?.amount || 0), 0);
                                    return `${totalRent}€${totalCharges > 0 ? ` + ${totalCharges}€ ch.` : ' / mois'}`;
                                }

                                return listing.price
                                    ? `${listing.price}€${listing.charges && (listing.charges as any).amount ? ` + ${(listing.charges as any).amount}€ ch.` : ' / mois'}`
                                    : '';
                            })()
                        }}
                    />
                </div>

                <div className={` ${!showContent ? 'hidden md:block' : 'block'}`}>
                    <div className="hidden md:flex h-10 items-center mb-6">
                        <h2 className="text-2xl font-medium">
                            {sectionTitles[activeSection]}
                        </h2>
                    </div>

                    <div className="md:border md:border-neutral-200 md:rounded-xl md:shadow-sm relative bg-white dark:bg-neutral-900 dark:border-neutral-800 min-h-[50vh] -mx-4 md:mx-0">
                        {/* Mobile Header: Back Button (Sticky) */}
                        <div className="
                            md:hidden 
                            sticky 
                            top-0
                            h-16
                            z-50 
                            bg-white dark:bg-neutral-900
                            px-6
                            border-b border-neutral-200 dark:border-neutral-800
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
                        <PageBody padVertical={false} className={`px-6 md:px-8 md:py-8 ${activeSection === 'visits' ? 'pt-0 pb-6' : 'py-6'}`}>
                            {/* Mobile Header: Title (Not Sticky) */}
                            {activeSection !== 'photos' && activeSection !== 'visits' && (
                                <div className="md:hidden mb-6">
                                    <h2 className="text-2xl font-medium">
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
