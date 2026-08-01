import { Globe } from "lucide-react";
import type { LegalConfig } from "../../../services/ConfigService";
import { useSettingsT } from "./useSettingsT";

interface LegalSettingsProps {
    title: string;
    config: LegalConfig;
    setConfig: (config: LegalConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

const LANG_NAMES: Record<'ca' | 'es' | 'en', { key: string; fallback: string }> = {
    ca: { key: 'admin.settings.lang.ca', fallback: 'Català' },
    es: { key: 'admin.settings.lang.es', fallback: 'Castellà' },
    en: { key: 'admin.settings.lang.en', fallback: 'Anglès' }
};

export function LegalSettings({ title, config, setConfig, activeLang, setActiveLang }: LegalSettingsProps) {
    const t = useSettingsT();
    const langName = t(LANG_NAMES[activeLang].key, LANG_NAMES[activeLang].fallback);

    return (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <h3 className="text-lg font-bold text-neutral-900">{title}</h3>

                <div className="flex p-1 bg-neutral-100 rounded-lg w-fit">
                    {(['ca', 'es', 'en'] as const).map((lang) => (
                        <button
                            key={lang}
                            type="button"
                            onClick={() => setActiveLang(lang)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeLang === lang
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <Globe size={18} aria-hidden="true" />
                    <p className="text-xs font-medium">
                        {t('admin.settings.editing_lang', 'Estàs editant la versió en')}{' '}
                        <span className="font-bold underline">{langName}</span>
                    </p>
                </div>

                <textarea
                    required
                    aria-label={title}
                    value={config[activeLang] || ''}
                    onChange={(e) => setConfig({ ...config, [activeLang]: e.target.value })}
                    rows={15}
                    className="w-full px-4 py-4 rounded-lg border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-neutral-300 outline-none transition-all text-sm leading-relaxed font-mono"
                    placeholder={`${t('admin.settings.legal.placeholder', 'Escriu aquí el text en')} ${langName.toLowerCase()}...`}
                />

                <p className="text-[10px] text-neutral-400 italic">
                    {t('admin.settings.legal.hint', "Pots fer servir salts de línia per separar paràgrafs. El contingut s'actualitzarà a la web quan l'usuari canviï d'idioma.")}
                </p>
            </div>
        </div>
    );
}
