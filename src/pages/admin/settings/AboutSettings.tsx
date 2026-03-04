import { Globe, X } from "lucide-react";
import type { AboutConfig } from "../../../services/ConfigService";

interface AboutSettingsProps {
    about: AboutConfig;
    setAbout: (about: AboutConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

export function AboutSettings({ about, setAbout, activeLang, setActiveLang }: AboutSettingsProps) {
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

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-700 pb-4 mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    Informació Corporativa (Sobre l'AFA)
                </h3>

                {/* Language Switcher for About */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
                    {(['ca', 'es', 'en'] as const).map((lang) => (
                        <button
                            key={lang}
                            type="button"
                            onClick={() => setActiveLang(lang)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === lang
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20 mb-4">
                    <Globe size={18} />
                    <p className="text-xs font-medium">Estàs editant la versió en <span className="font-bold underline">{activeLang === 'ca' ? 'Català' : activeLang === 'es' ? 'Castellà' : 'Anglès'}</span></p>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Descripció Principal (Qui som)</label>
                    <textarea
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
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all text-sm leading-relaxed"
                        placeholder="Explica la missió i valors de l'AFA..."
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Funcions de l'AFA (Llista)</label>
                        <button
                            type="button"
                            onClick={addAboutFunction}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            + Afegir funció
                        </button>
                    </div>

                    <div className="space-y-3">
                        {(about.translations?.[activeLang]?.functions || []).map((func, index) => (
                            <div key={index} className="flex gap-2">
                                <div className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold shrink-0 mt-2">
                                    {index + 1}
                                </div>
                                <input
                                    type="text"
                                    value={func}
                                    onChange={(e) => handleAboutFunctionChange(index, e.target.value)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                                    placeholder="Ex: Representar les famílies davant l'escola"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeAboutFunction(index)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                        {(about.translations?.[activeLang]?.functions || []).length === 0 && (
                            <p className="text-xs text-slate-400 italic text-center py-4">No hi ha funcions definides.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
