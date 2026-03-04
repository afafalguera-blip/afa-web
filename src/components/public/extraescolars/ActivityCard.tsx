import { Calendar as CalendarIcon, User, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LazyImage } from '../../common/LazyImage';
import { useContentTranslation } from '../../../hooks/useContentTranslation';
import { CategoryUtils } from '../../../utils/CategoryUtils';
import type { Activity } from '../../../services/ActivityService';

interface ActivityCardProps {
    activity: Activity;
    isAdmin: boolean;
    onEdit: () => void;
    onClick: () => void;
}

export function ActivityCard({ activity, isAdmin, onEdit, onClick }: ActivityCardProps) {
    const { t } = useTranslation();
    const { tContent } = useContentTranslation();

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5 group transition-all active:scale-[0.98] hover:shadow-md hover:scale-[1.01] flex flex-col cursor-pointer relative z-10"
        >
            {isAdmin && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="absolute top-4 right-4 z-30 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 scale-0 group-hover:scale-100 transition-transform flex items-center gap-1 text-xs px-3"
                >
                    <Edit size={14} />
                    {t('common.edit')}
                </button>
            )}
            <div className="relative h-44 overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                <LazyImage
                    src={activity.image_url}
                    alt={tContent(activity, 'title')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className={`absolute top-4 right-4 ${activity.color || 'bg-blue-500'}/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-20`}>
                    {CategoryUtils.translate(t, activity.category)}
                </span>
            </div>
            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                        {tContent(activity, 'title')}
                    </h3>
                    <div className="text-right shrink-0 ml-2">
                        <div className="flex flex-col items-end">
                            <p className="text-lg font-bold text-primary">
                                {activity.price_member || activity.price}€
                                <span className="text-[10px] font-medium text-slate-400 ml-1">({t('inscription.pricing.price_member')})</span>
                            </p>
                            {activity.price_non_member && (
                                <p className="text-sm font-bold text-slate-400 -mt-1">
                                    {activity.price_non_member}€
                                    <span className="text-[9px] font-medium text-slate-400/70 ml-1">({t('inscription.pricing.price_non_member')})</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                        <CalendarIcon className="text-primary w-4 h-4 mr-2 shrink-0" />
                        <span className="truncate">{tContent(activity, 'schedule_summary')}</span>
                    </div>
                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                        <User className="text-primary w-4 h-4 mr-2 shrink-0" />
                        <span className="truncate">{tContent(activity, 'grades')}</span>
                    </div>
                </div>
                <button className="w-full py-3.5 bg-primary hover:bg-opacity-90 text-white font-semibold rounded-2xl shadow-lg shadow-primary/20 transition-all">
                    {t('home.view_details')}
                </button>
            </div>
        </div>
    );
}
