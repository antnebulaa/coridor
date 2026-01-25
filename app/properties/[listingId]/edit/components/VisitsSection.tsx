'use client';

import { useState, useMemo } from "react";
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import { Trash2, Plus, Minus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import FloatingValuesButton from "@/components/ui/FloatingValuesButton";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import SoftInput from "@/components/inputs/SoftInput";
import SoftSelect from "@/components/inputs/SoftSelect";
import LargeActionButton from "@/components/ui/LargeActionButton";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    startOfWeek,
    endOfWeek,
    addDays,
    parseISO,
    startOfToday,
    isBefore,
    eachMonthOfInterval
} from "date-fns";
import { fr } from "date-fns/locale";
import CustomToast from "@/components/ui/CustomToast";
import BottomSheet from "@/components/ui/BottomSheet";

interface VisitsSectionProps {
    listing: SafeListing & {
        visitSlots?: any[];
        visitDuration?: number | null;
        userGlobalSlots?: any[];
    };
    className?: string; // Allow overriding height/layout
}



const RECOMMENDATIONS = {
    STUDIO: 15,
    SMALL: 20,
    LARGE: 30,
    HOUSE: 40
};

const VisitsSection: React.FC<VisitsSectionProps> = ({ listing, className }) => {
    const router = useRouter();
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

    // Local state for slots
    const [slots, setSlots] = useState<any[]>(listing.visitSlots || []);
    const [visitDuration, setVisitDuration] = useState(listing.visitDuration || 20);

    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("12:00");

    // Recommend duration on mount if not set
    useMemo(() => {
        // If we have a saved duration that is NOT the default (20), we respect it.
        // If it IS the default (20), we allow the recommendation logic to run 
        // in case the surface dictates a better default (e.g. 40min for large house).
        if (listing.visitDuration && listing.visitDuration !== 20) return;

        let recommended = 20;
        const surface = listing.surface || 0;

        if (surface < 20) {
            recommended = 15;
        } else if (surface >= 20 && surface < 50) {
            recommended = 20;
        } else if (surface >= 50 && surface < 80) {
            recommended = 30;
        } else {
            recommended = 40;
        }

        setVisitDuration(recommended);
    }, [listing.visitDuration, listing.surface]); // Depend on specific fields

    // Calculate Capacity
    const capacity = useMemo(() => {
        let totalMinutes = 0;
        slots.forEach(slot => {
            const start = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1] || '0');
            const end = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1] || '0');
            totalMinutes += (end - start);
        });
        // 2 candidates per slot
        const slotsCount = Math.floor(totalMinutes / visitDuration);
        return slotsCount * 2;
    }, [slots, visitDuration]);

    // Calculate Recommended Duration
    const recommendedDuration = useMemo(() => {
        const surface = listing.surface || 0;
        if (surface < 20) return 15;
        if (surface < 50) return 20;
        if (surface < 80) return 30;
        return 40;
    }, [listing.surface]);

    // Calendar Logic: Generate next 12 months
    const today = startOfToday();
    const months = useMemo(() => {
        return eachMonthOfInterval({
            start: today,
            end: addMonths(today, 11)
        });
    }, [today]);

    const toggleDate = (date: Date) => {
        if (isBefore(date, startOfToday())) return; // Prevent selecting past dates

        const isSelected = selectedDates.some(d => isSameDay(d, date));
        if (isSelected) {
            setSelectedDates(prev => prev.filter(d => !isSameDay(d, date)));
        } else {
            setSelectedDates(prev => [...prev, date]);
        }
    };

    const getSlotsForDate = (date: Date) => {
        return slots.filter(slot => isSameDay(parseISO(slot.date), date));
    };

    const handleAddSlot = async () => {
        if (selectedDates.length === 0) return;

        if (startTime >= endTime) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="L'heure de fin doit être après l'heure de début"
                    type="error"
                />
            ));
            return;
        }

        const hasOverlap = selectedDates.some(date => {
            const daySlots = getSlotsForDate(date);
            return daySlots.some(existingSlot => {
                return (startTime < existingSlot.endTime) && (endTime > existingSlot.startTime);
            });
        });

        if (hasOverlap) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Ce créneau chevauche un créneau existant ici"
                    type="error"
                />
            ));
            return;
        }

        // Check for Global Conflicts (Remote)
        const globalSlots = listing.userGlobalSlots || [];
        const hasGlobalConflict = selectedDates.some(date => {
            return globalSlots.some((gs: any) => {
                // Only check slots that are NOT local (i.e. conflicts)
                const isLocal = slots.some(s => s.id === gs.id);
                if (isLocal) return false;

                const isSameDate = isSameDay(parseISO(gs.date), date);
                if (!isSameDate) return false;

                // Check time overlap
                return (startTime < gs.endTime) && (endTime > gs.startTime);
            });
        });

        if (hasGlobalConflict) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Impossible : Vous avez déjà des disponibilités ailleurs sur ce créneau"
                    type="error"
                />
            ));
            return;
        }

        setIsLoading(true);
        try {
            const newSlotsToAdd = selectedDates.map(date => ({
                date: date.toISOString(),
                startTime,
                endTime
            }));

            const updatedSlots = [...slots, ...newSlotsToAdd];
            setSlots(updatedSlots);

            const slotsForSelectedDates = slots.filter(slot =>
                selectedDates.some(d => isSameDay(parseISO(slot.date), d))
            );

            const payload = [...slotsForSelectedDates, ...newSlotsToAdd];
            await axios.post(`/api/listings/${listing.id}/visits`, {
                slots: payload,
                dates: selectedDates.map(d => d.toISOString()),
                visitDuration
            });

            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Disponibilités ajoutées"
                    type="success"
                />
            ));

            // Auto-advance times for smoother UX
            const currentEndHour = parseInt(endTime.split(':')[0]);
            let nextStartHour = currentEndHour + 1; // 1 hour break by default

            // Cap at 20:00 start
            if (nextStartHour > 20) nextStartHour = 8; // Reset to morning if too late

            let nextEndHour = nextStartHour + 3; // Default 3 hour slot
            if (nextEndHour > 23) nextEndHour = 23;

            setStartTime(`${nextStartHour.toString().padStart(2, '0')}:00`);
            setEndTime(`${nextEndHour.toString().padStart(2, '0')}:00`);

            router.refresh();
        } catch (error) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la sauvegarde"
                    type="error"
                />
            ));
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSlot = async (slotToDelete: any) => {
        const newSlots = slots.filter(s => s !== slotToDelete);
        setSlots(newSlots);

        const date = parseISO(slotToDelete.date);
        const remainingSlotsForDate = newSlots.filter(s => isSameDay(parseISO(s.date), date));

        try {
            await axios.post(`/api/listings/${listing.id}/visits`, {
                slots: remainingSlotsForDate,
                dates: [slotToDelete.date]
            });
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Créneau supprimé"
                    type="success"
                />
            ));
            router.refresh();
        } catch (error) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la suppression"
                    type="error"
                />
            ));
            console.error(error);
        }
    };

    return (
        <div className={`flex flex-col md:flex-row rounded-xl overflow-hidden relative ${className || 'h-[calc(100vh-140px)] md:h-[600px]'}`}>
            {/* Calendar Section (Scrollable) */}
            <div className="flex-1 overflow-y-auto pb-[300px] md:pb-6 px-0 md:px-4 scroll-smooth">
                {months.map((monthDate, monthIdx) => {
                    const monthStart = startOfMonth(monthDate);
                    const monthEnd = endOfMonth(monthStart);
                    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
                    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                    return (
                        <div key={monthIdx} className="mb-8">
                            <h2 className="text-lg md:text-xl font-medium capitalize mb-4 sticky top-0 bg-white py-2 z-10 text-neutral-900">
                                {format(monthDate, 'MMMM yyyy', { locale: fr })}
                            </h2>

                            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center text-xs md:text-sm text-neutral-500 font-medium">
                                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                                    <div key={i}>{day}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1 md:gap-2">
                                {calendarDays.map((day, idx) => {
                                    const isSelected = selectedDates.some(d => isSameDay(d, day));
                                    const daySlots = getSlotsForDate(day);
                                    const hasSlots = daySlots.length > 0;

                                    // Check for conflicts (Slots elsewhere)
                                    const globalSlots = listing.userGlobalSlots || [];
                                    const conflictSlots = globalSlots.filter((gs: any) =>
                                        isSameDay(parseISO(gs.date), day) &&
                                        !daySlots.some((ls: any) =>
                                            gs.startTime === ls.startTime && gs.endTime === ls.endTime
                                        )
                                    );
                                    const hasConflicts = conflictSlots.length > 0;

                                    const isCurrentMonth = isSameMonth(day, monthDate);
                                    const isPast = isBefore(day, startOfToday());

                                    if (!isCurrentMonth) return <div key={idx} />;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => !isPast && toggleDate(day)}
                                            className={`
                                                aspect-square rounded-lg md:rounded-xl p-0.5 md:p-2 transition relative
                                                flex flex-col items-center justify-center border-2
                                                ${hasSlots ? 'border-[#FE3C10]' : hasConflicts ? 'border-neutral-300' : 'border-transparent'}
                                                ${isPast
                                                    ? 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
                                                    : isSelected
                                                        ? 'bg-[#FE3C10] text-white shadow-md'
                                                        : 'bg-neutral-100 text-neutral-700 cursor-pointer hover:bg-neutral-200'
                                                }
                                            `}
                                        >
                                            <span className={`
                                                text-sm md:text-base font-medium
                                                ${isToday(day) && !isSelected ? 'text-[#FE3C10] font-bold' : ''}
                                            `}>
                                                {format(day, 'd')}
                                            </span>

                                            <div className="mt-0.5 md:mt-1 flex gap-0.5">
                                                {hasSlots && (
                                                    <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#FE3C10]'}`} />
                                                )}
                                                {hasConflicts && (
                                                    <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/50' : 'bg-neutral-400'}`} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* Sidebar / Bottom Panel */}
            <div className={`
                fixed bottom-0 left-0 right-0 z-30 flex flex-col w-full
                pointer-events-none md:pointer-events-auto
                bg-transparent md:bg-white 
                border-t-0 md:border-t md:border-l border-neutral-200 
                shadow-none md:shadow-none md:h-full
            `}>
                {selectedDates.length === 0 ? (
                    <div className="pointer-events-auto bg-white p-6 flex flex-col items-center justify-center text-center h-full text-neutral-500 pb-10 md:pb-6 md:h-auto rounded-t-2xl md:rounded-none shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:shadow-none">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                            <CalendarIcon size={24} className="text-neutral-400" />
                        </div>
                        <p className="font-medium text-sm">Sélectionnez des dates pour gérer les créneaux</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full max-h-[50vh] md:max-h-none justify-end">

                        <div className="flex-1 px-4 pb-4 md:p-6 space-y-6 md:flex-none flex flex-col justify-end">

                            {/* Existing Slots List */}
                            {selectedDates.filter(d => getSlotsForDate(d).length > 0).length > 0 && (
                                <div className="pointer-events-auto bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] md:shadow-none md:bg-transparent max-h-[35vh] overflow-y-auto relative">
                                    <div className="sticky top-0 z-20 md:static">
                                        <div className="bg-white px-4 pt-4 pb-2 md:bg-transparent md:p-0">
                                            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Créneaux de visite existants</h4>
                                        </div>
                                        <div className="h-4 w-full bg-gradient-to-b from-white to-transparent md:hidden pointer-events-none" />
                                    </div>
                                    <div className="px-4 pb-4 md:p-0 relative z-0 divide-y divide-neutral-100">
                                        {selectedDates
                                            .filter(d => getSlotsForDate(d).length > 0)
                                            .sort((a, b) => a.getTime() - b.getTime())
                                            .map(date => {
                                                const daySlots = getSlotsForDate(date);
                                                return (
                                                    <div key={date.toISOString()} className="space-y-2 py-4 first:pt-0">
                                                        <div className="font-medium text-sm text-neutral-900 capitalize">
                                                            {format(date, 'EEEE d MMMM', { locale: fr })}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot, idx) => (
                                                                <div
                                                                    key={`${date.toISOString()}-${idx}`}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg"
                                                                >
                                                                    <span className="text-[20px] font-medium text-neutral-900">
                                                                        {slot.startTime} - {slot.endTime}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleDeleteSlot(slot)}
                                                                        className="text-neutral-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition -mr-1"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* Add Slot Form - MOVED TO BOTTOM SHEET */}
                        </div>

                        {/* Footer with Action Button */}
                        <div className="p-4 pb-12 md:p-6 bg-transparent md:bg-white border-t-0 md:border-t border-neutral-100 pointer-events-auto">
                            <LargeActionButton
                                label="Ajouter une plage horaires de visites"
                                onClick={() => setIsAddSheetOpen(true)}
                                disabled={isLoading}
                            />
                        </div>

                        <BottomSheet
                            isOpen={isAddSheetOpen}
                            onClose={() => setIsAddSheetOpen(false)}
                            title="Ajouter un créneau"
                        >
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Durée et horaires</h4>

                                    <div className="relative mt-6">
                                        {visitDuration === recommendedDuration && (
                                            <div className="absolute -top-6 right-0 bg-neutral-900 text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm animate-in fade-in zoom-in duration-200">
                                                Recommandé
                                            </div>
                                        )}
                                        <div className="bg-neutral-50 p-3 rounded-xl flex items-center justify-between">
                                            <span className="text-sm font-medium text-neutral-700">Visite de</span>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => setVisitDuration(Math.max(15, visitDuration - 5))}
                                                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                                                >
                                                    <Minus size={20} />
                                                </button>
                                                <div className="min-w-16 text-center">
                                                    <span className="font-medium text-lg text-neutral-900 leading-none">{visitDuration} min</span>
                                                </div>
                                                <button
                                                    onClick={() => setVisitDuration(visitDuration + 5)}
                                                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <SoftSelect
                                            id="startTime"
                                            label="Début"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            options={Array.from({ length: 24 * 4 }).map((_, i) => {
                                                const h = Math.floor(i / 4);
                                                const m = (i % 4) * 15;
                                                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                                                return {
                                                    value: timeStr,
                                                    label: timeStr,
                                                    disabled: false
                                                };
                                            })}
                                        />

                                        <SoftSelect
                                            id="endTime"
                                            label="Fin"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            options={Array.from({ length: 24 * 4 }).map((_, i) => {
                                                const h = Math.floor(i / 4);
                                                const m = (i % 4) * 15;
                                                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                                                return {
                                                    value: timeStr,
                                                    label: timeStr,
                                                    disabled: timeStr <= startTime
                                                };
                                            })}
                                        />
                                    </div>

                                    <div className="text-center">
                                        <p className="text-sm text-neutral-500">
                                            Soit <span className="font-bold text-neutral-900">{Math.floor(Math.max(0, (parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1] || '0')) - (parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1] || '0'))) / visitDuration)}</span> créneaux de {visitDuration} min
                                        </p>
                                        {(() => {
                                            const [startH, startM] = startTime.split(':').map(Number);
                                            const [endH, endM] = endTime.split(':').map(Number);
                                            const startMinutes = startH * 60 + (startM || 0);
                                            const endMinutes = endH * 60 + (endM || 0);

                                            if (startMinutes <= 630 && endMinutes >= 870) {
                                                return (
                                                    <p className="text-xs text-orange-600 mt-2 font-medium bg-orange-50 inline-block px-2 py-1 rounded-lg">
                                                        Pas de pause déjeuner ? 🥪
                                                    </p>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>

                                <LargeActionButton
                                    label="Confirmer"
                                    onClick={() => {
                                        handleAddSlot();
                                        setIsAddSheetOpen(false);
                                    }}
                                    disabled={isLoading}
                                />
                            </div>
                        </BottomSheet>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisitsSection;
