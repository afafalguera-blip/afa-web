import type { CalendarEvent } from '../../../services/admin/AdminCalendarService';
import { useTranslation } from 'react-i18next';

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
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push(i);
        }
        return days;
    };

    const getEventsForDay = (day: number) => {
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-tighter py-2">
                        {day}
                    </div>
                ))}
                {days.map((day, index) => {
                    const dayEvents = day ? getEventsForDay(day) : [];
                    const isToday = day &&
                        new Date().getDate() === day &&
                        new Date().getMonth() === currentMonth.getMonth() &&
                        new Date().getFullYear() === currentMonth.getFullYear();

                    return (
                        <div
                            key={index}
                            className={`min-h-[100px] p-2 border border-slate-50 dark:border-slate-800 rounded-xl transition-all ${day
                                ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                                : 'bg-slate-50/30 dark:bg-slate-950/30'
                                } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
                            onClick={() => {
                                if (day) {
                                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    onDayClick(dateStr);
                                }
                            }}
                        >
                            {day && (
                                <>
                                    <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {day}
                                    </span>
                                    <div className="space-y-1 mt-2">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <div
                                                key={event.id}
                                                className="text-[10px] px-2 py-0.5 rounded-lg truncate text-white font-medium shadow-sm transition-transform hover:scale-105"
                                                style={{ backgroundColor: event.color }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEventClick(event);
                                                }}
                                            >
                                                {event.title}
                                            </div>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[9px] text-slate-400 font-bold px-1 text-center">
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
