import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/layout/AdminLayout';
import { Home } from './pages/Home';
import { Extraescolars } from './pages/Extraescolars';
import { AdminLogin } from './pages/admin/AdminLogin';
import { Dashboard } from './pages/admin/dashboard/Dashboard';
import { InventoryPage } from './pages/admin/shop/InventoryPage';
import { OrdersPage } from './pages/admin/shop/OrdersPage';
import InscriptionsPage from './pages/admin/inscriptions/InscriptionsPage';
import { PaymentsPage } from './pages/admin/payments/PaymentsPage';
import { FinanceDashboard } from './pages/admin/finances/FinanceDashboard';
import InscriptionPage from './pages/InscriptionPage';
import ActivitiesManager from './pages/admin/ActivitiesManager';
import FeesPage from './pages/FeesPage';
import GeneralCalendarPage from './pages/GeneralCalendarPage';
import NewsManager from './pages/admin/NewsManager';
import ProjectsManager from './pages/admin/ProjectsManager';
import EventsManager from './pages/admin/EventsManager';
import AdminObservability from './pages/admin/AdminObservability';

import { NewsPage } from './pages/NewsPage';

import { ShopLanding } from './pages/shop/ShopLanding';

// Placeholder components
// const Placeholder = ({ title }: { title: string }) => (
//   <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
//     <h1 className="text-2xl font-bold text-slate-400">{title}</h1>
//     <p className="text-slate-500 mt-2">Pròximament...</p>
//   </div>
// );

// ... imports
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="extraescolars" element={<Extraescolars />} />
            <Route path="noticies" element={<NewsPage />} />
            <Route path="extraescolars/inscripcio" element={<InscriptionPage />} />
            <Route path="botiga" element={<ShopLanding />} />
            <Route path="quotes" element={<FeesPage />} />
            <Route path="calendari" element={<GeneralCalendarPage />} />
            {/* <Route path="perfil" element={<Placeholder title="Perfil" />} /> */}
          </Route>
          
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
             {/* ... admin routes */}
             <Route path="dashboard" element={<Dashboard />} />
             <Route path="inscriptions" element={<InscriptionsPage />} />
             <Route path="payments" element={<PaymentsPage />} />
             <Route path="finances" element={<FinanceDashboard />} />
             <Route path="shop/inventory" element={<InventoryPage />} />
             <Route path="shop/orders" element={<OrdersPage />} />
             <Route path="activities" element={<ActivitiesManager />} />
             <Route path="news" element={<NewsManager />} />
             <Route path="projects" element={<ProjectsManager />} />
             <Route path="calendar" element={<EventsManager />} />
             <Route path="observability" element={<AdminObservability />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
