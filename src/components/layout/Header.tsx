import { useTranslation } from 'react-i18next';

export function Header() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="px-6 py-4 flex items-center justify-between lg:hidden">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 overflow-hidden bg-white shadow-sm">
          <img 
            alt="AFA Escola Logo" 
            className="w-full h-full object-cover" 
            src="https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy9sb2dvLnBuZyIsImlhdCI6MTc2OTU1NDU3MiwiZXhwIjozMzMwNTU1NDU3Mn0.aZV-8wmEyaHeDITRf_SsMh4vj1um_jHjwD1-izQqEnc"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('header.greeting')}</p>
          <h1 className="text-xl font-bold text-secondary dark:text-primary">AFA Escola Falguera</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button 
                onClick={() => changeLanguage('ca')} 
                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${i18n.language === 'ca' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                CA
            </button>
            <button 
                onClick={() => changeLanguage('es')} 
                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${i18n.language === 'es' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                ES
            </button>
             <button 
                onClick={() => changeLanguage('en')} 
                className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${i18n.language === 'en' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
                EN
            </button>
        </div>

        <button className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
          <span className="material-icons-round text-slate-600 dark:text-slate-300">notifications</span>
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
        </button>
      </div>
    </header>
  );
}
