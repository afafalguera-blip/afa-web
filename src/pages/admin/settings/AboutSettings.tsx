import { Globe, X } from "lucide-react";
import type { AboutConfig } from "../../../services/ConfigService";
import { useSettingsT } from "./useSettingsT";

interface AboutSettingsProps {
    about: AboutConfig;
    setAbout: (about: AboutConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

const LANG_NAMES: Record<'ca' | 'es' | 'en', { key: string; fallback: string }> = {
    ca: { key: 'admin.settings.lang.ca', fallback: 'Català' },
    es: { key: 'admin.settings.lang.es', fallback: 'Castellà' },
    en: { key: 'admin.settings.lang.en', fallback: 'Anglès' }
};

export function AboutSettings({ about, setAbout, activeLang, setActiveLang }: AboutSettingsProps) {
    const t = useSettingsT();
    const langName = t(LANG_NAMES[activeLang].key, LANG_NAMES[activeLang].fallback);

    const handleAboutFunctionChange = (index: number, value: string) => {
        if (!about.translations?.[activeLang]) return;
        const newTranslations = { ...about.translations };
        const langData = { ...newTranslations[activeLang] };
        const newFunctions = [...langData.functions];
        newFunctions[index] = value;
        langData.functions = newFunctions;
        newTranslations[activeLang] = langData;
        setAbout({ ...about, translations: newTranslations });
    };

    const addAboutFunction = () => {
        if (!about.translations?.[activeLang]) return;
        const newTranslations = { ...about.translations };
        const langData = { ...newTranslations[activeLang] };
        langData.functions = [...langData.functions, ""];
        newTranslations[activeLang] = langData;
        setAbout({ ...about, translations: newTranslations });
    };

    const removeAboutFunction = (index: number) => {
        if (!about.translations?.[activeLang]) return;
        const newTranslations = { ...about.translations };
        const langData = { ...newTranslations[activeLang] };
        langData.functions = langData.functions.filter((_, i) => i !== index);
        newTranslations[activeLang] = langData;
        setAbout({ ...about, translations: newTranslations });
    };

    const functions = about.translations?.[activeLang]?.functions || [];

    return (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <h3 className="text-lg font-bold text-neutral-900">
                    {t('admin.settings.about.title', "Informació corporativa (Sobre l'AFA)")}
                </h3>

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

            <div className="space-y-6">
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <Globe size={18} aria-hidden="true" />
                    <p className="text-xs font-medium">
                        {t('admin.settings.editing_lang', 'Estàs editant la versió en')}{' '}
                        <span className="font-bold underline">{langName}</span>
                    </p>
                </div>

                <div className="space-y-2">
                    <label htmlFor="about-description" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.about.description', 'Descripció principal (qui som)')}
                    </label>
                    <textarea
                        id="about-description"
                        required
                        value={about.translations?.[activeLang]?.text || ""}
                        onChange={(e) => {
                            const newTranslations = about.translations ? { ...about.translations } : {
                                ca: { text: '', functions: [] },
                                es: { text: '', functions: [] },
                                en: { text: '', functions: [] }
                            };
                            const currentLangData = newTranslations[activeLang] || { text: '', functions: [] };
                            newTranslations[activeLang] = { ...currentLangData, text: e.target.value };
                            setAbout({ ...about, translations: newTranslations });
                        }}
                        rows={8}
                        className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-neutral-300 outline-none transition-all text-sm leading-relaxed"
                        placeholder={t('admin.settings.about.description_placeholder', "Explica la missió i valors de l'AFA...")}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="block text-sm font-bold text-neutral-700">
                            {t('admin.settings.about.functions', "Funcions de l'AFA (llista)")}
                        </span>
                        <button
                            type="button"
                            onClick={addAboutFunction}
                            className="text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1"
                        >
                            + {t('admin.settings.about.add_function', 'Afegir funció')}
                        </button>
                    </div>

                    <div className="space-y-3">
                        {functions.map((func, index) => (
                            <div key={index} className="flex gap-2">
                                <div className="w-8 h-8 flex items-center justify-center bg-neutral-100 rounded-lg text-xs font-bold shrink-0 mt-1">
                                    {index + 1}
                                </div>
                                <input
                                    type="text"
                                    value={func}
                                    aria-label={`${t('admin.settings.about.function', 'Funció')} ${index + 1}`}
                                    onChange={(e) => handleAboutFunctionChange(index, e.target.value)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-neutral-300 outline-none transition-all text-sm"
                                    placeholder={t('admin.settings.about.function_placeholder', "Ex: Representar les famílies davant l'escola")}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeAboutFunction(index)}
                                    aria-label={t('common.delete', 'Eliminar')}
                                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                        {functions.length === 0 && (
                            <p className="text-xs text-neutral-400 italic text-center py-4">
                                {t('admin.settings.about.no_functions', 'No hi ha funcions definides.')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
