'use client';

import { useState, useMemo, useEffect, useRef } from "react";
import { format, addDays, subDays, isSameDay, parseISO, startOfToday, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MapPin, User, Clock, Calendar, List, ClipboardCheck, MoreHorizontal, CalendarClock, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import VisitDetailsModal from "./VisitDetailsModal";
import Avatar from "@/components/Avatar";
import useRealtimeNotifications from "@/hooks/useRealtimeNotifications";

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
    status?: string;
    applicationId?: string | null;
    listing: {
        title: string;
    };
    candidate: {
        name: string;
        image: string | null;
    };
    evaluation?: {
        decision: string;
        compositeScore: number;
        scores?: { criterion: string; score: number }[];
    } | null;
}

interface InspectionEventData {
    id: string;
    type: 'ENTRY' | 'EXIT';
    status: string;
    date: string;
    startTime: string;
    endTime: string;
    tenantName: string | null;
    listingTitle: string;
    address: string | null;
    totalRooms: number;
    completedRooms: number;
}

interface LandlordCalendarClientProps {
    data: {
        slots: SlotData[];
        properties: any[];
        visits: VisitData[];
        inspections?: InspectionEventData[];
    };
    currentUser?: any;
}

const LandlordCalendarClient: React.FC<LandlordCalendarClientProps> = ({
    data,
    currentUser
}) => {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(startOfToday());
    const [view, setView] = useState<'day' | 'agenda'>('agenda');
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const headerRef = useRef<HTMLDivElement>(null);
    const NAVBAR_HEIGHT_DESKTOP = 64; // Global navbar height on desktop (hidden on mobile)

    // Inspection action menu
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [rescheduleId, setRescheduleId] = useState<string | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('10:00');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Realtime subscription for new visit bookings
    useRealtimeNotifications({
        userId: currentUser?.id,
        onNewVisit: () => {
            toast.success("Nouvelle visite réservée !", {
                icon: "📅",
                duration: 5000
            });
            router.refresh();
        }
    });

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

    // Auto-scroll to Today (or first future date)
    useEffect(() => {
        if (view === 'agenda' && headerHeight > 0) {
            const timer = setTimeout(() => {
                // Try today first, then first future date, then empty state
                let targetElement = document.getElementById('today-anchor');
                if (!targetElement) {
                    targetElement = document.getElementById('first-future-anchor');
                }
                if (!targetElement) {
                    targetElement = document.getElementById('empty-state-anchor');
                }

                if (targetElement) {
                    const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
                    const isMobile = window.innerWidth < 768;
                    const navbarOffset = isMobile ? 0 : NAVBAR_HEIGHT_DESKTOP;
                    const offsetPosition = elementPosition - navbarOffset - headerHeight - 10;

                    window.scrollTo({
                        top: Math.max(0, offsetPosition),
                        behavior: "auto"
                    });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [view, data, headerHeight]);

    // Common Event Formatting
    const formatEvent = (item: any, type: 'VISIT' | 'SLOT' | 'INSPECTION') => {
        if (type === 'INSPECTION') {
            const typeLabel = item.type === 'ENTRY' ? "EDL d'entrée" : 'EDL de sortie';
            return {
                type: 'INSPECTION' as const,
                id: item.id,
                propertyId: null,
                title: typeLabel,
                subtitle: item.address || item.listingTitle,
                startTime: item.startTime,
                endTime: item.endTime,
                date: item.date,
                status: item.status,
                image: null,
                candidate: null,
                listing: null,
                applicationId: null,
                evaluation: null,
                color: 'bg-amber-50 border-amber-400 text-amber-800',
                // Inspection-specific fields
                inspectionType: item.type,
                inspectionStatus: item.status,
                tenantName: item.tenantName,
                totalRooms: item.totalRooms,
                completedRooms: item.completedRooms,
            };
        }
        return {
            type,
            id: item.id,
            propertyId: null,
            title: type === 'VISIT' ? item.candidate.name : "Disponible",
            subtitle: type === 'VISIT' ? (item.listing.address || item.listing.title) : item.address,
            startTime: item.startTime,
            endTime: item.endTime,
            date: item.date,
            status: type === 'VISIT' ? (item.status || 'CONFIRMED') : null,
            image: type === 'VISIT' ? item.candidate.image : null,
            candidate: type === 'VISIT' ? item.candidate : null,
            listing: type === 'VISIT' ? item.listing : null,
            applicationId: type === 'VISIT' ? (item.applicationId || null) : null,
            evaluation: type === 'VISIT' ? (item.evaluation || null) : null,
            color: type === 'VISIT'
                ? (item.status === 'PENDING' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700')
                : 'bg-blue-50 border-blue-200 text-blue-700',
        };
    };

    // Filter events for the current day (Day View)
    const dayEvents = useMemo(() => {
        const slots = (data.slots || []).map(s => formatEvent(s, 'SLOT'));
        const visits = (data.visits || []).map(v => formatEvent(v, 'VISIT'));
        const inspections = (data.inspections || []).map(i => formatEvent(i, 'INSPECTION'));
        return [...slots, ...visits, ...inspections]
            .filter(event => isSameDay(parseISO(event.date), currentDate))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [data, currentDate]);

    // Agenda Events (All from Today onwards)
    const agendaEvents = useMemo(() => {
        const rawSlots = (data.slots || []).map(s => formatEvent(s, 'SLOT'));
        const rawVisits = (data.visits || []).map(v => formatEvent(v, 'VISIT'));
        const rawInspections = (data.inspections || []).map(i => formatEvent(i, 'INSPECTION'));

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

        // Add Inspections
        rawInspections.forEach(i => {
            if (!groupedByDate[i.date]) groupedByDate[i.date] = [];
            groupedByDate[i.date].push(i);
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

    const handleCancelInspection = async (inspectionId: string) => {
        if (!confirm("Annuler cet état des lieux ? Le locataire sera notifié.")) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/inspection/${inspectionId}/cancel`, { method: 'POST' });
            if (res.ok) {
                toast.success("État des lieux annulé");
                setActionMenuId(null);
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Erreur");
            }
        } catch {
            toast.error("Erreur réseau");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRescheduleInspection = async () => {
        if (!rescheduleId || !rescheduleDate || !rescheduleTime) return;
        setIsSubmitting(true);
        try {
            const scheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
            const res = await fetch(`/api/inspection/${rescheduleId}/reschedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scheduledAt }),
            });
            if (res.ok) {
                toast.success("État des lieux reprogrammé");
                setRescheduleId(null);
                setRescheduleDate('');
                setRescheduleTime('10:00');
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "Erreur");
            }
        } catch {
            toast.error("Erreur réseau");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEventClick = (event: any) => {
        if (event.type === 'VISIT') {
            setSelectedEvent(event);
            setIsModalOpen(true);
        } else if (event.type === 'INSPECTION') {
            // Navigate to inspection based on status
            if (event.inspectionStatus === 'DRAFT') {
                router.push(`/inspection/${event.id}/rooms`);
            } else if (event.inspectionStatus === 'SIGNED') {
                router.push(`/inspection/${event.id}/done`);
            } else {
                router.push(`/inspection/${event.id}/sign`);
            }
        }
    };

    return (
        <Container>
            <VisitDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                event={selectedEvent}
                onEvaluationSaved={() => router.refresh()}
            />

            {/* Reschedule Modal */}
            {rescheduleId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRescheduleId(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-neutral-900">Reprogrammer l&apos;EDL</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-neutral-600 mb-1 block">Date</label>
                                <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-neutral-600 mb-1 block">Heure</label>
                                <input
                                    type="time"
                                    value={rescheduleTime}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleRescheduleInspection}
                                disabled={isSubmitting || !rescheduleDate}
                                className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Envoi...' : 'Reprogrammer'}
                            </button>
                            <button
                                onClick={() => setRescheduleId(null)}
                                className="px-4 py-2.5 text-neutral-500 text-sm hover:text-neutral-700"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-6">

                {/* Header with Ref */}
                <div
                    ref={headerRef}
                    className="sticky top-0 md:top-16 z-30 bg-white pt-safe md:pt-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 transition-all"
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
                <div className="bg-white rounded-none sm:rounded-xl p-0 min-h-[600px] -mx-4 sm:mx-0 border-y sm:border-0 border-neutral-200" onClick={() => actionMenuId && setActionMenuId(null)}>

                    {/* AGENDA VIEW */}
                    {view === 'agenda' && (
                        <div className="flex flex-col pb-[10vh]">
                            {Object.keys(agendaEvents).length === 0 ? (
                                <div id="empty-state-anchor" className="flex flex-col items-center justify-center h-[400px] text-neutral-500">
                                    <Calendar size={48} className="mb-4 text-neutral-300" />
                                    <p>Aucun événement à venir.</p>
                                </div>
                            ) : (() => {
                                let firstFutureFound = false;
                                return Object.entries(agendaEvents).map(([date, events]) => {
                                    const parsedDate = parseISO(date);
                                    const isToday = isSameDay(parsedDate, new Date());
                                    const isPastDate = isBefore(parsedDate, startOfToday());

                                    // Mark the first non-past date as fallback anchor
                                    const isFirstFuture = !isPastDate && !firstFutureFound && !isToday;
                                    if (isFirstFuture) firstFutureFound = true;

                                    const anchorId = isToday ? 'today-anchor' : (isFirstFuture ? 'first-future-anchor' : undefined);

                                    return (
                                        <div key={date} id={anchorId}>
                                            <div
                                                className={`sticky z-20 text-lg backdrop-blur-sm px-4 py-3 font-semibold flex items-center gap-2 border-b transition-colors
                                                    ${isPastDate ? 'bg-white text-neutral-500 border-neutral-100' : 'bg-white/95 text-neutral-700 border-neutral-200'}
                                                `}
                                                style={{ top: `${headerHeight}px` }}
                                            >
                                                <Calendar size={16} className={isPastDate ? "text-neutral-500" : ""} />
                                                <span className="capitalize">{format(parsedDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                                                {isToday && <span className="text-xs font-normal capitalize text-red-500 px-2 py-1 rounded-2xl ml-2">Aujourd'hui</span>}
                                            </div>
                                            <div className="space-y-2 pt-4 pb-6 px-3">
                                                {events.sort((a: any, b: any) => {
                                                    // Priority: INSPECTION > VISIT > SLOT
                                                    const priority: Record<string, number> = { INSPECTION: 0, VISIT: 1, SLOT: 2 };
                                                    const diff = (priority[a.type] ?? 1) - (priority[b.type] ?? 1);
                                                    if (diff !== 0) return diff;
                                                    return a.startTime.localeCompare(b.startTime);
                                                }).map((event: any) => {
                                                    // Determine if event is passed
                                                    const [endH, endM] = event.endTime.split(':').map(Number);
                                                    const eventEndDateTime = new Date(parsedDate);
                                                    eventEndDateTime.setHours(endH, endM, 0, 0);
                                                    const isPastEvent = isBefore(eventEndDateTime, new Date());

                                                    if (event.type === 'VISIT') {
                                                        // VISIT: Card Style (Restored)
                                                        return (
                                                            <div
                                                                key={`${event.type}-${event.id}`}
                                                                onClick={() => handleEventClick(event)}
                                                                className={`
                                                                    group border rounded-2xl p-3 cursor-pointer transition flex flex-row items-center gap-1
                                                                    ${isPastEvent
                                                                        ? 'bg-neutral-50 border-neutral-200 opacity-80 hover:opacity-100'
                                                                        : 'bg-white border-neutral-500 hover:border-neutral-400 hover:shadow-md'
                                                                    }
                                                                `}
                                                            >
                                                                {/* Time Block */}
                                                                <div className={`flex flex-col items-center justify-center min-w-[70px] border-r pr-4 ${isPastEvent ? 'border-neutral-100' : 'border-neutral-200'}`}>
                                                                    <span className={`text-lg font-medium ${isPastEvent ? 'text-neutral-600' : 'text-neutral-700'}`}>{event.startTime}</span>
                                                                    <span className={`text-sm ${isPastEvent ? 'text-neutral-500' : 'text-neutral-500'}`}>{event.endTime}</span>
                                                                </div>

                                                                {/* Content */}
                                                                <div className="flex-1 flex items-start gap-3">
                                                                    <div className={`shrink-0 ${isPastEvent ? "opacity-80" : ""}`}>
                                                                        <Avatar src={event.image} seed={event.title} size={42} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <h4 className={`font-semibold truncate ${isPastEvent ? 'text-neutral-600' : 'text-neutral-700'}`}>{event.title}</h4>
                                                                                {/* Evaluation decision badge */}
                                                                                {event.evaluation?.decision === 'SHORTLISTED' && (
                                                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Shortliste" />
                                                                                )}
                                                                                {event.evaluation?.decision === 'UNDECIDED' && (
                                                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" title="Indecis" />
                                                                                )}
                                                                                {event.evaluation?.decision === 'ELIMINATED' && (
                                                                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" title="Ecarte" />
                                                                                )}
                                                                            </div>
                                                                            {event.status === 'PENDING' && (
                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase shrink-0">En attente</span>
                                                                            )}
                                                                            {event.status === 'CONFIRMED' && !event.evaluation && (
                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 uppercase shrink-0">Confirmée</span>
                                                                            )}
                                                                        </div>
                                                                        <div className={`flex items-center gap-1.5 text-sm mt-0.5 ${isPastEvent ? 'text-neutral-500' : 'text-neutral-700'}`}>
                                                                            <MapPin size={13} className="shrink-0 -translate-y-px" />
                                                                            <span className="line-clamp-1">{event.subtitle}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    if (event.type === 'INSPECTION') {
                                                        const statusLabel = event.inspectionStatus === 'DRAFT'
                                                            ? `${event.completedRooms}/${event.totalRooms} pièces`
                                                            : event.inspectionStatus === 'PENDING_SIGNATURE'
                                                                ? 'Attente signature'
                                                                : 'Signé';
                                                        return (
                                                            <div
                                                                key={`${event.type}-${event.id}`}
                                                                onClick={() => handleEventClick(event)}
                                                                className={`
                                                                    group border rounded-2xl p-3 cursor-pointer transition flex flex-row items-center gap-0
                                                                    ${isPastEvent
                                                                        ? 'bg-neutral-50 border-neutral-200 opacity-80 hover:opacity-100'
                                                                        : 'bg-amber-50 border-amber-300 hover:border-amber-400 hover:shadow-md'
                                                                    }
                                                                `}
                                                            >
                                                                {/* Time Block */}
                                                                <div className={`flex flex-col items-center justify-center min-w-[70px] border-r pr-4 ${isPastEvent ? 'border-neutral-100' : 'border-amber-200'}`}>
                                                                    <span className={`text-lg font-medium ${isPastEvent ? 'text-neutral-600' : 'text-amber-700'}`}>{event.startTime}</span>
                                                                    <span className={`text-sm ${isPastEvent ? 'text-neutral-500' : 'text-amber-500'}`}>{event.endTime}</span>
                                                                </div>

                                                                {/* Content */}
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <ClipboardCheck size={15} className={`shrink-0 -translate-y-px ${isPastEvent ? 'text-neutral-500' : 'text-amber-700'}`} />
                                                                            <h4 className={`font-semibold ${isPastEvent ? 'text-neutral-600' : 'text-amber-800'}`}>{event.title}</h4>
                                                                        </div>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                                                                            event.inspectionStatus === 'SIGNED'
                                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                                : event.inspectionStatus === 'PENDING_SIGNATURE'
                                                                                    ? 'bg-blue-100 text-blue-800'
                                                                                    : 'bg-amber-100 text-amber-800'
                                                                        }`}>
                                                                            {statusLabel}
                                                                        </span>
                                                                    </div>
                                                                    {event.tenantName && (
                                                                        <div className={`text-sm font-medium mt-1.5 ${isPastEvent ? 'text-neutral-500' : 'text-amber-800'}`}>
                                                                            Avec {event.tenantName}
                                                                        </div>
                                                                    )}
                                                                    <div className={`flex items-center gap-1.5 text-sm mt-0.5 ${isPastEvent ? 'text-neutral-500' : 'text-amber-700'}`}>
                                                                        <MapPin size={13} className="shrink-0 -translate-y-px" />
                                                                        <span className="line-clamp-1">au {event.subtitle}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex items-center gap-1">
                                                                    {event.inspectionStatus === 'DRAFT' && !isPastEvent && (
                                                                        <div className="relative">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActionMenuId(actionMenuId === event.id ? null : event.id);
                                                                                }}
                                                                                className="p-1.5 rounded-full hover:bg-amber-100 transition text-amber-500 hover:text-amber-700"
                                                                            >
                                                                                <MoreHorizontal size={18} />
                                                                            </button>
                                                                            {actionMenuId === event.id && (
                                                                                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50 min-w-[180px]">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setActionMenuId(null);
                                                                                            setRescheduleId(event.id);
                                                                                        }}
                                                                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-neutral-50 text-neutral-700"
                                                                                    >
                                                                                        <CalendarClock size={15} />
                                                                                        Reprogrammer
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleCancelInspection(event.id);
                                                                                        }}
                                                                                        disabled={isSubmitting}
                                                                                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-red-50 text-red-600 disabled:opacity-50"
                                                                                    >
                                                                                        <XIcon size={15} />
                                                                                        Annuler l&apos;EDL
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className={`hidden sm:flex items-center transition ${isPastEvent ? 'text-neutral-300' : 'text-amber-400 group-hover:text-amber-700'}`}>
                                                                        <ChevronRight size={20} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // SLOT: Pill Style (Restored)
                                                    return (
                                                        <div
                                                            key={`${event.type}-${event.id}`}
                                                            className={`flex items-center px-0 mb-2 ${isPastEvent ? 'opacity-80' : ''}`}
                                                        >
                                                            <div className={`px-4 py-3 mt-1 mb-1 rounded-2xl font-medium text-sm w-full sm:w-auto text-left sm:text-left ${isPastEvent ? 'bg-neutral-100 text-neutral-500' : 'bg-[#FBF7F2] text-neutral-700'}`}>
                                                                <div className={`font-medium text-xl ${isPastEvent ? 'text-neutral-600' : 'text-neutral-700'}`}>Visites</div>
                                                                <div>Créneaux ouverts de {event.startTime} à {event.endTime}</div>
                                                                {event.subtitle && (
                                                                    <div className={`text-xs mt-0.5 flex items-center justify-start gap-1.5 ${isPastEvent ? 'text-neutral-500' : 'text-neutral-700'}`}>
                                                                        <MapPin size={11} className="shrink-0 -translate-y-px" />
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
                            })()}

                            {/* Empty Future State */}
                            {(() => {
                                const hasFutureEvents = Object.values(agendaEvents).some(events =>
                                    events.some(event => {
                                        const parsedDate = parseISO(event.date);
                                        if (isAfter(parsedDate, new Date())) return true;
                                        if (isSameDay(parsedDate, new Date())) {
                                            const [endH, endM] = event.endTime.split(':').map(Number);
                                            const eventEndDateTime = new Date(parsedDate);
                                            eventEndDateTime.setHours(endH, endM, 0, 0);
                                            return isAfter(eventEndDateTime, new Date());
                                        }
                                        return false;
                                    })
                                );

                                if (!hasFutureEvents && Object.keys(agendaEvents).length > 0) {
                                    return (
                                        <div id="empty-state-anchor" className="flex flex-col items-center justify-center p-10 mt-4 mb-4 text-neutral-600 bg-white rounded-xl mx-4 sm:mx-0">
                                            <Calendar size={32} className="mb-3 opacity-50" />
                                            <p className="font-medium text-lg">Aucune visite à venir</p>
                                            <p className="text-sm opacity-75">Vos événements passés sont affichés ci-dessus.</p>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
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
                                    const isInspection = event.type === 'INSPECTION';
                                    const zIndex = isVisit ? 20 : isInspection ? 25 : 10;
                                    const width = isVisit || isInspection ? '90%' : '95%';
                                    const left = isVisit || isInspection ? '5%' : '0';

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
                                                {isInspection ? <ClipboardCheck size={14} /> : isVisit ? <User size={14} /> : <Clock size={14} />}
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
