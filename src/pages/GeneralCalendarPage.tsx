import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon
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
  subDays
} from 'date-fns';
import { ca, es } from 'date-fns/locale';
import { useEffect } from 'react';

type ViewMode = 'month' | 'week' | 'day';

export default function GeneralCalendarPage() {
  const { t: _t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(window.innerWidth < 768 ? 'month' : 'week');

  const locale = i18n.language === 'ca' ? ca : es;

  useEffect(() => {
    // Activities will be needed here later
  }, []);

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
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 h-full">
            {weekDays.map(day => (
              <div key={day} className="p-4 text-center text-[10px] font-black uppercase text-slate-400 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {day}
              </div>
            ))}
            {monthDays.map((day, idx) => (
              <div 
                key={idx} 
                className={`min-h-[100px] p-2 border-b border-r border-slate-50 dark:border-slate-800 last:border-r-0 transition-colors ${!isSameMonth(day, currentDate) ? 'bg-slate-50/30 dark:bg-slate-800/10 grayscale' : ''} ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'w-7 h-7 bg-primary text-white flex items-center justify-center rounded-full shadow-lg shadow-primary/30' : 'text-slate-600 dark:text-slate-400'}`}>
                        {format(day, 'd')}
                    </span>
                </div>
                {/* Simplified events list for month view */}
                <div className="space-y-1">
                    {/* Placeholder for events or activities that fall on this day */}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'week' && (
            <div className="p-20 text-center text-slate-400 font-medium">
                Vista de Setmana en desenvolupament...
            </div>
        )}

        {viewMode === 'day' && (
            <div className="p-20 text-center text-slate-400 font-medium">
                Vista de Dia en desenvolupament...
            </div>
        )}
      </div>
    </div>
  );
}
