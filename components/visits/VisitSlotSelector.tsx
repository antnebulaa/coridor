'use client';

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { SafeUser } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import CustomToast from "../ui/CustomToast";

interface VisitSlotSelectorProps {
    listingId: string;
    currentUser?: SafeUser | null;
    onSuccess?: () => void;
}

interface AvailableSlot {
    date: string;
    startTime: string;
    endTime: string;
    bookingsCount: number;
}

const VisitSlotSelector: React.FC<VisitSlotSelectorProps> = ({
    listingId,
    currentUser,
    onSuccess
}) => {
    const [slots, setSlots] = useState<AvailableSlot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openDate, setOpenDate] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
    const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [isBooked, setIsBooked] = useState(false);

    useEffect(() => {
        const fetchSlots = async () => {
            try {
                const response = await axios.get(`/api/listings/${listingId}/available-visits`);
                setSlots(response.data);
                if (response.data.length > 0) {
                    // Open the first date by default
                    setOpenDate(response.data[0].date);
                }
            } catch (error) {
                console.error("Failed to fetch slots", error);
                toast.custom((t) => (
                    <CustomToast
                        t={t}
                        message="Impossible de charger les créneaux"
                        type="error"
                    />
                ));
            } finally {
                setIsLoading(false);
            }
        };

        if (listingId) fetchSlots();
    }, [listingId]);

    const uniqueDates = useMemo(() => {
        const dates = slots.map(s => s.date);
        const unique = Array.from(new Set(dates)).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
        return unique.map(d => d.toISOString());
    }, [slots]);

    const handleSelectSlot = (slot: AvailableSlot) => {
        setSelectedSlot(slot);
    };

    const handleConfirmBooking = async () => {
        if (!selectedSlot || !currentUser) return;

        setIsBooking(true);
        try {
            await axios.post('/api/visits/book', {
                listingId,
                date: selectedSlot.date,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime
            });
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Visite confirmée !"
                    type="success"
                />
            ));
            setIsBooked(true);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.custom((t) => (
                <CustomToast
                    t={t}
                    message="Erreur lors de la réservation"
                    type="error"
                />
            ));
            console.error(error);
        } finally {
            setIsBooking(false);
        }
    };

    // Calculate duration in minutes
    const getDuration = (start: string, end: string) => {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        return (endH * 60 + endM) - (startH * 60 + startM);
    };

    if (isBooked) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800 text-center h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-400 mb-2">Visite Confirmée</h3>
                <p className="text-green-700 dark:text-green-300">
                    Votre demande a bien été prise en compte.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement des disponibilités...</div>;
    }

    if (slots.length === 0) {
        return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Aucun créneau disponible pour le moment.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
            <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
                <h3 className="text-xl font-bold text-neutral-800 dark:text-white">Choisissez la date de consultation</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Ces créneaux correspondent à des visites groupées (2 candidats maximum).
                </p>
            </div>

            <div className="flex-1 overflow-y-auto px-0 py-2">
                {uniqueDates.map((dateStr) => {
                    const dateObj = parseISO(dateStr);
                    const isOpen = openDate === dateStr;
                    const daySlots = slots.filter(s => s.date === dateStr);

                    return (
                        <div key={dateStr} className="border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden mb-3">
                            <button
                                onClick={() => setOpenDate(isOpen ? null : dateStr)}
                                className="w-full flex items-center justify-between px-2 py-3 bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                            >
                                <span className="font-semibold text-neutral-800 dark:text-white capitalize">
                                    {format(dateObj, 'EEEE d MMMM yyyy', { locale: fr })}
                                </span>
                                {isOpen ? <ChevronUp size={20} className="text-blue-600 dark:text-blue-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                            </button>

                            {isOpen && (
                                <div
                                    className="p-2 bg-blue-50 dark:bg-neutral-800/50 border-t border-gray-100 dark:border-neutral-800"
                                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}
                                >
                                    {daySlots.map((slot, idx) => {
                                        const isSelected = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime;

                                        return (
                                            <button
                                                key={idx}
                                                disabled={isBooking}
                                                onClick={() => handleSelectSlot(slot)}
                                                className={`
                                                    w-full
                                                    px-2 py-2 rounded-md font-semibold text-sm
                                                    transition text-center truncate
                                                    ${isSelected
                                                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-neutral-900'
                                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50'}
                                                `}
                                            >
                                                {slot.startTime}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
                {selectedSlot ? (
                    <div className="mb-6 text-left">
                        <div className="font-normal text-gray-900 dark:text-white">
                            Vous avez sélectionné :
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white mb-4 capitalize">
                            le {format(parseISO(selectedSlot.date), 'EEEE d MMMM yyyy', { locale: fr })} à {selectedSlot.startTime}
                        </div>
                        <div className="font-normal text-sm text-gray-500 dark:text-gray-400">
                            Veuillez prévoir {getDuration(selectedSlot.startTime, selectedSlot.endTime)} min pour ce rendez-vous
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 text-center text-sm text-gray-400 dark:text-gray-500 h-[88px] flex items-center justify-center">
                        Sélectionnez un créneau ci-dessus
                    </div>
                )}
                <Button
                    disabled={!selectedSlot || isBooking}
                    label={isBooking ? "Confirmation..." : "Je confirme le rendez-vous"}
                    onClick={handleConfirmBooking}
                />
            </div>
        </div>
    );
};

export default VisitSlotSelector;
