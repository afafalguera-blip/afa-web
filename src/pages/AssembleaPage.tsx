import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  TrendingUp, 
  Users, 
  Target, 
  CheckCircle2, 
  Megaphone,
  Mail,
  Instagram
} from 'lucide-react';

export function AssembleaPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
            {t('assemblea.title')}
          </h1>
          <p className="text-xl text-blue-600 dark:text-blue-400 font-bold">
            {t('assemblea.course')}
          </p>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('assemblea.subtitle')}
          </p>
        </div>

        {/* 1. Punts del Dia */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
            {t('assemblea.sections.agenda.title')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(t('assemblea.sections.agenda.items', { returnObjects: true }) as string[]).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold rounded-lg">
                  {idx + 1}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Estat de Comptes */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              {t('assemblea.sections.economics.title')}
            </h3>
            <ul className="space-y-3">
              {(t('assemblea.sections.economics.items', { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              {t('assemblea.sections.investments.title')}
            </h3>
            <ul className="space-y-3">
              {(t('assemblea.sections.investments.items', { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 3. Funcions i Destí Quota */}
        <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="grid md:grid-cols-2 gap-12 relative z-10">
            <div>
              <h3 className="text-2xl font-bold mb-6 border-b border-blue-400 pb-2">{t('assemblea.sections.functions.title')}</h3>
              <ul className="grid gap-2">
                {(t('assemblea.sections.functions.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-center gap-2 font-medium opacity-90">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-6 border-b border-blue-400 pb-2">{t('assemblea.sections.quota.title')}</h3>
              <ul className="space-y-3">
                {(t('assemblea.sections.quota.items', { returnObjects: true }) as string[]).map((item, i) => (
                  <li key={i} className="flex items-center gap-3 bg-blue-700/50 p-3 rounded-xl border border-blue-500/30">
                    <CheckCircle2 className="w-5 h-5 text-blue-200" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 4. Projectes */}
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white px-2">{t('assemblea.sections.projects.title')}</h2>
            
            {/* Brigada List */}
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-3xl p-6 sm:p-8">
                <h3 className="text-xl font-bold text-amber-700 dark:text-amber-500 mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    {t('assemblea.sections.projects.brigade.title')}
                </h3>
                <p className="text-amber-900/70 dark:text-amber-200/70 mb-6">
                    {t('assemblea.sections.projects.brigade.desc')}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl">
                        <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2 text-sm uppercase">{t('assemblea.sections.projects.done.title')}</h4>
                        <ul className="text-sm space-y-1 text-slate-700 dark:text-slate-300">
                             {(t('assemblea.sections.projects.done.items', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>• {item}</li>
                             ))}
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm ring-2 ring-amber-500/20">
                        <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-2 text-sm uppercase">{t('assemblea.sections.projects.future.title')}</h4>
                        <ul className="text-sm space-y-1 text-slate-700 dark:text-slate-300">
                             {(t('assemblea.sections.projects.future.items', { returnObjects: true }) as string[]).map((item, i) => (
                                <li key={i}>• {item}</li>
                             ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Other Projects Grid */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                    'Canvi de xandall', 'Geganta i Capgrossa', 'Petó i Adeu', 
                    'Col·laboració entitats poble', 'Façana amb Institut Olorda', 
                    'Noves acadèmies anglès', 'Mercat segona mà', 
                    'Recaptació solidària (Dana)', 'Paradeta Sant Jordi'
                ].map((proj, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{proj}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* 5. Junta i Call to Action */}
        <div className="grid md:grid-cols-5 gap-6">
            <div className="md:col-span-2 bg-slate-900 text-white rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">{t('assemblea.sections.board_change.title')}</h3>
                    <p className="text-slate-400 text-sm mb-6">{t('assemblea.sections.board_change.desc')}</p>
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                            <p className="font-bold text-blue-400 text-sm">{t('assemblea.sections.board_change.important_title')}</p>
                            <p className="text-sm text-slate-300">{t('assemblea.sections.board_change.important_desc')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="md:col-span-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg shadow-blue-500/20">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <Megaphone className="w-12 h-12 mb-4 animate-bounce" />
                <h2 className="text-3xl font-black mb-2">{t('assemblea.sections.board_change.call_to_action_title')}</h2>
                <p className="text-blue-100 mb-8 max-w-sm">
                    {t('assemblea.sections.board_change.call_to_action_desc')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <a href="mailto:afafalguera@gmail.com" className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors">
                        <Mail className="w-5 h-5" />
                        {t('assemblea.sections.contact.contact_us')}
                    </a>
                    <a href="https://instagram.com/afaescolafalguera" target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-indigo-800/50 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-800/70 transition-colors backdrop-blur-sm">
                        <Instagram className="w-5 h-5" />
                        {t('assemblea.sections.contact.instagram')}
                    </a>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
