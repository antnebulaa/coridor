'use client';

import { useState, useMemo, useEffect, useRef } from "react";
import { format, addDays, subDays, isSameDay, parseISO, startOfToday, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MapPin, User, Clock, Calendar, List } from "lucide-react";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import VisitDetailsModal from "./VisitDetailsModal";
import Avatar from "@/components/Avatar";

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
        slots: SlotData[];
        properties: any[];
        visits: VisitData[];
    };
    currentUser?: any;
}

const LandlordCalendarClient: React.FC<LandlordCalendarClientProps> = ({
    data,
}) => {
    const [currentDate, setCurrentDate] = useState(startOfToday());
    const [view, setView] = useState<'day' | 'agenda'>('agenda');
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const headerRef = useRef<HTMLDivElement>(null);

    // Measure header height for sticky positioning
    useEffect(() => {
        if (!headerRef.current) return;

        const updateHeight = () => {
            if (headerRef.current) {
                setHeaderHeight(headerRef.current.offsetHeight);
            }
        };

        const observer = new ResizeObserver(updateHeight);
        observer.observe(headerRef.current);
        updateHeight(); // Initial measure

        return () => observer.disconnect();
    }, []);

    // Auto-scroll to Today
    useEffect(() => {
        if (view === 'agenda') {
            const todayElement = document.getElementById('today-anchor');
            if (todayElement) {
                // Scroll with offset taking header height into account
                const elementPosition = todayElement.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementPosition - headerHeight - 20; // 20px buffer

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "auto"
                });
            }
        }
    }, [view, data, headerHeight]);

    // Common Event Formatting
    const formatEvent = (item: any, type: 'VISIT' | 'SLOT') => ({
        type,
        id: item.id,
        propertyId: null,
        title: type === 'VISIT' ? item.candidate.name : "Disponible",
        subtitle: type === 'VISIT' ? (item.listing.address || item.listing.title) : item.address,
        startTime: item.startTime,
        endTime: item.endTime,
        date: item.date,
        image: type === 'VISIT' ? item.candidate.image : null,
        candidate: type === 'VISIT' ? item.candidate : null,
        listing: type === 'VISIT' ? item.listing : null,
        color: type === 'VISIT' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
    });

    // Filter events for the current day (Day View)
    const dayEvents = useMemo(() => {
        const slots = (data.slots || []).map(s => formatEvent(s, 'SLOT'));
        const visits = (data.visits || []).map(v => formatEvent(v, 'VISIT'));
        return [...slots, ...visits]
            .filter(event => isSameDay(parseISO(event.date), currentDate))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [data, currentDate]);

    // Agenda Events (All from Today onwards)
    const agendaEvents = useMemo(() => {
        const rawSlots = (data.slots || []).map(s => formatEvent(s, 'SLOT'));
        const rawVisits = (data.visits || []).map(v => formatEvent(v, 'VISIT'));

        // Helper to merge slots
        const mergeSlots = (slots: any[]) => {
            if (slots.length === 0) return [];
            const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
            const merged: any[] = [];
            let current = sorted[0];

            for (let i = 1; i < sorted.length; i++) {
                const next = sorted[i];
                if (next.startTime === current.endTime) {
                    current = { ...current, endTime: next.endTime };
                } else {
                    merged.push(current);
                    current = next;
                }
            }
            merged.push(current);
            return merged;
        };

        // Group everything by Date
        const groupedByDate: Record<string, any[]> = {};

        // Add Visits first
        rawVisits.forEach(v => {
            if (!groupedByDate[v.date]) groupedByDate[v.date] = [];
            groupedByDate[v.date].push(v);
        });

        // Group slots by date separately to merge them
        const slotsByDate: Record<string, any[]> = {};
        rawSlots.forEach(s => {
            if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
            slotsByDate[s.date].push(s);
        });

        // Merge slots per day and add to main group
        Object.entries(slotsByDate).forEach(([date, daySlots]) => {
            const merged = mergeSlots(daySlots);
            if (!groupedByDate[date]) groupedByDate[date] = [];
            groupedByDate[date].push(...merged);
        });

        // Filter for Today+ and Sort final lists
        const sortedDates = Object.keys(groupedByDate).sort();
        const final: Record<string, any[]> = {};

        sortedDates.forEach(date => {
            // Keep all dates, including past ones
            final[date] = groupedByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        return final;
    }, [data]);

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

    const handleEventClick = (event: any) => {
        if (event.type === 'VISIT') {
            setSelectedEvent(event);
            setIsModalOpen(true);
        }
    };

    return (
        <Container>
            <VisitDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                event={selectedEvent}
            />

            <div className="flex flex-col gap-6">

                {/* Header with Ref */}
                <div
                    ref={headerRef}
                    className="sticky top-0 z-30 bg-white pt-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 transition-all border-b border-transparent shadow-sm"
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <Heading
                            title="Mon Calendrier"

                        />

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            {/* View Toggle */}
                            <div className="bg-neutral-100 p-1 rounded-lg flex items-center">
                                <button
                                    onClick={() => setView('day')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${view === 'day' ? 'bg-white text-black' : 'text-neutral-500 hover:text-neutral-700'}`}
                                >
                                    <Clock size={16} />
                                    Journée
                                </button>
                                <button
                                    onClick={() => setView('agenda')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${view === 'agenda' ? 'bg-white text-black' : 'text-neutral-500 hover:text-neutral-700'}`}
                                >
                                    <List size={16} />
                                    Agenda
                                </button>
                            </div>

                            {/* Date Navigation (Only for Day View) */}
                            {view === 'day' && (
                                <div className="flex items-center justify-between gap-4 bg-white border border-neutral-200 rounded-lg p-1 pl-4">
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
                                            Auj.
                                        </button>
                                        <button
                                            onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                                            className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center transition"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-none sm:rounded-xl p-0 min-h-[600px] -mx-4 sm:mx-0 border-y sm:border-0 border-neutral-200">

                    {/* AGENDA VIEW */}
                    {view === 'agenda' && (
                        <div className="flex flex-col pb-[80vh]">
                            {Object.keys(agendaEvents).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[400px] text-neutral-500">
                                    <Calendar size={48} className="mb-4 text-neutral-300" />
                                    <p>Aucun événement à venir.</p>
                                </div>
                            ) : (
                                Object.entries(agendaEvents).map(([date, events]) => {
                                    const isToday = isSameDay(parseISO(date), new Date());
                                    return (
                                        <div key={date} id={isToday ? 'today-anchor' : undefined}>
                                            <div
                                                className="sticky z-20 text-lg border-neutral-200 bg-white/95 backdrop-blur-sm px-4 py-3 font-semibold text-neutral-700 flex items-center gap-2 border-b"
                                                style={{ top: `${headerHeight - 1}px` }}
                                            >
                                                <Calendar size={16} />
                                                {format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })}
                                                {isToday && <span className="text-xs font-normal capitalize text-red-500 px-2 py-1 rounded-2xl ml-2">Aujourd'hui</span>}
                                            </div>
                                            <div className="space-y-2 pt-1 pb-6 px-3">
                                                {events.sort((a: any, b: any) => {
                                                    if (a.type === 'SLOT' && b.type === 'VISIT') return -1;
                                                    if (a.type === 'VISIT' && b.type === 'SLOT') return 1;
                                                    return 0; // Keep time sort if same type
                                                }).map((event: any) => {
                                                    if (event.type === 'VISIT') {
                                                        // VISIT: Card Style (Restored)
                                                        return (
                                                            <div
                                                                key={`${event.type}-${event.id}`}
                                                                onClick={() => handleEventClick(event)}
                                                                className="group bg-white border border-neutral-500 rounded-2xl p-3 cursor-pointer hover:border-1 hover:border-neutral-400 hover:shadow-md transition flex flex-row items-center gap-4"
                                                            >
                                                                {/* Time Block */}
                                                                <div className="flex flex-col items-center justify-center min-w-[70px] border-r border-neutral-200 pr-4">
                                                                    <span className="text-lg font-medium text-neutral-700">{event.startTime}</span>
                                                                    <span className="text-sm text-neutral-500">{event.endTime}</span>
                                                                </div>

                                                                {/* Content */}
                                                                <div className="flex-1 flex items-center gap-3">
                                                                    <Avatar src={event.image} seed={event.title} size={42} />
                                                                    <div>
                                                                        <h4 className="font-semibold text-neutral-700">{event.title}</h4>
                                                                        <div className="flex items-center gap-1 text-sm text-neutral-700 mt-0.5">
                                                                            <MapPin size={14} className="shrink-0" />
                                                                            <span className="line-clamp-1">{event.subtitle}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Action */}
                                                                <div className="hidden sm:flex items-center text-neutral-400 group-hover:text-black transition pl-4">
                                                                    <ChevronRight size={20} />
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // SLOT: Pill Style (Restored)
                                                    return (
                                                        <div
                                                            key={`${event.type}-${event.id}`}
                                                            className="flex items-center px-0 mb-2"
                                                        >
                                                            <div className="px-4 py-3 mt-1 mb-1 rounded-2xl bg-[#FBF7F2] font-medium text-sm text-neutral-700 w-full sm:w-auto text-left sm:text-left">
                                                                <div className="font-medium text-neutral-700 text-xl">Visites</div>
                                                                <div>Créneaux ouverts de {event.startTime} à {event.endTime}</div>
                                                                {event.subtitle && (
                                                                    <div className="text-xs text-neutral-700 mt-0.5 flex items-left justify-left sm:justify-start gap-1">
                                                                        <MapPin size={12} />
                                                                        au {event.subtitle}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* DAY VIEW */}
                    {view === 'day' && (
                        <div className="flex flex-row overflow-x-auto h-full">
                            {/* Existing Day View Logic */}
                            <div className="w-16 md:w-20 border-r border-neutral-100 bg-neutral-50 flex-none relative">
                                {hours.map(hour => (
                                    <div key={hour} className="h-[120px] relative border-b border-neutral-100 last:border-0">
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium text-neutral-400 bg-neutral-50 px-1">
                                            {hour}:00
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex-1 relative bg-white h-[1560px]">
                                {hours.map(hour => (
                                    <div key={hour} className="h-[120px] border-b border-dashed border-neutral-100 w-full box-border" />
                                ))}

                                {dayEvents.map((event) => {
                                    const style = getPositionStyle(event.startTime, event.endTime);
                                    const isVisit = event.type === 'VISIT';
                                    const zIndex = isVisit ? 20 : 10;
                                    const width = isVisit ? '90%' : '95%';
                                    const left = isVisit ? '5%' : '0';

                                    return (
                                        <div
                                            key={`${event.type}-${event.id}`}
                                            onClick={() => handleEventClick(event)}
                                            className={`
                                                    absolute left-2 right-2 rounded-lg p-3 border-l-4
                                                    ${event.color}
                                                    transition hover:brightness-95 cursor-pointer
                                                    flex flex-col justify-center
                                                    overflow-hidden shadow-xs
                                                `}
                                            style={{ ...style, zIndex, width, left }}
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
                    )}
                </div>
            </div>
        </Container>
    );
};

export default LandlordCalendarClient;
