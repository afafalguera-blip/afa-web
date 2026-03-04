import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle2, Languages, Plus, Trash2 } from 'lucide-react';
import { ConfigService, type AboutConfig } from '../../services/ConfigService';

interface AboutSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: AboutConfig | null;
    onUpdate: (newConfig: AboutConfig) => void;
}

type LangCode = 'ca' | 'es' | 'en';

export function AboutSettingsModal({ isOpen, onClose, currentConfig, onUpdate }: AboutSettingsModalProps) {
    const [activeLang, setActiveLang] = useState<LangCode>('ca');
    const [translations, setTranslations] = useState<Required<AboutConfig>['translations']>({
        ca: { text: '', functions: [] },
        es: { text: '', functions: [] },
        en: { text: '', functions: [] }
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (currentConfig?.translations) {
            setTranslations(currentConfig.translations);
        } else if (currentConfig) {
            // Migration for old structure if it exists
            const oldConfig = currentConfig as AboutConfig & { text?: string; functions?: string[] };
            setTranslations({
                ca: { text: oldConfig.text || '', functions: oldConfig.functions || [] },
                es: { text: oldConfig.text || '', functions: oldConfig.functions || [] },
                en: { text: oldConfig.text || '', functions: oldConfig.functions || [] }
            });
        }
    }, [currentConfig, isOpen]);

    if (!isOpen) return null;

    const handleTextChange = (value: string) => {
        setTranslations(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [activeLang]: { ...prev[activeLang], text: value }
            };
        });
    };

    const handleFunctionChange = (index: number, value: string) => {
        setTranslations(prev => {
            if (!prev) return prev;
            const newFunctions = [...prev[activeLang].functions];
            newFunctions[index] = value;
            return {
                ...prev,
                [activeLang]: { ...prev[activeLang], functions: newFunctions }
            };
        });
    };

    const addFunction = () => {
        setTranslations(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [activeLang]: {
                    ...prev[activeLang],
                    functions: [...prev[activeLang].functions, '']
                }
            };
        });
    };

    const removeFunction = (index: number) => {
        setTranslations(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [activeLang]: {
                    ...prev[activeLang],
                    functions: prev[activeLang].functions.filter((_, i) => i !== index)
                }
            };
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const newConfig: AboutConfig = { translations };
            await ConfigService.updateAboutConfig(newConfig);
            onUpdate(newConfig);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);
        } catch (err) {
            const error = err as Error;
            console.error(error);
            setError(error.message || "Error al guardar la configuració");
        } finally {
            setSaving(false);
        }
    };

    const langTabs: { code: LangCode; label: string }[] = [
        { code: 'ca', label: 'Català' },
        { code: 'es', label: 'Castellano' },
        { code: 'en', label: 'English' }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Configuració "Què fa l'AFA?"
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 m-6 mb-0 rounded-2xl shrink-0">
                    {langTabs.map((tab) => (
                        <button
                            key={tab.code}
                            onClick={() => setActiveLang(tab.code)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${activeLang === tab.code
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Languages size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSave} className="p-6 pt-4 space-y-6 overflow-y-auto">
                    <div className="space-y-2 text-left">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                            Text de presentació ({activeLang.toUpperCase()})
                        </label>
                        <textarea
                            value={translations[activeLang].text}
                            onChange={(e) => handleTextChange(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all font-medium resize-none text-sm"
                            placeholder="Escriu aquí la descripció de l'AFA..."
                        />
                    </div>

                    <div className="space-y-4 text-left">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                                Funcions principals ({activeLang.toUpperCase()})
                            </label>
                            <button
                                type="button"
                                onClick={addFunction}
                                className="text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1"
                            >
                                <Plus size={14} />
                                Afegir funció
                            </button>
                        </div>

                        <div className="space-y-3">
                            {translations[activeLang].functions.map((func, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={func}
                                        onChange={(e) => handleFunctionChange(index, e.target.value)}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all font-medium text-sm"
                                        placeholder={`Funció ${index + 1}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeFunction(index)}
                                        className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shrink-0"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {translations[activeLang].functions.length === 0 && (
                                <p className="text-center py-4 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    No hi ha funcions definides per a aquest idioma.
                                </p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-sm">
                            <AlertCircle size={16} />
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center gap-2 text-sm">
                            <CheckCircle2 size={16} />
                            <p>Configuració guardada correctament!</p>
                        </div>
                    )}
                </form>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel·lar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Save size={18} />
                                Guardar Canvis
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
