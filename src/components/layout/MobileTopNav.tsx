import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function MobileTopNav() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10 z-50 flex items-center justify-between px-4 lg:hidden">
      {/* Left: Branding & Greeting */}
      <Link to="/" className="flex items-center gap-3 active:scale-95 transition-transform">
        <div className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-700 overflow-hidden bg-white shadow-sm shrink-0">
          <img 
            alt="AFA Logo" 
            className="w-full h-full object-cover p-0.5" 
            src="https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy9sb2dvLnBuZyIsImlhdCI6MTc2OTU1NDU3MiwiZXhwIjozMzMwNTU1NDU3Mn0.aZV-8wmEyaHeDITRf_SsMh4vj1um_jHjwD1-izQqEnc"
          />
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-medium leading-none mb-0.5">Bon dia Família 👋</span>
            <span className="font-bold text-sm text-primary dark:text-white leading-none">AFA Escola Falguera</span>
        </div>
      </Link>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Languages (Compact & Rounded) */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-full border border-slate-100 dark:border-slate-700">
            {['ca', 'es', 'en'].map((lang) => (
                <button 
                    key={lang}
                    onClick={() => changeLanguage(lang)} 
                    translate="no" 
                    className={`notranslate text-[10px] font-bold px-2 py-1 rounded-full transition-all ${
                        i18n.language === lang 
                        ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    {lang.toUpperCase()}
                </button>
            ))}
        </div>

        {/* Bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
        </button>
      </div>
    </div>
  );
}
