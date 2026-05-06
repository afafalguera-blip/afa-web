import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Utensils, Clock, AlertTriangle, Salad, ListChecks, MessageCircle, FileText, Download, ChefHat } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { MenjadorService, type MenjadorMenu, type MenjadorRate } from '../services/MenjadorService';
import { ConfigService, type MenjadorInfoBlock, type MenjadorInfoConfig } from '../services/ConfigService';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { proxyStorageUrl } from '../utils/storageUrl';

const MONTH_KEYS = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
];

function formatBytes(bytes: number | null | undefined): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Tab = 'menus' | 'prices' | 'info';

export default function MenjadorPage() {
    const { t, i18n } = useTranslation();
    const { tContent } = useContentTranslation();
    const lang = (i18n.language?.split('-')[0] ?? 'ca') as 'ca' | 'es' | 'en';

    const [info, setInfo] = useState<MenjadorInfoBlock | null>(null);
    const [rates, setRates] = useState<MenjadorRate[]>([]);
    const [menus, setMenus] = useState<MenjadorMenu[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('menus');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [config, ratesData, menusData] = await Promise.all([
                    ConfigService.getMenjadorInfoConfig(),
                    MenjadorService.getRates(),
                    MenjadorService.getActiveMenus(),
                ]);
                if (cancelled) return;
                setInfo(pickInfoBlock(config, lang));
                setRates(ratesData);
                setMenus(menusData);
            } catch (err) {
                console.error('Error loading menjador page:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [lang]);

    const fix = rates.filter(r => r.rate_type === 'fix');
    const esporadic = rates.filter(r => r.rate_type === 'esporadic');

    const formatPeriod = (month: number | null, year: number | null): string => {
        if (!month && !year) return t('menjador_page.no_period');
        const monthName = month ? t(`months.${MONTH_KEYS[month - 1]}` as 'months.january') : '';
        if (month && year) return `${capitalize(monthName)} ${year}`;
        if (year) return String(year);
        return capitalize(monthName);
    };

    return (
        <>
            <SEO
                title={t('menjador_page.seo_title', 'Servei de Menjador')}
                description={t('menjador_page.seo_description', 'Tota la informació sobre el servei de menjador escolar: horaris, preus per a alumnat fix i esporàdic, i menús mensuals descarregables.')}
            />

            <div className="max-w-5xl mx-auto px-4 pt-4 pb-20 space-y-10">
                {/* Header */}
                <header className="text-center space-y-4 pt-4">
                    <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-full">
                        <Utensils className="w-8 h-8 text-amber-600" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {t('menjador_page.title', 'Servei de Menjador')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                        {t('menjador_page.subtitle', 'Horaris, preus i menús del servei de menjador escolar.')}
                    </p>
                </header>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                    </div>
                )}

                {!loading && (
                    <>
                        {/* Tabs */}
                        <nav className="flex justify-center">
                            <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 gap-1">
                                <TabButton active={tab === 'menus'} onClick={() => setTab('menus')} icon={<FileText className="w-4 h-4" />} label={t('menjador_page.tab_menus', 'Menús')} />
                                <TabButton active={tab === 'prices'} onClick={() => setTab('prices')} icon={<span className="material-icons-round text-base">payments</span>} label={t('menjador_page.tab_prices', 'Preus')} />
                                <TabButton active={tab === 'info'} onClick={() => setTab('info')} icon={<ListChecks className="w-4 h-4" />} label={t('menjador_page.tab_info', 'Informació')} />
                            </div>
                        </nav>

                        {/* MENUS */}
                        {tab === 'menus' && (
                            <section className="space-y-4">
                                <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                                    {t('menjador_page.menus_subtitle', 'Descarrega els menús mensuals en PDF.')}
                                </p>
                                {menus.length === 0 ? (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-10 text-center border border-dashed border-slate-200 dark:border-slate-700">
                                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">
                                            {t('menjador_page.no_menus', 'Encara no hi ha menús publicats.')}
                                        </p>
                                    </div>
                                ) : (
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {menus.map(menu => (
                                            <li key={menu.id}>
                                                <a
                                                    href={proxyStorageUrl(menu.file_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group"
                                                >
                                                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{menu.title}</p>
                                                        <p className="text-xs text-slate-500 truncate">
                                                            {formatPeriod(menu.month, menu.year)}
                                                            {menu.size_bytes ? ` · ${formatBytes(menu.size_bytes)}` : ''}
                                                        </p>
                                                    </div>
                                                    <Download className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors shrink-0" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {/* PRICES */}
                        {tab === 'prices' && (
                            <section className="space-y-4">
                                <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                                    {t('menjador_page.prices_subtitle', 'Es distingeix entre alumnat fix (mig mes o més + 1 dia) i alumnat esporàdic (dies solts).')}
                                </p>
                                {fix.length === 0 && esporadic.length === 0 ? (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-10 text-center border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-slate-500 text-sm">
                                            {t('menjador_page.no_rates', 'Sense tarifes configurades')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <RatesCard
                                            title={t('menjador_page.fix_title', 'Alumnat fix')}
                                            subtitle={t('menjador_page.fix_subtitle', 'Mig mes o més + 1 dia')}
                                            rates={fix}
                                            accent="amber"
                                            memberLabel={t('menjador_page.price_member', 'Soci')}
                                            nonMemberLabel={t('menjador_page.price_non_member', 'No soci')}
                                            empty={t('menjador_page.no_rates', 'Sense tarifes configurades')}
                                            tContent={tContent}
                                        />
                                        <RatesCard
                                            title={t('menjador_page.esporadic_title', 'Alumnat esporàdic')}
                                            subtitle={t('menjador_page.esporadic_subtitle', 'Dies solts')}
                                            rates={esporadic}
                                            accent="indigo"
                                            memberLabel={t('menjador_page.price_member', 'Soci')}
                                            nonMemberLabel={t('menjador_page.price_non_member', 'No soci')}
                                            empty={t('menjador_page.no_rates', 'Sense tarifes configurades')}
                                            tContent={tContent}
                                        />
                                    </div>
                                )}
                            </section>
                        )}

                        {/* INFO */}
                        {tab === 'info' && (
                            <section className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
                                {info?.intro && (
                                    <div className="p-6 md:p-8">
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base md:text-lg">
                                            {info.intro}
                                        </p>
                                    </div>
                                )}
                                {info?.schedule && <InfoRow icon={<Clock className="w-5 h-5 text-amber-600" />} title={t('menjador_page.schedule_title', 'Horari')} body={info.schedule} />}
                                {info?.company && <InfoRow icon={<ChefHat className="w-5 h-5 text-emerald-600" />} title={t('menjador_page.company_title', 'Empresa proveïdora')} body={info.company} />}
                                {info?.how_to && <InfoRow icon={<ListChecks className="w-5 h-5 text-indigo-600" />} title={t('menjador_page.how_to_title', 'Com s\'utilitza')} body={info.how_to} />}
                                {info?.diets && <InfoRow icon={<Salad className="w-5 h-5 text-lime-600" />} title={t('menjador_page.diets_title', 'Dietes especials')} body={info.diets} />}
                                {info?.allergies && <InfoRow icon={<AlertTriangle className="w-5 h-5 text-rose-600" />} title={t('menjador_page.allergies_title', 'Al·lèrgies i intoleràncies')} body={info.allergies} />}
                                {info?.contact && <InfoRow icon={<MessageCircle className="w-5 h-5 text-blue-600" />} title={t('menjador_page.contact_title', 'Contacte')} body={info.contact} />}
                                {!info && (
                                    <div className="p-10 text-center text-slate-400 text-sm">
                                        {t('menjador_page.no_info', 'Sense informació configurada.')}
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

function pickInfoBlock(config: MenjadorInfoConfig | null, lang: 'ca' | 'es' | 'en'): MenjadorInfoBlock | null {
    if (!config?.translations) return null;
    return config.translations[lang] || config.translations.ca || config.translations.es || null;
}

function capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                active
                    ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
            aria-pressed={active}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

interface InfoRowProps {
    icon: React.ReactNode;
    title: string;
    body: string;
}

function InfoRow({ icon, title, body }: InfoRowProps) {
    return (
        <div className="flex gap-4 p-5 md:p-6">
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider mb-1">{title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-line">{body}</p>
            </div>
        </div>
    );
}

interface RatesCardProps {
    title: string;
    subtitle: string;
    rates: MenjadorRate[];
    accent: 'amber' | 'indigo';
    memberLabel: string;
    nonMemberLabel: string;
    empty: string;
    tContent: <T>(item: T, field: string) => string;
}

function RatesCard({ title, subtitle, rates, accent, memberLabel, nonMemberLabel, empty, tContent }: RatesCardProps) {
    const headerBg = accent === 'amber' ? 'bg-amber-500' : 'bg-indigo-500';
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className={`${headerBg} text-white p-5`}>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-white/80 text-xs">{subtitle}</p>
            </div>
            <div className="p-5 space-y-4">
                {rates.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">{empty}</p>
                ) : (
                    rates.map(rate => {
                        const label = tContent(rate, 'label');
                        const note = tContent(rate, 'note');
                        return (
                            <div key={rate.id} className="border-t first:border-t-0 border-slate-100 dark:border-slate-700 pt-4 first:pt-0">
                                {label && <p className="font-bold text-slate-800 dark:text-white text-sm mb-2">{label}</p>}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{memberLabel}</p>
                                        <p className="text-xl font-black text-slate-800 dark:text-white">{rate.preu_soci}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{nonMemberLabel}</p>
                                        <p className="text-xl font-black text-slate-800 dark:text-white">{rate.preu_no_soci}</p>
                                    </div>
                                </div>
                                {note && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">{note}</p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
