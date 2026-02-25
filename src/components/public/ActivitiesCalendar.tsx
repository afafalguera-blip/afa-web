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
    <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-3xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col">
        {DAYS.map((day) => {
          const daySessions = getSortedSessionsForDay(day.id);
          const hasSessions = daySessions.length > 0;

          return (
            <div
              key={day.id}
              className={`flex items-stretch border-b last:border-0 border-slate-200 dark:border-slate-800 min-h-[90px] lg:min-h-[110px] ${!hasSessions ? 'bg-slate-100/30 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-800/50'
                }`}
            >
              {/* Day Label - Vertical Bar */}
              <div className="w-10 lg:w-20 shrink-0 flex items-center justify-center border-r border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/80">
                <span className="font-black text-[10px] lg:text-sm text-slate-400 dark:text-slate-500 rotate-[-90deg] lg:rotate-0 uppercase tracking-tighter">
                  {day.label}
                </span>
              </div>

              {/* Sessions Grid for the Day */}
              <div className="flex-1 p-3 lg:p-4 flex gap-3 lg:gap-4 overflow-x-auto hide-scrollbar snap-x">
                {hasSessions ? (
                  daySessions.map((item, idx) => {
                    // Manual override for Patinaje color to orange
                    const isPatinaje = tContent(item.activity, 'title').toLowerCase().includes('patinaje') ||
                      tContent(item.activity, 'title').toLowerCase().includes('skating');
                    const activityColor = isPatinaje ? 'bg-orange-500' : (item.activity.color || 'bg-blue-500');
                    const bgColorClass = isPatinaje ? 'bg-orange-50 dark:bg-orange-900/20' : activityColor.replace('bg-', 'bg-') + ' bg-opacity-10';

                    return (
                      <div
                        key={`${item.activity.id}-${idx}`}
                        onClick={() => onActivityClick?.(item.activity)}
                        className={`snap-start min-w-[150px] lg:min-w-[220px] flex flex-col justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden bg-white dark:bg-slate-800`}
                      >
                        {/* Accent Line */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${activityColor}`}></div>

                        {/* Light solid background overlay to avoid true transparency issues while keeping the tint */}
                        <div className={`absolute inset-0 ${bgColorClass} pointer-events-none opacity-40`}></div>

                        <div className="relative z-10 pl-2">
                          <h4 className="font-bold text-xs lg:text-base text-slate-900 dark:text-white leading-tight line-clamp-2 mb-1">
                            {tContent(item.activity, 'title')}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[10px] lg:text-sm font-bold text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.session.startTime}</span>
                          </div>
                        </div>

                        <div className="relative z-10 pl-2 mt-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] lg:text-[10px] font-black uppercase tracking-wider ${isPatinaje ? 'text-orange-600 bg-orange-100' : activityColor.replace('bg-', 'text-') + ' bg-slate-100 dark:bg-slate-700'
                            }`}>
                            {item.groupName}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <span className="text-[10px] lg:text-xs font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                      {t('common.no_activities')}
                    </span>
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
