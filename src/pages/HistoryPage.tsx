import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  Users,
  Leaf,
  Music,
  Cpu,
  Quote,
  Heart,
  ArrowRight,
} from 'lucide-react';

type Milestone = {
  year: string;
  titleKey: string;
  descKey: string;
  color: string;
};

const MILESTONES: Milestone[] = [
  { year: '1971', titleKey: 'history.timeline.1971.title', descKey: 'history.timeline.1971.desc', color: 'bg-rose-500' },
  { year: '1972', titleKey: 'history.timeline.1972.title', descKey: 'history.timeline.1972.desc', color: 'bg-amber-500' },
  { year: '1976', titleKey: 'history.timeline.1976.title', descKey: 'history.timeline.1976.desc', color: 'bg-emerald-500' },
  { year: '1985', titleKey: 'history.timeline.1985.title', descKey: 'history.timeline.1985.desc', color: 'bg-teal-500' },
  { year: '1988', titleKey: 'history.timeline.1988.title', descKey: 'history.timeline.1988.desc', color: 'bg-sky-500' },
  { year: '1997', titleKey: 'history.timeline.1997.title', descKey: 'history.timeline.1997.desc', color: 'bg-indigo-500' },
  { year: '2012', titleKey: 'history.timeline.2012.title', descKey: 'history.timeline.2012.desc', color: 'bg-violet-500' },
  { year: '2022', titleKey: 'history.timeline.2022.title', descKey: 'history.timeline.2022.desc', color: 'bg-fuchsia-500' },
];

export default function HistoryPage() {
  // i18next types t() to literal keys only; this page resolves keys dynamically.
  const { t: tStrict } = useTranslation();
  const t = tStrict as unknown as (key: string, fallback?: string) => string;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500 via-rose-500 to-fuchsia-600 px-8 py-16 sm:px-12 sm:py-24 mb-12 shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-black/10 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              {t('history.subtitle', 'Mig segle d\'escola pública')}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              {t('history.title', 'La nostra història')}
            </h1>
            <p className="text-white/90 text-lg sm:text-xl leading-relaxed">
              {t('history.intro', 'De l\'escola del barri que va néixer de la lluita veïnal al projecte educatiu que avui acompanya les nostres famílies. Aquesta és la història que cada dia continueu escrivint amb nosaltres.')}
            </p>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { value: '+50', labelKey: 'history.stats.years' },
            { value: '1971', labelKey: 'history.stats.founded' },
            { value: '1', labelKey: 'history.stats.lines' },
            { value: '~200', labelKey: 'history.stats.students' },
          ].map((s) => (
            <div key={s.labelKey} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 text-center shadow-sm">
              <div className="text-3xl sm:text-4xl font-black text-primary mb-1">{s.value}</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {t(s.labelKey)}
              </div>
            </div>
          ))}
        </div>

        {/* Origins */}
        <section className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-3 block">
                {t('history.origins.eyebrow', 'Els orígens')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
                {t('history.origins.title', 'Una escola que va néixer del barri')}
              </h2>
              <div className="w-16 h-1.5 bg-rose-500 rounded-full mb-6" />
            </div>
            <div className="lg:col-span-3 space-y-4 text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              <p>{t('history.origins.p1', 'A principis dels anys 70, el barri de Falguera creixia al ritme de les fàbriques. Famílies arribades de mig Estat es trobaven sense places escolars: més de 600 nens i nenes havien d\'anar amb autobús a Barcelona.')}</p>
              <p>{t('history.origins.p2', 'Les famílies del barri es van organitzar i van exigir una escola pública. La pressió va funcionar: el 1971 es van cedir els terrenys i es va començar a construir el centre, just darrere del Palau Falguera.')}</p>
            </div>
          </div>
        </section>

        {/* Quote */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 sm:p-12 mb-20 relative overflow-hidden">
          <Quote className="absolute top-6 right-6 w-24 h-24 text-white/5" />
          <div className="relative max-w-3xl">
            <p className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-4">
              {t('history.quote.text', '"L\'escola va passar de ser franquista a catalana, i el barri de no tenir res a estar ple de vida."')}
            </p>
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
              {t('history.quote.author', 'Crònica veïnal del barri de Falguera')}
            </p>
          </div>
        </div>

        {/* Modelo Building */}
        <section className="mb-20">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="bg-gradient-to-br from-amber-400 to-rose-500 p-10 sm:p-14 flex items-center justify-center text-center">
                <div>
                  <Building2 className="w-16 h-16 text-white mb-6 mx-auto" />
                  <div className="text-6xl sm:text-7xl font-black text-white mb-2">5</div>
                  <p className="text-white/90 font-bold uppercase tracking-wide text-sm">
                    {t('history.modelo.fact', 'escoles "sense portes" a tot Espanya')}
                  </p>
                </div>
              </div>
              <div className="p-8 sm:p-12">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-3 block">
                  {t('history.modelo.eyebrow', '1972 · Inauguració')}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4">
                  {t('history.modelo.title', 'L\'"escola sense portes"')}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {t('history.modelo.p1', 'L\'edifici original era un projecte experimental: aules diàfanes, grans finestrals, llum natural i molts espais compartits. Una de les només cinc del seu tipus a tot l\'Estat.')}
                </p>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t('history.modelo.p2', 'L\'escola va arribar a tenir més de 1.000 alumnes i 38 mestres. Tanta vida no cabia en un sol espai obert i amb el temps es van haver d\'aixecar parets per crear aules tradicionals.')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
              {t('history.timeline.eyebrow', 'Línia del temps')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">
              {t('history.timeline.title', 'Moments que ens han fet')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {t('history.timeline.intro', 'Cinc dècades en un cop d\'ull.')}
            </p>
          </div>

          <div className="relative">
            {/* vertical line - hidden on mobile */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 -translate-x-1/2" />

            <div className="space-y-8 md:space-y-12">
              {MILESTONES.map((m, idx) => {
                const isLeft = idx % 2 === 0;
                return (
                  <div key={m.year} className="relative md:grid md:grid-cols-2 md:gap-8 items-center">
                    {/* dot */}
                    <div className="hidden md:block absolute left-1/2 top-8 -translate-x-1/2 z-10">
                      <div className={`w-4 h-4 rounded-full ${m.color} ring-4 ring-slate-50 dark:ring-slate-950`} />
                    </div>

                    {/* card */}
                    <div className={`${isLeft ? 'md:pr-12 md:text-right' : 'md:col-start-2 md:pl-12'}`}>
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`inline-block px-3 py-1 ${m.color} text-white text-sm font-black rounded-full mb-3`}>
                          {m.year}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                          {t(m.titleKey)}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                          {t(m.descKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Name Change Highlight */}
        <section className="mb-20">
          <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-widest text-white/80 mb-3 block">
                  {t('history.name.eyebrow', '1988 · Un nom propi')}
                </span>
                <h2 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
                  {t('history.name.title', 'De "Colegio Modelo" a Escola Falguera')}
                </h2>
                <p className="text-white/90 text-lg leading-relaxed">
                  {t('history.name.desc', 'La comunitat va decidir canviar el nom per reivindicar el barri, deixar enrere connotacions de l\'època anterior i posar arrels en el lloc on viuen les famílies.')}
                </p>
              </div>
              <div className="text-center">
                <div className="text-6xl sm:text-7xl font-black mb-2">→</div>
                <div className="text-2xl font-black uppercase tracking-wider">
                  {t('history.name.label', 'Falguera')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Today */}
        <section className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3 block">
              {t('history.today.eyebrow', 'Avui')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">
              {t('history.today.title', 'Una escola en acció constant')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {t('history.today.intro', 'Mig segle després, la Falguera continua sent un projecte viu, arrelat al barri i obert al món.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-7 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                <Leaf className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('history.today.green.title', 'Escola Verda')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {t('history.today.green.desc', 'Hort escolar, sostenibilitat i activitats a la natura aprofitant la proximitat al riu i a Collserola.')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-7 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center mb-4">
                <Music className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('history.today.cordes.title', 'Projecte Cordes')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {t('history.today.cordes.desc', 'Aprenentatge d\'instruments de corda dins l\'aula, en col·laboració amb l\'Escola Municipal de Música del Palau Falguera.')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-7 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('history.today.steam.title', 'STE(IA)M')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {t('history.today.steam.desc', 'Ciència, tecnologia, art i intel·ligència artificial integrades al currículum amb experiències pràctiques.')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-7 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mb-4">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('history.today.community.title', 'Comunitat AFA')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {t('history.today.community.desc', 'Extraescolars, acollida i menjador amb cuina pròpia: les famílies fan possible el dia a dia de l\'escola.')}
              </p>
            </div>
          </div>
        </section>

        {/* Palau */}
        <section className="mb-20">
          <div className="bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 rounded-3xl p-8 sm:p-12 border border-amber-100 dark:border-amber-900/40">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-1">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-3 block">
                  {t('history.palau.eyebrow', 'El nostre nom')}
                </span>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 leading-tight">
                  {t('history.palau.title', 'Per què "Falguera"?')}
                </h2>
              </div>
              <div className="lg:col-span-2 space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                <p>{t('history.palau.p1', 'L\'escola pren el nom del Palau Falguera, una finca del segle XVII que és el cor històric de Sant Feliu. Es troba just al costat del centre i en formem part del seu paisatge cultural.')}</p>
                <p>{t('history.palau.p2', 'Avui el Palau acull l\'Escola Municipal de Música i és l\'escenari de l\'Exposició Nacional de Roses. Els seus jardins són una extensió natural de les nostres aules.')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[3rem] p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="relative">
            <Users className="w-12 h-12 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
              {t('history.cta.title', 'La història la continueu escrivint vosaltres')}
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              {t('history.cta.desc', 'Cada família que s\'incorpora suma un capítol nou. Coneix l\'AFA i descobreix com participar-hi.')}
            </p>
            <Link
              to="/sobre-afa"
              className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              {t('history.cta.button', 'Coneix l\'AFA')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
