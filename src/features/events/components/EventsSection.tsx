import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EventsService, type CalendarEvent } from '../services/EventsService';

export const EventsSection: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await EventsService.getUpcomingEvents(4);
                setEvents(data);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    return (
        <section className="px-6 mt-8 mb-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.events_title')}</h2>
                <Link to="/calendari" className="text-sm font-semibold text-primary">{t('home.see_all')}</Link>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl animate-pulse">
                        <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                        </div>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 uppercase text-[10px] tracking-widest font-bold">
                        {t('common.no_events' as any)}
                    </div>
                ) : (
                    events.map((event) => {
                        const date = new Date(event.event_date);
                        const day = date.getDate();
                        const month = date.toLocaleDateString(i18n.language, { month: 'short' });

                        return (
                            <div key={event.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group relative z-10">
                                <div
                                    className="w-14 h-14 flex flex-col items-center justify-center rounded-xl text-secondary dark:text-primary transition-colors"
                                    style={{ backgroundColor: event.color ? `${event.color}15` : 'rgba(var(--color-primary), 0.1)' }}
                                >
                                    <span className="text-[10px] font-bold uppercase">{month}</span>
                                    <span className="text-xl font-bold">{day}</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{event.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {event.start_time ? event.start_time.slice(0, 5) : ''}
                                        {event.start_time && event.location ? ' · ' : ''}
                                        {event.location}
                                    </p>
                                </div>
                                <button className="p-2 text-slate-300 hover:text-slate-500 transition group-hover:bg-slate-100 dark:group-hover:bg-slate-700 rounded-full">
                                    <span className="material-icons-round text-lg">chevron_right</span>
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
};
