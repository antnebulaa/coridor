'use client';

import { useState, useMemo } from "react";
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import { Trash2, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import FloatingValuesButton from "@/components/ui/FloatingValuesButton";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import SoftSelect from "@/components/inputs/SoftSelect";
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

interface VisitsSectionProps {
    listing: SafeListing & {
        visitSlots?: any[];
        visitDuration?: number | null;
    };
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const RECOMMENDATIONS = {
    STUDIO: 15,
    SMALL: 20,
    LARGE: 30,
    HOUSE: 40
};

const VisitsSection: React.FC<VisitsSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Local state for slots
    const [slots, setSlots] = useState<any[]>(listing.visitSlots || []);
    const [visitDuration, setVisitDuration] = useState(listing.visitDuration || 20);

    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("18:00");

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
            toast.error("L'heure de fin doit être après l'heure de début");
            return;
        }

        const hasOverlap = selectedDates.some(date => {
            const daySlots = getSlotsForDate(date);
            return daySlots.some(existingSlot => {
                return (startTime < existingSlot.endTime) && (endTime > existingSlot.startTime);
            });
        });

        if (hasOverlap) {
            toast.error("Ce créneau chevauche un créneau existant");
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

            toast.success("Disponibilités ajoutées");

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
            toast.error("Erreur lors de la sauvegarde");
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
            toast.success("Créneau supprimé");
            router.refresh();
        } catch (error) {
            toast.error("Erreur lors de la suppression");
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] md:h-[600px] rounded-xl overflow-hidden relative">
            {/* Calendar Section (Scrollable) */}
            <div className="flex-1 overflow-y-auto pb-48 md:pb-6 px-0 sm:px-2 md:px-6 scroll-smooth">
                {months.map((monthDate, monthIdx) => {
                    const monthStart = startOfMonth(monthDate);
                    const monthEnd = endOfMonth(monthStart);
                    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
                    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
                    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                    return (
                        <div key={monthIdx} className="mb-8">
                            <h2 className="text-xl font-bold capitalize mb-4 sticky top-0 bg-white py-2 z-10">
                                {format(monthDate, 'MMMM yyyy', { locale: fr })}
                            </h2>

                            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm text-neutral-500">
                                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                                    <div key={day}>{day}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays.map((day, idx) => {
                                    const isSelected = selectedDates.some(d => isSameDay(d, day));
                                    const daySlots = getSlotsForDate(day);
                                    const hasSlots = daySlots.length > 0;
                                    const isCurrentMonth = isSameMonth(day, monthDate);
                                    const isPast = isBefore(day, startOfToday());

                                    if (!isCurrentMonth) return <div key={idx} />; // Don't render days from other months to keep grid clean

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => !isPast && toggleDate(day)}
                                            className={`
                                                aspect-square rounded-xl border p-1 md:p-2 transition relative
                                                flex flex-col items-center justify-center
                                                ${isPast ? 'opacity-30 bg-neutral-100 cursor-not-allowed' : 'cursor-pointer'}
                                                ${isSelected
                                                    ? 'bg-[#002FA7] text-white border-[#002FA7] z-10'
                                                    : !isPast && 'border-neutral-200 hover:border-neutral-400'
                                                }
                                                ${hasSlots && !isSelected && !isPast ? 'bg-neutral-50' : ''}
                                            `}
                                        >
                                            <span className={`
                                                text-sm font-medium
                                                ${isToday(day) && !isSelected ? 'bg-black text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}
                                                ${isToday(day) && isSelected ? 'font-bold' : ''}
                                            `}>
                                                {format(day, 'd')}
                                            </span>

                                            {hasSlots && (
                                                <div className="mt-1 flex gap-0.5">
                                                    <div className="w-1 h-1 rounded-full bg-green-500" />
                                                    {daySlots.length > 1 && <div className="w-1 h-1 rounded-full bg-green-500" />}
                                                </div>
                                            )}
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
                fixed bottom-4 left-4 right-4 z-20 pointer-events-none flex flex-col gap-3 justify-end
                md:static md:inset-auto md:w-[350px] md:border-l md:pointer-events-auto md:bg-white md:p-6 md:block md:gap-6 overflow-y-auto
            `}>
                {/* Block 1: Status / Existing Slots */}
                <div className={`
                    pointer-events-auto bg-neutral-900 text-white rounded-3xl p-4 shadow-xl shrink-0 transition-all
                    md:bg-transparent md:text-black md:shadow-none md:rounded-none md:p-0
                    ${selectedDates.length === 0 ? 'w-auto mx-auto' : 'w-full'}
                `}>
                    {selectedDates.length === 0 ? (
                        <div className="flex items-center gap-3 justify-center md:justify-start pt-10">
                            <CalendarIcon size={20} className="text-neutral-400" />
                            <span className="font-medium text-sm text-neutral-500">Sélectionnez des dates pour commencer</span>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full max-h-[20vh] md:max-h-none overflow-hidden">
                            <h4 className="font-bold mb-2 md:mb-4 text-sm md:text-lg px-2 text-foreground">
                                <span className="md:hidden">Créneaux existants ({selectedDates.length} dates)</span>
                                <span className="hidden md:inline">Créneaux existants</span>
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar px-2 max-h-[200px] mb-6">
                                {selectedDates.flatMap(date => {
                                    const daySlots = getSlotsForDate(date);
                                    if (daySlots.length === 0) return null;
                                    return daySlots.map((slot, idx) => (
                                        <div key={`${date.toISOString()}-${idx}`} className="flex items-center justify-between p-3 border border-neutral-700 md:border-neutral-200 rounded-xl text-xs md:text-sm bg-neutral-800 md:bg-white">
                                            <div>
                                                <p className="font-semibold">{format(date, 'd MMM', { locale: fr })}</p>
                                                <p className="text-neutral-400 md:text-neutral-500">{slot.startTime} - {slot.endTime}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSlot(slot)}
                                                className="text-red-400 hover:text-red-300 md:text-red-500 md:hover:bg-red-50 p-2 rounded-full transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ));
                                })}
                                {selectedDates.every(d => getSlotsForDate(d).length === 0) && (
                                    <p className="text-sm text-neutral-500 italic py-2">Aucun créneau planifié pour cette sélection</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Block 2: Add Slot Controls (Only if dates selected) */}
                {selectedDates.length > 0 && (
                    <div className={`
                        pointer-events-auto bg-neutral-900 text-white rounded-3xl p-4 shadow-xl shrink-0 w-full mt-auto
                        md:bg-transparent md:text-black md:shadow-none md:rounded-none md:p-0 md:mt-0 flex flex-col gap-4
                    `}>
                        <div className="hidden md:block border-t pt-6">
                            <h3 className="text-lg font-bold mb-1">
                                {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} sélectionnée{selectedDates.length > 1 ? 's' : ''}
                            </h3>
                            <p className="text-sm text-neutral-500">
                                Définissez les horaires pour ces dates.
                            </p>
                        </div>

                        {/* Mobile Header */}
                        <div className="md:hidden flex justify-between items-center mb-4 px-2">
                            <span className="font-semibold text-sm">Ajouter un créneau</span>
                        </div>

                        {/* Duration Control */}
                        <div className="bg-neutral-100 p-4 rounded-xl flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-neutral-700">Durée visite</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setVisitDuration(Math.max(15, visitDuration - 5))}
                                        className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold hover:bg-neutral-50 transition"
                                    >-</button>
                                    <span className="font-bold text-sm min-w-[3rem] text-center">{visitDuration} min</span>
                                    <button
                                        onClick={() => setVisitDuration(visitDuration + 5)}
                                        className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold hover:bg-neutral-50 transition"
                                    >+</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SoftSelect
                                id="startTime"
                                label="Début"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                options={HOURS.map(h => {
                                    const hourStr = `${h.toString().padStart(2, '0')}:00`;
                                    const isOccupied = selectedDates.some(date => {
                                        const daySlots = getSlotsForDate(date);
                                        return daySlots.some(slot => {
                                            const s = parseInt(slot.startTime.split(':')[0]);
                                            const e = parseInt(slot.endTime.split(':')[0]);
                                            return h >= s && h < e;
                                        });
                                    });
                                    return {
                                        value: hourStr,
                                        label: hourStr,
                                        disabled: isOccupied
                                    };
                                })}
                            />

                            <SoftSelect
                                id="endTime"
                                label="Fin"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                options={HOURS.map(h => {
                                    const hourStr = `${h.toString().padStart(2, '0')}:00`;
                                    const startH = parseInt(startTime.split(':')[0]);

                                    const isOccupied = selectedDates.some(date => {
                                        const daySlots = getSlotsForDate(date);
                                        return daySlots.some(slot => {
                                            const s = parseInt(slot.startTime.split(':')[0]);
                                            const e = parseInt(slot.endTime.split(':')[0]);
                                            return h > s && h <= e;
                                        });
                                    });

                                    const isValid = h > startH;

                                    return {
                                        value: hourStr,
                                        label: hourStr,
                                        disabled: !isValid || isOccupied
                                    };
                                })}
                            />
                        </div>

                        <Button
                            label="Ajouter le créneau"
                            onClick={handleAddSlot}
                            disabled={isLoading}

                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisitsSection;
