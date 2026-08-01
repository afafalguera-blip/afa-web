import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Wallet,
  Heart,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Megaphone,
  Mail,
  Instagram
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfigService, type SocialConfig } from '../services/ConfigService';
import { useHomepageConfig } from '../hooks/useHomepageConfig';
import { proxyStorageUrl } from '../utils/storageUrl';

interface Stat { value: string; label: string; desc: string }
interface Entry { title: string; desc: string }
interface Member { role: string; name: string }

export function AssembleaPage() {
  // i18next types t() to literal keys; these lists come back as objects/arrays.
  const { t: tStrict } = useTranslation();
  const t = tStrict as unknown as (key: string, opts?: object) => string;
  const list = <T,>(key: string): T[] =>
    (t(key, { returnObjects: true }) as unknown as T[]) || [];

  const [social, setSocial] = useState<SocialConfig | null>(null);
  const homepage = useHomepageConfig();

  useEffect(() => {
    ConfigService.getSocialConfig().then(setSocial);
  }, []);

  const agenda = list<string>('assemblea.agenda.items');
  const stats = list<Stat>('assemblea.accounts.stats');
  const accountNotes = list<string>('assemblea.accounts.items');
  const projects = list<Entry>('assemblea.projects.items');
  const members = list<Member>('assemblea.board.members');
  const questions = list<Entry>('assemblea.qa.items');
  const agreements = list<string>('assemblea.agreements.items');

  const meta = [
    { icon: Calendar, label: t('assemblea.meta.date_label'), value: t('assemblea.meta.date_value') },
    { icon: Clock, label: t('assemblea.meta.time_label'), value: t('assemblea.meta.time_value') },
    { icon: MapPin, label: t('assemblea.meta.place_label'), value: t('assemblea.meta.place_value') },
    { icon: Video, label: t('assemblea.meta.mode_label'), value: t('assemblea.meta.mode_value') },
  ];

  const actaUrl = homepage.assemblea_pdf_url ? proxyStorageUrl(homepage.assemblea_pdf_url) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden bg-primary px-8 py-16 sm:px-12 sm:py-20 mb-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              {t('assemblea.hero.badge')}
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              {t('assemblea.hero.title')}
            </h1>
            <p className="text-white/80 text-lg sm:text-xl font-medium max-w-2xl mb-8">
              {t('assemblea.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {actaUrl && (
                <a
                  href={actaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white text-primary px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  <FileText className="w-5 h-5" />
                  {t('assemblea.hero.acta_cta')}
                </a>
              )}
              <Link
                to="/documents"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-6 py-3 rounded-2xl font-bold hover:bg-white/20 transition-all backdrop-blur-md border border-white/20"
              >
                <FileText className="w-5 h-5" />
                {t('assemblea.cta.documents')}
              </Link>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {meta.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{m.label}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{m.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ordre del dia */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 px-2">{t('assemblea.agenda.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agenda.map((item, i) => (
              <div key={item} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black mb-4">
                  {i + 1}
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Estat de comptes */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-3 px-2">
            <Wallet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t('assemblea.accounts.title')}</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 px-2 max-w-3xl">{t('assemblea.accounts.intro')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{s.value}</p>
                <p className="font-bold text-slate-900 dark:text-white mb-2">{s.label}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm mb-6">
            <ul className="space-y-4">
              {accountNotes.map((note) => (
                <li key={note} className="flex gap-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-3xl p-6 sm:p-8">
            <h3 className="text-xl font-bold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-2">
              <Heart className="w-6 h-6" />
              {t('assemblea.accounts.thanks.title')}
            </h3>
            <p className="text-rose-900/70 dark:text-rose-200/70 leading-relaxed">
              {t('assemblea.accounts.thanks.desc')}
            </p>
          </div>
        </section>

        {/* Balanç del mandat */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 px-2">{t('assemblea.projects.title')}</h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 px-2">{t('assemblea.projects.intro')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <article key={p.title} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{p.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{p.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Nova Junta */}
        <section className="bg-indigo-900 rounded-[3rem] p-8 sm:p-16 mb-16 relative overflow-hidden text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-7 h-7 text-indigo-300" />
              <h2 className="text-3xl sm:text-4xl font-black">{t('assemblea.board.title')}</h2>
            </div>
            <p className="text-indigo-100/70 text-lg mb-10 max-w-2xl">{t('assemblea.board.intro')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {members.map((m) => (
                <div key={m.name} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                  <span className="inline-block px-3 py-1 bg-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-widest text-indigo-200 mb-4">
                    {m.role}
                  </span>
                  <p className="text-lg font-bold leading-snug">{m.name}</p>
                </div>
              ))}
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-indigo-100/70 leading-relaxed">
              {t('assemblea.board.note')}
            </div>
          </div>
        </section>

        {/* Precs i preguntes */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6 px-2">
            <HelpCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t('assemblea.qa.title')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((q) => (
              <div key={q.title} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-3xl p-6 sm:p-8">
                <h3 className="text-lg font-bold text-amber-700 dark:text-amber-500 mb-2">{q.title}</h3>
                <p className="text-amber-900/70 dark:text-amber-200/70 leading-relaxed">{q.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Acords */}
        <section className="mb-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">{t('assemblea.agreements.title')}</h2>
          <ul className="space-y-4 mb-8">
            {agreements.map((a) => (
              <li key={a} className="flex gap-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-primary" />
                <span className="font-medium">{a}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-400 dark:text-slate-500 italic border-t border-slate-100 dark:border-slate-800 pt-6">
            {t('assemblea.agreements.signature')}
          </p>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[3rem] p-8 sm:p-16 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mb-8 backdrop-blur-md">
            <Megaphone className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight max-w-2xl">
            {t('assemblea.cta.title')}
          </h2>
          <p className="text-blue-100 text-lg sm:text-xl mb-12 max-w-xl opacity-90">
            {t('assemblea.cta.desc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Link to="/contacte" className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-lg">
              <Mail className="w-5 h-5" />
              {t('assemblea.cta.contact_us')}
            </Link>
            <a
              href={social?.instagram || "https://instagram.com/afafalguera"}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-900/30 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-900/50 transition-all hover:scale-105 active:scale-95 backdrop-blur-md border border-white/10 shadow-lg"
            >
              <Instagram className="w-5 h-5" />
              {t('assemblea.cta.instagram')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssembleaPage;
