import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Calendar,
  Target,
  Heart,
  Megaphone,
  Mail,
  Instagram,
  FileText,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfigService, type SocialConfig } from '../services/ConfigService';

export function AssembleaPage() {
  const { t } = useTranslation();
  const [social, setSocial] = useState<SocialConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const socialData = await ConfigService.getSocialConfig();
      setSocial(socialData);
    };
    fetchConfig();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden bg-primary px-8 py-16 sm:px-12 sm:py-20 mb-12 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
              {t('assemblea.hero.title')}
            </h1>
            <p className="text-white/80 text-lg sm:text-xl font-medium max-w-2xl">
              {t('assemblea.hero.subtitle')}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('assemblea.cards.members.title')}</h3>
            <p className="text-slate-600 dark:text-slate-400">{t('assemblea.cards.members.desc')}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('assemblea.cards.meetings.title')}</h3>
            <p className="text-slate-600 dark:text-slate-400">{t('assemblea.cards.meetings.desc')}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t('assemblea.cards.decisions.title')}</h3>
            <p className="text-slate-600 dark:text-slate-400">{t('assemblea.cards.decisions.desc')}</p>
          </div>
        </div>

        {/* Why it is important Section */}
        <div className="bg-indigo-900 rounded-[3rem] p-8 sm:p-16 mb-16 relative overflow-hidden text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 bg-indigo-500/30 backdrop-blur-md rounded-full text-sm font-bold uppercase tracking-widest text-indigo-300 mb-6">
                Com participar?
              </span>
              <h2 className="text-4xl sm:text-5xl font-black mb-8 leading-tight">
                {t('assemblea.sections.importance.title')}
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-xl text-indigo-300 border border-white/10">1</div>
                  <p className="text-lg text-indigo-100/80 leading-relaxed pt-2">{t('assemblea.sections.importance.reason1')}</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-xl text-indigo-300 border border-white/10">2</div>
                  <p className="text-lg text-indigo-100/80 leading-relaxed pt-2">{t('assemblea.sections.importance.reason2')}</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-xl text-indigo-300 border border-white/10">3</div>
                  <p className="text-lg text-indigo-100/80 leading-relaxed pt-2">{t('assemblea.sections.importance.reason3')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 border border-white/10 shadow-inner">
              <div className="bg-indigo-500 rounded-3xl w-16 h-16 flex items-center justify-center mb-8 shadow-lg shadow-indigo-500/20">
                <Heart className="w-8 h-8 text-white fill-white/20" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{t('assemblea.sections.board_change.title')}</h3>
              <p className="text-indigo-100/70 text-lg leading-relaxed mb-8">
                {t('assemblea.sections.board_change.desc')}
              </p>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 italic text-indigo-100/60">
                "{t('assemblea.sections.board_change.important_desc')}"
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section - Terminology Refined */}
        <div className="space-y-6 mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white px-2">{t('assemblea.sections.projects.title')}</h2>

          {/* Commissions List */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-3xl p-6 sm:p-8">
            <h3 className="text-xl font-bold text-amber-700 dark:text-amber-500 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              {t('assemblea.sections.projects.commissions.title')}
            </h3>
            <p className="text-amber-900/70 dark:text-amber-200/70 mb-6 font-medium">
              {t('assemblea.sections.projects.commissions.desc')}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl border border-amber-100/50 dark:border-amber-800/20">
                <p className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">{t('assemblea.sections.projects.done.title')}</p>
                <p className="text-sm text-amber-900/60 dark:text-amber-200/50">{t('assemblea.sections.projects.done.desc')}</p>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl border border-amber-100/50 dark:border-amber-800/20">
                <p className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">{t('assemblea.sections.projects.future.title')}</p>
                <p className="text-sm text-amber-900/60 dark:text-amber-200/50">{t('assemblea.sections.projects.future.desc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[3rem] p-8 sm:p-16 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mb-8 backdrop-blur-md">
            <Megaphone className="w-10 h-10 animate-bounce" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-6 leading-tight max-w-2xl">
            {t('assemblea.sections.board_change.call_to_action_title')}
          </h2>
          <p className="text-blue-100 text-lg sm:text-xl mb-12 max-w-xl opacity-90">
            {t('assemblea.sections.board_change.call_to_action_desc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <Link to="/contacte" className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 shadow-lg">
              <Mail className="w-5 h-5" />
              {t('assemblea.sections.contact.contact_us')}
            </Link>
            <a
              href={social?.instagram || "https://instagram.com/afafalguera"}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-900/30 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-900/50 transition-all hover:scale-105 active:scale-95 backdrop-blur-md border border-white/10 shadow-lg"
            >
              <Instagram className="w-5 h-5" />
              {t('assemblea.sections.contact.instagram')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
