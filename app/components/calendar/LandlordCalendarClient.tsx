'use client';

import { useState, useMemo } from "react";
import { format, addDays, subDays, isSameDay, parseISO, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MapPin, User, Clock } from "lucide-react";
import Container from "@/components/Container";

interface PropertyData {
    id: string;
    category: string;
    city: string | null;
    visitSlots: {
        id: string;
        startTime: string;
        endTime: string;
        date: string;
    }[];
}

interface SlotData {
    id: string;
    startTime: string;
    endTime: string;
    date: string;
    address: string | null;
}

interface VisitData {
    id: string;
    startTime: string;
    endTime: string;
    date: string;
    listing: {
        title: string;
    };
    candidate: {
        name: string;
        image: string | null;
    };
}

interface LandlordCalendarClientProps {
    data: {
        slots: SlotData[]; // NEW
        properties: any[]; // Kept for context if needed, but slots are separate now
        visits: VisitData[];
    };
    currentUser?: any;
}

const LandlordCalendarClient: React.FC<LandlordCalendarClientProps> = ({
    data,
}) => {
    const [currentDate, setCurrentDate] = useState(startOfToday());

    // Filter events for the current day
    const dayEvents = useMemo(() => {
        // 1. Availability Slots (User Centric)
        const availabilitySlots = (data.slots || []).map((slot) => ({
            type: 'SLOT',
            id: slot.id,
            propertyId: null, // No longer strictly tied to one property ID for display
            title: "Disponible",
            subtitle: slot.address || "Lieu défini",
            startTime: slot.startTime,
            endTime: slot.endTime,
            date: slot.date,
            color: 'bg-blue-50 border-blue-200 text-blue-700'
        })).filter(event => isSameDay(parseISO(event.date), currentDate));

        // 2. Confirmed Visits
        const visits = data.visits.map((visit) => ({
            type: 'VISIT',
            id: visit.id,
            propertyId: null, // Linked via listing
            title: visit.candidate.name,
            subtitle: visit.listing.title,
            startTime: visit.startTime,
            endTime: visit.endTime,
            date: visit.date,
            image: visit.candidate.image,
            color: 'bg-red-50 border-red-200 text-red-700'
        })).filter(event => isSameDay(parseISO(event.date), currentDate));

        return [...availabilitySlots, ...visits].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [data, currentDate]);

    // Hours Grid (8:00 to 20:00)
    const hours = Array.from({ length: 13 }).map((_, i) => i + 8); // 8 to 20

    const getPositionStyle = (startTime: string, endTime: string) => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const startMinutes = (startH - 8) * 60 + startM;
        const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

        return {
            top: `${startMinutes * 2}px`, // 2px per minute
            height: `${durationMinutes * 2}px`
        };
    };

    return (
        <Container>
            <div className="pt-24 pb-20">
                <div className="flex flex-col gap-6">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">Mon Calendrier</h1>
                            <p className="text-neutral-500">Gérez vos disponibilités et vos visites</p>
                        </div>
                        <div className="flex items-center justify-between w-full md:w-auto gap-4 bg-white shadow-sm border border-neutral-200 rounded-full p-1 pl-4">
                            <div className="font-medium capitalize text-neutral-900 min-w-[120px] text-center text-sm md:text-base">
                                {format(currentDate, 'EEEE d MMMM', { locale: fr })}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentDate(prev => subDays(prev, 1))}
                                    className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => setCurrentDate(startOfToday())}
                                    className="px-3 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 rounded-full transition hidden sm:block"
                                >
                                    Aujourd&apos;hui
                                </button>
                                <button
                                    onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                                    className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-row min-h-[600px] overflow-x-auto">

                        {/* Time Column */}
                        <div className="w-16 md:w-20 border-r border-neutral-100 bg-neutral-50 flex-none relative">
                            {hours.map(hour => (
                                <div key={hour} className="h-[120px] relative border-b border-neutral-100 last:border-0">
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium text-neutral-400 bg-neutral-50 px-1">
                                        {hour}:00
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Events Area */}
                        <div className="flex-1 relative bg-white h-[1560px]"> {/* 13 hours * 120px */}
                            {/* Background Grid Lines */}
                            {hours.map(hour => (
                                <div key={hour} className="h-[120px] border-b border-dashed border-neutral-100 w-full box-border" />
                            ))}

                            {/* Events */}
                            {dayEvents.map((event) => {
                                const style = getPositionStyle(event.startTime, event.endTime);

                                const isVisit = event.type === 'VISIT';
                                const zIndex = isVisit ? 20 : 10;
                                const width = isVisit ? '90%' : '95%';
                                const left = isVisit ? '5%' : '0';

                                return (
                                    <div
                                        key={`${event.type}-${event.id}`}
                                        className={`
                                            absolute left-2 right-2 rounded-lg p-3 border-l-4
                                            ${event.color}
                                            transition hover:brightness-95 cursor-pointer
                                            flex flex-col justify-center
                                            overflow-hidden
                                        `}
                                        style={{
                                            ...style,
                                            zIndex,
                                            width,
                                            left
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {isVisit ? <User size={14} /> : <Clock size={14} />}
                                            <span className="font-semibold text-sm truncate">{event.title}</span>
                                            <span className="text-xs opacity-75">{event.startTime} - {event.endTime}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-75 text-xs truncate">
                                            <MapPin size={12} />
                                            {event.subtitle}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Current Time Indicator (if Today) */}
                            {isSameDay(currentDate, new Date()) && (
                                <div
                                    className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                                    style={{
                                        top: `${((new Date().getHours() - 8) * 60 + new Date().getMinutes()) * 2}px`
                                    }}
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>
        </Container>
    );
};

export default LandlordCalendarClient;
