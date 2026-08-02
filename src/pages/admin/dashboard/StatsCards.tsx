import { UserPlus, UserMinus, Users, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { InscriptionStats } from '../../../services/admin/AdminInscriptionsService';

interface StatsCardsProps {
  stats: InscriptionStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useTranslation();

  const cards = [
    {
      title: t('admin.dashboard.stats.active'),
      value: String(stats.activeStudents),
      icon: UserPlus,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      title: t('admin.dashboard.stats.bajas'),
      value: String(stats.bajaStudents),
      icon: UserMinus,
      color: 'text-amber-600',
      bg: 'bg-amber-100'
    },
    {
      title: t('admin.dashboard.stats.afa_members'),
      value: `${stats.afaMemberStudents}/${stats.activeStudents}`,
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      title: t('admin.dashboard.stats.popular'),
      value: stats.topActivity ? `${stats.topActivity.name} (${stats.topActivity.count})` : '—',
      icon: Star,
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white p-6 rounded-lg border border-neutral-200 flex items-center gap-4"
        >
          <div className={`p-3 rounded-lg ${card.bg}`}>
            <card.icon className={`w-6 h-6 ${card.color}`} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-500">{card.title}</p>
            <p className="text-2xl font-bold text-neutral-900 truncate">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
