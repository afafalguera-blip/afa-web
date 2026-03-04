import { Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EnrollmentBannerProps {
    onSignup: () => void;
}

export function EnrollmentBanner({ onSignup }: EnrollmentBannerProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-6 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all mb-6 lg:mb-10 group relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
                <button
                    onClick={onSignup}
                    className="w-full md:w-auto px-12 py-3 bg-primary text-white rounded-xl font-bold text-sm lg:text-base hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap flex items-center justify-center gap-2"
                >
                    <Rocket className="w-5 h-5" />
                    {t('inscription.activity_modal.signup_btn')}
                </button>
            </div>
        </div>
    );
}
