import { useMemo } from 'react';
import type { Activity, ScheduleSession } from '../../services/ActivityService';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ActivitiesCalendarProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

export function ActivitiesCalendar({ activities, onActivityClick }: ActivitiesCalendarProps) {
  const { t } = useTranslation();
  const { tContent } = useContentTranslation();

  const DAYS = [
    { id: 1, label: t('admin.editor.days.mon'), key: 'mon' },
    { id: 2, label: t('admin.editor.days.tue'), key: 'tue' },
    { id: 3, label: t('admin.editor.days.wed'), key: 'wed' },
    { id: 4, label: t('admin.editor.days.thu'), key: 'thu' },
    { id: 5, label: t('admin.editor.days.fri'), key: 'fri' },
  ];

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

  // Sort sessions by time
  const getSortedSessionsForDay = (dayId: number) => {
    return sessions
      .filter(s => s.session.day === dayId)
      .sort((a, b) => {
        const [Ah, Am] = a.session.startTime.split(':').map(Number);
        const [Bh, Bm] = b.session.startTime.split(':').map(Number);
        return (Ah * 60 + Am) - (Bh * 60 + Bm);
      });
  };

  return (
    <div className="w-full space-y-8">
       {/* Mobile/Tablet: Stacked or Grid. Desktop: 5 columns if enough space, or responsive grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {DAYS.map(day => {
            const daySessions = getSortedSessionsForDay(day.id);
            const hasSessions = daySessions.length > 0;

            return (
              <div 
                key={day.id} 
                className={`flex flex-col rounded-3xl overflow-hidden transition-all ${
                  hasSessions 
                    ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700' 
                    : 'bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 dashed border-dashed opacity-70'
                }`}
              >
                {/* Day Header */}
                <div className={`p-4 text-center border-b ${
                  hasSessions 
                    ? 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800' 
                    : 'border-slate-100 dark:border-slate-800'
                }`}>
                  <h3 className={`font-black text-lg ${
                    hasSessions ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {day.label}
                  </h3>
                </div>

                {/* Sessions List */}
                <div className="p-3 flex-1 space-y-3 min-h-[100px]">
                  {hasSessions ? (
                    daySessions.map((item, idx) => (
                      <div
                        key={`${item.activity.id}-${idx}`}
                        onClick={() => onActivityClick?.(item.activity)}
                        className={`group relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md border border-slate-100 dark:border-slate-700 ${
                           item.activity.color?.replace('bg-', 'bg-opacity-10 bg-') || 'bg-blue-50 dark:bg-blue-900/20'
                        }`}
                      >
                         {/* Left colored accent bar */}
                         <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${item.activity.color || 'bg-blue-500'}`}></div>

                         <div className="pl-2">
                            {/* Group Tag */}
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                    item.activity.color?.replace('bg-', 'text-') || 'text-blue-600'
                                } bg-white/50 dark:bg-black/20`}>
                                    {item.groupName}
                                </span>
                            </div>

                            {/* Title */}
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                                {tContent(item.activity, 'title')}
                            </h4>

                            {/* Time */}
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{item.session.startTime} - {item.session.endTime}</span>
                            </div>
                            
                            {/* Location (if we had it in schema, for now just placeholder if needed, removed to keep clean) */}
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 space-y-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
       </div>
    </div>
  );
}
