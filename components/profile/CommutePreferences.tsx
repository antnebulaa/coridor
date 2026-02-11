'use client';

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import CustomToast from "@/components/ui/CustomToast";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Train, Car, Bike, Footprints, Briefcase, Home, GraduationCap, Star, Heart } from "lucide-react";
import { useTranslations } from 'next-intl';

import { SafeUser } from "@/types";
import { Button } from "@/components/ui/Button";
import CommuteAddressSelect from "@/components/inputs/CommuteAddressSelect";
import { AddressSelectValue } from "@/components/inputs/MapboxAddressSelect";

interface CommutePreferencesProps {
    currentUser: SafeUser;
}

const CommutePreferences: React.FC<CommutePreferencesProps> = ({
    currentUser
}) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const t = useTranslations('account.preferences.commute');
    const tCommon = useTranslations('common');

    // Form state
    const [name, setName] = useState('');
    const [address, setAddress] = useState<AddressSelectValue | null>(null);
    const [transportMode, setTransportMode] = useState('TRANSIT');
    const [icon, setIcon] = useState('briefcase');

    const iconList = [
        { id: 'briefcase', icon: Briefcase, label: t('icons.work') },
        { id: 'home', icon: Home, label: t('icons.home') },
        { id: 'school', icon: GraduationCap, label: t('icons.school') },
        { id: 'favorite', icon: Star, label: t('icons.favorite') },
        { id: 'partner', icon: Heart, label: t('icons.partner') }
    ];

    const onDelete = (id: string) => {
        setIsLoading(true);
        axios.delete('/api/user/commute', { data: { id } })
            .then(() => {
                toast.custom((tToast) => (
                    <CustomToast
                        t={tToast}
                        message={t('toasts.deleted')}
                        type="success"
                    />
                ));
                router.refresh();
            })
            .catch(() => {
                toast.custom((tToast) => (
                    <CustomToast
                        t={tToast}
                        message={t('toasts.deleteError')}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    const onToggleMap = (id: string, newState: boolean) => {
        axios.patch('/api/user/commute', { id, isShowOnMap: newState })
            .then(() => {
                toast.custom((tToast) => (
                    <CustomToast
                        t={tToast}
                        message={newState ? t('toasts.visible') : t('toasts.hidden')}
                        type="success"
                    />
                ));
                router.refresh();
            })
            .catch(() => {
                toast.custom((tToast) => (
                    <CustomToast
                        t={tToast}
                        message={t('toasts.visibilityError')}
                        type="error"
                    />
                ));
            });
    }

    const onSubmit = () => {
        if (!name || !address) {
            toast.custom((tToast) => (
                <CustomToast
                    t={tToast}
                    message={t('toasts.fillAll')}
                    type="error"
                />
            ));
            return;
        }

        setIsLoading(true);

        axios.post('/api/user/commute', {
            name,
            address: address.label,
            latitude: address.latlng[0],
            longitude: address.latlng[1],
            transportMode,
            icon
        })
            .then(() => {
                toast.custom((tToast) => (
                    <CustomToast
                        t={tToast}
                        message={t('toasts.added')}
                        type="success"
                    />
                ));
                router.refresh();
                setIsAdding(false);
                setName('');
                setAddress(null);
                setTransportMode('TRANSIT');
                setIcon('briefcase');
            })
            .catch(() => {
                toast.custom((tToast) => (
                    <CustomToast
                        t={tToast}
                        message={t('toasts.addError')}
                        type="error"
                    />
                ));
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    return (
        <div className="flex flex-col gap-6 p-6 border border-border rounded-xl bg-card">
            <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">{t('title')}</h3>
                <p className="text-muted-foreground text-sm">
                    {t('description')}
                </p>
            </div>

            <div className="flex flex-col gap-3">
                {currentUser.commuteLocations?.map((location) => {
                    // Determine Icon
                    const matchedIcon = iconList.find(i => i.id === location.icon);

                    return (
                        <div key={location.id} className="group flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-border/50 hover:border-border transition">
                            <div className="flex items-center gap-4">
                                <div className="
                                flex items-center justify-center 
                                w-10 h-10 
                                rounded-full 
                                bg-white dark:bg-neutral-800 
                                border border-neutral-100 dark:border-neutral-800
                                shadow-sm
                            ">
                                    {matchedIcon ? (
                                        <matchedIcon.icon size={18} className="text-neutral-700 dark:text-neutral-300" />
                                    ) : (
                                        <>
                                            {location.transportMode === 'TRANSIT' && <Train size={18} className="text-neutral-700 dark:text-neutral-300" />}
                                            {location.transportMode === 'DRIVING' && <Car size={18} className="text-neutral-700 dark:text-neutral-300" />}
                                            {location.transportMode === 'CYCLING' && <Bike size={18} className="text-neutral-700 dark:text-neutral-300" />}
                                            {location.transportMode === 'WALKING' && <Footprints size={18} className="text-neutral-700 dark:text-neutral-300" />}
                                        </>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{location.name}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px] md:max-w-md">
                                        {location.address}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end gap-1">
                                    <div className="text-[10px] uppercase font-bold text-neutral-400">{t('map')}</div>
                                    <div
                                        onClick={() => onToggleMap(location.id, !location.isShowOnMap)}
                                        className={`
                                        w-9 h-5 rounded-full relative transition cursor-pointer 
                                        ${location.isShowOnMap ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'}
                                    `}
                                        title={location.isShowOnMap ? t('hideMap') : t('showMap')}
                                    >
                                        <div className={`
                                        absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white dark:bg-black transition-transform shadow-sm
                                        ${location.isShowOnMap ? 'translate-x-4' : 'translate-x-0'}
                                    `} />
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800 mx-1"></div>
                                <button
                                    onClick={() => onDelete(location.id)}
                                    disabled={isLoading}
                                    className="flex items-center justify-center bg-transparent border-none text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 w-8 h-8 p-0 min-w-0 rounded-full transition"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )
                })}

                {currentUser.commuteLocations?.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-neutral-500 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 text-sm">
                        {t('empty')}
                    </div>
                )}
            </div>

            {!isAdding ? (
                <div className="flex justify-start">
                    <Button
                        onClick={() => setIsAdding(true)}
                        variant="outline"
                        className="w-auto gap-2 pl-3 pr-4"
                        small
                    >
                        <Plus size={16} />
                        <span>{t('add')}</span>
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-4 p-4 border border-border rounded-lg bg-neutral-50/50 dark:bg-neutral-900/20">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="font-medium text-sm">{t('new')}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-neutral-500">{t('name')}</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('placeholder')}
                                className="
                                    p-3 text-sm
                                    bg-neutral-100 dark:bg-neutral-800 
                                    rounded-lg outline-none
                                    placeholder:text-neutral-400
                                "
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-neutral-500">{t('type')}</label>
                            <div className="flex gap-2">
                                {iconList.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setIcon(item.id)}
                                        className={`
                                            w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition border
                                            ${icon === item.id ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'}
                                        `}
                                        title={item.label}
                                    >
                                        <item.icon size={18} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-neutral-500">{t('transport')}</label>
                        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                            {['TRANSIT', 'DRIVING', 'CYCLING', 'WALKING'].map((mode) => (
                                <div
                                    key={mode}
                                    onClick={() => setTransportMode(mode)}
                                    className={`
                                        flex-1 flex items-center justify-center p-2 rounded-md cursor-pointer transition
                                        ${transportMode === mode ? 'bg-white dark:bg-black shadow-sm text-black dark:text-white' : 'text-neutral-400 hover:text-neutral-600'}
                                    `}
                                    title={mode}
                                >
                                    {mode === 'TRANSIT' && <Train size={16} />}
                                    {mode === 'DRIVING' && <Car size={16} />}
                                    {mode === 'CYCLING' && <Bike size={16} />}
                                    {mode === 'WALKING' && <Footprints size={16} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-neutral-500">{t('address')}</label>
                        <CommuteAddressSelect
                            value={address || undefined}
                            onChange={(val) => setAddress(val)}
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                        <Button
                            label={tCommon('cancel')}
                            onClick={() => setIsAdding(false)}
                            variant="ghost"
                            size="sm"
                            className="w-auto border-none hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        />
                        <Button
                            label={tCommon('save')}
                            onClick={onSubmit}
                            disabled={isLoading}
                            size="sm"
                            className="w-auto"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommutePreferences;
