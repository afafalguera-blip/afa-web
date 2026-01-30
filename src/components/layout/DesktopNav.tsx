import { Home, LayoutGrid, ShoppingBag, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { icon: Home, labelKey: 'nav.home', path: '/' },
  { icon: LayoutGrid, labelKey: 'nav.extraescolars', path: '/extraescolars' },
  { icon: ShoppingBag, labelKey: 'nav.shop', path: '/botiga' },
  // { icon: User, labelKey: 'nav.profile', path: '/perfil' },
];

export function DesktopNav() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 sticky top-0 z-50">
      <NavLink to="/" className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-white transition-transform group-hover:scale-110 shadow-sm">
             <img 
            alt="AFA Escola Logo" 
            className="w-full h-full object-cover p-0.5" 
            src="https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/sign/Imagenes/logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NjM3Yjc4My1lYzY4LTRjMjMtYmMyNS04MTA2ODk5ZjhjMGIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJJbWFnZW5lcy9sb2dvLnBuZyIsImlhdCI6MTc2OTU1NDU3MiwiZXhwIjozMzMwNTU1NDU3Mn0.aZV-8wmEyaHeDITRf_SsMh4vj1um_jHjwD1-izQqEnc"
          />
        </div>
        <span className="font-bold text-lg text-slate-800 dark:text-white">AFA Escola Falguera</span>
      </NavLink>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {NAV_ITEMS.map(({ icon: Icon, labelKey, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  isActive 
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm font-semibold' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{t(labelKey as any)}</span>
            </NavLink>
          ))}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

        <div className="flex items-center gap-2">
            <button onClick={() => changeLanguage('ca')} translate="no" className={`notranslate text-xs font-bold px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${i18n.language === 'ca' ? 'text-primary' : 'text-slate-400'}`}>CA</button>
            <button onClick={() => changeLanguage('es')} translate="no" className={`notranslate text-xs font-bold px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${i18n.language === 'es' ? 'text-primary' : 'text-slate-400'}`}>ES</button>
            <button onClick={() => changeLanguage('en')} translate="no" className={`notranslate text-xs font-bold px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${i18n.language === 'en' ? 'text-primary' : 'text-slate-400'}`}>EN</button>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

        <button 
            onClick={async () => {
                await import('../../lib/supabase').then(m => m.supabase.auth.signOut());
                window.location.href = '/';
            }} 
            className="text-slate-500 hover:text-red-600 transition-colors"
            title="Tancar Sessió"
        >
            <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
