import { format, type Locale } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, ExternalLink, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../../../services/CalendarService';

interface CalendarAgendaViewProps {
    agendaDates: Date[];
    getEventsForDay: (day: Date) => CalendarEvent[];
    isToday: (day: Date) => boolean;
    onEventClick: (event: CalendarEvent) => void;
    locale: Locale;
}

export function CalendarAgendaView({
    agendaDates,
    getEventsForDay,
    isToday,
    onEventClick,
    locale
}: CalendarAgendaViewProps) {
    const { t } = useTranslation();

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-5 duration-500">
            {agendaDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300">
                        <CalendarIcon size={32} />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                        {t('calendar.no_events_month')}
                    </p>
                </div>
            ) : (
                agendaDates.map((day, dIdx) => {
                    const dayEvents = getEventsForDay(day);
                    const dayIsToday = isToday(day);

                    return (
                        <div key={dIdx} className="space-y-4">
                            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                {format(day, 'EEEE d MMMM', { locale })}
                                {dayIsToday && <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>}
                            </h2>

                            <div className="space-y-3">
                                {dayEvents.map((event, eIdx) => (
                                    <div
                                        key={eIdx}
                                        className="group relative flex items-center py-6 border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-all active:scale-[0.98]"
                                    >
                                        <div
                                            className="absolute left-0 top-6 bottom-6 w-1 rounded-full opacity-60"
                                            style={{ backgroundColor: event.color }}
                                        />

                                        <div className="flex-1 pl-6">
                                            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1.5">
                                                {(!event.all_day && event.start_time) ? (
                                                    <div className="flex items-center gap-1.5 text-primary/80">
                                                        <Clock size={12} strokeWidth={3} />
                                                        <span>{event.start_time}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-primary/70">{t('common.all_day', 'Tot el dia')}</span>
                                                )}
                                                {event.location && (
                                                    <span className="opacity-30">|</span>
                                                )}
                                                {event.location && (
                                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                                        <MapPin size={12} strokeWidth={3} />
                                                        <span className="truncate max-w-[150px]">{event.location}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight group-hover:text-primary transition-colors">
                                                {event.title}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {event.link ? (
                                                <Link
                                                    to={event.link}
                                                    className="p-3 bg-primary/5 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                                >
                                                    <ExternalLink size={14} />
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={() => onEventClick(event)}
                                                    className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
