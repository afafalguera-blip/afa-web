import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  LayoutGrid,
  Sparkles,
  ShoppingBag,
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SheetKey = 'activities' | 'services' | 'more' | null;

interface SheetItem {
  icon: typeof Home;
  labelKey: string;
  fallback: string;
  path: string;
  accent: string;
}

const ACTIVITIES_ITEMS: SheetItem[] = [
  { icon: Trophy, labelKey: 'nav.extraescolars', fallback: 'Extraescolars', path: '/extraescolars', accent: 'bg-primary text-white' },
  { icon: CreditCard, labelKey: 'home.fees', fallback: 'Quotes', path: '/quotes', accent: 'bg-secondary text-white' },
  { icon: Calendar, labelKey: 'home.calendar', fallback: 'Calendari', path: '/calendari', accent: 'bg-amber-500 text-white' },
];

const SERVICES_ITEMS: SheetItem[] = [
  { icon: Sun, labelKey: 'home.acollida', fallback: 'Acollida', path: '/acollida', accent: 'bg-indigo-500 text-white' },
  { icon: UtensilsCrossed, labelKey: 'home.menjador', fallback: 'Menjador', path: '/menjador', accent: 'bg-orange-500 text-white' },
];

const MORE_ITEMS: SheetItem[] = [
  { icon: Info, labelKey: 'nav.about_afa', fallback: 'Sobre l\'AFA', path: '/sobre-afa', accent: 'bg-blue-500 text-white' },
  { icon: BookOpen, labelKey: 'history.title', fallback: 'Història', path: '/historia', accent: 'bg-rose-500 text-white' },
  { icon: Newspaper, labelKey: 'nav.news', fallback: 'Notícies', path: '/noticies', accent: 'bg-emerald-500 text-white' },
  { icon: FileText, labelKey: 'nav.documents', fallback: 'Documents', path: '/documents', accent: 'bg-slate-500 text-white' },
  { icon: Mail, labelKey: 'nav.contact', fallback: 'Contacte', path: '/contacte', accent: 'bg-teal-500 text-white' },
  { icon: MessageSquare, labelKey: 'nav.suggestions', fallback: 'Suggeriments', path: '/contacte?subject=Sugeriment', accent: 'bg-violet-500 text-white' },
];

const ACTIVITIES_PATHS = ['/extraescolars', '/quotes', '/calendari'];
const SERVICES_PATHS = ['/acollida', '/menjador'];
const MORE_PATHS = ['/sobre-afa', '/historia', '/noticies', '/documents', '/contacte'];

export function BottomNav() {
  // i18next types t() to literal keys only; this nav uses dynamic keys and
  // passes t to child components typed as (key, fallback) => string.
  const { t: tStrict } = useTranslation();
  const t = tStrict as unknown as (key: string, fallback?: string) => string;
  const location = useLocation();
  const [openSheet, setOpenSheet] = useState<SheetKey>(null);

  // Close sheet on route change
  useEffect(() => {
    setOpenSheet(null);
  }, [location.pathname, location.search]);

  // Lock body scroll while sheet open
  useEffect(() => {
    if (openSheet) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [openSheet]);

  const isHome = location.pathname === '/';
  const isShop = location.pathname.startsWith('/botiga');
  const isActivitiesPath = ACTIVITIES_PATHS.some(p => location.pathname.startsWith(p));
  const isServicesPath = SERVICES_PATHS.some(p => location.pathname.startsWith(p));
  const isMorePath = MORE_PATHS.some(p => location.pathname.startsWith(p));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-2 pt-2 grid grid-cols-5 items-stretch"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
      >
        <NavTab
          to="/"
          label={t('nav.home', 'Inici')}
          icon={<Home className="w-5 h-5" strokeWidth={2.2} />}
          active={isHome}
        />
        <SheetTab
          label={t('nav.activities', 'Activitats')}
          icon={<LayoutGrid className="w-5 h-5" strokeWidth={2.2} />}
          active={openSheet === 'activities' || (isActivitiesPath && !openSheet)}
          onClick={() => setOpenSheet(openSheet === 'activities' ? null : 'activities')}
        />
        <SheetTab
          label={t('nav.services', 'Serveis')}
          icon={<Sparkles className="w-5 h-5" strokeWidth={2.2} />}
          active={openSheet === 'services' || (isServicesPath && !openSheet)}
          onClick={() => setOpenSheet(openSheet === 'services' ? null : 'services')}
        />
        <NavTab
          to="/botiga"
          label={t('nav.shop', 'Botiga')}
          icon={<ShoppingBag className="w-5 h-5" strokeWidth={2.2} />}
          active={isShop}
        />
        <SheetTab
          label={t('nav.more', 'Més')}
          icon={<MoreHorizontal className="w-5 h-5" strokeWidth={2.2} />}
          active={openSheet === 'more' || (isMorePath && !openSheet)}
          onClick={() => setOpenSheet(openSheet === 'more' ? null : 'more')}
        />
      </nav>

      <AnimatePresence>
        {openSheet === 'activities' && (
          <BottomSheet
            key="activities"
            title={t('nav.activities', 'Activitats')}
            subtitle={t('nav.activities_subtitle', 'Inscripcions, quotes i calendari')}
            onClose={() => setOpenSheet(null)}
            items={ACTIVITIES_ITEMS}
            t={t}
          />
        )}
        {openSheet === 'services' && (
          <BottomSheet
            key="services"
            title={t('nav.services', 'Serveis')}
            subtitle={t('nav.services_subtitle', 'Acollida i menjador')}
            onClose={() => setOpenSheet(null)}
            items={SERVICES_ITEMS}
            t={t}
          />
        )}
        {openSheet === 'more' && (
          <BottomSheet
            key="more"
            title={t('nav.more', 'Més')}
            subtitle={t('nav.more_subtitle', 'Tot el que pots explorar')}
            onClose={() => setOpenSheet(null)}
            items={MORE_ITEMS}
            t={t}
            grid
          />
        )}
      </AnimatePresence>
    </>
  );
}

interface NavTabProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

function NavTab({ to, label, icon, active }: NavTabProps) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className="flex flex-col items-center justify-center gap-1 py-1 active:scale-95 transition-transform"
    >
      <TabContent label={label} icon={icon} active={active} />
    </NavLink>
  );
}

interface SheetTabProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function SheetTab({ label, icon, active, onClick }: SheetTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 py-1 active:scale-95 transition-transform"
    >
      <TabContent label={label} icon={icon} active={active} />
    </button>
  );
}

function TabContent({ label, icon, active }: { label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <>
      <div className={`relative flex items-center justify-center w-14 h-7 rounded-full transition-colors ${active ? 'bg-primary/15 dark:bg-primary/25' : ''}`}>
        <span className={`transition-colors ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
          {icon}
        </span>
      </div>
      <span className={`text-[10px] font-bold tracking-tight transition-colors ${active ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </span>
    </>
  );
}

interface BottomSheetProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  items: SheetItem[];
  t: (key: string, fallback?: string) => string;
  grid?: boolean;
}

function BottomSheet({ title, subtitle, onClose, items, t, grid }: BottomSheetProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-sm lg:hidden"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 600) onClose();
        }}
        className="fixed left-0 right-0 z-[56] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl lg:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-6 pt-2 pb-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        {/* Items */}
        <div className={`px-4 pb-6 ${grid ? 'grid grid-cols-3 gap-3' : 'space-y-2'}`}>
          {items.map(item => {
            const Icon = item.icon;
            return grid ? (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${item.accent}`}>
                  <Icon className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 text-center leading-tight">
                  {t(item.labelKey, item.fallback)}
                </span>
              </Link>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-[0.98]"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${item.accent}`}>
                  <Icon className="w-6 h-6" strokeWidth={2.2} />
                </div>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {t(item.labelKey, item.fallback)}
                </span>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
