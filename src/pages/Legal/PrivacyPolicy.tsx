import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { ConfigService, type LegalConfig } from '../../services/ConfigService';

export default function PrivacyPolicy() {
    const { i18n } = useTranslation();
    const [config, setConfig] = useState<LegalConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            const data = await ConfigService.getPrivacyConfig();
            if (data) setConfig(data);
            setLoading(false);
        };
        fetchConfig();
    }, []);

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
                    <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
                        <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                        {currentLang === 'ca' ? 'Política de Privacitat' : currentLang === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}
                    </h1>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
                    {content ? (
                        <div
                            className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed space-y-4"
                            dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
                        />
                    ) : (
                        <div className="text-center py-12 text-slate-400 italic">
                            {currentLang === 'ca' ? 'No hi ha contingut disponible.' : currentLang === 'es' ? 'No hay contenido disponible.' : 'No content available.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
