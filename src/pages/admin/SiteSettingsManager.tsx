import { useEffect, useState } from "react";
import { ConfigService, type ContactConfig, type SocialConfig, type AboutConfig, type LegalConfig } from "../../services/ConfigService";
import {
    Save,
    Mail,
    Phone,
    MapPin,
    Clock,
    Instagram,
    Twitter,
    Facebook,
    Info,
    AlertCircle,
    CheckCircle2,
    Settings,
    HelpCircle,
    X,
    FileLock2,
    Cookie,
    Globe
} from "lucide-react";

type TabType = 'contact' | 'social' | 'about' | 'privacy' | 'cookies';
type LangType = 'ca' | 'es' | 'en';

export default function SiteSettingsManager() {
    const [activeTab, setActiveTab] = useState<TabType>('contact');
    const [contact, setContact] = useState<ContactConfig | null>(null);
    const [social, setSocial] = useState<SocialConfig | null>(null);
    const [about, setAbout] = useState<AboutConfig | null>(null);
    const [privacy, setPrivacy] = useState<LegalConfig | null>(null);
    const [cookies, setCookies] = useState<LegalConfig | null>(null);

    const [activeLang, setActiveLang] = useState<LangType>('ca');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const [contactData, socialData, aboutData, privacyData, cookiesData] = await Promise.all([
                ConfigService.getContactConfig(),
                ConfigService.getSocialConfig(),
                ConfigService.getAboutConfig(),
                ConfigService.getPrivacyConfig(),
                ConfigService.getCookiesConfig()
            ]);

            if (contactData) setContact(contactData);
            if (socialData) setSocial(socialData);
            if (aboutData) setAbout(aboutData);
            if (privacyData) setPrivacy(privacyData);
            if (cookiesData) setCookies(cookiesData);
        } catch (err) {
            console.error(err);
            setError("Error al carregar la configuració del lloc");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);
        setError(null);

        try {
            if (activeTab === 'contact' && contact) {
                await ConfigService.updateContactConfig(contact);
            } else if (activeTab === 'social' && social) {
                await ConfigService.updateSocialConfig(social);
            } else if (activeTab === 'about' && about) {
                await ConfigService.updateAboutConfig(about);
            } else if (activeTab === 'privacy' && privacy) {
                await ConfigService.updatePrivacyConfig(privacy);
            } else if (activeTab === 'cookies' && cookies) {
                await ConfigService.updateCookiesConfig(cookies);
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setError("Error al guardar els canvis");
        } finally {
            setSaving(false);
        }
    };

    const handleAboutFunctionChange = (index: number, value: string) => {
        if (!about) return;
        const newFunctions = [...about.functions];
        newFunctions[index] = value;
        setAbout({ ...about, functions: newFunctions });
    };

    const addAboutFunction = () => {
        if (!about) return;
        setAbout({ ...about, functions: [...about.functions, ""] });
    };

    const removeAboutFunction = (index: number) => {
        if (!about) return;
        const newFunctions = about.functions.filter((_, i) => i !== index);
        setAbout({ ...about, functions: newFunctions });
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <Settings className="text-primary w-8 h-8" />
                        Configuració del Lloc
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Personalitza la informació global de l'AFA sense tocar codi.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl mb-8 w-fit">
                <button
                    onClick={() => setActiveTab('contact')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'contact'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Mail size={16} /> Contacte
                </button>
                <button
                    onClick={() => setActiveTab('social')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'social'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Instagram size={16} /> Xarxes Socials
                </button>
                <button
                    onClick={() => setActiveTab('about')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'about'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Info size={16} /> Sobre l'AFA
                </button>
                <button
                    onClick={() => setActiveTab('privacy')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'privacy'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <FileLock2 size={16} /> Privacitat
                </button>
                <button
                    onClick={() => setActiveTab('cookies')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'cookies'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Cookie size={16} /> Cookies
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {activeTab === 'contact' && contact && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-50 dark:border-slate-700 pb-4">
                            Dades de Contacte Principal
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email Oficial</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        value={contact.email}
                                        onChange={(e) => setContact({ ...contact, email: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Telèfon (Opcional)</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={contact.phone}
                                        onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="Ex: 933 00 00 00"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Direcció Física</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={contact.address}
                                        onChange={(e) => setContact({ ...contact, address: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Horari d'Atenció</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={contact.schedule}
                                        onChange={(e) => setContact({ ...contact, schedule: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Informació adicional horari / localització</label>
                                <textarea
                                    value={contact.schedule_info}
                                    onChange={(e) => setContact({ ...contact, schedule_info: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'social' && social && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-50 dark:border-slate-700 pb-4">
                            Xarxes Socials
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Instagram</label>
                                <div className="relative">
                                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={18} />
                                    <input
                                        type="url"
                                        value={social.instagram}
                                        onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Twitter / X (Opcional)</label>
                                <div className="relative">
                                    <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-500" size={18} />
                                    <input
                                        type="url"
                                        value={social.twitter}
                                        onChange={(e) => setSocial({ ...social, twitter: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="https://twitter.com/..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Facebook (Opcional)</label>
                                <div className="relative">
                                    <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                                    <input
                                        type="url"
                                        value={social.facebook}
                                        onChange={(e) => setSocial({ ...social, facebook: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all"
                                        placeholder="https://facebook.com/..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'about' && about && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-50 dark:border-slate-700 pb-4">
                            Informació Corporativa (Sobre l'AFA)
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Descripció Principal (Qui som)</label>
                                <textarea
                                    required
                                    value={about.text}
                                    onChange={(e) => setAbout({ ...about, text: e.target.value })}
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
                                    {about.functions.map((func, index) => (
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
                                    {about.functions.length === 0 && (
                                        <p className="text-xs text-slate-400 italic text-center py-4">No hi ha funcions definides.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(activeTab === 'privacy' || activeTab === 'cookies') && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-700 pb-4 mb-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {activeTab === 'privacy' ? 'Política de Privacitat' : 'Política de Cookies'}
                            </h3>

                            {/* Language Switcher */}
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
                                {(['ca', 'es', 'en'] as LangType[]).map((lang) => (
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

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20 mb-4">
                                <Globe size={18} />
                                <p className="text-xs font-medium">Estàs editant la versió en <span className="font-bold underline">{activeLang === 'ca' ? 'Català' : activeLang === 'es' ? 'Castellà' : 'Anglès'}</span></p>
                            </div>

                            <textarea
                                required
                                value={activeTab === 'privacy' ? (privacy?.[activeLang] || '') : (cookies?.[activeLang] || '')}
                                onChange={(e) => {
                                    if (activeTab === 'privacy' && privacy) {
                                        setPrivacy({ ...privacy, [activeLang]: e.target.value });
                                    } else if (activeTab === 'cookies' && cookies) {
                                        setCookies({ ...cookies, [activeLang]: e.target.value });
                                    }
                                }}
                                rows={15}
                                className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all text-sm leading-relaxed font-mono"
                                placeholder={`Escriu aquí el text de la política en ${activeLang === 'ca' ? 'català' : activeLang === 'es' ? 'castellà' : 'anglès'}...`}
                            />

                            <p className="text-[10px] text-slate-400 italic">
                                * Pots fer servir salts de línia per separar paràgrafs. El contingut s'actualitzarà a la web quan l'usuari canviï d'idioma.
                            </p>
                        </div>
                    </div>
                )}

                {/* Feedback Messages */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl animate-shake">
                        <AlertCircle size={20} />
                        <p className="font-medium text-sm">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-3 p-4 bg-green-100 border border-green-200 text-green-700 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 size={20} />
                        <p className="font-medium text-sm">Configuració guardada correctament!</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 items-center pt-4">
                    <button
                        disabled={saving}
                        type="submit"
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Save size={20} />
                                Guardar Canvis de {activeTab === 'contact' ? 'Contacte' : activeTab === 'social' ? 'Xarxes' : activeTab === 'about' ? 'Sobre l\'AFA' : activeTab === 'privacy' ? 'Privacitat' : 'Cookies'}
                            </>
                        )}
                    </button>
                    <div className="hidden md:flex items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <HelpCircle size={18} />
                        <p className="text-xs">Els canvis s'aplicaran a tota la web pública instantàniament.</p>
                    </div>
                </div>
            </form>
        </div>
    );
}
