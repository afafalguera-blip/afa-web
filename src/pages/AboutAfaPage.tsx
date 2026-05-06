import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Mail, Users, Heart, Target, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { BoardService, type BoardMember, type BoardSectionConfig } from '../services/BoardService';
import { proxyStorageUrl } from '../utils/storageUrl';

const ROLE_ORDER: Record<string, number> = {
  president: 0,
  vicepresident: 1,
  treasurer: 2,
  secretary: 3,
  vocal: 4,
};

export default function AboutAfaPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split('-')[0] || 'ca') as 'ca' | 'es' | 'en';
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [config, setConfig] = useState<BoardSectionConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [list, cfg] = await Promise.all([
        BoardService.listVisible(),
        BoardService.getSectionConfig(),
      ]);
      if (cancelled) return;
      setMembers(list);
      setConfig(cfg);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const copy = useMemo(() => {
    const tr = config?.translations?.[lang];
    return {
      title: tr?.title || t('about_afa.title', 'Sobre l\'AFA'),
      subtitle: tr?.subtitle || t('about_afa.subtitle', 'Qui som i com ens organitzem'),
      mission: tr?.mission || t('about_afa.mission_default', ''),
      composition_title: tr?.composition_title || t('about_afa.composition_title', 'La Junta Directiva'),
      composition_intro: tr?.composition_intro || t('about_afa.composition_intro', ''),
    };
  }, [config, lang, t]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const ra = ROLE_ORDER[a.role_key] ?? 99;
      const rb = ROLE_ORDER[b.role_key] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.display_order - b.display_order;
    });
  }, [members]);

  const getMemberCopy = (m: BoardMember) => {
    const tr = m.translations?.[lang];
    return {
      role: tr?.role || m.role || t(`about_afa.roles.${m.role_key}`, m.role),
      bio: tr?.bio ?? m.bio ?? '',
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden bg-primary px-8 py-16 sm:px-12 sm:py-20 mb-12 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              {copy.subtitle}
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              {copy.title}
            </h1>
            {copy.mission && (
              <p className="text-white/90 text-lg sm:text-xl leading-relaxed max-w-2xl">
                {copy.mission}
              </p>
            )}
          </div>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-5">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t('about_afa.pillars.families.title', 'Famílies que sumen')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {t('about_afa.pillars.families.desc', 'Tota família matriculada n\'és part i pot participar a l\'assemblea i les comissions.')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-5">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t('about_afa.pillars.mission.title', 'Missió')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {t('about_afa.pillars.mission.desc', 'Acompanyar el projecte educatiu i organitzar activitats per a l\'alumnat i les famílies.')}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-5">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t('about_afa.pillars.nonprofit.title', 'Sense ànim de lucre')}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              {t('about_afa.pillars.nonprofit.desc', 'Tots els recursos es reinverteixen en l\'escola i la comunitat educativa.')}
            </p>
          </div>
        </div>

        {/* History Promo */}
        <Link
          to="/historia"
          className="group block mb-16 rounded-3xl bg-gradient-to-br from-amber-500 via-rose-500 to-fuchsia-600 p-8 sm:p-10 shadow-xl hover:shadow-2xl transition-all hover:scale-[1.01] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15" />
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 text-white">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-white/80 mb-2">
                {t('about_afa.history_promo.eyebrow', 'Mig segle d\'escola')}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black mb-2 leading-tight">
                {t('about_afa.history_promo.title', 'Coneix la nostra història')}
              </h3>
              <p className="text-white/90 leading-relaxed max-w-2xl">
                {t('about_afa.history_promo.desc', 'De l\'escola que va néixer de la lluita veïnal als anys 70 al projecte educatiu d\'avui. Una història del barri de Falguera.')}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 font-bold text-white group-hover:translate-x-1 transition-transform">
              {t('about_afa.history_promo.cta', 'Llegeix-la')}
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

        {/* Board Section */}
        <section className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3">
              {copy.composition_title}
            </h2>
            {copy.composition_intro && (
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                {copy.composition_intro}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : sortedMembers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                {t('about_afa.empty', 'Encara no s\'han publicat els membres de la Junta.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedMembers.map((m) => {
                const c = getMemberCopy(m);
                return (
                  <article
                    key={m.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 relative overflow-hidden">
                      {m.photo_url ? (
                        <img
                          src={proxyStorageUrl(m.photo_url)}
                          alt={m.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-5xl font-black text-slate-400 dark:text-slate-600">
                            {m.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wide text-primary shadow-sm">
                        {c.role}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{m.name}</h3>
                      {c.bio && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-3">{c.bio}</p>
                      )}
                      {m.email && (
                        <a
                          href={`mailto:${m.email}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                        >
                          <Mail className="w-4 h-4" />
                          {m.email}
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[3rem] p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <h2 className="relative text-3xl sm:text-4xl font-black mb-4 leading-tight">
            {t('about_afa.cta.title', 'Vols formar part de l\'AFA?')}
          </h2>
          <p className="relative text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            {t('about_afa.cta.desc', 'Escriu-nos i t\'expliquem com participar a l\'assemblea, comissions o Junta.')}
          </p>
          <Link
            to="/contacte"
            className="relative inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            <Mail className="w-5 h-5" />
            {t('about_afa.cta.contact', 'Contacta amb nosaltres')}
          </Link>
        </div>
      </div>
    </div>
  );
}
