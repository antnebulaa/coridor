'use client';

import { useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import EditSectionFooter from "./EditSectionFooter";
import CustomToast from "@/components/ui/CustomToast";
import { useTranslations } from 'next-intl';

interface FurnitureSectionProps {
    listing: SafeListing & { furniture?: any };
}

const MANDATORY_IDS = [
    'bedding', 'curtains', 'hob', 'oven', 'fridge', 'freezer',
    'dishes', 'utensils', 'table', 'seats', 'shelves', 'lights', 'vacuum',
];

const OPTIONAL_IDS = [
    'washingMachine', 'coffeeMaker', 'toaster', 'dishwasher',
    'hairDryer', 'mirror', 'sheets', 'towels', 'cloths',
];

const ALL_IDS = [...MANDATORY_IDS, ...OPTIONAL_IDS];

const FurnitureSection: React.FC<FurnitureSectionProps> = ({
    listing
}) => {
    const router = useRouter();
    const t = useTranslations('properties.edit.furniture');
    const [isLoading, setIsLoading] = useState(false);

    const MANDATORY_ITEMS = MANDATORY_IDS.map(id => ({ id, label: t(`mandatory.${id}`) }));
    const OPTIONAL_ITEMS = OPTIONAL_IDS.map(id => ({ id, label: t(`optional.${id}`) }));

    // Initial state derived from listing.furniture or false
    const [state, setState] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        const furniture = listing.furniture || {};

        ALL_IDS.forEach(id => {
            initial[id] = furniture[id] || false;
        });

        return initial;
    });

    const toggle = (id: string) => {
        setState(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const onSave = () => {
        setIsLoading(true);

        axios.post(`/api/listings/${listing.id}/furniture`, state)
            .then(() => {
                toast.custom((toastRef) => (
                    <CustomToast
                        t={toastRef}
                        message={t('saved')}
                        type="success"
                    />
                ));
                router.refresh(); // Refresh to update server-side data
            })
            .catch(() => {
                toast.custom((toastRef) => (
                    <CustomToast
                        t={toastRef}
                        message={t('error')}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    // Check compliance: All mandatory items must be true
    const isCompliant = MANDATORY_IDS.every(id => state[id]);

    return (
        <div className="flex flex-col gap-8">


            <div className={`
                border rounded-lg p-4 text-sm flex gap-3 items-start
                ${isCompliant
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-orange-50 border-orange-200 text-orange-800'
                }
            `}>
                <div className="mt-0.5">
                    {isCompliant ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <span className="font-semibold">
                        {isCompliant ? t('compliant') : t('nonCompliant')}
                    </span>
                    <span>
                        {isCompliant ? t('compliantDescription') : t('nonCompliantDescription')}
                    </span>
                </div>
            </div>

            {/* Mandatory Section */}
            <div className="flex flex-col gap-4">
                <h3 className="font-medium text-lg border-b pb-2">{t('mandatoryTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MANDATORY_ITEMS.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => toggle(item.id)}
                            className={`
                                flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition group
                                ${state[item.id] ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-black'}
                            `}
                        >
                            <span className="font-normal text-base">{item.label}</span>
                            <div className={`
                                w-6 h-6 rounded-full border transition flex items-center justify-center
                                ${state[item.id]
                                    ? 'bg-black border-black'
                                    : 'border-neutral-300 bg-white group-hover:border-black'
                                }
                            `}>
                                {state[item.id] && (
                                    <Check size={14} className="text-white" strokeWidth={1.5} />
                                )}
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            {/* Optional Section */}
            <div className="flex flex-col gap-4">
                <h3 className="font-medium text-lg border-b pb-2">{t('optionalTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {OPTIONAL_ITEMS.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => toggle(item.id)}
                            className={`
                                flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition group
                                ${state[item.id] ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-black'}
                            `}
                        >
                            <div className={`
                                w-6 h-6 rounded-full border transition flex items-center justify-center
                                ${state[item.id]
                                    ? 'bg-black border-black'
                                    : 'border-neutral-300 bg-white group-hover:border-black'
                                }
                            `}>
                                {state[item.id] && (
                                    <Check size={14} className="text-white" strokeWidth={1.5} />
                                )}
                            </div>
                            <span className="font-medium text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <EditSectionFooter
                label={isLoading ? t('saving') : t('save')}
                onClick={onSave}
                disabled={isLoading}
            />
        </div>
    );
}

export default FurnitureSection;
