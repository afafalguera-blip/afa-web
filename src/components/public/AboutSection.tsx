import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Edit } from 'lucide-react';
import type { AboutConfig, ContactConfig } from '../../services/ConfigService';

interface AboutSectionProps {
    isAdmin: boolean;
    aboutExpanded: boolean;
    setAboutExpanded: (expanded: boolean) => void;
    aboutConfig: AboutConfig | null;
    contactConfig: ContactConfig | null;
    onOpenAboutModal: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
    isAdmin,
    aboutExpanded,
    setAboutExpanded,
    aboutConfig,
    contactConfig,
    onOpenAboutModal
}) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language as 'ca' | 'es' | 'en';

    return (
        <section className="px-6 mt-4 mb-12 relative z-10">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <div
                    onClick={() => setAboutExpanded(!aboutExpanded)}
                    className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary">
                            <span className="material-icons-round">info</span>
                        </div>
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white">{t('home.about_title')}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenAboutModal();
                                }}
                                className="p-2 bg-slate-100 dark:bg-slate-700 text-primary rounded-full hover:scale-110 active:scale-95 transition-all"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                        {aboutExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                    </div>
                </div>

                {aboutExpanded && (
                    <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 space-y-4 animate-in slide-in-from-top-2">
                        {aboutConfig?.translations?.[currentLang]?.text ? (
                            <div
                                className="whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: aboutConfig.translations[currentLang].text.replace(/\n/g, '<br/>') }}
                            />
                        ) : (aboutConfig as any)?.text ? (
                            <div
                                className="whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: (aboutConfig as any).text.replace(/\n/g, '<br/>') }}
                            />
                        ) : (
                            <>
                                <p>{t('home.about_text_1')}</p>
                                <p>{t('home.about_text_2')}</p>
                                <p>{t('home.about_text_3')}</p>
                            </>
                        )}

                        {aboutConfig?.translations?.[currentLang]?.functions ? (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                                <h4 className="font-semibold mb-2 text-primary">{t('home.about_functions_title')}</h4>
                                <ul className="list-disc pl-4 space-y-1 marker:text-primary">
                                    {aboutConfig.translations[currentLang].functions.map((func: string, i: number) => (
                                        <li key={i}>{func}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : ((aboutConfig as any)?.functions && (aboutConfig as any).functions.length > 0) ? (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                                <h4 className="font-semibold mb-2 text-primary">{t('home.about_functions_title')}</h4>
                                <ul className="list-disc pl-4 space-y-1 marker:text-primary">
                                    {(aboutConfig as any).functions.map((func: string, i: number) => (
                                        <li key={i}>{func}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                                <h4 className="font-semibold mb-2 text-primary">{t('home.about_functions_title')}</h4>
                                <ul className="list-disc pl-4 space-y-1 marker:text-primary">
                                    {((t('home.about_functions' as any, { returnObjects: true }) as any) || []).map((func: string, i: number) => (
                                        <li key={i}>{func}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="text-xs italic text-slate-500 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20 space-y-2">
                            <p className="font-bold text-amber-800 dark:text-amber-200 not-italic uppercase tracking-wider text-[10px]">
                                {t('contact_page.schedule_title')}
                            </p>
                            <p>{contactConfig?.schedule || t('home.about_contact')}</p>
                            <p className="text-primary font-semibold">
                                {contactConfig?.schedule_info || t('contact_page.email_demand')}
                            </p>
                            {contactConfig?.email && (
                                <a href={`mailto:${contactConfig.email}`} className="text-primary font-semibold hover:underline block">
                                    {contactConfig.email}
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
