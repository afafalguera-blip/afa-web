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

export default function MenjadorPage() {
    const { t, i18n } = useTranslation();
    const { tContent } = useContentTranslation();
    const lang = (i18n.language?.split('-')[0] ?? 'ca') as 'ca' | 'es' | 'en';

    const [info, setInfo] = useState<MenjadorInfoBlock | null>(null);
    const [rates, setRates] = useState<MenjadorRate[]>([]);
    const [menus, setMenus] = useState<MenjadorMenu[]>([]);
    const [loading, setLoading] = useState(true);

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
                        {/* Intro */}
                        {info?.intro && (
                            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base md:text-lg">
                                    {info.intro}
                                </p>
                            </section>
                        )}

                        {/* Info grid */}
                        {info && (
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {info.schedule && (
                                    <InfoCard
                                        icon={<Clock className="w-5 h-5 text-amber-600" />}
                                        title={t('menjador_page.schedule_title', 'Horari')}
                                        body={info.schedule}
                                        accent="amber"
                                    />
                                )}
                                {info.company && (
                                    <InfoCard
                                        icon={<ChefHat className="w-5 h-5 text-emerald-600" />}
                                        title={t('menjador_page.company_title', 'Empresa proveïdora')}
                                        body={info.company}
                                        accent="emerald"
                                    />
                                )}
                                {info.diets && (
                                    <InfoCard
                                        icon={<Salad className="w-5 h-5 text-lime-600" />}
                                        title={t('menjador_page.diets_title', 'Dietes especials')}
                                        body={info.diets}
                                        accent="lime"
                                    />
                                )}
                                {info.allergies && (
                                    <InfoCard
                                        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
                                        title={t('menjador_page.allergies_title', 'Al·lèrgies i intoleràncies')}
                                        body={info.allergies}
                                        accent="rose"
                                    />
                                )}
                                {info.how_to && (
                                    <InfoCard
                                        icon={<ListChecks className="w-5 h-5 text-indigo-600" />}
                                        title={t('menjador_page.how_to_title', 'Com s\'utilitza')}
                                        body={info.how_to}
                                        accent="indigo"
                                        wide
                                    />
                                )}
                                {info.contact && (
                                    <InfoCard
                                        icon={<MessageCircle className="w-5 h-5 text-blue-600" />}
                                        title={t('menjador_page.contact_title', 'Contacte')}
                                        body={info.contact}
                                        accent="blue"
                                        wide={!info.how_to}
                                    />
                                )}
                            </section>
                        )}

                        {/* Prices */}
                        {(fix.length > 0 || esporadic.length > 0) && (
                            <section className="space-y-4">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="material-icons-round text-amber-600">payments</span>
                                    {t('menjador_page.prices_title', 'Preus')}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    {t('menjador_page.prices_subtitle', 'Es distingeix entre alumnat fix (mig mes o més + 1 dia) i alumnat esporàdic (dies solts).')}
                                </p>

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
                            </section>
                        )}

                        {/* Menus */}
                        <section className="space-y-4">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <FileText className="w-6 h-6 text-amber-600" />
                                        {t('menjador_page.menus_title', 'Menús')}
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                                        {t('menjador_page.menus_subtitle', 'Descarrega els menús mensuals en PDF.')}
                                    </p>
                                </div>
                            </div>

                            {menus.length === 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-700">
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

interface InfoCardProps {
    icon: React.ReactNode;
    title: string;
    body: string;
    accent: 'amber' | 'emerald' | 'lime' | 'rose' | 'indigo' | 'blue';
    wide?: boolean;
}

const ACCENT_BG: Record<InfoCardProps['accent'], string> = {
    amber: 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20',
    lime: 'bg-lime-50 dark:bg-lime-900/10 border-lime-100 dark:border-lime-900/20',
    rose: 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20',
};

function InfoCard({ icon, title, body, accent, wide }: InfoCardProps) {
    return (
        <div className={`rounded-3xl p-5 border ${ACCENT_BG[accent]} ${wide ? 'md:col-span-2' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider">{title}</h3>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">{body}</p>
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
