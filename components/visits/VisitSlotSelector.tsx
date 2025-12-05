'use client';

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";
import { SafeUser } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";

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
                toast.error("Impossible de charger les créneaux");
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
            toast.success("Visite confirmée !");
            setIsBooked(true);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error("Erreur lors de la réservation");
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
            <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">Visite Confirmée</h3>
                <p className="text-green-700">
                    Votre demande a bien été prise en compte.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Chargement des disponibilités...</div>;
    }

    if (slots.length === 0) {
        return <div className="p-8 text-center text-gray-500">Aucun créneau disponible pour le moment.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-neutral-800">Choisissez la date de consultation</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Ces créneaux correspondent à des visites groupées (2 candidats maximum).
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {uniqueDates.map((dateStr) => {
                    const dateObj = parseISO(dateStr);
                    const isOpen = openDate === dateStr;
                    const daySlots = slots.filter(s => s.date === dateStr);

                    return (
                        <div key={dateStr} className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                            <button
                                onClick={() => setOpenDate(isOpen ? null : dateStr)}
                                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition"
                            >
                                <span className="font-semibold text-neutral-800 capitalize">
                                    {format(dateObj, 'EEEE d MMMM yyyy', { locale: fr })}
                                </span>
                                {isOpen ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                            </button>

                            {isOpen && (
                                <div
                                    className="p-4 bg-blue-50 border-t border-gray-100"
                                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}
                                >
                                    {daySlots.map((slot, idx) => {
                                        const isSelected = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime;
                                        const isHovered = hoveredSlotKey === `${slot.date}-${slot.startTime}`;

                                        // Colors:
                                        // Selected: bg-blue-600 (#2563EB), text-white
                                        // Hover: bg-blue-300 (#93C5FD), text-blue-900 (#1E3A8A)
                                        // Default: bg-blue-100 (#DBEAFE), text-blue-700 (#1D4ED8)

                                        let bg = '#DBEAFE';
                                        let color = '#1D4ED8';

                                        if (isSelected) {
                                            bg = '#2563EB';
                                            color = '#FFFFFF';
                                        } else if (isHovered && !isBooking) {
                                            bg = '#93C5FD';
                                            color = '#1E3A8A';
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                disabled={isBooking}
                                                onClick={() => handleSelectSlot(slot)}
                                                onMouseEnter={() => setHoveredSlotKey(`${slot.date}-${slot.startTime}`)}
                                                onMouseLeave={() => setHoveredSlotKey(null)}
                                                style={{
                                                    backgroundColor: bg,
                                                    color: color,
                                                }}
                                                className={`
                                                    w-full
                                                    px-2 py-2 rounded-md font-semibold text-sm
                                                    transition text-center truncate
                                                    ${isSelected ? 'shadow-md ring-2 ring-blue-600 ring-offset-1' : ''}
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

            <div className="p-4 border-t border-gray-200 bg-gray-50">
                {selectedSlot ? (
                    <div className="mb-6 text-left">
                        <div className="font-normal text-gray-900">
                            Vous avez sélectionné :
                        </div>
                        <div className="font-medium text-gray-900 mb-4 capitalize">
                            le {format(parseISO(selectedSlot.date), 'EEEE d MMMM yyyy', { locale: fr })} à {selectedSlot.startTime}
                        </div>
                        <div className="font-normal text-sm text-gray-500">
                            Veuillez prévoir {getDuration(selectedSlot.startTime, selectedSlot.endTime)} min pour ce rendez-vous
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 text-center text-sm text-gray-400 h-[88px] flex items-center justify-center">
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
