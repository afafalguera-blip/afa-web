import { useEffect, useState } from "react";
import { ConfigService, type ContactConfig, type SocialConfig, type AboutConfig, type LegalConfig, type ShopConfig, type FeesConfig, type PricingConfig, type BrandingConfig, type AnalyticsConfig, type HomepageConfig } from "../../services/ConfigService";
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
    ShoppingBag,
    CreditCard,
    Palette,
    LayoutDashboard,
    BarChart3
} from "lucide-react";
import { ContactSettings } from "./settings/ContactSettings";
import { SocialSettings } from "./settings/SocialSettings";
import { AboutSettings } from "./settings/AboutSettings";
import { LegalSettings } from "./settings/LegalSettings";
import { ShopSettings } from "./settings/ShopSettings";
import { FeesSettings } from "./settings/FeesSettings";
import { BrandingSettings } from "./settings/BrandingSettings";
import { HomepageSettings } from "./settings/HomepageSettings";
import { AnalyticsSettings } from "./settings/AnalyticsSettings";

type TabType = 'contact' | 'social' | 'about' | 'privacy' | 'cookies' | 'shop' | 'fees' | 'branding' | 'homepage' | 'analytics';
type LangType = 'ca' | 'es' | 'en';

export default function SiteSettingsManager() {
    const [activeTab, setActiveTab] = useState<TabType>('contact');
    const [contact, setContact] = useState<ContactConfig | null>(null);
    const [social, setSocial] = useState<SocialConfig | null>(null);
    const [about, setAbout] = useState<AboutConfig | null>(null);
    const [privacy, setPrivacy] = useState<LegalConfig | null>(null);
    const [cookies, setCookies] = useState<LegalConfig | null>(null);
    const [shop, setShop] = useState<ShopConfig | null>(null);
    const [fees, setFees] = useState<FeesConfig | null>(null);
    const [pricing, setPricing] = useState<PricingConfig | null>(null);
    const [branding, setBranding] = useState<BrandingConfig | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsConfig | null>(null);
    const [homepage, setHomepage] = useState<HomepageConfig | null>(null);


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
            const [contactData, socialData, aboutData, privacyData, cookiesData, shopData, feesData, pricingData, brandingData, analyticsData, homepageData] = await Promise.all([
                ConfigService.getContactConfig(),
                ConfigService.getSocialConfig(),
                ConfigService.getAboutConfig(),
                ConfigService.getPrivacyConfig(),
                ConfigService.getCookiesConfig(),
                ConfigService.getShopConfig(),
                ConfigService.getFeesConfig(),
                ConfigService.getPricingConfig(),
                ConfigService.getBrandingConfig(),
                ConfigService.getAnalyticsConfig(),
                ConfigService.getHomepageConfig()
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
            if (feesData) setFees(feesData);
            if (pricingData) setPricing(pricingData);
            if (brandingData) setBranding(brandingData);
            if (analyticsData) setAnalytics(analyticsData);
            if (homepageData) setHomepage(homepageData);

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
            } else if (activeTab === 'fees' && fees && pricing) {
                await Promise.all([
                    ConfigService.updateFeesConfig(fees),
                    ConfigService.updatePricingConfig(pricing)
                ]);
            } else if (activeTab === 'branding' && branding) {
                await ConfigService.updateBrandingConfig(branding);
            } else if (activeTab === 'homepage' && homepage) {
                await ConfigService.updateHomepageConfig(homepage);
            } else if (activeTab === 'analytics' && analytics) {
                await ConfigService.updateAnalyticsConfig(analytics);
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
            <div className="flex flex-wrap p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl mb-8 gap-1">
                {([
                    { id: 'contact' as TabType, icon: Mail, label: 'Contacte' },
                    { id: 'social' as TabType, icon: Instagram, label: 'Xarxes' },
                    { id: 'about' as TabType, icon: Info, label: "Sobre l'AFA" },
                    { id: 'fees' as TabType, icon: CreditCard, label: 'Quotes' },
                    { id: 'branding' as TabType, icon: Palette, label: 'Marca' },
                    { id: 'homepage' as TabType, icon: LayoutDashboard, label: 'Home' },
                    { id: 'analytics' as TabType, icon: BarChart3, label: 'Analytics' },
                    { id: 'privacy' as TabType, icon: FileLock2, label: 'Privacitat' },
                    { id: 'cookies' as TabType, icon: Cookie, label: 'Cookies' },
                    { id: 'shop' as TabType, icon: ShoppingBag, label: 'Botiga' },
                ]).map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === id
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        <Icon size={16} /> {label}
                    </button>
                ))}
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

                {activeTab === 'fees' && fees && pricing && (
                    <FeesSettings
                        fees={fees}
                        setFees={setFees}
                        pricing={pricing}
                        setPricing={setPricing}
                        activeLang={activeLang}
                        setActiveLang={setActiveLang}
                    />
                )}

                {activeTab === 'branding' && branding && (
                    <BrandingSettings
                        branding={branding}
                        setBranding={setBranding}
                        activeLang={activeLang}
                        setActiveLang={setActiveLang}
                    />
                )}

                {activeTab === 'homepage' && homepage && (
                    <HomepageSettings
                        homepage={homepage}
                        setHomepage={setHomepage}
                    />
                )}

                {activeTab === 'analytics' && analytics && (
                    <AnalyticsSettings
                        analytics={analytics}
                        setAnalytics={setAnalytics}
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
                                Guardar Canvis de {{ contact: 'Contacte', social: 'Xarxes', about: "Sobre l'AFA", privacy: 'Privacitat', cookies: 'Cookies', shop: 'Botiga', fees: 'Quotes', branding: 'Marca', homepage: 'Home', analytics: 'Analytics' }[activeTab]}
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
