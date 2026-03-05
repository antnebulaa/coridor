'use client';

import { useState, useMemo, useEffect, useRef } from "react";
import { format, addDays, subDays, isSameDay, parseISO, startOfToday, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MapPin, User, Clock, Calendar, List, ClipboardCheck, MoreHorizontal, CalendarClock, X as XIcon } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import VisitDetailsModal from "./VisitDetailsModal";
import EventDetailPanel from "./EventDetailPanel";
import Avatar from "@/components/Avatar";
import BottomSheet from "@/components/ui/BottomSheet";
import useRealtimeNotifications from "@/hooks/useRealtimeNotifications";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isDesktop = useMediaQuery('(min-width: 768px)');

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
        updateHeight();

        return () => observer.disconnect();
    }, []);

    // Auto-scroll to Today (or first future date) — scrolls within the left panel
    useEffect(() => {
        if (view === 'agenda' && headerHeight > 0) {
            const timer = setTimeout(() => {
                let targetElement = document.getElementById('today-anchor');
                if (!targetElement) {
                    targetElement = document.getElementById('first-future-anchor');
                }
                if (!targetElement) {
                    targetElement = document.getElementById('empty-state-anchor');
                }

                if (targetElement && scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const containerRect = container.getBoundingClientRect();
                    const elementRect = targetElement.getBoundingClientRect();
                    const offsetPosition = elementRect.top - containerRect.top + container.scrollTop - headerHeight - 10;

                    container.scrollTo({
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

    // Agenda Events (All dates)
    const agendaEvents = useMemo(() => {
        const rawSlots = (data.slots || []).map(s => formatEvent(s, 'SLOT'));
        const rawVisits = (data.visits || []).map(v => formatEvent(v, 'VISIT'));
        const rawInspections = (data.inspections || []).map(i => formatEvent(i, 'INSPECTION'));

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

        const groupedByDate: Record<string, any[]> = {};

        rawVisits.forEach(v => {
            if (!groupedByDate[v.date]) groupedByDate[v.date] = [];
            groupedByDate[v.date].push(v);
        });

        rawInspections.forEach(i => {
            if (!groupedByDate[i.date]) groupedByDate[i.date] = [];
            groupedByDate[i.date].push(i);
        });

        const slotsByDate: Record<string, any[]> = {};
        rawSlots.forEach(s => {
            if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
            slotsByDate[s.date].push(s);
        });

        Object.entries(slotsByDate).forEach(([date, daySlots]) => {
            const merged = mergeSlots(daySlots);
            if (!groupedByDate[date]) groupedByDate[date] = [];
            groupedByDate[date].push(...merged);
        });

        const sortedDates = Object.keys(groupedByDate).sort();
        const final: Record<string, any[]> = {};

        sortedDates.forEach(date => {
            final[date] = groupedByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        return final;
    }, [data]);

    // Hours Grid (8:00 to 20:00)
    const hours = Array.from({ length: 13 }).map((_, i) => i + 8);

    const getPositionStyle = (startTime: string, endTime: string) => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMinutes = (startH - 8) * 60 + startM;
        const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        return {
            top: `${startMinutes * 2}px`,
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
            if (!isDesktop) {
                setIsModalOpen(true);
            }
        } else if (event.type === 'INSPECTION') {
            if (event.inspectionStatus === 'DRAFT') {
                router.push(`/inspection/${event.id}/rooms`);
            } else if (event.inspectionStatus === 'SIGNED') {
                router.push(`/inspection/${event.id}/done`);
            } else {
                router.push(`/inspection/${event.id}/sign`);
            }
        }
    };

    const handleEvaluationSaved = () => {
        router.refresh();
    };

    return (
        <>
            {/* Mobile-only visit details modal */}
            <VisitDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                event={selectedEvent}
                onEvaluationSaved={handleEvaluationSaved}
            />

            {/* Action Menu BottomSheet */}
            <BottomSheet
                isOpen={!!actionMenuId}
                onClose={() => setActionMenuId(null)}
                title="Actions"
            >
                <div className="flex flex-col p-2 pb-8">
                    <button
                        onClick={() => {
                            const id = actionMenuId;
                            setActionMenuId(null);
                            if (id) setRescheduleId(id);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-secondary rounded-xl transition"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                            <CalendarClock size={20} className="text-amber-600" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-medium text-[16px]">Reprogrammer</span>
                            <span className="text-sm text-muted-foreground">Choisir une nouvelle date</span>
                        </div>
                    </button>
                    <button
                        onClick={() => {
                            const id = actionMenuId;
                            setActionMenuId(null);
                            if (id) handleCancelInspection(id);
                        }}
                        disabled={isSubmitting}
                        className="flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition disabled:opacity-50"
                    >
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                            <XIcon size={20} className="text-red-600" />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-medium text-[16px] text-red-600">Annuler l&apos;EDL</span>
                            <span className="text-sm text-muted-foreground">Le locataire sera notifié</span>
                        </div>
                    </button>
                </div>
            </BottomSheet>

            {/* Reschedule BottomSheet */}
            <BottomSheet
                isOpen={!!rescheduleId}
                onClose={() => setRescheduleId(null)}
                title="Reprogrammer l'état des lieux"
            >
                <div className="flex flex-col px-6 pb-8">
                    {(() => {
                        const displayDate = rescheduleDate ? new Date(rescheduleDate + 'T12:00') : new Date();
                        const hasSelected = !!rescheduleDate;
                        return (
                            <div className="flex flex-col items-center py-6">
                                <span className={clsx("text-sm font-medium uppercase tracking-widest", hasSelected ? "text-muted-foreground" : "text-muted-foreground/50")}>
                                    {format(displayDate, 'EEEE', { locale: fr })}
                                </span>
                                <span className={clsx("text-7xl font-bold leading-none mt-1", hasSelected ? "text-foreground" : "text-muted-foreground/30")}>
                                    {format(displayDate, 'd')}
                                </span>
                                <span className={clsx("text-xl font-medium mt-1", hasSelected ? "text-muted-foreground" : "text-muted-foreground/50")}>
                                    {format(displayDate, 'MMMM yyyy', { locale: fr })}
                                </span>
                            </div>
                        );
                    })()}

                    <div className="relative mb-5">
                        <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            className="w-full px-4 py-3.5 bg-secondary rounded-2xl text-center text-sm font-medium text-transparent focus:outline-none transition appearance-none"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xl font-medium text-muted-foreground pointer-events-none">
                            {rescheduleDate ? 'Modifier la date' : 'Choisir une date'}
                        </span>
                    </div>

                    <div className="mb-5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Heure</span>
                        <div className="flex flex-wrap gap-2">
                            {['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00'].map((time) => (
                                <button
                                    key={time}
                                    onClick={() => setRescheduleTime(time)}
                                    className={clsx(
                                        "px-4 py-2.5 rounded-full text-sm font-semibold transition-all",
                                        rescheduleTime === time
                                            ? "bg-foreground text-background scale-105"
                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                    )}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center mb-5">Le locataire sera notifié du changement</p>

                    <button
                        onClick={handleRescheduleInspection}
                        disabled={isSubmitting || !rescheduleDate}
                        className="w-full py-4 bg-foreground text-background rounded-2xl text-base font-semibold disabled:opacity-30 transition-all active:scale-[0.98]"
                    >
                        {isSubmitting ? 'Reprogrammation...' : 'Confirmer'}
                    </button>
                </div>
            </BottomSheet>

            {/* Main split-panel layout */}
            <div className="md:h-full flex flex-col md:flex-row md:min-h-0">

                {/* Left Panel: Event list */}
                <div ref={scrollContainerRef} className="flex-1 md:flex-[3] md:min-h-0 md:overflow-y-auto md:border-r md:border-border md:px-2">

                    {/* Header */}
                    <div
                        ref={headerRef}
                        className="sticky top-0 z-30 bg-background pt-safe md:pt-4 pb-2 px-4 transition-all"
                    >
                      <div className="max-w-3xl mx-auto w-full">
                        {/* Row 1: Title + View Toggle (always stable) */}
                        <div className="flex items-center justify-between gap-4">
                            <h1 className="text-2xl font-medium tracking-tight text-foreground">Mon Calendrier</h1>

                            <div className="bg-secondary p-1 rounded-2xl flex items-center">
                                <button
                                    onClick={() => setView('day')}
                                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${view === 'day' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Clock size={20} />
                                    
                                </button>
                                <button
                                    onClick={() => setView('agenda')}
                                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${view === 'agenda' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <List size={20} />
                                  
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Date Navigation (Only for Day View) */}
                        {view === 'day' && (
                            <div className="flex items-center justify-between gap-4 bg-background border border-border rounded-lg p-1 pl-4 mt-3">
                                <div className="font-medium capitalize text-foreground min-w-[120px] text-center text-sm md:text-base">
                                    {format(currentDate, 'EEEE d MMMM', { locale: fr })}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentDate(prev => subDays(prev, 1))}
                                        className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(startOfToday())}
                                        className="px-3 py-1 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-full transition hidden sm:block"
                                    >
                                        Auj.
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                                        className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-h-[400px] max-w-3xl mx-auto w-full" onClick={() => actionMenuId && setActionMenuId(null)}>

                        {/* AGENDA VIEW */}
                        {view === 'agenda' && (
                            <div className="flex flex-col pb-[10vh]">
                                {Object.keys(agendaEvents).length === 0 ? (
                                    <div id="empty-state-anchor" className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                                        <Calendar size={48} className="mb-4 opacity-30" />
                                        <p>Aucun événement à venir.</p>
                                    </div>
                                ) : (() => {
                                    // Check if there are any future/current events
                                    const hasFutureEvents = Object.entries(agendaEvents).some(([date, evts]) => {
                                        const pd = parseISO(date);
                                        if (isAfter(pd, new Date())) return true;
                                        if (isSameDay(pd, new Date())) {
                                            return evts.some((e: any) => {
                                                const [eH, eM] = e.endTime.split(':').map(Number);
                                                const end = new Date(pd);
                                                end.setHours(eH, eM, 0, 0);
                                                return isAfter(end, new Date());
                                            });
                                        }
                                        return false;
                                    });

                                    // Descending order: newest/upcoming first
                                    const allDates = Object.keys(agendaEvents).sort().reverse();
                                    const elements: React.ReactNode[] = [];
                                    let emptyStateInserted = false;

                                    // If no future events at all, show empty state at the TOP
                                    if (!hasFutureEvents && allDates.length > 0) {
                                        emptyStateInserted = true;
                                        elements.push(
                                            <div key="empty-state" id="empty-state-anchor" className="flex flex-col items-center justify-center rounded-2xl m-3 mt-2 md:mt-2 bg-[#F0EEE6] py-[80px] text-neutral-700">
                                                <Calendar size={32} className="mb-3 opacity-50" />
                                                <p className="font-medium text-base">Aucune visite à venir</p>
                                                <p className="text-sm opacity-75">Vos événements passés sont affichés ci-dessous.</p>
                                            </div>
                                        );
                                    }

                                    // Find closest future date for auto-scroll anchor (last future in descending = closest to today)
                                    const closestFutureDate = allDates.filter(d => {
                                        const pd = parseISO(d);
                                        return !isBefore(pd, startOfToday()) && !isSameDay(pd, new Date());
                                    }).pop() || null;

                                    allDates.forEach((date, idx) => {
                                        const events = agendaEvents[date];
                                        const parsedDate = parseISO(date);
                                        const isToday = isSameDay(parsedDate, new Date());
                                        const isPastDate = isBefore(parsedDate, startOfToday());

                                        const anchorId = isToday ? 'today-anchor' : (date === closestFutureDate ? 'first-future-anchor' : undefined);

                                        // Render date group
                                        elements.push(
                                            <div key={date} id={anchorId}>
                                                <div
                                                    className={`sticky z-20 text-lg backdrop-blur-sm px-4 py-3 font-medium flex items-center gap-2 border-b transition-colors
                                                        ${isPastDate ? 'bg-background text-muted-foreground border-border' : 'bg-background/95 text-foreground border-border'}
                                                    `}
                                                    style={{ top: `${headerHeight}px` }}
                                                >
                                                    <Calendar size={16} className={isPastDate ? "text-muted-foreground" : ""} />
                                                    <span className="capitalize">{format(parsedDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                                                    {isToday && <span className="text-xs font-normal capitalize text-red-500 px-2 py-1 rounded-2xl ml-2">Aujourd&apos;hui</span>}
                                                </div>
                                                <div className="space-y-2 pt-4 pb-6 px-3">
                                                    {events.sort((a: any, b: any) => {
                                                        const priority: Record<string, number> = { INSPECTION: 0, VISIT: 1, SLOT: 2 };
                                                        const diff = (priority[a.type] ?? 1) - (priority[b.type] ?? 1);
                                                        if (diff !== 0) return diff;
                                                        return a.startTime.localeCompare(b.startTime);
                                                    }).map((event: any) => {
                                                        const [endH, endM] = event.endTime.split(':').map(Number);
                                                        const eventEndDateTime = new Date(parsedDate);
                                                        eventEndDateTime.setHours(endH, endM, 0, 0);
                                                        const isPastEvent = isBefore(eventEndDateTime, new Date());
                                                        const isSelected = selectedEvent?.id === event.id && selectedEvent?.type === event.type;

                                                        if (event.type === 'VISIT') {
                                                            return (
                                                                <div
                                                                    key={`${event.type}-${event.id}`}
                                                                    onClick={() => handleEventClick(event)}
                                                                    className={`
                                                                        group border rounded-2xl p-3 cursor-pointer transition flex flex-row items-center gap-1
                                                                        ${isPastEvent
                                                                            ? 'bg-secondary opacity-80 hover:opacity-100'
                                                                            : 'bg-background border-foreground/20 hover:border-foreground/40 hover:shadow-md'
                                                                        }
                                                                        ${isSelected ? 'border-2 border-amber-800' : ''}
                                                                    `}
                                                                >
                                                                    {/* Time Block */}
                                                                    <div className="flex flex-col items-center justify-center min-w-[70px] border-r border-border pr-4">
                                                                        <span className={`text-lg font-medium ${isPastEvent ? 'text-muted-foreground' : 'text-foreground'}`}>{event.startTime}</span>
                                                                        <span className="text-sm text-muted-foreground">{event.endTime}</span>
                                                                    </div>

                                                                    {/* Content */}
                                                                    <div className="flex-1 flex items-start gap-3 pl-3">
                                                                        <div className={`shrink-0 ${isPastEvent ? "opacity-80" : ""}`}>
                                                                            <Avatar src={event.image} seed={event.title} size={42} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                    <h4 className={`font-medium truncate ${isPastEvent ? 'text-muted-foreground' : 'text-foreground'}`}>{event.title}</h4>
                                                                                    {event.evaluation?.decision === 'SHORTLISTED' && (
                                                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Retenu" />
                                                                                    )}
                                                                                    {event.evaluation?.decision === 'UNDECIDED' && (
                                                                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" title="Indécis" />
                                                                                    )}
                                                                                    {event.evaluation?.decision === 'ELIMINATED' && (
                                                                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" title="Ecarté" />
                                                                                    )}
                                                                                </div>
                                                                                {event.status === 'PENDING' && (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 uppercase shrink-0">En attente</span>
                                                                                )}
                                                                                {event.status === 'CONFIRMED' && !event.evaluation && (
                                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 uppercase shrink-0">Confirmée</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 text-sm mt-0.5 text-muted-foreground">
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
                                                                            ? 'bg-secondary opacity-80 hover:opacity-100'
                                                                            : 'bg-amber-50 border-amber-300 hover:border-amber-400 hover:shadow-md dark:bg-amber-950/20 dark:border-amber-700'
                                                                        }
                                                                    `}
                                                                >
                                                                    {/* Time Block */}
                                                                    <div className={`flex flex-col items-center justify-center min-w-[70px] border-r pr-4 ${isPastEvent ? 'border-border' : 'border-amber-200 dark:border-amber-800'}`}>
                                                                        <span className={`text-lg font-medium ${isPastEvent ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400'}`}>{event.startTime}</span>
                                                                        <span className={`text-sm ${isPastEvent ? 'text-muted-foreground' : 'text-amber-500 dark:text-amber-500'}`}>{event.endTime}</span>
                                                                    </div>

                                                                    {/* Content */}
                                                                    <div className="flex-1 pl-3">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <ClipboardCheck size={15} className={`shrink-0 -translate-y-px ${isPastEvent ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400'}`} />
                                                                                <h4 className={`font-medium ${isPastEvent ? 'text-muted-foreground' : 'text-amber-800 dark:text-amber-300'}`}>{event.title}</h4>
                                                                            </div>
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase shrink-0 ${
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
                                                                            <div className={`text-sm font-medium mt-0 ${isPastEvent ? 'text-muted-foreground' : 'text-amber-800 dark:text-amber-300'}`}>
                                                                                Avec {event.tenantName}
                                                                            </div>
                                                                        )}
                                                                        <div className={`flex items-center gap-1 text-sm mt-0 ${isPastEvent ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400'}`}>
                                                                            <MapPin size={13} className="shrink-0 -translate-y-px" />
                                                                            <span className="line-clamp-1">au {event.subtitle}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex items-center gap-1">
                                                                        {event.inspectionStatus === 'DRAFT' && !isPastEvent && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setActionMenuId(event.id);
                                                                                }}
                                                                                className="p-1.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition text-amber-500 hover:text-amber-700"
                                                                            >
                                                                                <MoreHorizontal size={18} />
                                                                            </button>
                                                                        )}
                                                                        <div className={`hidden sm:flex items-center transition ${isPastEvent ? 'text-muted-foreground/30' : 'text-amber-400 group-hover:text-amber-700'}`}>
                                                                            <ChevronRight size={20} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // SLOT: Pill Style
                                                        return (
                                                            <div
                                                                key={`${event.type}-${event.id}`}
                                                                className={`flex items-center px-0 mb-2 ${isPastEvent ? 'opacity-80' : ''}`}
                                                            >
                                                                <div className={`px-4 py-3 mt-1 mb-1 rounded-2xl font-base text-sm w-full sm:w-auto text-left ${isPastEvent ? 'bg-secondary text-muted-foreground' : 'bg-[#FBF7F2] dark:bg-secondary text-foreground'}`}>
                                                                    <div className={`font-medium text-xl ${isPastEvent ? 'text-muted-foreground' : 'text-foreground'}`}>Visites</div>
                                                                    <div>Créneaux ouverts de {event.startTime} à {event.endTime}</div>
                                                                    {event.subtitle && (
                                                                        <div className="text-xs mt-0.5 flex items-center justify-start gap-1.5 text-muted-foreground">
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

                                        // Insert empty state between future/today and past dates (descending order)
                                        if (!emptyStateInserted && hasFutureEvents && !isPastDate) {
                                            const nextDate = allDates[idx + 1];
                                            if (nextDate && isBefore(parseISO(nextDate), startOfToday())) {
                                                emptyStateInserted = true;
                                                elements.push(
                                                    <div key="empty-state" id="empty-state-anchor" className="flex flex-col items-center justify-center p-10 mt-2 mb-4 text-muted-foreground">
                                                        <Calendar size={32} className="mb-3 opacity-50" />
                                                        <p className="font-medium text-base">Aucune visite à venir</p>
                                                        <p className="text-sm opacity-75">Vos événements passés sont affichés ci-dessous.</p>
                                                    </div>
                                                );
                                            }
                                        }
                                    });

                                    return elements;
                                })()}
                            </div>
                        )}

                        {/* DAY VIEW */}
                        {view === 'day' && (
                            <div className="flex flex-row overflow-x-auto h-full">
                                <div className="w-16 md:w-20 border-r border-border bg-secondary flex-none relative">
                                    {hours.map(hour => (
                                        <div key={hour} className="h-[120px] relative border-b border-border last:border-0">
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground bg-secondary px-1">
                                                {hour}:00
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex-1 relative bg-background h-[1560px]">
                                    {hours.map(hour => (
                                        <div key={hour} className="h-[120px] border-b border-dashed border-border w-full box-border" />
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

                {/* Right Panel: Event details (desktop only) */}
                <div className="hidden md:flex md:flex-col md:flex-[2] md:max-w-[480px] h-full overflow-y-auto">
                    {selectedEvent && selectedEvent.type === 'VISIT' ? (
                        <EventDetailPanel
                            event={selectedEvent}
                            onEvaluationSaved={handleEvaluationSaved}
                            onClose={() => setSelectedEvent(null)}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <Calendar size={48} className="mb-4 opacity-30" />
                            <p className="text-sm">Sélectionnez un événement</p>
                        </div>
                    )}
                </div>
            </div>
                    </>
    );
};

export default LandlordCalendarClient;
