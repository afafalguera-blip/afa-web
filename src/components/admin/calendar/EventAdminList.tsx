import { useTranslation } from 'react-i18next';
import { Search, Calendar, Clock, MapPin, Edit, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '../../../services/admin/AdminCalendarService';

interface EventAdminListProps {
    events: CalendarEvent[];
    searchText: string;
    onSearchChange: (value: string) => void;
    onEdit: (event: CalendarEvent) => void;
    onDelete: (id: string) => void;
    loading: boolean;
}

export function EventAdminList({
    events,
    searchText,
    onSearchChange,
    onEdit,
    onDelete,
    loading
}: EventAdminListProps) {
    const { t } = useTranslation();

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('admin.calendar.search_placeholder')}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white"
                        value={searchText}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                    <p className="font-medium">{t('admin.calendar.no_events')}</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEvents.map(event => (
                        <div key={event.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-4 h-4 rounded-full mt-1.5 flex-shrink-0 shadow-sm transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: event.color }}
                                    />
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                            {event.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(event.event_date + 'T00:00:00').toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    day: 'numeric',
                                                    month: 'short'
                                                })}
                                            </span>
                                            {!event.all_day && event.start_time && (
                                                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {event.start_time.slice(0, 5)}
                                                    {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                                </span>
                                            )}
                                            {event.location && (
                                                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {event.location}
                                                </span>
                                            )}
                                        </div>
                                        {event.description && (
                                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                                                {event.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onEdit(event)}
                                        className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all translate-x-2 group-hover:translate-x-0"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(event.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all translate-x-2 group-hover:translate-x-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
