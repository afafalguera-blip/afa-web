import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  subDays
} from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';

import { CalendarService, type CalendarEvent } from '../services/CalendarService';
import { CalendarMonthView } from '../components/public/calendar/CalendarMonthView';
import { CalendarAgendaView } from '../components/public/calendar/CalendarAgendaView';
import { EventDetailModal } from '../components/public/calendar/EventDetailModal';

type ViewMode = 'month' | 'agenda';

export default function GeneralCalendarPage() {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(window.innerWidth < 768 ? 'agenda' : 'month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const locales = { ca, es, en: enUS };
  const locale = locales[i18n.language as keyof typeof locales] || ca;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const allEvents = await CalendarService.getCalendarEvents(currentDate);
        setEvents(allEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate]);

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    // format as YYYY-MM-DD in local time
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    const dayStr = `${year}-${month}-${date}`;
    return events.filter(event => event.event_date === dayStr);
  };

  const handlePrev = () => {
    if (viewMode === 'month' || viewMode === 'agenda') setCurrentDate(subMonths(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 7));
  };

  const handleNext = () => {
    if (viewMode === 'month' || viewMode === 'agenda') setCurrentDate(addMonths(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 7));
  };

  const handleToday = () => setCurrentDate(new Date());

  // Week days for header
  const weekDaysShort = i18n.language === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

  // Helper to compare dates without timezones
  const isToday = (day: Date) => {
    const today = new Date();
    return day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate();
  };

  const getDayStr = (date: Date) => format(date, 'yyyy-MM-dd');

  // Month rendering logic
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Agenda logic (show only current month events by default)
  const agendaDates = useMemo(() => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
    return daysInMonth.filter(day => {
      const dayStr = getDayStr(day);
      return events.some(e => e.event_date === dayStr);
    });
  }, [currentDate, events]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-0 md:px-6 pt-4 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
            <CalendarIcon className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white capitalize tracking-tight">
              {format(currentDate, 'MMMM yyyy', { locale })}
            </h1>
            <p className="text-slate-500 text-sm font-medium">{t('calendar.subtitle', 'Calendari d\'esdeveniments')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Filter Toggles */}
          <div className="hidden md:flex items-center bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${viewMode === 'agenda' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <List size={14} />
              {t('calendar.view_agenda', 'Agenda')}
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${viewMode === 'month' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <CalendarIcon size={14} />
              {t('calendar.view_month', 'Mes')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
            >
              {t('calendar.today', 'Avui')}
            </button>
            <div className="flex bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              <button onClick={handlePrev} className="p-2.5 border-r border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
              <button onClick={handleNext} className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"><ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 md:border md:border-slate-200 md:dark:border-slate-800 md:rounded-[2.5rem] overflow-hidden md:shadow-xl min-h-[600px] transition-all duration-300">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[600px] gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-bold animate-pulse">{t('common.loading', 'Carregant...')}</p>
          </div>
        ) : (
          <>
            {viewMode === 'month' && (
              <CalendarMonthView
                currentDate={currentDate}
                monthDays={monthDays}
                weekDaysShort={weekDaysShort}
                getEventsForDay={getEventsForDay}
                isToday={isToday}
                onEventClick={setSelectedEvent}
              />
            )}

            {viewMode === 'agenda' && (
              <CalendarAgendaView
                agendaDates={agendaDates}
                getEventsForDay={getEventsForDay}
                isToday={isToday}
                onEventClick={setSelectedEvent}
                locale={locale}
              />
            )}
          </>
        )}
      </div>

      {/* Modern Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          locale={locale}
        />
      )}
    </div>
  );
}
