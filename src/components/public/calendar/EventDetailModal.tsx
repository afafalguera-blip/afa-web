import { format, parseISO, type Locale } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../../../services/CalendarService';

interface EventDetailModalProps {
    event: CalendarEvent;
    onClose: () => void;
    locale: Locale;
}

export function EventDetailModal({ event, onClose, locale }: EventDetailModalProps) {
    const { t } = useTranslation();

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] p-4 animate-in fade-in transition-all duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-10 duration-500 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="h-32 bg-primary/5 flex items-center justify-center relative">
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{ backgroundColor: event.color }}
                    />
                    <CalendarIcon className="w-16 h-16 text-primary/20" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-3 bg-white/80 dark:bg-slate-800/80 rounded-2xl text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
                    >
                        <ChevronRight className="rotate-90 md:rotate-0" size={20} />
                    </button>
                </div>

                <div className="p-8 pt-0 -mt-8 relative z-10">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                                style={{ backgroundColor: event.color }}
                            >
                                <CalendarIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                                    {event.title}
                                </h3>
                                <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">
                                    {format(parseISO(event.event_date), "EEEE d MMMM yyyy", { locale })}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 py-4 border-y border-slate-50 dark:border-slate-800">
                            {(!event.all_day && event.start_time) && (
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <div className="text-sm font-bold">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none mb-1">{t('calendar.time')}</p>
                                        <span>{event.start_time} {event.end_time ? `- ${event.end_time}` : ''}</span>
                                    </div>
                                </div>
                            )}

                            {event.location && (
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    <div className="text-sm font-bold">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none mb-1">{t('calendar.location')}</p>
                                        <span>{event.location}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {event.description && (
                            <div className="mt-6">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-2">{t('calendar.description')}</p>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                                    {event.description}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="mt-8 w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {t('calendar.close')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
