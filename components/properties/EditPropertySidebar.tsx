'use client';

import { TabType, SectionType } from "@/app/properties/[listingId]/edit/EditPropertyClient";
import { Building2, Calendar, FileText, Image as ImageIcon, LayoutDashboard, Settings, Users, ChartBar } from "lucide-react";
import { sidebarTabs, sidebarLinks } from "@/app/properties/[listingId]/edit/constants";

interface EditPropertySidebarProps {
    activeTab: TabType;
    activeSection: SectionType;
    onChangeTab: (tab: TabType) => void;
    onChangeSection: (section: SectionType) => void;
    subtitles?: Record<string, string>;
    customLinks?: Record<TabType, { id: string; label: string; icon?: any }[]>;
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
                {currentLinks.map((link) => {
                    const isTitle = link.id === 'title';
                    return (
                        <div
                            key={link.id}
                            onClick={() => !isTitle && onChangeSection(link.id as SectionType)}
                            className={`
                                p-1.5 
                                rounded-xl 
                                transition
                                flex flex-row items-center gap-3
                                ${activeSection === link.id ? 'bg-neutral-100 dark:bg-neutral-800' : isTitle ? '' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer'}
                            `}
                        >
                            <div className={`
                                w-10 h-10 rounded-lg 
                                bg-[#FBFBFB] dark:bg-neutral-700 
                                flex items-center justify-center shrink-0
                            `}>
                                {link.icon && <link.icon size={20} className="text-neutral-600 dark:text-neutral-300" />}
                            </div>

                            <div className="flex flex-col min-w-0">
                                {!isTitle && (
                                    <span className={`font-medium ${activeSection === link.id ? 'text-black dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                        {link.label}
                                    </span>
                                )}
                                {subtitles?.[link.id] && (
                                    <span className={`
                                        truncate mt-0.5
                                        ${isTitle
                                            ? 'text-[20px] font-medium text-black dark:text-white leading-tight'
                                            : 'text-xs text-neutral-500 dark:text-neutral-400 font-normal'}
                                    `}>
                                        {subtitles[link.id]}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default EditPropertySidebar;
