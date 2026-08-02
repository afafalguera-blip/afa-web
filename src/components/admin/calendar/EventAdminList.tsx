import { useTranslation } from 'react-i18next';
import { Search, Calendar, Clock, MapPin, Edit, Trash2 } from 'lucide-react';
import type { CalendarEvent } from '../../../services/admin/AdminCalendarService';
import { eventEndDate, isMultiDay } from '../../../utils/eventDates';

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
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('admin.calendar.search_placeholder')}
                        aria-label={t('admin.calendar.search_placeholder')}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-md focus:ring-2 focus:ring-neutral-300 outline-none text-neutral-900"
                        value={searchText}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="p-12 text-center text-neutral-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-neutral-200" />
                    <p className="text-[13px]">{t('admin.calendar.no_events')}</p>
                </div>
            ) : (
                <div className="divide-y divide-neutral-100">
                    {filteredEvents.map(event => (
                        <div key={event.id} className="p-4 hover:bg-neutral-50 transition-colors group">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <span
                                        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                                        style={{ backgroundColor: event.color }}
                                        aria-hidden="true"
                                    />
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-[14px] text-neutral-900">
                                            {event.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-medium text-neutral-500">
                                            <span className="inline-flex items-center gap-1.5 bg-neutral-100 px-2 py-0.5 rounded">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {(() => {
                                                    const fmt = (d: string) =>
                                                        new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
                                                            weekday: 'short',
                                                            day: 'numeric',
                                                            month: 'short'
                                                        });
                                                    return isMultiDay(event)
                                                        ? `${fmt(event.event_date)} — ${fmt(eventEndDate(event))}`
                                                        : fmt(event.event_date);
                                                })()}
                                            </span>
                                            {!event.all_day && event.start_time && (
                                                <span className="inline-flex items-center gap-1.5 bg-neutral-100 px-2 py-0.5 rounded">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {event.start_time.slice(0, 5)}
                                                    {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                                </span>
                                            )}
                                            {event.location && (
                                                <span className="inline-flex items-center gap-1.5 bg-neutral-100 px-2 py-0.5 rounded">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {event.location}
                                                </span>
                                            )}
                                        </div>
                                        {event.description && (
                                            <p className="mt-2 text-[13px] text-neutral-600 line-clamp-2">
                                                {event.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(event)}
                                        className="p-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors"
                                        title={t('common.edit')}
                                        aria-label={t('common.edit')}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(event.id)}
                                        className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                        title={t('common.delete')}
                                        aria-label={t('common.delete')}
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
