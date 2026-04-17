import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AuthProvider } from './core/contexts/AuthContext';
import { CartProvider } from './features/shop/contexts/CartContext';
import { GoogleAnalytics } from './components/common/GoogleAnalytics';

// Shared loading fallback
const Loading = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

// Public pages
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Extraescolars = lazy(() => import('./pages/Extraescolars').then(m => ({ default: m.Extraescolars })));
const NewsPage = lazy(() => import('./pages/NewsPage').then(m => ({ default: m.NewsPage })));
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'));
const InscriptionPage = lazy(() => import('./pages/InscriptionPage'));
const FeesPage = lazy(() => import('./pages/FeesPage'));
const GeneralCalendarPage = lazy(() => import('./pages/GeneralCalendarPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const PrivacyPolicy = lazy(() => import('./pages/Legal/PrivacyPolicy'));
const CookiesPolicy = lazy(() => import('./pages/Legal/CookiesPolicy'));
const SantJordiIdeasPage = lazy(() => import('./pages/SantJordiIdeasPage'));
const ShopLanding = lazy(() => import('./features/shop/pages/ShopLanding').then(m => ({ default: m.ShopLanding })));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));

// Admin pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout').then(m => ({ default: m.AdminLayout })));
const Dashboard = lazy(() => import('./pages/admin/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const InventoryPage = lazy(() => import('./pages/admin/shop/InventoryPage').then(m => ({ default: m.InventoryPage })));
const OrdersPage = lazy(() => import('./pages/admin/shop/OrdersPage').then(m => ({ default: m.OrdersPage })));
const InscriptionsPage = lazy(() => import('./pages/admin/inscriptions/InscriptionsPage'));
const PaymentsPage = lazy(() => import('./pages/admin/payments/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const FinanceDashboard = lazy(() => import('./pages/admin/finances/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const ActivitiesManager = lazy(() => import('./pages/admin/ActivitiesManager'));
const NewsManager = lazy(() => import('./pages/admin/NewsManager'));
const NewsEditorPage = lazy(() => import('./pages/admin/NewsEditorPage'));
const ProjectsManager = lazy(() => import('./pages/admin/ProjectsManager'));
const EventsManager = lazy(() => import('./pages/admin/EventsManager'));
const NotificationManager = lazy(() => import('./pages/admin/NotificationManager'));
const DocumentsManager = lazy(() => import('./pages/admin/DocumentsManager'));
const AdminObservability = lazy(() => import('./pages/admin/AdminObservability'));
const AcollidaManager = lazy(() => import('./pages/admin/AcollidaManager'));
const AnnouncementManager = lazy(() => import('./pages/admin/AnnouncementManager'));
const ContactManager = lazy(() => import('./pages/admin/ContactManager'));
const SiteSettingsManager = lazy(() => import('./pages/admin/SiteSettingsManager'));
const TasksManager = lazy(() => import('./pages/admin/TasksManager'));
const ShortLinksManager = lazy(() => import('./pages/admin/ShortLinksManager'));

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <GoogleAnalytics />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="extraescolars" element={<Extraescolars />} />
                <Route path="noticies" element={<NewsPage />} />
                <Route path="noticies/:slug" element={<NewsDetailPage />} />
                <Route path="extraescolars/inscripcio" element={<InscriptionPage />} />
                <Route path="botiga" element={<ShopLanding />} />
                <Route path="quotes" element={<FeesPage />} />
                <Route path="calendari" element={<GeneralCalendarPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="contacte" element={<ContactPage />} />
                <Route path="privacitat" element={<PrivacyPolicy />} />
                <Route path="cookies" element={<CookiesPolicy />} />
                <Route path="especial/sant-jordi" element={<SantJordiIdeasPage />} />
              </Route>

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="inscriptions" element={<InscriptionsPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="finances" element={<FinanceDashboard />} />
                <Route path="shop/inventory" element={<InventoryPage />} />
                <Route path="shop/orders" element={<OrdersPage />} />
                <Route path="activities" element={<ActivitiesManager />} />
                <Route path="news" element={<NewsManager />} />
                <Route path="news/:id" element={<NewsEditorPage />} />
                <Route path="projects" element={<ProjectsManager />} />
                <Route path="calendar" element={<EventsManager />} />
                <Route path="tasks" element={<TasksManager />} />
                <Route path="short-links" element={<ShortLinksManager />} />
                <Route path="documents" element={<DocumentsManager />} />
                <Route path="notifications" element={<NotificationManager />} />
                <Route path="acollida" element={<AcollidaManager />} />
                <Route path="banner" element={<AnnouncementManager />} />
                <Route path="contactes" element={<ContactManager />} />
                <Route path="settings" element={<SiteSettingsManager />} />
                <Route path="observability" element={<AdminObservability />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
