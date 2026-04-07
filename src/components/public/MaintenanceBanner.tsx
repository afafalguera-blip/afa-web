import { Wrench, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MAINTENANCE_MODE, MAINTENANCE_EMAIL } from '../../utils/maintenance';

export function MaintenanceBanner() {
    const { t } = useTranslation();

    if (!MAINTENANCE_MODE) return null;

    return (
        <div className="bg-amber-500 text-white relative z-[45] border-b border-amber-600">
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                    <span className="flex w-8 h-8 items-center justify-center bg-white/20 rounded-lg shrink-0">
                        <Wrench size={16} className="text-white" />
                    </span>
                    <p className="text-sm sm:text-base font-bold text-center">
                        {t('maintenance.banner')}
                    </p>
                </div>
                <a
                    href={`mailto:${MAINTENANCE_EMAIL}`}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0"
                >
                    <Mail size={12} />
                    {MAINTENANCE_EMAIL}
                </a>
            </div>
        </div>
    );
}
