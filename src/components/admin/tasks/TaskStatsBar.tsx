import { useTranslation } from 'react-i18next';

interface TaskStatsBarProps {
  stats: { open: number; inProgress: number; overdue: number; completed: number };
}

export function TaskStatsBar({ stats }: TaskStatsBarProps) {
  const { t } = useTranslation();

  const items = [
    { label: t('admin.tasks.open_tasks'), value: stats.open, color: 'text-neutral-900' },
    { label: t('admin.tasks.in_progress_count'), value: stats.inProgress, color: 'text-neutral-900' },
    { label: t('admin.tasks.overdue_count'), value: stats.overdue, color: 'text-amber-600' },
    { label: t('admin.tasks.completed_count'), value: stats.completed, color: 'text-green-700' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-lg border border-neutral-200 p-5">
          <p className="text-[13px] text-neutral-500">{item.label}</p>
          <p className={`text-3xl font-bold mt-2 tabular-nums ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
