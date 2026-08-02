import { useTranslation } from 'react-i18next';
import type { CalendarEvent } from '../../../services/admin/AdminCalendarService';

interface CalendarAdminGridProps {
    currentMonth: Date;
    events: CalendarEvent[];
    onDayClick: (date: string) => void;
    onEventClick: (event: CalendarEvent) => void;
}

export function CalendarAdminGrid({
    currentMonth,
    events,
    onDayClick,
    onEventClick
}: CalendarAdminGridProps) {
    const { t } = useTranslation();

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = (firstDay.getDay() + 6) % 7;
        const totalDays = lastDay.getDate();

        const days: (number | null)[] = [];
        for (let i = 0; i < startingDay; i++) days.push(null);
        for (let i = 1; i <= totalDays; i++) days.push(i);
        return days;
    };

    const toDateString = (day: number) =>
        `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const getEventsForDay = (day: number) => {
        const dateStr = toDateString(day);
        return events.filter(e => e.event_date === dateStr);
    };

    const days = generateCalendarDays();
    const weekDays = [
        t('admin.editor.days.mon'),
        t('admin.editor.days.tue'),
        t('admin.editor.days.wed'),
        t('admin.editor.days.thu'),
        t('admin.editor.days.fri'),
        t('admin.editor.days.sat'),
        t('admin.editor.days.sun')
    ];

    return (
        <div className="bg-white p-4 rounded-lg border border-neutral-200">
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-[11px] font-semibold text-neutral-400 uppercase tracking-wide py-2">
                        {day}
                    </div>
                ))}
                {days.map((day, index) => {
                    const dayEvents = day ? getEventsForDay(day) : [];
                    const isToday = Boolean(day) &&
                        new Date().getDate() === day &&
                        new Date().getMonth() === currentMonth.getMonth() &&
                        new Date().getFullYear() === currentMonth.getFullYear();

                    return (
                        <div
                            key={index}
                            className={`min-h-[100px] p-1.5 border rounded-md ${
                                day ? 'bg-white border-neutral-100' : 'bg-neutral-50 border-transparent'
                            } ${isToday ? 'ring-2 ring-neutral-900 ring-inset' : ''}`}
                        >
                            {day && (
                                <>
                                    {/* Clicking the day number opens the "new event" modal prefilled with that date. */}
                                    <button
                                        type="button"
                                        onClick={() => onDayClick(toDateString(day))}
                                        aria-label={t('admin.calendar.new_event')}
                                        className={`w-full text-left px-1 py-0.5 rounded text-[13px] font-semibold transition-colors hover:bg-neutral-100 ${
                                            isToday ? 'text-neutral-900' : 'text-neutral-600'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                    <div className="space-y-1 mt-1.5">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <button
                                                key={event.id}
                                                type="button"
                                                onClick={() => onEventClick(event)}
                                                className="block w-full text-left text-[10px] px-2 py-0.5 rounded truncate text-white font-medium transition-opacity hover:opacity-90"
                                                style={{ backgroundColor: event.color }}
                                                title={event.title}
                                            >
                                                {event.title}
                                            </button>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[10px] text-neutral-400 font-semibold px-1 text-center">
                                                +{dayEvents.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
