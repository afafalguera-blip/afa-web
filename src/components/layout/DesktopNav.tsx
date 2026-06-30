import { useEffect, useRef, useState } from 'react';
import {
  Home,
  ShoppingBag,
  LogOut,
  ChevronDown,
  LayoutGrid,
  Sparkles,
  MoreHorizontal,
  Trophy,
  CreditCard,
  Calendar,
  Sun,
  UtensilsCrossed,
  Info,
  BookOpen,
  Newspaper,
  FileText,
  Mail,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { NotificationBell } from '../common/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { useBranding } from '../../hooks/useBranding';

type DropdownKey = 'activities' | 'services' | 'more' | null;

interface MenuItem {
  icon: typeof Home;
  labelKey: string;
  fallback: string;
  descKey: string;
  descFallback: string;
  path: string;
  iconBg: string;
}

const ACTIVITIES_ITEMS: MenuItem[] = [
  { icon: Trophy, labelKey: 'nav.extraescolars', fallback: 'Extraescolars', descKey: 'nav_menu.extraescolars_desc', descFallback: 'Inscripcions i activitats', path: '/extraescolars', iconBg: 'bg-primary text-white' },
  { icon: CreditCard, labelKey: 'home.fees', fallback: 'Quotes', descKey: 'nav_menu.fees_desc', descFallback: 'Tarifes i pagaments', path: '/quotes', iconBg: 'bg-secondary text-white' },
  { icon: Calendar, labelKey: 'home.calendar', fallback: 'Calendari', descKey: 'nav_menu.calendar_desc', descFallback: 'Tot el curs en un cop d\'ull', path: '/calendari', iconBg: 'bg-amber-500 text-white' },
];

const SERVICES_ITEMS: MenuItem[] = [
  { icon: Sun, labelKey: 'home.acollida', fallback: 'Acollida', descKey: 'nav_menu.acollida_desc', descFallback: 'Horaris i tarifes', path: '/acollida', iconBg: 'bg-indigo-500 text-white' },
  { icon: UtensilsCrossed, labelKey: 'home.menjador', fallback: 'Menjador', descKey: 'nav_menu.menjador_desc', descFallback: 'Menús, preus i info', path: '/menjador', iconBg: 'bg-orange-500 text-white' },
];

const MORE_ITEMS: MenuItem[] = [
  { icon: Info, labelKey: 'nav.about_afa', fallback: 'Sobre l\'AFA', descKey: 'nav_menu.about_desc', descFallback: 'Qui som i la Junta', path: '/sobre-afa', iconBg: 'bg-blue-500 text-white' },
  { icon: BookOpen, labelKey: 'history.title', fallback: 'Història', descKey: 'nav_menu.history_desc', descFallback: 'Mig segle d\'escola', path: '/historia', iconBg: 'bg-rose-500 text-white' },
  { icon: Newspaper, labelKey: 'nav.news', fallback: 'Notícies', descKey: 'nav_menu.news_desc', descFallback: 'Última hora de l\'AFA', path: '/noticies', iconBg: 'bg-emerald-500 text-white' },
  { icon: FileText, labelKey: 'nav.documents', fallback: 'Documents', descKey: 'nav_menu.documents_desc', descFallback: 'Recursos i descàrregues', path: '/documents', iconBg: 'bg-slate-500 text-white' },
  { icon: Mail, labelKey: 'nav.contact', fallback: 'Contacte', descKey: 'nav_menu.contact_desc', descFallback: 'Escriu-nos', path: '/contacte', iconBg: 'bg-teal-500 text-white' },
  { icon: MessageSquare, labelKey: 'nav.suggestions', fallback: 'Suggeriments', descKey: 'nav_menu.suggestions_desc', descFallback: 'Idees i millores', path: '/contacte?subject=Sugeriment', iconBg: 'bg-violet-500 text-white' },
];

const ACTIVITIES_PATHS = ['/extraescolars', '/quotes', '/calendari'];
const SERVICES_PATHS = ['/acollida', '/menjador'];
const MORE_PATHS = ['/sobre-afa', '/historia', '/noticies', '/documents', '/contacte'];

export function DesktopNav() {
  // i18next types t() to literal keys only; this nav uses dynamic keys and
  // passes t to child components typed as (key, fallback) => string.
  const { t: tStrict, i18n } = useTranslation();
  const t = tStrict as unknown as (key: string, fallback?: string) => string;
  const { isAdmin } = useAuth();
  const branding = useBranding();
  const location = useLocation();
  const [open, setOpen] = useState<DropdownKey>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);

  // Close dropdown on route change
  useEffect(() => {
    setOpen(null);
  }, [location.pathname, location.search]);

  // Click-outside + ESC
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const isActivities = ACTIVITIES_PATHS.some(p => location.pathname.startsWith(p));
  const isServices = SERVICES_PATHS.some(p => location.pathname.startsWith(p));
  const isMore = MORE_PATHS.some(p => location.pathname.startsWith(p));

  return (
    <nav className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 sticky top-0 z-50">
      <NavLink to="/" className="flex items-center gap-4 group">
        <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-white transition-transform group-hover:scale-110 shadow-sm">
          <img alt="AFA Escola Logo" className="w-full h-full object-cover p-0.5" src={branding.logo_url} />
        </div>
        <span className="font-bold text-lg text-slate-800 dark:text-white">{branding.site_name}</span>
      </NavLink>

      <div ref={containerRef} className="flex items-center gap-8">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg relative">
          <NavTab to="/" label={t('nav.home', 'Inici')} icon={<Home className="w-4 h-4" />} />

          <DropdownTab
            label={t('nav.activities', 'Activitats')}
            icon={<LayoutGrid className="w-4 h-4" />}
            isOpen={open === 'activities'}
            isActive={isActivities}
            onToggle={() => setOpen(open === 'activities' ? null : 'activities')}
          />

          <DropdownTab
            label={t('nav.services', 'Serveis')}
            icon={<Sparkles className="w-4 h-4" />}
            isOpen={open === 'services'}
            isActive={isServices}
            onToggle={() => setOpen(open === 'services' ? null : 'services')}
          />

          <NavTab to="/botiga" label={t('nav.shop', 'Botiga')} icon={<ShoppingBag className="w-4 h-4" />} />

          <DropdownTab
            label={t('nav.more', 'Més')}
            icon={<MoreHorizontal className="w-4 h-4" />}
            isOpen={open === 'more'}
            isActive={isMore}
            onToggle={() => setOpen(open === 'more' ? null : 'more')}
          />

          <AnimatePresence>
            {open === 'activities' && <DropdownPanel items={ACTIVITIES_ITEMS} t={t} onClose={() => setOpen(null)} />}
            {open === 'services' && <DropdownPanel items={SERVICES_ITEMS} t={t} onClose={() => setOpen(null)} />}
            {open === 'more' && <DropdownPanel items={MORE_ITEMS} t={t} onClose={() => setOpen(null)} wide />}
          </AnimatePresence>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

        <div className="flex items-center gap-2">
          <button onClick={() => changeLanguage('ca')} translate="no" className={`notranslate text-xs font-bold px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${i18n.language === 'ca' ? 'text-primary' : 'text-slate-400'}`}>CA</button>
          <button onClick={() => changeLanguage('es')} translate="no" className={`notranslate text-xs font-bold px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${i18n.language === 'es' ? 'text-primary' : 'text-slate-400'}`}>ES</button>
          <button onClick={() => changeLanguage('en')} translate="no" className={`notranslate text-xs font-bold px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${i18n.language === 'en' ? 'text-primary' : 'text-slate-400'}`}>EN</button>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

        <NotificationBell />

        {isAdmin && (
          <>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
            <NavLink to="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all font-bold shadow-sm shadow-blue-600/20">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Admin</span>
            </NavLink>
          </>
        )}

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

interface NavTabProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function NavTab({ to, label, icon }: NavTabProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
          isActive
            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm font-semibold'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`
      }
    >
      {icon}
      <span className="text-sm">{label}</span>
    </NavLink>
  );
}

interface DropdownTabProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
}

function DropdownTab({ label, icon, isOpen, isActive, onToggle }: DropdownTabProps) {
  const highlight = isOpen || isActive;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
        highlight
          ? 'bg-white dark:bg-slate-700 text-primary shadow-sm font-semibold'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

interface DropdownPanelProps {
  items: MenuItem[];
  t: (key: string, fallback?: string) => string;
  onClose: () => void;
  wide?: boolean;
}

function DropdownPanel({ items, t, onClose, wide }: DropdownPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className={`absolute left-1/2 -translate-x-1/2 top-full mt-3 ${wide ? 'w-[640px]' : 'w-[420px]'} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl shadow-slate-300/40 dark:shadow-black/40 p-3 z-50`}
    >
      <div className={wide ? 'grid grid-cols-2 gap-1.5' : 'space-y-1'}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${item.iconBg}`}>
                <Icon className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {t(item.labelKey, item.fallback)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {t(item.descKey, item.descFallback)}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
