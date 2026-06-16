import { useMemo, useState } from 'react';
import type { Activity, ScheduleSession } from '../../services/ActivityService';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { classifyGroup, type CourseStage } from '../../utils/courseStage';

interface ActivitiesCalendarProps {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

interface DaySession {
  activity: Activity;
  session: ScheduleSession;
  groupName: string;
}

type Stage = 'all' | CourseStage;

export function ActivitiesCalendar({ activities, onActivityClick }: ActivitiesCalendarProps) {
  const { t } = useTranslation();
  const { tContent } = useContentTranslation();
  const [stage, setStage] = useState<Stage>('all');

  const DAYS = [
    { id: 1, label: t('admin.editor.days.mon') },
    { id: 2, label: t('admin.editor.days.tue') },
    { id: 3, label: t('admin.editor.days.wed') },
    { id: 4, label: t('admin.editor.days.thu') },
    { id: 5, label: t('admin.editor.days.fri') },
  ];

  const STAGES: { key: Stage; label: string }[] = [
    { key: 'all', label: t('inscription.calendar_filter.all') },
    { key: 'infantil', label: t('inscription.calendar_filter.infantil') },
    { key: 'primaria1', label: t('inscription.calendar_filter.cycle1') },
    { key: 'primaria2', label: t('inscription.calendar_filter.cycle2') },
  ];

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, DaySession[]>();
    activities.forEach(activity => {
      activity.schedule_details?.forEach(group => {
        group.sessions?.forEach(session => {
          if (stage !== 'all' && classifyGroup(group.group) !== stage) return;
          const list = map.get(session.day) ?? [];
          list.push({ activity, session, groupName: group.group });
          map.set(session.day, list);
        });
      });
    });
    map.forEach(list =>
      list.sort((a, b) => a.session.startTime.localeCompare(b.session.startTime))
    );
    return map;
  }, [activities, stage]);

  // Hide days with no sessions to keep the view short on mobile
  const activeDays = DAYS.filter(d => (sessionsByDay.get(d.id)?.length ?? 0) > 0);

  return (
    <div className="space-y-4">
      {/* Schedule & snack notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-slate-800 dark:text-white">
            {t('inscription.calendar_info.title')}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('inscription.calendar_info.text')}
          </p>
        </div>
      </div>

      {/* Stage filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {STAGES.map(s => (
          <button
            key={s.key}
            onClick={() => setStage(s.key)}
            className={`px-4 py-1.5 lg:px-5 lg:py-2 rounded-full text-xs lg:text-sm font-bold whitespace-nowrap transition-all border ${stage === s.key
              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeDays.length === 0 ? (
        <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-16 text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-slate-300 dark:text-slate-700">
            {t('common.no_activities')}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {activeDays.map(day => {
            const daySessions = sessionsByDay.get(day.id) ?? [];
            return (
              <div
                key={day.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 overflow-hidden flex flex-col"
              >
                {/* Day header */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    {day.label}
                  </h3>
                </div>

                {/* Sessions */}
                <div className="p-2.5 flex flex-col gap-2 flex-1">
                  {daySessions.map((item, idx) => (
                    <button
                      key={`${item.activity.id}-${idx}`}
                      onClick={() => onActivityClick?.(item.activity)}
                      className="group flex items-center gap-3 w-full text-left rounded-xl bg-slate-50 dark:bg-slate-900/40 p-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-900/70 active:scale-[0.98]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                          {tContent(item.activity, 'title')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.groupName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
