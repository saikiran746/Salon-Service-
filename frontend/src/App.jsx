import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SiteProvider } from './context/SiteContext';
import { Suspense, lazy, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/common/PageTransition';
import LuxurySplashScreen from './components/common/LuxurySplashScreen';

// Client Pages
import Home from './pages/client/Home';
const Services = lazy(() => import('./pages/client/Services'));
const Memberships = lazy(() => import('./pages/client/Memberships'));
const Gallery = lazy(() => import('./pages/client/Gallery'));
const Contact = lazy(() => import('./pages/client/Contact'));
const Login = lazy(() => import('./pages/client/Login'));
const Register = lazy(() => import('./pages/client/Register'));
const ForgotPassword = lazy(() => import('./pages/client/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/client/ResetPassword'));
const BookAppointment = lazy(() => import('./pages/client/BookAppointment'));
const ClientDashboard = lazy(() => import('./pages/client/Dashboard'));

// Admin Pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminSecureLogin = lazy(() => import('./pages/admin/AdminSecureLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminAppointments = lazy(() => import('./pages/admin/Appointments'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminServices = lazy(() => import('./pages/admin/Services'));
const AdminStaff = lazy(() => import('./pages/admin/Staff'));
const AdminBilling = lazy(() => import('./pages/admin/Billing'));
const AdminMembership = lazy(() => import('./pages/admin/Membership'));
const AdminGallery = lazy(() => import('./pages/admin/Gallery'));
const AdminLeads = lazy(() => import('./pages/admin/Leads'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminEmailMarketing = lazy(() => import('./pages/admin/EmailMarketing'));
const AdminCustomerDetail = lazy(() => import('./pages/admin/CustomerDetail'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// Analytics Pages
const ClientAnalytics = lazy(() => import('./pages/admin/analytics/ClientAnalytics'));
const StaffPerformance = lazy(() => import('./pages/admin/analytics/StaffPerformance'));
const ServiceAnalytics = lazy(() => import('./pages/admin/analytics/ServiceAnalytics'));
const AppointmentAnalytics = lazy(() => import('./pages/admin/analytics/AppointmentAnalytics'));
const BillingAnalytics = lazy(() => import('./pages/admin/analytics/BillingAnalytics'));
const AdminActivity = lazy(() => import('./pages/admin/analytics/AdminActivity'));
const WebsitePreview = lazy(() => import('./pages/admin/WebsitePreview'));

const Loader = () => (
  <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
    <div className="flex flex-col items-center gap-6">
      <span className="font-display text-lg text-gold-500 tracking-[0.25em] uppercase animate-pulse">TONI & GUY</span>
      <div className="w-24 h-[1px] bg-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 bg-gold-500 w-full animate-shimmer" style={{
          background: 'linear-gradient(90deg, transparent 0%, #C9A84C 50%, transparent 100%)',
          backgroundSize: '200% 100%',
        }} />
      </div>
    </div>
  </div>
);

// Protected route for authenticated users
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
};

// Admin route guard
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <Loader />;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
};

// Guest only route
const GuestRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <Loader />;
  if (isAuthenticated && isAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<Loader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Client Routes */}
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/services" element={<PageTransition><Services /></PageTransition>} />
          <Route path="/memberships" element={<PageTransition><Memberships /></PageTransition>} />
          <Route path="/gallery" element={<PageTransition><Gallery /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />

          {/* Guest Routes */}
          <Route path="/login" element={<PageTransition><GuestRoute><Login /></GuestRoute></PageTransition>} />
          <Route path="/register" element={<PageTransition><GuestRoute><Register /></GuestRoute></PageTransition>} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />

          {/* Customer Protected Routes */}
          <Route path="/book" element={<PageTransition><ProtectedRoute><BookAppointment /></ProtectedRoute></PageTransition>} />
          <Route path="/dashboard" element={<PageTransition><ProtectedRoute><ClientDashboard /></ProtectedRoute></PageTransition>} />
          <Route path="/dashboard/:tab" element={<PageTransition><ProtectedRoute><ClientDashboard /></ProtectedRoute></PageTransition>} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          {/* Magic-link auto-login from security alert email — no guard, token IS the credential */}
          <Route path="/admin/secure-login" element={<AdminSecureLogin />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/appointments" element={<AdminRoute><AdminAppointments /></AdminRoute>} />
          <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
          <Route path="/admin/customers/:id" element={<AdminRoute><AdminCustomerDetail /></AdminRoute>} />
          <Route path="/admin/services" element={<AdminRoute><AdminServices /></AdminRoute>} />
          <Route path="/admin/staff" element={<AdminRoute><AdminStaff /></AdminRoute>} />
          <Route path="/admin/billing" element={<AdminRoute><AdminBilling /></AdminRoute>} />
          <Route path="/admin/memberships" element={<AdminRoute><AdminMembership /></AdminRoute>} />
          <Route path="/admin/gallery" element={<AdminRoute><AdminGallery /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
          <Route path="/admin/leads" element={<AdminRoute><AdminLeads /></AdminRoute>} />
          <Route path="/admin/email-marketing" element={<AdminRoute><AdminEmailMarketing /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />

          {/* Analytics Routes */}
          <Route path="/admin/analytics/clients" element={<AdminRoute><ClientAnalytics /></AdminRoute>} />
          <Route path="/admin/analytics/staff" element={<AdminRoute><StaffPerformance /></AdminRoute>} />
          <Route path="/admin/analytics/services" element={<AdminRoute><ServiceAnalytics /></AdminRoute>} />
          <Route path="/admin/analytics/appointments" element={<AdminRoute><AppointmentAnalytics /></AdminRoute>} />
          <Route path="/admin/analytics/billing" element={<AdminRoute><BillingAnalytics /></AdminRoute>} />
          <Route path="/admin/analytics/activity" element={<AdminRoute><AdminActivity /></AdminRoute>} />
          <Route path="/admin/preview" element={<AdminRoute><WebsitePreview /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center flex-col gap-4">
              <h1 className="text-9xl font-display text-gold-500/10">404</h1>
              <p className="text-white/20 font-sans tracking-widest text-xs">PAGE NOT FOUND</p>
              <a href="/" className="btn-gold mt-4">RETURN HOME</a>
            </div>
          } />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <SiteProvider>
        <AnimatePresence mode="wait">
          {showSplash ? (
            <LuxurySplashScreen key="splash" onComplete={() => setShowSplash(false)} />
          ) : (
            <AppRoutes key="app" />
          )}
        </AnimatePresence>
      </SiteProvider>
    </AuthProvider>
  );
}
