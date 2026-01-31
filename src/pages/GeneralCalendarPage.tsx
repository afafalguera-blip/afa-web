import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  MapPin,
  Clock
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
  isSameDay, 
  addDays, 
  subDays,
  parseISO
} from 'date-fns';
import { ca, es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

type ViewMode = 'month' | 'week' | 'day';

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
}

export default function GeneralCalendarPage() {
  const { t: _t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(window.innerWidth < 768 ? 'month' : 'week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const locale = i18n.language === 'ca' ? ca : es;

  // Fetch events from Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
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
        // Note: news event_date is ISO timestamp, so we need to filter carefully or just fetch all published and filter in JS
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
                start_time: new Date(item.event_date!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                end_time: null,
                location: null,
                all_day: false,
                event_type: 'news',
                color: '#3b82f6' // Blue for news
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

  // Get events for a specific day
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => event.event_date === dayStr);
  };

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  // Week days for header
  const weekDays = ['dl', 'dt', 'dc', 'dj', 'dv', 'ds', 'dg'];

  // Month rendering logic
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Week rendering logic
  const weekDaysRange = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-4 pt-4">
      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">
              {format(currentDate, 'MMMM yyyy', { locale })}
            </h1>
            <p className="text-slate-500 text-sm font-medium">Calendari d'activitats i esdeveniments</p>
          </div>
        </div>

        <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <button 
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Mes
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Setmana
          </button>
          <button 
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Dia
          </button>
        </div>

        <div className="flex items-center gap-2">
            <button onClick={handleToday} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Avui</button>
            <div className="flex bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <button onClick={handlePrev} className="p-2 border-r border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                <button onClick={handleNext} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
            </div>
        </div>
      </div>

      {/* Calendar Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-[500px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {viewMode === 'month' && (
              <div className="grid grid-cols-7 h-full">
                {weekDays.map(day => (
                  <div key={day} className="p-4 text-center text-[10px] font-black uppercase text-slate-400 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    {day}
                  </div>
                ))}
                {monthDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div 
                      key={idx} 
                      className={`min-h-[100px] p-2 border-b border-r border-slate-50 dark:border-slate-800 last:border-r-0 transition-colors ${!isSameMonth(day, currentDate) ? 'bg-slate-50/30 dark:bg-slate-800/10 opacity-50' : ''} ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'w-7 h-7 bg-primary text-white flex items-center justify-center rounded-full shadow-lg shadow-primary/30' : 'text-slate-600 dark:text-slate-400'}`}>
                              {format(day, 'd')}
                          </span>
                      </div>
                      {/* Events list */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: event.color + '20', color: event.color }}
                          >
                            {event.all_day ? '' : event.start_time?.slice(0, 5) + ' '}{event.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{dayEvents.length - 3} més</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'week' && (
              <div className="grid grid-cols-7 h-full">
                {weekDaysRange.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div key={idx} className="border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                      <div className={`p-3 text-center border-b border-slate-100 dark:border-slate-800 ${isSameDay(day, new Date()) ? 'bg-primary/10' : 'bg-slate-50/50'}`}>
                        <p className="text-[10px] font-black uppercase text-slate-400">{weekDays[idx]}</p>
                        <p className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-primary' : 'text-slate-700'}`}>{format(day, 'd')}</p>
                      </div>
                      <div className="p-2 space-y-2 min-h-[300px]">
                        {dayEvents.map(event => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="w-full text-left p-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity border-l-2"
                            style={{ backgroundColor: event.color + '15', borderColor: event.color }}
                          >
                            <p className="font-bold truncate" style={{ color: event.color }}>{event.title}</p>
                            {!event.all_day && event.start_time && (
                              <p className="text-slate-500 text-[10px]">{event.start_time.slice(0, 5)} - {event.end_time?.slice(0, 5)}</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'day' && (
              <div className="p-6">
                <div className={`text-center pb-4 border-b border-slate-100 ${isSameDay(currentDate, new Date()) ? 'bg-primary/5 rounded-xl p-4' : ''}`}>
                  <p className="text-sm font-bold text-slate-400 uppercase">{format(currentDate, 'EEEE', { locale })}</p>
                  <p className={`text-4xl font-black ${isSameDay(currentDate, new Date()) ? 'text-primary' : 'text-slate-800'}`}>{format(currentDate, 'd')}</p>
                </div>
                <div className="mt-6 space-y-3">
                  {getEventsForDay(currentDate).length === 0 ? (
                    <p className="text-center text-slate-400 py-10">No hi ha esdeveniments aquest dia</p>
                  ) : (
                    getEventsForDay(currentDate).map(event => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left p-4 rounded-xl border-l-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                        style={{ borderColor: event.color }}
                      >
                        <p className="font-bold text-slate-800">{event.title}</p>
                        {!event.all_day && event.start_time && (
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                            {event.start_time.slice(0, 5)} - {event.end_time?.slice(0, 5)}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div 
                className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: selectedEvent.color }}
              />
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{selectedEvent.title}</h3>
                <p className="text-slate-500 text-sm capitalize">
                  {format(parseISO(selectedEvent.event_date), "EEEE, d 'de' MMMM", { locale })}
                </p>
              </div>
            </div>

            {!selectedEvent.all_day && selectedEvent.start_time && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-3">
                <Clock className="w-4 h-4" />
                <span>{selectedEvent.start_time.slice(0, 5)} - {selectedEvent.end_time?.slice(0, 5)}</span>
              </div>
            )}

            {selectedEvent.location && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent.description && (
              <p className="text-slate-600 dark:text-slate-300 mt-4 text-sm">
                {selectedEvent.description}
              </p>
            )}

            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-6 w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Tancar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
