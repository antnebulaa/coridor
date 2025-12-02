'use client';

import { useState, useMemo } from "react";
import { SafeListing } from "@/types";
import { Button } from "@/components/ui/Button";
import { Trash2, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
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
    };
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const VisitsSection: React.FC<VisitsSectionProps> = ({ listing }) => {
    const router = useRouter();
    const [selectedDates, setSelectedDates] = useState<Date[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Local state for slots
    const [slots, setSlots] = useState<any[]>(listing.visitSlots || []);

    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("18:00");

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
                dates: selectedDates.map(d => d.toISOString())
            });

            toast.success("Disponibilités ajoutées");
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
                fixed bottom-0 left-0 right-0 z-20 bg-white p-4 border-t border-neutral-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]
                md:static md:w-[350px] md:border-l md:border-t-0 md:shadow-none md:flex md:flex-col
            `}>
                {selectedDates.length > 0 ? (
                    <div className="grid grid-cols-2 md:flex md:flex-col gap-3 md:gap-4 h-full">
                        {/* Existing Slots */}
                        <div className="order-1 md:order-2 bg-black md:bg-transparent text-white md:text-black rounded-2xl p-3 md:p-0 flex flex-col max-h-[150px] md:max-h-none overflow-hidden">
                            <h4 className="font-medium mb-2 md:mb-4 text-sm md:text-base">
                                <span className="md:hidden">Existants</span>
                                <span className="hidden md:inline">Créneaux existants</span>
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                                {selectedDates.flatMap(date => {
                                    const daySlots = getSlotsForDate(date);
                                    return daySlots.map((slot, idx) => (
                                        <div key={`${date.toISOString()}-${idx}`} className="flex items-center justify-between p-2 border border-neutral-800 md:border-neutral-200 rounded-lg text-xs md:text-sm bg-neutral-900 md:bg-white">
                                            <div>
                                                <p className="font-medium">{format(date, 'd MMM', { locale: fr })}</p>
                                                <p className="text-neutral-400 md:text-neutral-500">{slot.startTime}-{slot.endTime}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSlot(slot)}
                                                className="text-red-500 hover:bg-red-900/20 md:hover:bg-red-50 p-1 rounded-full"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ));
                                })}
                                {selectedDates.every(d => getSlotsForDate(d).length === 0) && (
                                    <p className="text-xs md:text-sm text-neutral-500 italic text-center">Aucun</p>
                                )}
                            </div>
                        </div>

                        {/* Add Slot */}
                        <div className="order-2 md:order-1 bg-black md:bg-transparent text-white md:text-black rounded-2xl p-3 md:p-0 flex flex-col justify-between">
                            <div className="hidden md:block mb-6">
                                <h3 className="text-lg font-semibold mb-2">
                                    {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} sélectionnée{selectedDates.length > 1 ? 's' : ''}
                                </h3>
                                <p className="text-sm text-neutral-500">
                                    Définissez les horaires.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 mb-2">
                                <div className="flex gap-2">
                                    <select
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="p-1.5 border rounded-md w-full bg-neutral-800 md:bg-white border-neutral-700 md:border-neutral-200 text-white md:text-black text-sm"
                                    >
                                        {HOURS.map(h => (
                                            <option key={`start-${h}`} value={`${h.toString().padStart(2, '0')}:00`}>
                                                {h.toString().padStart(2, '0')}:00
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="p-1.5 border rounded-md w-full bg-neutral-800 md:bg-white border-neutral-700 md:border-neutral-200 text-white md:text-black text-sm"
                                    >
                                        {HOURS.map(h => (
                                            <option key={`end-${h}`} value={`${h.toString().padStart(2, '0')}:00`}>
                                                {h.toString().padStart(2, '0')}:00
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <Button
                                onClick={handleAddSlot}
                                disabled={isLoading}
                                className="w-full bg-white text-black hover:bg-neutral-200 md:bg-black md:text-white md:hover:bg-neutral-800 text-sm py-1 md:py-2"
                            >
                                Ajouter
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 md:p-6">
                        <CalendarIcon size={24} className="mb-2 opacity-20 md:w-12 md:h-12" />
                        <p className="text-sm">Sélectionnez des dates.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisitsSection;
