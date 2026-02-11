'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VisitEvent {
    title: string;
    date: string;      // ISO date string (YYYY-MM-DD or full ISO)
    startTime: string; // HH:mm format
    endTime?: string;  // HH:mm format (optional, defaults to startTime + 30min)
    location?: string;
    description?: string;
}

interface AddToCalendarButtonProps {
    event: VisitEvent;
    variant?: 'default' | 'compact' | 'icon-only';
    className?: string;
}

const AddToCalendarButton: React.FC<AddToCalendarButtonProps> = ({
    event,
    variant = 'default',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll into view when dropdown opens
    useEffect(() => {
        if (isOpen && containerRef.current) {
            setTimeout(() => {
                containerRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 100);
        }
    }, [isOpen]);

    // Parse and format dates
    const getDateInfo = () => {
        const dateOnly = event.date.includes('T')
            ? event.date.split('T')[0]
            : event.date;

        const [hours, minutes] = event.startTime.split(':').map(Number);

        let endHours = hours;
        let endMinutes = minutes + 30;
        if (event.endTime) {
            [endHours, endMinutes] = event.endTime.split(':').map(Number);
        } else if (endMinutes >= 60) {
            endHours++;
            endMinutes -= 60;
        }

        const startDateTime = new Date(`${dateOnly}T${event.startTime}:00`);
        const endDateTime = new Date(`${dateOnly}T${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`);

        return { dateOnly, startDateTime, endDateTime };
    };

    // Format for Google Calendar (YYYYMMDDTHHmmssZ)
    const formatGoogleDate = (d: Date) => {
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    // Format for Outlook (ISO format)
    const formatOutlookDate = (d: Date) => {
        return d.toISOString();
    };

    const addToGoogle = () => {
        const { startDateTime, endDateTime } = getDateInfo();
        const url = new URL('https://calendar.google.com/calendar/render');
        url.searchParams.set('action', 'TEMPLATE');
        url.searchParams.set('text', event.title);
        url.searchParams.set('dates', `${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}`);
        if (event.location) url.searchParams.set('location', event.location);
        url.searchParams.set('details', event.description || 'Visite organisée via Coridor');
        window.open(url.toString(), '_blank');
        setIsOpen(false);
    };

    const addToOutlook = () => {
        const { startDateTime, endDateTime } = getDateInfo();
        const url = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
        url.searchParams.set('subject', event.title);
        url.searchParams.set('startdt', formatOutlookDate(startDateTime));
        url.searchParams.set('enddt', formatOutlookDate(endDateTime));
        if (event.location) url.searchParams.set('location', event.location);
        url.searchParams.set('body', event.description || 'Visite organisée via Coridor');
        window.open(url.toString(), '_blank');
        setIsOpen(false);
    };

    const downloadICS = () => {
        const { startDateTime, endDateTime } = getDateInfo();

        const formatICSDate = (d: Date) => {
            return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
        };

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Coridor//Visit//FR',
            'BEGIN:VEVENT',
            `DTSTART:${formatICSDate(startDateTime)}`,
            `DTEND:${formatICSDate(endDateTime)}`,
            `SUMMARY:${event.title}`,
            event.location ? `LOCATION:${event.location}` : '',
            `DESCRIPTION:${event.description || 'Visite organisée via Coridor'}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].filter(Boolean).join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'visite.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsOpen(false);
    };

    const calendarOptions = [
        {
            id: 'google',
            label: 'Google Calendar',
            icon: '📅',
            onClick: addToGoogle,
        },
        {
            id: 'outlook',
            label: 'Outlook',
            icon: '📧',
            onClick: addToOutlook,
        },
        {
            id: 'apple',
            label: 'Apple Calendar',
            icon: '🍎',
            onClick: downloadICS,
            subtitle: '(fichier .ics)',
        },
    ];

    return (
        <div className={`${className}`} ref={containerRef}>
            {/* Main Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`
                    flex items-center justify-center gap-2
                    ${variant === 'compact'
                        ? 'px-3 py-2 text-sm'
                        : variant === 'icon-only'
                            ? 'p-2'
                            : 'px-4 py-2.5'
                    }
                    bg-neutral-100 hover:bg-neutral-200 
                    dark:bg-neutral-800 dark:hover:bg-neutral-700
                    text-neutral-700 dark:text-neutral-200
                    font-medium rounded-xl transition
                    w-full
                `}
            >
                <Calendar className="w-4 h-4" />
                {variant !== 'icon-only' && (
                    <>
                        <span className={variant === 'compact' ? 'text-xs' : 'text-sm'}>
                            Ajouter au calendrier
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {/* Inline Dropdown - not absolute, part of document flow */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                            {calendarOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        option.onClick();
                                    }}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition text-left"
                                >
                                    <span className="text-lg">{option.icon}</span>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                            {option.label}
                                        </span>
                                        {option.subtitle && (
                                            <span className="text-xs text-neutral-500">
                                                {option.subtitle}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AddToCalendarButton;
