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
    className?: string; // Allow overriding height/layout
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

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
        <div className={`flex flex-col md:flex-row rounded-xl overflow-hidden relative ${className || 'h-[calc(100vh-140px)] md:h-[600px]'}`}>
            {/* Calendar Section (Scrollable) */}
            <div className="flex-1 overflow-y-auto pb-[300px] md:pb-6 px-2 md:px-6 scroll-smooth">
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
                                    const isCurrentMonth = isSameMonth(day, monthDate);
                                    const isPast = isBefore(day, startOfToday());

                                    if (!isCurrentMonth) return <div key={idx} />;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => !isPast && toggleDate(day)}
                                            className={`
                                                aspect-square rounded-lg md:rounded-xl border p-0.5 md:p-2 transition relative
                                                flex flex-col items-center justify-center
                                                ${isPast ? 'opacity-30 bg-neutral-50 cursor-not-allowed' : 'cursor-pointer'}
                                                ${isSelected
                                                    ? 'bg-neutral-900 text-white border-neutral-900 z-10 shadow-md'
                                                    : !isPast && 'border-neutral-200 hover:border-neutral-400 bg-white'
                                                }
                                                ${hasSlots && !isSelected && !isPast ? 'bg-neutral-50' : ''}
                                            `}
                                        >
                                            <span className={`
                                                text-sm md:text-base font-medium
                                                ${isToday(day) && !isSelected ? 'text-indigo-600 font-bold' : ''}
                                            `}>
                                                {format(day, 'd')}
                                            </span>

                                            {hasSlots && (
                                                <div className="mt-0.5 md:mt-1 flex gap-0.5">
                                                    <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
                                                    {daySlots.length > 1 && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />}
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
                fixed bottom-0 left-0 right-0 z-30 flex flex-col bg-white border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]
                md:static md:w-[350px] md:border-t-0 md:border-l md:shadow-none md:h-full
            `}>
                {selectedDates.length === 0 ? (
                    <div className="p-6 flex flex-col items-center justify-center text-center h-full text-neutral-500 pb-10 md:pb-6">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                            <CalendarIcon size={24} className="text-neutral-400" />
                        </div>
                        <p className="font-medium text-sm">Sélectionnez des dates pour gérer les créneaux</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full max-h-[50vh] md:max-h-none">

                        {/* Header: Selected Count + Actions */}
                        <div className="p-4 md:p-6 border-b border-neutral-100 flex justify-between items-center bg-white sticky top-0 z-20">
                            <div>
                                <h3 className="font-bold text-neutral-900">
                                    {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''}
                                </h3>
                                <p className="text-xs text-neutral-500 hidden md:block">Gérez les créneaux pour la sélection</p>
                            </div>
                            <button
                                onClick={() => setSelectedDates([])}
                                className="text-xs font-medium text-neutral-500 underline"
                            >
                                Tout désélectionner
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

                            {/* Existing Slots List */}
                            {selectedDates.some(d => getSlotsForDate(d).length > 0) && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Créneaux existants</h4>
                                    <div className="space-y-2">
                                        {selectedDates.flatMap(date => {
                                            const daySlots = getSlotsForDate(date);
                                            return daySlots.map((slot, idx) => (
                                                <div key={`${date.toISOString()}-${idx}`} className="flex items-center justify-between p-3 border border-neutral-200 rounded-xl bg-neutral-50">
                                                    <div>
                                                        <p className="font-medium text-sm text-neutral-900">{format(date, 'd MMM', { locale: fr })}</p>
                                                        <p className="text-xs text-neutral-500">{slot.startTime} - {slot.endTime}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteSlot(slot)}
                                                        className="text-neutral-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ));
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Add Slot Form */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ajouter un créneau</h4>

                                <div className="bg-neutral-50 p-3 rounded-xl flex items-center justify-between">
                                    <span className="text-sm font-medium text-neutral-700">Durée</span>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setVisitDuration(Math.max(15, visitDuration - 5))}
                                            className="w-7 h-7 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center text-sm font-bold hover:border-neutral-400 transition"
                                        >-</button>
                                        <span className="font-bold text-sm min-w-12 text-center text-neutral-900">{visitDuration} min</span>
                                        <button
                                            onClick={() => setVisitDuration(visitDuration + 5)}
                                            className="w-7 h-7 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center text-sm font-bold hover:border-neutral-400 transition"
                                        >+</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
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

                                            // Simple validity check
                                            const isValid = h > startH;

                                            return {
                                                value: hourStr,
                                                label: hourStr,
                                                disabled: !isValid
                                            };
                                        })}
                                    />
                                </div>

                                <Button
                                    label="Ajouter"
                                    onClick={handleAddSlot}
                                    disabled={isLoading}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisitsSection;
