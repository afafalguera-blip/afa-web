import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cookie, Check, ShieldCheck, PieChart, Target } from 'lucide-react';
import { ConfigService, type LegalConfig } from '../../services/ConfigService';
import { CookieService, type CookieConsent } from '../../services/CookieService';

export default function CookiesPolicy() {
    const { i18n, t } = useTranslation();
    const [config, setConfig] = useState<LegalConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [consent, setConsent] = useState<CookieConsent>({
        technical: true,
        analytics: false,
        marketing: false
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            const data = await ConfigService.getCookiesConfig();
            if (data) setConfig(data);

            const savedConsent = CookieService.getConsent();
            if (savedConsent) {
                setConsent(savedConsent);
            }

            setLoading(false);
        };
        fetchConfig();
    }, []);

    const handleToggle = (key: keyof CookieConsent) => {
        if (key === 'technical') return;
        setConsent(prev => ({ ...prev, [key]: !prev[key] }));
        setSaved(false);
    };

    const handleSave = () => {
        CookieService.setConsent(consent);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const currentLang = (i18n.language.split('-')[0] || 'ca') as keyof LegalConfig;
    const content = config?.[currentLang] || config?.ca || '';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-4">
                        <Cookie className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                        {t('legal.cookies_title')}
                    </h1>
                </div>

                {/* Configuration Panel */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {t('legal.cookies_prefs')}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Technical */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 opacity-80">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        {t('legal.cookies_technical')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {t('legal.cookies_technical_desc')}
                                    </p>
                                </div>
                            </div>
                            <div className="w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </div>

                        {/* Analytics */}
                        <div
                            onClick={() => handleToggle('analytics')}
                            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary/50 cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <PieChart className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        {t('legal.cookies_analytics')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {t('legal.cookies_analytics_desc')}
                                    </p>
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${consent.analytics ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${consent.analytics ? 'right-1' : 'left-1'}`}></div>
                            </div>
                        </div>

                        {/* Marketing */}
                        <div
                            onClick={() => handleToggle('marketing')}
                            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary/50 cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <Target className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">
                                        {t('legal.cookies_personalization')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {t('legal.cookies_personalization_desc')}
                                    </p>
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${consent.marketing ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${consent.marketing ? 'right-1' : 'left-1'}`}></div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${saved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
                            }`}
                    >
                        {saved ? (
                            <>
                                <Check className="w-5 h-5" />
                                {t('legal.cookies_saved')}
                            </>
                        ) : (
                            t('legal.cookies_save')
                        )}
                    </button>
                </div>

                {/* Main Content */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
                    {content ? (
                        <div
                            className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed space-y-4 prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
                        />
                    ) : (
                        <div className="text-center py-12 text-slate-400 italic">
                            {t('legal.no_content')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
