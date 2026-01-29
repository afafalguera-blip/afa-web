import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopNav } from './DesktopNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
        
      <DesktopNav />

      {/* Status bar spacer - Mobile only */}
      <div className="h-12 w-full lg:hidden"></div>
      
      <main className="pb-24 lg:pb-12 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      <div className="lg:hidden">
        <BottomNav />
      </div>
      
      {/* iOS Home Indicator Simulator - Mobile Only */}
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full z-[60] lg:hidden"></div>
    </div>
  );
}
