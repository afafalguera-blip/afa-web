import { Home, LayoutGrid, ShoppingBag } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface NavItem {
  icon: typeof Home;
  labelKey: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/' },
  { icon: LayoutGrid, labelKey: 'nav.extraescolars', path: '/extraescolars' },
  { icon: ShoppingBag, labelKey: 'nav.shop', path: '/botiga' },
  // { icon: User, labelKey: 'nav.profile', path: '/perfil' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-card-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-6 pb-8 pt-3 flex justify-between items-center z-50">
      {NAV_ITEMS.map(({ icon: Icon, labelKey, path }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`
          }
        >
          <Icon className="w-6 h-6" strokeWidth={2} />
          <span className="text-[10px] font-medium uppercase tracking-wide">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
