import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopNav } from './DesktopNav';
import { MobileTopNav } from './MobileTopNav';
import { SchoolSuppliesBackground } from './SchoolSuppliesBackground';
import { AnnouncementBanner } from '../public/AnnouncementBanner';
import { MaintenanceBanner } from '../public/MaintenanceBanner';
import { CookieBanner } from '../public/CookieBanner';
import { Link } from 'react-router-dom';


export function Layout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 relative overflow-x-hidden">
      <SchoolSuppliesBackground />

      <DesktopNav />
      <MobileTopNav />

      {/* Status bar spacer - Mobile only (adjusted for new TopNav) */}
      <div className="h-16 w-full lg:hidden"></div>

      <MaintenanceBanner />
      <AnnouncementBanner />

      <main className="pb-24 lg:pb-12 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      <footer className="hidden lg:block border-t border-slate-100 dark:border-white/5 py-8 mt-12 mb-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} AFA Escola Falguera. {t('footer.all_rights_reserved', 'Tots els drets reservats.')}</p>
          <div className="flex gap-6">
            <Link to="/privacitat" className="hover:text-primary transition-colors">{t('legal.privacy_title')}</Link>
            <Link to="/cookies" className="hover:text-primary transition-colors">{t('legal.cookies_title')}</Link>
          </div>
        </div>
      </footer>

      <div className="lg:hidden">
        <BottomNav />
      </div>

      <CookieBanner />

      {/* iOS Home Indicator Simulator - Mobile Only */}

      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full z-[60] lg:hidden"></div>
    </div>
  );
}
