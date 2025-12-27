'use client';

import { TabType, SectionType } from "@/app/properties/[listingId]/edit/EditPropertyClient";
import { sidebarTabs, sidebarLinks } from "@/app/properties/[listingId]/edit/constants";

interface EditPropertySidebarProps {
    activeTab: TabType;
    activeSection: SectionType;
    onChangeTab: (tab: TabType) => void;
    onChangeSection: (section: SectionType) => void;
    subtitles?: Record<string, string>;
    customLinks?: Record<TabType, { id: string; label: string }[]>;
}

const EditPropertySidebar: React.FC<EditPropertySidebarProps> = ({
    activeTab,
    activeSection,
    onChangeTab,
    onChangeSection,
    subtitles,
    customLinks
}) => {
    const currentLinks = (customLinks || sidebarLinks)[activeTab];

    return (
        <div className="flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex flex-row items-center justify-between bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full">
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
                            ${activeTab === tab.id ? 'bg-white dark:bg-neutral-700 shadow-sm text-black dark:text-white' : 'text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white'}
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
                {currentLinks.map((link) => (
                    <div
                        key={link.id}
                        onClick={() => onChangeSection(link.id as SectionType)}
                        className={`
                            p-3 
                            rounded-xl 
                            cursor-pointer 
                            transition
                            flex flex-col
                            ${activeSection === link.id ? 'bg-neutral-100 dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}
                        `}
                    >
                        <span className={`font-medium ${activeSection === link.id ? 'text-black dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {link.label}
                        </span>
                        {subtitles?.[link.id] && (
                            <span className={`
                                truncate mt-0.5
                                ${link.id === 'title'
                                    ? 'text-[20px] font-medium text-neutral-500 dark:text-neutral-400 leading-tight'
                                    : 'text-xs text-neutral-500 dark:text-neutral-400 font-normal'}
                            `}>
                                {subtitles[link.id]}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EditPropertySidebar;
