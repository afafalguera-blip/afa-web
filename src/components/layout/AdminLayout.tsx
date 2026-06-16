import { useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Calendar,
  Newspaper,
  FolderHeart,
  CalendarRange,
  History as HistoryIcon,
  Bell,
  Megaphone,
  MessageSquare,
  Settings,
  ListTodo,
  Link2,
  UserSquare2,
  Utensils,
  FileText,
  HelpCircle,
  ClipboardList
} from 'lucide-react';

// Payload-style hybrid shell: dark neutral sidebar, light content.
// Flat (no gradients/shadows), small radii, compact nav.
const navClass = ({ isActive }: { isActive: boolean }) => `
  flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors
  ${isActive
    ? 'bg-neutral-800 text-white'
    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100'}
`;

const sectionLabel = 'px-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1';
const sectionWrap = 'pt-4 mt-4 border-t border-neutral-800';

export function AdminLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Force Spanish in Admin
    if (i18n.language !== 'es') {
      i18n.changeLanguage('es');
    }
  }, [i18n]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { state: { from: window.location.pathname } });
      } else if (profile && profile.role !== 'admin') {
        // Optionally show unauthorised page or redirect to /botiga
        alert(t('admin.access_denied'));
        navigate('/botiga');
      }
    }
  }, [user, profile, loading, navigate, t]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-700"></div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-neutral-900 border-r border-neutral-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
        flex flex-col h-screen overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-14 flex-shrink-0 flex items-center px-4 border-b border-neutral-800">
          <Link
            to="/"
            onClick={closeSidebar}
            className="text-[15px] font-semibold text-white hover:text-neutral-300 transition-colors"
          >
            {t('admin.title')}
          </Link>
          <button
            className="ml-auto lg:hidden"
            onClick={closeSidebar}
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 custom-scrollbar">
          <NavLink to="/admin/dashboard" onClick={closeSidebar} className={navClass}>
            <LayoutDashboard className="w-[18px] h-[18px]" />
            {t('admin.sidebar.dashboard')}
          </NavLink>

          <div className={sectionWrap}>
            <p className={sectionLabel}>{t('admin.sidebar.management')}</p>
            <NavLink to="/admin/inscriptions" onClick={closeSidebar} className={navClass}>
              <Users className="w-[18px] h-[18px]" />
              {t('admin.sidebar.inscriptions')}
            </NavLink>
            <NavLink to="/admin/inscription-config" onClick={closeSidebar} className={navClass}>
              <ClipboardList className="w-[18px] h-[18px]" />
              {t('admin.sidebar.inscription_config', "Config. Inscripcions")}
            </NavLink>
            <NavLink to="/admin/payments" onClick={closeSidebar} className={navClass}>
              <CreditCard className="w-[18px] h-[18px]" />
              {t('admin.sidebar.payments')}
            </NavLink>
            <NavLink to="/admin/finances" onClick={closeSidebar} className={navClass}>
              <TrendingUp className="w-[18px] h-[18px]" />
              {t('admin.sidebar.finances')}
            </NavLink>
          </div>

          <div className={sectionWrap}>
            <p className={sectionLabel}>{t('admin.sidebar.shop')}</p>
            <NavLink to="/admin/shop/orders" onClick={closeSidebar} className={navClass}>
              <CreditCard className="w-[18px] h-[18px]" />
              {t('admin.sidebar.orders')}
            </NavLink>
            <NavLink to="/admin/shop/inventory" onClick={closeSidebar} className={navClass}>
              <LayoutDashboard className="w-[18px] h-[18px]" />
              {t('admin.sidebar.inventory')}
            </NavLink>
          </div>

          <div className={sectionWrap}>
            <p className={sectionLabel}>{t('admin.sidebar.communication')}</p>
            <NavLink to="/admin/contactes" onClick={closeSidebar} className={navClass}>
              <MessageSquare className="w-[18px] h-[18px]" />
              {t('admin.sidebar.contact_messages')}
            </NavLink>
            <NavLink to="/admin/notifications" onClick={closeSidebar} className={navClass}>
              <Bell className="w-[18px] h-[18px]" />
              {t('admin.sidebar.notifications')}
            </NavLink>
            <NavLink to="/admin/banner" onClick={closeSidebar} className={navClass}>
              <Megaphone className="w-[18px] h-[18px]" />
              {t('admin.sidebar.banner')}
            </NavLink>
          </div>

          <div className={sectionWrap}>
            <p className={sectionLabel}>{t('admin.sidebar.content')}</p>
            <NavLink to="/admin/activities" onClick={closeSidebar} className={navClass}>
              <Calendar className="w-[18px] h-[18px]" />
              {t('admin.sidebar.activities')}
            </NavLink>
            <NavLink to="/admin/faq" onClick={closeSidebar} className={navClass}>
              <HelpCircle className="w-[18px] h-[18px]" />
              {t('admin.sidebar.faq', 'FAQ')}
            </NavLink>
            <NavLink to="/admin/news" onClick={closeSidebar} className={navClass}>
              <Newspaper className="w-[18px] h-[18px]" />
              {t('admin.sidebar.news')}
            </NavLink>
            <NavLink to="/admin/projects" onClick={closeSidebar} className={navClass}>
              <FolderHeart className="w-[18px] h-[18px]" />
              {t('admin.sidebar.projects')}
            </NavLink>
            <NavLink to="/admin/calendar" onClick={closeSidebar} className={navClass}>
              <CalendarRange className="w-[18px] h-[18px]" />
              {t('admin.sidebar.calendar')}
            </NavLink>
            <NavLink to="/admin/tasks" onClick={closeSidebar} className={navClass}>
              <ListTodo className="w-[18px] h-[18px]" />
              {t('admin.sidebar.tasks')}
            </NavLink>
            <NavLink to="/admin/short-links" onClick={closeSidebar} className={navClass}>
              <Link2 className="w-[18px] h-[18px]" />
              Enlaces cortos
            </NavLink>
            <NavLink to="/admin/acollida" onClick={closeSidebar} className={navClass}>
              <Users className="w-[18px] h-[18px]" />
              {t('admin.sidebar.acollida')}
            </NavLink>
            <NavLink to="/admin/menjador" onClick={closeSidebar} className={navClass}>
              <Utensils className="w-[18px] h-[18px]" />
              {t('admin.sidebar.menjador', 'Gestión Menjador')}
            </NavLink>
            <NavLink to="/admin/documents" onClick={closeSidebar} className={navClass}>
              <FolderHeart className="w-[18px] h-[18px]" />
              Documentos
            </NavLink>
            <NavLink to="/admin/forms" onClick={closeSidebar} className={navClass}>
              <FileText className="w-[18px] h-[18px]" />
              {t('forms.admin.title')}
            </NavLink>
          </div>

          <div className={sectionWrap}>
            <p className={sectionLabel}>{t('admin.sidebar.system')}</p>
            <NavLink to="/admin/board" onClick={closeSidebar} className={navClass}>
              <UserSquare2 className="w-[18px] h-[18px]" />
              Sobre AFA / Junta
            </NavLink>
            <NavLink to="/admin/settings" onClick={closeSidebar} className={navClass}>
              <Settings className="w-[18px] h-[18px]" />
              Configuració General
            </NavLink>
            <NavLink to="/admin/observability" onClick={closeSidebar} className={navClass}>
              <HistoryIcon className="w-[18px] h-[18px]" />
              {t('admin.sidebar.observability')}
            </NavLink>
          </div>
        </nav>

        <div className="flex-shrink-0 p-3 border-t border-neutral-800">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-8 h-8 rounded-md bg-neutral-700 text-neutral-100 flex items-center justify-center font-semibold text-xs uppercase">
              {profile?.full_name?.substring(0, 2) || user?.email?.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-medium text-neutral-100 truncate">{profile?.full_name || user?.email}</p>
              <p className="text-xs text-neutral-500 capitalize">{profile?.role || 'User'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-neutral-800 rounded-md text-[13px] font-medium text-neutral-400 hover:bg-neutral-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t('admin.sidebar.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-neutral-200 lg:hidden px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-neutral-500"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-neutral-900">{t('admin.title')}</span>
          <div className="w-8" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-neutral-100 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
