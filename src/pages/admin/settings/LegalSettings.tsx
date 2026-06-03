import { Globe } from "lucide-react";
import type { LegalConfig } from "../../../services/ConfigService";

interface LegalSettingsProps {
    title: string;
    config: LegalConfig;
    setConfig: (config: LegalConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

export function LegalSettings({ title, config, setConfig, activeLang, setActiveLang }: LegalSettingsProps) {
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-50 dark:border-neutral-700 pb-4 mb-6">
                <h3 className="text-xl font-bold text-neutral-800 dark:text-white">
                    {title}
                </h3>

                {/* Language Switcher */}
                <div className="flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg w-fit">
                    {(['ca', 'es', 'en'] as const).map((lang) => (
                        <button
                            key={lang}
                            type="button"
                            onClick={() => setActiveLang(lang)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === lang
                                ? 'bg-white dark:bg-neutral-700 text-primary shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                                }`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/20 mb-4">
                    <Globe size={18} />
                    <p className="text-xs font-medium">Estàs editant la versió en <span className="font-bold underline">{activeLang === 'ca' ? 'Català' : activeLang === 'es' ? 'Castellà' : 'Anglès'}</span></p>
                </div>

                <textarea
                    required
                    value={config[activeLang] || ''}
                    onChange={(e) => setConfig({ ...config, [activeLang]: e.target.value })}
                    rows={15}
                    className="w-full px-4 py-4 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 focus:ring-2 focus:ring-primary outline-none transition-all text-sm leading-relaxed font-mono"
                    placeholder={`Escriu aquí el text en ${activeLang === 'ca' ? 'català' : activeLang === 'es' ? 'castellà' : 'anglès'}...`}
                />

                <p className="text-[10px] text-neutral-400 italic">
                    * Pots fer servir salts de línia per separar paràgrafs. El contingut s'actualitzarà a la web quan l'usuari canviï d'idioma.
                </p>
            </div>
        </div>
    );
}
