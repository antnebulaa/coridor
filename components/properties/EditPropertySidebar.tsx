'use client';

import { TabType, SectionType } from "@/app/properties/[listingId]/edit/EditPropertyClient";
import { sidebarTabs, sidebarLinks } from "@/app/properties/[listingId]/edit/constants";

interface EditPropertySidebarProps {
    activeTab: TabType;
    activeSection: SectionType;
    onChangeTab: (tab: TabType) => void;
    onChangeSection: (section: SectionType) => void;
}

const EditPropertySidebar: React.FC<EditPropertySidebarProps> = ({
    activeTab,
    activeSection,
    onChangeTab,
    onChangeSection
}) => {

    return (
        <div className="flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex flex-row items-center justify-between bg-neutral-100 p-1 rounded-full">
                {sidebarTabs.map((tab) => (
                    <div
                        key={tab.id}
                        onClick={() => onChangeTab(tab.id as TabType)}
                        className={`
                            flex 
                            items-center 
                            justify-center 
                            p-2 
                            rounded-full 
                            cursor-pointer 
                            transition 
                            w-full
                            ${activeTab === tab.id ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:text-black'}
                        `}
                    >
                        {tab.id === 'preferences' ? (
                            <tab.icon size={20} />
                        ) : (
                            <span className="font-medium text-sm">{tab.label}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Links */}
            <div className="flex flex-col gap-2">
                {sidebarLinks[activeTab].map((link) => (
                    <div
                        key={link.id}
                        onClick={() => onChangeSection(link.id as SectionType)}
                        className={`
                            p-3 
                            rounded-xl 
                            cursor-pointer 
                            transition
                            font-medium
                            ${activeSection === link.id ? 'bg-neutral-100 text-black' : 'text-neutral-500 hover:bg-neutral-50 hover:text-black'}
                        `}
                    >
                        {link.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EditPropertySidebar;
