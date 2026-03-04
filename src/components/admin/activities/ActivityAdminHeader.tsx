import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

interface ActivityAdminHeaderProps {
    onCreate: () => void;
}

export function ActivityAdminHeader({ onCreate }: ActivityAdminHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                    {t('admin.activities.title')}
                </h1>
                <p className="text-slate-500">
                    {t('admin.activities.subtitle')}
                </p>
            </div>
            <button
                onClick={onCreate}
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center gap-2 transition-all"
            >
                <Plus className="w-5 h-5" /> {t('admin.activities.new_activity')}
            </button>
        </div>
    );
}
