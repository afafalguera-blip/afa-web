import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  ExternalLink,
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
  isSameMonth,
  addDays,
  subDays,
  parseISO
} from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  all_day: boolean;
  event_type: string;
  color: string;
  link?: string;
}

export default function GeneralCalendarPage() {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(window.innerWidth < 768 ? 'agenda' : 'month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const locales = { ca, es, en: enUS };
  const locale = locales[i18n.language as keyof typeof locales] || ca;

  // Fetch events from Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      // We fetch current month, previous and next one to ensure smooth transitions
      const startDate = format(startOfMonth(subMonths(currentDate, 1)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(currentDate, 1)), 'yyyy-MM-dd');

      try {
        // 1. Fetch Calendar Events
        const { data: calendarEvents, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', startDate)
          .lte('event_date', endDate)
          .order('event_date', { ascending: true });

        if (eventsError) throw eventsError;

        // 2. Fetch News with Dates
        const { data: newsItems, error: newsError } = await supabase
          .from('news')
          .select('*')
          .eq('published', true)
          .not('event_date', 'is', null);

        if (newsError) throw newsError;

        // 3. Map News to Calendar Events
        const newsEvents: CalendarEvent[] = (newsItems || [])
          .filter(item => {
            const date = item.event_date?.split('T')[0];
            return date && date >= startDate && date <= endDate;
          })
          .map(item => ({
            id: `news-${item.id}`,
            title: item.title,
            description: item.excerpt,
            event_date: item.event_date!.split('T')[0], // YYYY-MM-DD
            start_time: item.event_date ? format(new Date(item.event_date), 'HH:mm') : null,
            end_time: null,
            location: null,
            all_day: false,
            event_type: 'news',
            color: '#3b82f6', // Blue for news
            link: `/noticies` // Could be improved to deep link if possible
          }));

        // 4. Merge
        const allEvents = [...(calendarEvents || []), ...newsEvents];
        setEvents(allEvents);

      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate]);

  // Get events for a specific day using local date string to avoid timezone shifts
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
    else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month' || viewMode === 'agenda') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  // Week days for header
  const weekDaysShort = i18n.language === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

  // Helper to compare dates without timezones
  const isSameDayLocal = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
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
            <p className="text-slate-500 text-sm font-medium">{t('calendar.subtitle')}</p>
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
              Agenda
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${viewMode === 'month' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <CalendarIcon size={14} />
              {t('calendar.view_month')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
            >
              {t('calendar.today')}
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
            <p className="text-slate-400 text-sm font-bold animate-pulse">{t('common.loading')}</p>
          </div>
        ) : (
          <>
            {/* Monthly Grid View */}
            {viewMode === 'month' && (
              <div className="grid grid-cols-7 h-full animate-in fade-in zoom-in-95 duration-500">
                {weekDaysShort.map(day => (
                  <div key={day} className="py-6 text-center text-[10px] font-black uppercase text-slate-400 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 tracking-[0.2em]">
                    {day}
                  </div>
                ))}
                {monthDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDayLocal(day, new Date());
                  const isCurrMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={idx}
                      className={`min-h-[120px] lg:min-h-[150px] p-3 border-b border-r border-slate-50 dark:border-slate-800 last:border-r-0 transition-all ${!isCurrMonth ? 'bg-slate-50/30 dark:bg-slate-800/10 opacity-40' : 'hover:bg-slate-50 group/day'} ${isToday ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm font-black transition-all ${isToday ? 'w-8 h-8 bg-primary text-white flex items-center justify-center rounded-[10px] shadow-lg shadow-primary/30' : 'text-slate-400 group-hover/day:text-primary dark:text-slate-500'}`}>
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
                            onClick={() => setSelectedEvent(event)}
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
            )}

            {/* Agenda View (Mobile Focused List) */}
            {viewMode === 'agenda' && (
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
                    const isToday = isSameDayLocal(day, new Date());

                    return (
                      <div key={dIdx} className="space-y-4">
                        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                          {format(day, 'EEEE d MMMM', { locale })}
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>}
                        </h2>

                        <div className="space-y-3">
                          {dayEvents.map((event, eIdx) => (
                            <div
                              key={eIdx}
                              className="group relative flex items-center py-6 border-b border-slate-50 dark:border-slate-800/50 last:border-0 transition-all active:scale-[0.98]"
                            >
                              {/* Left accent line */}
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
                                    onClick={() => setSelectedEvent(event)}
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
            )}

            {/* Note: Weak and Day views could be updated too if needed, but Agenda/Month are the focus */}
          </>
        )}
      </div>

      {/* Modern Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] p-4 animate-in fade-in transition-all duration-300"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-10 duration-500 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header/Image/Banner */}
            <div className="h-32 bg-primary/5 flex items-center justify-center relative">
              <div
                className="absolute inset-0 opacity-10"
                style={{ backgroundColor: selectedEvent.color }}
              />
              <CalendarIcon className="w-16 h-16 text-primary/20" />
              <button
                onClick={() => setSelectedEvent(null)}
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
                    style={{ backgroundColor: selectedEvent.color }}
                  >
                    <CalendarIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                      {selectedEvent.title}
                    </h3>
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">
                      {format(parseISO(selectedEvent.event_date), "EEEE d MMMM yyyy", { locale })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 py-4 border-y border-slate-50 dark:border-slate-800">
                  {(!selectedEvent.all_day && selectedEvent.start_time) && (
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                      <Clock className="w-5 h-5 text-primary" />
                      <div className="text-sm font-bold">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none mb-1">{t('calendar.time')}</p>
                        <span>{selectedEvent.start_time} {selectedEvent.end_time ? `- ${selectedEvent.end_time}` : ''}</span>
                      </div>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-5 h-5 text-primary" />
                      <div className="text-sm font-bold">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none mb-1">{t('calendar.location')}</p>
                        <span>{selectedEvent.location}</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div className="mt-6">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-2">{t('calendar.description')}</p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="mt-8 w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t('calendar.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
