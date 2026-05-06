import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Clock, Users, Sparkles, Calendar, Info, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/common/SEO';
import { supabase } from '../lib/supabase';
import { useContentTranslation } from '../hooks/useContentTranslation';

interface AcollidaRate {
    id?: string;
    horari: string;
    horari_ca?: string;
    horari_es?: string;
    horari_en?: string;
    preu_soci_mes: string;
    preu_soci_ocasional: string | null;
    preu_no_soci_mes: string;
    preu_no_soci_ocasional: string | null;
    order_index?: number;
}

function pickIcon(horari: string) {
    const h = horari.toLowerCase();
    if (h.includes('17') || h.includes('tarda') || h.includes('tarde') || h.includes('afternoon') || h.includes('pm')) {
        return <Moon className="w-5 h-5" />;
    }
    return <Sun className="w-5 h-5" />;
}

export default function AcollidaPage() {
    const { t } = useTranslation();
    const { tContent } = useContentTranslation();
    const [rates, setRates] = useState<AcollidaRate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('acollida_rates')
                    .select('*')
                    .order('order_index', { ascending: true });
                if (error) throw error;
                if (!cancelled && data) setRates(data);
            } catch (err) {
                console.error('Error fetching acollida rates:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <>
            <SEO
                title={t('acollida_page.seo_title', "Servei d'Acollida")}
                description={t('acollida_page.seo_description', "Tota la informació sobre el servei d'acollida: horaris, tarifes per a socis i no socis, i opció ocasional.")}
            />

            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

                    {/* Hero */}
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-8 py-14 sm:px-12 sm:py-20 shadow-2xl">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15" />
                        <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10 max-w-3xl">
                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest rounded-full mb-5">
                                <Sparkles className="w-3.5 h-3.5" />
                                {t('acollida_page.eyebrow', 'Servei AFA')}
                            </span>
                            <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight">
                                {t('acollida_page.title', "Servei d'Acollida")}
                            </h1>
                            <p className="text-white/90 text-lg leading-relaxed">
                                {t('acollida_page.intro', "Espai segur i acompanyat abans i després de l'horari escolar perquè les famílies puguin conciliar amb tranquil·litat.")}
                            </p>
                        </div>
                    </div>

                    {/* Info cards */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard
                            icon={<Clock className="w-5 h-5" />}
                            title={t('acollida_page.info.schedule.title', 'Horaris flexibles')}
                            body={t('acollida_page.info.schedule.body', 'Disponibilitat al matí abans d\'entrar a classe i a la tarda en sortir, segons les necessitats de cada família.')}
                            accent="indigo"
                        />
                        <InfoCard
                            icon={<Users className="w-5 h-5" />}
                            title={t('acollida_page.info.team.title', 'Equip educatiu')}
                            body={t('acollida_page.info.team.body', 'Monitoratge titulat que acompanya l\'estona amb jocs, lectures i petites activitats adaptades a cada edat.')}
                            accent="violet"
                        />
                        <InfoCard
                            icon={<Calendar className="w-5 h-5" />}
                            title={t('acollida_page.info.flex.title', 'Mensual o ocasional')}
                            body={t('acollida_page.info.flex.body', 'Pots contractar el servei tot el mes o utilitzar-lo en dies puntuals quan ho necessitis.')}
                            accent="fuchsia"
                        />
                    </section>

                    {/* Rates */}
                    <section className="space-y-5">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                    {t('acollida_page.rates_title', 'Tarifes')}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    {t('acollida_page.rates_subtitle', 'Preus per a famílies sòcies i no sòcies de l\'AFA. Mensual o ocasional.')}
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                            </div>
                        ) : rates.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-10 text-center border border-dashed border-slate-200 dark:border-slate-700">
                                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">
                                    {t('acollida_page.no_rates', 'Encara no hi ha tarifes publicades.')}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {rates.map((rate, idx) => {
                                    const horari = tContent(rate, 'horari');
                                    return (
                                        <article
                                            key={rate.id ?? idx}
                                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
                                        >
                                            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-6 py-4 flex items-center gap-3">
                                                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                                    {pickIcon(horari)}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                                                        {t('acollida_page.timeslot', 'Franja horària')}
                                                    </p>
                                                    <p className="text-lg font-black leading-tight">{horari}</p>
                                                </div>
                                            </div>
                                            <div className="p-5 grid grid-cols-2 gap-3">
                                                <PricePill
                                                    label={t('acollida_page.member', 'Soci/a')}
                                                    accent="indigo"
                                                    monthly={rate.preu_soci_mes}
                                                    occasional={rate.preu_soci_ocasional}
                                                    monthlyLabel={t('acollida_page.per_month', 'mes')}
                                                    occasionalLabel={t('acollida_page.occasional', 'ocasional')}
                                                />
                                                <PricePill
                                                    label={t('acollida_page.non_member', 'No soci/a')}
                                                    accent="slate"
                                                    monthly={rate.preu_no_soci_mes}
                                                    occasional={rate.preu_no_soci_ocasional}
                                                    monthlyLabel={t('acollida_page.per_month', 'mes')}
                                                    occasionalLabel={t('acollida_page.occasional', 'ocasional')}
                                                />
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 p-4 flex gap-3">
                            <Info className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                                {t('acollida_page.note', "Els preus ocasionals s'apliquen a dies puntuals. Per a inscripcions o més informació, contacta amb l'AFA.")}
                            </p>
                        </div>
                    </section>

                    {/* CTA */}
                    <section>
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                            <div className="relative">
                                <h2 className="text-2xl sm:text-3xl font-black mb-3 leading-tight">
                                    {t('acollida_page.cta.title', 'Necessites més informació?')}
                                </h2>
                                <p className="text-slate-300 max-w-xl mx-auto mb-7">
                                    {t('acollida_page.cta.desc', "Si tens dubtes o vols apuntar-te al servei, escriu-nos i t'ajudem amb tots els detalls.")}
                                </p>
                                <Link
                                    to="/contacte"
                                    className="inline-flex items-center gap-2 bg-white text-slate-900 px-7 py-3.5 rounded-2xl font-bold hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 shadow-lg"
                                >
                                    <Mail className="w-5 h-5" />
                                    {t('acollida_page.cta.button', 'Contacta amb l\'AFA')}
                                </Link>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </>
    );
}

interface InfoCardProps {
    icon: React.ReactNode;
    title: string;
    body: string;
    accent: 'indigo' | 'violet' | 'fuchsia';
}

const ACCENT_BG: Record<InfoCardProps['accent'], string> = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400',
};

function InfoCard({ icon, title, body, accent }: InfoCardProps) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${ACCENT_BG[accent]}`}>
                {icon}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{body}</p>
        </div>
    );
}

interface PricePillProps {
    label: string;
    accent: 'indigo' | 'slate';
    monthly: string;
    occasional: string | null;
    monthlyLabel: string;
    occasionalLabel: string;
}

function PricePill({ label, accent, monthly, occasional, monthlyLabel, occasionalLabel }: PricePillProps) {
    const isPrimary = accent === 'indigo';
    return (
        <div className={`rounded-2xl p-4 ${isPrimary ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isPrimary ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {label}
            </p>
            <div className="flex items-baseline gap-1.5 mb-1">
                <span className={`text-2xl font-black leading-none ${isPrimary ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                    {monthly}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{monthlyLabel}</span>
            </div>
            {occasional && (
                <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/40 flex items-baseline gap-1.5">
                    <span className={`text-sm font-bold leading-none ${isPrimary ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {occasional}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{occasionalLabel}</span>
                </div>
            )}
        </div>
    );
}
