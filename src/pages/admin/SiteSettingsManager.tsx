import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
    Save,
    Settings,
    HelpCircle,
    Loader2,
    Mail,
    Instagram,
    Info,
    FileLock2,
    Cookie,
    ShoppingBag,
    CreditCard,
    Palette,
    LayoutDashboard,
    BarChart3,
    KeyRound,
    CalendarRange,
    Coins,
    BookOpen
} from "lucide-react";
import { ConfigService, type ContactConfig, type SocialConfig, type AboutConfig, type LegalConfig, type ShopConfig, type FeesConfig, type PricingConfig, type BrandingConfig, type AnalyticsConfig, type HomepageConfig, type HeroConfig } from "../../services/ConfigService";
import { ContactSettings } from "./settings/ContactSettings";
import { SocialSettings } from "./settings/SocialSettings";
import { AboutSettings } from "./settings/AboutSettings";
import { LegalSettings } from "./settings/LegalSettings";
import { ShopSettings } from "./settings/ShopSettings";
import { FeesSettings } from "./settings/FeesSettings";
import { BrandingSettings } from "./settings/BrandingSettings";
import { HomepageSettings } from "./settings/HomepageSettings";
import { AnalyticsSettings } from "./settings/AnalyticsSettings";
import AiKeysSettings from "./settings/AiKeysSettings";
import SeasonSettings from "./settings/SeasonSettings";
import FeeRulesSettings from "./settings/FeeRulesSettings";
import BooksSettings from "./settings/BooksSettings";
import { useSettingsT } from "./settings/useSettingsT";
import { AdminPageHeader } from "../../components/admin/common/AdminPageHeader";
import { useToast } from "../../components/common/Toast";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";
import { invalidateBrandingCache } from "../../hooks/useBranding";
import { invalidateHomepageCache } from "../../hooks/useHomepageConfig";

type TabId =
    | 'fees' | 'fee-rules' | 'books'
    | 'season'
    | 'contact' | 'social' | 'about' | 'homepage' | 'branding'
    | 'privacy' | 'cookies' | 'shop'
    | 'analytics' | 'ai-keys';

type LangType = 'ca' | 'es' | 'en';

interface TabDef {
    id: TabId;
    icon: LucideIcon;
    labelKey: string;
    labelDefault: string;
    /**
     * The panel owns its own save button, feedback and data loading. The page
     * renders no footer for it (replaces the repeated `activeTab !== ...` chains).
     */
    selfManaged?: boolean;
}

interface TabGroup {
    id: string;
    labelKey: string;
    labelDefault: string;
    tabs: TabDef[];
}

/**
 * Settings are grouped so that every money-related screen sits together under
 * "Quotes i preus" — previously two unrelated tabs were both labelled "Quotes".
 */
const TAB_GROUPS: TabGroup[] = [
    {
        id: 'prices',
        labelKey: 'admin.settings.groups.prices',
        labelDefault: 'Quotes i preus',
        tabs: [
            { id: 'fees', icon: CreditCard, labelKey: 'admin.settings.tabs.fees', labelDefault: 'Quota anual i banc' },
            { id: 'fee-rules', icon: Coins, labelKey: 'admin.settings.tabs.fee_rules', labelDefault: 'Quota mensual activitats', selfManaged: true },
            { id: 'books', icon: BookOpen, labelKey: 'admin.settings.tabs.books', labelDefault: 'Llibres', selfManaged: true }
        ]
    },
    {
        id: 'season',
        labelKey: 'admin.settings.groups.season',
        labelDefault: 'Curs escolar',
        tabs: [
            { id: 'season', icon: CalendarRange, labelKey: 'admin.settings.tabs.season', labelDefault: 'Curs actiu', selfManaged: true }
        ]
    },
    {
        id: 'content',
        labelKey: 'admin.settings.groups.content',
        labelDefault: 'Contingut del web',
        tabs: [
            { id: 'contact', icon: Mail, labelKey: 'admin.settings.tabs.contact', labelDefault: 'Contacte' },
            { id: 'social', icon: Instagram, labelKey: 'admin.settings.tabs.social', labelDefault: 'Xarxes' },
            { id: 'about', icon: Info, labelKey: 'admin.settings.tabs.about', labelDefault: "Sobre l'AFA" },
            { id: 'homepage', icon: LayoutDashboard, labelKey: 'admin.settings.tabs.homepage', labelDefault: 'Portada' },
            { id: 'branding', icon: Palette, labelKey: 'admin.settings.tabs.branding', labelDefault: 'Marca' }
        ]
    },
    {
        id: 'legal',
        labelKey: 'admin.settings.groups.legal',
        labelDefault: 'Legal i botiga',
        tabs: [
            { id: 'privacy', icon: FileLock2, labelKey: 'admin.settings.tabs.privacy', labelDefault: 'Privacitat' },
            { id: 'cookies', icon: Cookie, labelKey: 'admin.settings.tabs.cookies', labelDefault: 'Cookies' },
            { id: 'shop', icon: ShoppingBag, labelKey: 'admin.settings.tabs.shop', labelDefault: 'Botiga' }
        ]
    },
    {
        id: 'technical',
        labelKey: 'admin.settings.groups.technical',
        labelDefault: 'Tècnic',
        tabs: [
            { id: 'analytics', icon: BarChart3, labelKey: 'admin.settings.tabs.analytics', labelDefault: 'Analytics' },
            { id: 'ai-keys', icon: KeyRound, labelKey: 'admin.settings.tabs.ai_keys', labelDefault: 'Claus IA', selfManaged: true }
        ]
    }
];

const ALL_TABS: TabDef[] = TAB_GROUPS.flatMap((group) => group.tabs);
const TAB_BY_ID = Object.fromEntries(ALL_TABS.map((tab) => [tab.id, tab])) as Record<TabId, TabDef>;

/** Older rows stored `text`/`functions` at the root instead of per language. */
function normalizeAbout(data: AboutConfig): AboutConfig {
    if (data.translations) return data;
    const legacy = data as unknown as { text?: string; functions?: string[] };
    const block = { text: legacy.text || '', functions: legacy.functions || [] };
    return { translations: { ca: { ...block }, es: { ...block }, en: { ...block } } };
}

export default function SiteSettingsManager() {
    const t = useSettingsT();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<TabId>('fees');
    const [activeLang, setActiveLang] = useState<LangType>('ca');

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
    const [hero, setHero] = useState<HeroConfig | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const { confirmDiscard } = useDirtyGuard(dirty);

    // Tabs already fetched in this session — switching back must not refetch.
    const loadedTabs = useRef(new Set<TabId>());

    const loadTab = useCallback(async (tab: TabId) => {
        if (loadedTabs.current.has(tab)) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            switch (tab) {
                case 'contact': {
                    const data = await ConfigService.getContactConfig();
                    if (data) setContact(data);
                    break;
                }
                case 'social': {
                    const data = await ConfigService.getSocialConfig();
                    if (data) setSocial(data);
                    break;
                }
                case 'about': {
                    const data = await ConfigService.getAboutConfig();
                    if (data) setAbout(normalizeAbout(data));
                    break;
                }
                case 'privacy': {
                    const data = await ConfigService.getPrivacyConfig();
                    if (data) setPrivacy(data);
                    break;
                }
                case 'cookies': {
                    const data = await ConfigService.getCookiesConfig();
                    if (data) setCookies(data);
                    break;
                }
                case 'shop': {
                    const data = await ConfigService.getShopConfig();
                    if (data) setShop(data);
                    break;
                }
                case 'fees': {
                    const [feesData, pricingData] = await Promise.all([
                        ConfigService.getFeesConfig(),
                        ConfigService.getPricingConfig()
                    ]);
                    if (feesData) setFees(feesData);
                    if (pricingData) setPricing(pricingData);
                    break;
                }
                case 'branding': {
                    const data = await ConfigService.getBrandingConfig();
                    if (data) setBranding(data);
                    break;
                }
                case 'homepage': {
                    const [homepageData, heroData] = await Promise.all([
                        ConfigService.getHomepageConfig(),
                        ConfigService.getHeroConfig()
                    ]);
                    if (homepageData) setHomepage(homepageData);
                    if (heroData) setHero(heroData);
                    break;
                }
                case 'analytics': {
                    const data = await ConfigService.getAnalyticsConfig();
                    if (data) setAnalytics(data);
                    break;
                }
                default:
                    // Self-managed panels fetch their own data.
                    break;
            }
            loadedTabs.current.add(tab);
        } catch (err) {
            console.error(err);
            toast.error(t('admin.settings.load_error', 'Error al carregar la configuració del lloc'));
        } finally {
            setLoading(false);
        }
    }, [toast, t]);

    useEffect(() => {
        loadTab(activeTab);
    }, [activeTab, loadTab]);

    const handleTabChange = async (id: TabId) => {
        if (id === activeTab) return;
        if (!(await confirmDiscard())) return;
        setDirty(false);
        setActiveTab(id);
    };

    const handleRefresh = async () => {
        if (!(await confirmDiscard())) return;
        setDirty(false);
        loadedTabs.current.delete(activeTab);
        loadTab(activeTab);
    };

    /** Wraps a state setter so any panel edit flags the page as dirty. */
    const tracked = <T,>(setter: React.Dispatch<React.SetStateAction<T | null>>) => (value: T) => {
        setDirty(true);
        setter(value);
    };

    const activeDef = TAB_BY_ID[activeTab];

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (activeDef.selfManaged) return;
        setSaving(true);

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
                invalidateBrandingCache();
            } else if (activeTab === 'homepage' && homepage) {
                await Promise.all([
                    ConfigService.updateHomepageConfig(homepage),
                    ...(hero ? [ConfigService.updateHeroConfig(hero)] : [])
                ]);
                invalidateHomepageCache();
            } else if (activeTab === 'analytics' && analytics) {
                await ConfigService.updateAnalyticsConfig(analytics);
            }

            setDirty(false);
            toast.success(t('admin.settings.saved', 'Configuració guardada correctament'));
        } catch (err) {
            console.error(err);
            toast.error(t('admin.settings.save_error', 'Error al guardar els canvis'));
        } finally {
            setSaving(false);
        }
    };

    const panelId = `settings-panel-${activeTab}`;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <AdminPageHeader
                title={t('admin.settings.title', 'Configuració del lloc')}
                subtitle={t('admin.settings.subtitle', "Personalitza la informació global de l'AFA sense tocar codi.")}
                icon={Settings}
                loading={loading}
                onRefresh={handleRefresh}
            />

            {/* Grouped tabs: each group states what kind of setting it holds. */}
            <div className="rounded-lg border border-neutral-200 bg-white p-3 space-y-3">
                {TAB_GROUPS.map((group) => (
                    <div key={group.id}>
                        <p className="px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                            {t(group.labelKey, group.labelDefault)}
                        </p>
                        <div
                            role="tablist"
                            aria-label={t(group.labelKey, group.labelDefault)}
                            className="flex flex-wrap gap-1"
                        >
                            {group.tabs.map(({ id, icon: Icon, labelKey, labelDefault }) => {
                                const selected = activeTab === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="tab"
                                        aria-selected={selected}
                                        aria-controls={selected ? panelId : undefined}
                                        onClick={() => handleTabChange(id)}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-[13px] font-medium transition-colors ${selected
                                            ? 'bg-neutral-900 text-white'
                                            : 'text-neutral-600 hover:bg-neutral-100'
                                            }`}
                                    >
                                        <Icon size={15} aria-hidden="true" /> {t(labelKey, labelDefault)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSave} id={panelId} role="tabpanel" className="space-y-6">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'contact' && contact && (
                            <ContactSettings contact={contact} setContact={tracked(setContact)} />
                        )}

                        {activeTab === 'social' && social && (
                            <SocialSettings social={social} setSocial={tracked(setSocial)} />
                        )}

                        {activeTab === 'about' && about && (
                            <AboutSettings
                                about={about}
                                setAbout={tracked(setAbout)}
                                activeLang={activeLang}
                                setActiveLang={setActiveLang}
                            />
                        )}

                        {activeTab === 'privacy' && privacy && (
                            <LegalSettings
                                title={t('admin.settings.privacy_title', 'Política de privacitat')}
                                config={privacy}
                                setConfig={tracked(setPrivacy)}
                                activeLang={activeLang}
                                setActiveLang={setActiveLang}
                            />
                        )}

                        {activeTab === 'cookies' && cookies && (
                            <LegalSettings
                                title={t('admin.settings.cookies_title', 'Política de cookies')}
                                config={cookies}
                                setConfig={tracked(setCookies)}
                                activeLang={activeLang}
                                setActiveLang={setActiveLang}
                            />
                        )}

                        {activeTab === 'shop' && shop && (
                            <ShopSettings
                                shop={shop}
                                setShop={tracked(setShop)}
                                activeLang={activeLang}
                                setActiveLang={setActiveLang}
                            />
                        )}

                        {activeTab === 'fees' && fees && pricing && (
                            <FeesSettings
                                fees={fees}
                                setFees={tracked(setFees)}
                                pricing={pricing}
                                setPricing={tracked(setPricing)}
                                activeLang={activeLang}
                                setActiveLang={setActiveLang}
                            />
                        )}

                        {activeTab === 'branding' && branding && (
                            <BrandingSettings
                                branding={branding}
                                setBranding={tracked(setBranding)}
                                activeLang={activeLang}
                                setActiveLang={setActiveLang}
                            />
                        )}

                        {activeTab === 'homepage' && homepage && (
                            <HomepageSettings
                                homepage={homepage}
                                setHomepage={tracked(setHomepage)}
                                hero={hero}
                                setHero={tracked(setHero)}
                            />
                        )}

                        {activeTab === 'analytics' && analytics && (
                            <AnalyticsSettings
                                analytics={analytics}
                                setAnalytics={tracked(setAnalytics)}
                            />
                        )}

                        {activeTab === 'ai-keys' && <AiKeysSettings />}
                        {activeTab === 'season' && <SeasonSettings onDirtyChange={setDirty} />}
                        {activeTab === 'fee-rules' && <FeeRulesSettings onDirtyChange={setDirty} />}
                        {activeTab === 'books' && <BooksSettings onDirtyChange={setDirty} />}

                        {!activeDef.selfManaged && (
                            <div className="flex gap-4 items-center pt-2">
                                <button
                                    disabled={saving}
                                    type="submit"
                                    className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            {t('admin.settings.save_tab', 'Guardar canvis de')}{' '}
                                            {t(activeDef.labelKey, activeDef.labelDefault)}
                                        </>
                                    )}
                                </button>
                                <div className="hidden md:flex items-center gap-2 px-4 py-3 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-500">
                                    <HelpCircle size={16} aria-hidden="true" />
                                    <p className="text-xs">
                                        {t('admin.settings.instant_hint', "Els canvis s'apliquen a la web pública immediatament.")}
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </form>
        </div>
    );
}
