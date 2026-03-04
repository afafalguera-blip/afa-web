import { format, isSameMonth } from 'date-fns';
import type { CalendarEvent } from '../../../services/CalendarService';

interface CalendarMonthViewProps {
    currentDate: Date;
    monthDays: Date[];
    weekDaysShort: string[];
    getEventsForDay: (day: Date) => CalendarEvent[];
    isToday: (day: Date) => boolean;
    onEventClick: (event: CalendarEvent) => void;
}

export function CalendarMonthView({
    currentDate,
    monthDays,
    weekDaysShort,
    getEventsForDay,
    isToday,
    onEventClick
}: CalendarMonthViewProps) {
    return (
        <div className="grid grid-cols-7 h-full animate-in fade-in zoom-in-95 duration-500">
            {weekDaysShort.map(day => (
                <div key={day} className="py-6 text-center text-[10px] font-black uppercase text-slate-400 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 tracking-[0.2em]">
                    {day}
                </div>
            ))}
            {monthDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const dayIsToday = isToday(day);
                const isCurrMonth = isSameMonth(day, currentDate);

                return (
                    <div
                        key={idx}
                        className={`min-h-[120px] lg:min-h-[150px] p-3 border-b border-r border-slate-50 dark:border-slate-800 last:border-r-0 transition-all ${!isCurrMonth ? 'bg-slate-50/30 dark:bg-slate-800/10 opacity-40' : 'hover:bg-slate-50 group/day'} ${dayIsToday ? 'bg-primary/5' : ''}`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-sm font-black transition-all ${dayIsToday ? 'w-8 h-8 bg-primary text-white flex items-center justify-center rounded-[10px] shadow-lg shadow-primary/30' : 'text-slate-400 group-hover/day:text-primary dark:text-slate-500'}`}>
                                {format(day, 'd')}
                            </span>
                            {dayEvents.length > 0 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"></div>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {dayEvents.slice(0, 3).map(event => (
                                <button
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold truncate transition-all hover:scale-[1.03] active:scale-95 border-l-2 shadow-sm"
                                    style={{
                                        backgroundColor: event.color + '10',
                                        color: event.color,
                                        borderColor: event.color
                                    }}
                                >
                                    {!event.all_day && event.start_time && (
                                        <span className="mr-1 opacity-70">{event.start_time}</span>
                                    )}
                                    {event.title}
                                </button>
                            ))}
                            {dayEvents.length > 3 && (
                                <span className="block text-center text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">+{dayEvents.length - 3} més</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
