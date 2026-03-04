import { useEffect, useState } from "react";
import { ConfigService, type ContactConfig, type SocialConfig, type AboutConfig, type LegalConfig, type ShopConfig } from "../../services/ConfigService";
import {
    Save,
    Settings,
    HelpCircle,
    AlertCircle,
    CheckCircle2,
    Mail,
    Instagram,
    Info,
    FileLock2,
    Cookie,
    ShoppingBag
} from "lucide-react";
import { ContactSettings } from "./settings/ContactSettings";
import { SocialSettings } from "./settings/SocialSettings";
import { AboutSettings } from "./settings/AboutSettings";
import { LegalSettings } from "./settings/LegalSettings";
import { ShopSettings } from "./settings/ShopSettings";

type TabType = 'contact' | 'social' | 'about' | 'privacy' | 'cookies' | 'shop';
type LangType = 'ca' | 'es' | 'en';

export default function SiteSettingsManager() {
    const [activeTab, setActiveTab] = useState<TabType>('contact');
    const [contact, setContact] = useState<ContactConfig | null>(null);
    const [social, setSocial] = useState<SocialConfig | null>(null);
    const [about, setAbout] = useState<AboutConfig | null>(null);
    const [privacy, setPrivacy] = useState<LegalConfig | null>(null);
    const [cookies, setCookies] = useState<LegalConfig | null>(null);
    const [shop, setShop] = useState<ShopConfig | null>(null);


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
            const [contactData, socialData, aboutData, privacyData, cookiesData, shopData] = await Promise.all([
                ConfigService.getContactConfig(),
                ConfigService.getSocialConfig(),
                ConfigService.getAboutConfig(),
                ConfigService.getPrivacyConfig(),
                ConfigService.getCookiesConfig(),
                ConfigService.getShopConfig()
            ]);

            if (contactData) setContact(contactData);
            if (socialData) setSocial(socialData);
            if (aboutData) {
                // Ensure translations exists for the About section
                if (!aboutData.translations) {
                    const legacy = aboutData as unknown as { text?: string; functions?: string[] };
                    setAbout({
                        translations: {
                            ca: { text: legacy.text || '', functions: legacy.functions || [] },
                            es: { text: legacy.text || '', functions: legacy.functions || [] },
                            en: { text: legacy.text || '', functions: legacy.functions || [] }
                        }
                    });
                } else {
                    setAbout(aboutData);
                }
            }
            if (privacyData) setPrivacy(privacyData);
            if (cookiesData) setCookies(cookiesData);
            if (shopData) setShop(shopData);

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
            } else if (activeTab === 'shop' && shop) {
                await ConfigService.updateShopConfig(shop);
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
                <button
                    onClick={() => setActiveTab('shop')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'shop'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <ShoppingBag size={16} /> Botiga
                </button>
            </div>


            <form onSubmit={handleSave} className="space-y-6">
                {activeTab === 'contact' && contact && (
                    <ContactSettings contact={contact} setContact={setContact} />
                )}

                {activeTab === 'social' && social && (
                    <SocialSettings social={social} setSocial={setSocial} />
                )}

                {activeTab === 'about' && about && (
                    <AboutSettings
                        about={about}
                        setAbout={setAbout}
                        activeLang={activeLang}
                        setActiveLang={setActiveLang}
                    />
                )}

                {activeTab === 'privacy' && privacy && (
                    <LegalSettings
                        title="Política de Privacitat"
                        config={privacy}
                        setConfig={setPrivacy}
                        activeLang={activeLang}
                        setActiveLang={setActiveLang}
                    />
                )}

                {activeTab === 'cookies' && cookies && (
                    <LegalSettings
                        title="Política de Cookies"
                        config={cookies}
                        setConfig={setCookies}
                        activeLang={activeLang}
                        setActiveLang={setActiveLang}
                    />
                )}

                {activeTab === 'shop' && shop && (
                    <ShopSettings
                        shop={shop}
                        setShop={setShop}
                        activeLang={activeLang}
                        setActiveLang={setActiveLang}
                    />
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
                                Guardar Canvis de {activeTab === 'contact' ? 'Contacte' : activeTab === 'social' ? 'Xarxes' : activeTab === 'about' ? 'Sobre l\'AFA' : activeTab === 'privacy' ? 'Privacitat' : activeTab === 'cookies' ? 'Cookies' : 'Botiga'}
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
