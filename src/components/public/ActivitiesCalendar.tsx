import { useMemo } from 'react';
import type { Activity, ScheduleSession } from '../../services/ActivityService';

interface ActivitiesCalendarProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

const DAYS = [
  { id: 1, label: 'Dll' },
  { id: 2, label: 'Dtm' },
  { id: 3, label: 'Dmc' },
  { id: 4, label: 'Djs' },
  { id: 5, label: 'Dvd' },
  { id: 6, label: 'Dss' },
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

export function ActivitiesCalendar({ activities, onActivityClick }: ActivitiesCalendarProps) {

  const sessions = useMemo(() => {
    const allSessions: { activity: Activity; session: ScheduleSession; groupName: string }[] = [];
    activities.forEach(activity => {
      activity.schedule_details?.forEach(group => {
        group.sessions?.forEach(session => {
          allSessions.push({
            activity,
            session,
            groupName: group.group
          });
        });
      });
    });
    return allSessions;
  }, [activities]);

  const getTimePosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const startHour = 8;
    const hourHeight = 64; // px per hour
    return (hours - startHour) * hourHeight + (minutes / 60) * hourHeight;
  };

  const getDurationHeight = (start: string, end: string) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const durationMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    return (durationMinutes / 60) * 64;
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="min-w-[800px] relative">
          {/* Header */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="p-4 border-r border-slate-100 dark:border-slate-800"></div>
            {DAYS.map(day => (
              <div key={day.id} className="p-4 text-center font-bold text-slate-700 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                {day.label}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="relative h-[896px]"> {/* 14 hours * 64px */}
            {/* Hour Rows */}
            {HOURS.map(hour => (
              <div 
                key={hour} 
                className="absolute w-full border-b border-slate-100 dark:border-slate-800 flex"
                style={{ top: `${(hour - 8) * 64}px`, height: '64px' }}
              >
                <div className="w-[80px] p-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-right pr-4 border-r border-slate-100 dark:border-slate-800">
                  {hour}:00
                </div>
                <div className="flex-1 grid grid-cols-6 h-full">
                    {[1,2,3,4,5,6].map(d => (
                        <div key={d} className="border-r border-slate-50 dark:border-slate-800/30 last:border-r-0"></div>
                    ))}
                </div>
              </div>
            ))}

            {/* Activities Overlay */}
            <div className="absolute top-0 left-[80px] right-0 bottom-0 pointer-events-none grid grid-cols-6 h-full">
              {[1, 2, 3, 4, 5, 6].map(dayId => (
                <div key={dayId} className="relative h-full">
                  {sessions
                    .filter(s => s.session.day === dayId)
                    .map((item, idx) => {
                      const top = getTimePosition(item.session.startTime);
                      const height = getDurationHeight(item.session.startTime, item.session.endTime);
                      
                      return (
                        <div
                          key={`${item.activity.id}-${idx}`}
                          onClick={() => onActivityClick?.(item.activity)}
                          className={`absolute left-1 right-1 rounded-xl p-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95 pointer-events-auto overflow-hidden ${item.activity.color || 'bg-blue-500'} text-white border-2 border-white dark:border-slate-900 shadow-md group`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            zIndex: 10
                          }}
                        >
                          <div className="text-[9px] font-bold uppercase opacity-80 leading-none mb-1 truncate">
                            {item.groupName}
                          </div>
                          <div className="text-[11px] font-extrabold leading-tight mb-1 line-clamp-2">
                            {item.activity.title}
                          </div>
                          <div className="text-[9px] font-medium opacity-90">
                            {item.session.startTime} - {item.session.endTime}
                          </div>
                          
                          {/* Tooltip on hover (built-in browser tooltip for simplicity or we can do more) */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend / Footer */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 justify-center">
            {Array.from(new Set(activities.map(a => a.category))).map(cat => {
                const activity = activities.find(a => a.category === cat);
                return (
                    <div key={cat} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${activity?.color || 'bg-blue-500'}`}></div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{cat}</span>
                    </div>
                );
            })}
      </div>
    </div>
  );
}
