import { useTranslation } from 'react-i18next';
import { Mail, Clock, Instagram, AlertCircle } from 'lucide-react';
import type { ContactConfig, SocialConfig } from '../../../services/ConfigService';

interface ContactInfoProps {
    contact: ContactConfig | null;
    social: SocialConfig | null;
}

export function ContactInfo({ contact, social }: ContactInfoProps) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Schedule Card */}
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 md:p-8 border border-amber-100 dark:border-amber-900/20">
                <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                        <Clock size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                            {t('contact_page.schedule_title', 'Horari d\'atenció')}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                            {contact?.schedule || t('contact_page.schedule_mon', 'Dilluns de 16:30 a 18:00h')}
                        </p>
                    </div>
                </div>

                <div className="p-3 md:p-4 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-amber-100 dark:border-amber-900/10 flex items-start gap-3">
                    <Mail className="text-primary mt-1 shrink-0" size={16} />
                    <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">
                        {contact?.schedule_info || t('contact_page.email_demand', 'Fora d\'aquest horari, demaneu cita per email')}
                    </p>
                </div>

                <div className="mt-3 p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/30 flex items-start gap-3">
                    <AlertCircle className="text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" size={14} />
                    <p className="text-[11px] md:text-xs font-medium text-amber-700 dark:text-amber-400 leading-tight">
                        {t('contact_page.schedule_appointment_mobile', 'Cal demanar cita prèvia per a consultes presencials.')}
                    </p>
                </div>
            </div>

            {/* Social & Direct Contact Card */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm md:text-base">
                    {t('contact_page.other_ways', 'Altres vies')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                    <a
                        href={`mailto:${contact?.email || 'ampafalguera@hotmail.es'}`}
                        className="flex items-center gap-3 text-primary hover:underline font-medium text-sm md:text-base"
                    >
                        <Mail size={16} />
                        <span className="truncate">{contact?.email || 'ampafalguera@hotmail.es'}</span>
                    </a>
                    {social?.instagram && (
                        <a
                            href={social.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-pink-600 hover:underline font-medium text-sm md:text-base"
                        >
                            <Instagram className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                            <span>
                                {social.instagram.split('/').pop()?.startsWith('@')
                                    ? social.instagram.split('/').pop()
                                    : `@${social.instagram.split('/').pop()}`}
                            </span>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
