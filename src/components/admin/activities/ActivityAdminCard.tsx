import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Activity } from '../../../services/ActivityService';
import { CategoryUtils } from '../../../utils/CategoryUtils';
import { proxyStorageUrl } from '../../../utils/storageUrl';

interface ActivityAdminCardProps {
    activity: Activity;
    onEdit: (activity: Activity) => void;
    onDelete: (activity: Activity) => void;
}

export function ActivityAdminCard({ activity, onEdit, onDelete }: ActivityAdminCardProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm hover:shadow transition-shadow flex flex-col">
            <div className="h-40 relative bg-neutral-100">
                {activity.image_url && (
                    <img src={proxyStorageUrl(activity.image_url)} alt="" className="w-full h-full object-cover" />
                )}
                <div className={`absolute top-4 right-4 ${activity.color} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>
                    {CategoryUtils.translate(t, activity.category)}
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-lg line-clamp-1 text-neutral-900">{activity.title}</h3>
                    <span className="font-bold text-neutral-900 shrink-0">{activity.price}€</span>
                </div>
                <p className="text-neutral-500 text-sm line-clamp-2 mb-4 flex-1">{activity.description}</p>

                <div className="flex items-center gap-4 text-xs font-medium text-neutral-400 mb-4 border-t border-neutral-100 pt-3">
                    <span>{activity.spots} {t('admin.activities.spots')}</span>
                    <span>•</span>
                    <span>{activity.grades}</span>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(activity)}
                        className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 transition-colors"
                    >
                        <Pencil className="w-4 h-4" /> {t('admin.activities.edit')}
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(activity)}
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                        className="w-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
