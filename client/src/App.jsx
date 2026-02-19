import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { MicrositeDashboardLayout } from './layouts/MicrositeDashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { BrowseEventsPage } from './pages/BrowseEventsPage';
import { MicrositePage } from './pages/MicrositePage';
import { MicrositeGuestDashboard } from './pages/MicrositeGuestDashboard';
import { MicrositePlannerDashboard } from './pages/MicrositePlannerDashboard';
import { MicrositeMyBookings } from './pages/MicrositeMyBookings';
import { MicrositePlannerBookings } from './pages/MicrositePlannerBookings';
import { MicrositePlannerGuests } from './pages/MicrositePlannerGuests';
import { MicrositeEventReports } from './pages/MicrositeEventReports';
import { MicrositeHotelsManagement } from './pages/MicrositeHotelsManagement';
import { AdminApprovalsPage } from './pages/AdminApprovalsPage';
import { AdminFeedbackPage } from './pages/AdminFeedbackPage';
import { AdminEventsPage } from './pages/AdminEventsPage';
import { PlannerEventsPage } from './pages/PlannerEventsPage';
import { CreateProposalPage } from './pages/CreateProposalPage';
import { PlannerProposalsPage } from './pages/PlannerProposalsPage';
import { PlannerInventoryPage } from './pages/PlannerInventoryPage';
import { PlannerBookingsPage } from './pages/PlannerBookingsPage';
import { PlannerAnalyticsPage } from './pages/PlannerAnalyticsPage';
import { HotelDashboardPage } from './pages/HotelDashboardPage';
import { HotelRfpsPage } from './pages/HotelRfpsPage';
import { HotelInventoryPage } from './pages/HotelInventoryPage';
import { HotelBookingsPage } from './pages/HotelBookingsPage';
import { eventService } from './services/apiServices';
import { useAuthStore } from './store/authStore';
import ChatBot from './components/ChatBot';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Placeholder pages for other roles
const ProposalsPage = () => <div className="card"><h2 className="text-2xl font-bold">Proposals</h2><p className="mt-4">Proposals management coming soon...</p></div>;
const GuestBookingsPage = () => <div className="card"><h2 className="text-2xl font-bold">My Bookings</h2><p className="mt-4">Guest bookings page coming soon...</p></div>;
const AdminUsersPage = () => <div className="card"><h2 className="text-2xl font-bold">Users Management</h2><p className="mt-4">User management coming soon...</p></div>;
const AdminAnalyticsPage = () => <div className="card"><h2 className="text-2xl font-bold">Admin Analytics</h2><p className="mt-4">Analytics dashboard coming soon...</p></div>;
const AdminLogsPage = () => <div className="card"><h2 className="text-2xl font-bold">Audit Logs</h2><p className="mt-4">Audit logs coming soon...</p></div>;

// Router to decide which microsite dashboard to show based on role
const MicrositeDashboardRouter = () => {
  const { user } = useAuthStore();
  
  if (user?.role === 'planner') {
    return <MicrositePlannerDashboard />;
  }
  
  return <MicrositeGuestDashboard />;
};

// Microsite placeholder pages
const MicrositePaymentsPlaceholder = () => {
  const { slug } = useParams();
  const { data: eventData } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });
  return (
    <MicrositeDashboardLayout event={eventData?.data}>
      <div className="card">
        <h2 className="text-2xl font-bold">Payment History</h2>
        <p className="mt-4 text-gray-600">Payment tracking coming soon...</p>
      </div>
    </MicrositeDashboardLayout>
  );
};

const MicrositeInventoryPlaceholder = () => {
  const { slug } = useParams();
  const { data: eventData } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });
  return (
    <MicrositeDashboardLayout event={eventData?.data}>
      <div className="card">
        <h2 className="text-2xl font-bold">Manage Inventory</h2>
        <p className="mt-4 text-gray-600">Inventory management for this event coming soon...</p>
      </div>
    </MicrositeDashboardLayout>
  );
};





function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public Routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />}
          />

          {/* Public Microsite Route */}
          <Route path="/microsite/:slug" element={<MicrositePage />} />

          {/* Microsite Dashboard Routes - Protected */}
          <Route
            path="/microsite/:slug/dashboard"
            element={
              <ProtectedRoute>
                <MicrositeDashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/microsite/:slug/my-bookings"
            element={
              <ProtectedRoute allowedRoles={['guest']}>
                <MicrositeMyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/microsite/:slug/payments"
            element={
              <ProtectedRoute allowedRoles={['guest']}>
                <MicrositePaymentsPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/microsite/:slug/inventory"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <MicrositeInventoryPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/microsite/:slug/bookings"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <MicrositePlannerBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/microsite/:slug/guests"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <MicrositePlannerGuests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/microsite/:slug/reports"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <MicrositeEventReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/microsite/:slug/hotels"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <MicrositeHotelsManagement />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Planner Routes */}
          <Route
            path="/planner/events"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <PlannerEventsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/proposals/create"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <CreateProposalPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/inventory"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <PlannerInventoryPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/proposals"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <PlannerProposalsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/bookings"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <PlannerBookingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/analytics"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <PlannerAnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Hotel Routes */}
          <Route
            path="/hotel/dashboard"
            element={
              <ProtectedRoute allowedRoles={['hotel']}>
                <DashboardLayout>
                  <HotelDashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hotel/rfps"
            element={
              <ProtectedRoute allowedRoles={['hotel']}>
                <DashboardLayout>
                  <HotelRfpsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hotel/inventory"
            element={
              <ProtectedRoute allowedRoles={['hotel']}>
                <DashboardLayout>
                  <HotelInventoryPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hotel/bookings"
            element={
              <ProtectedRoute allowedRoles={['hotel']}>
                <DashboardLayout>
                  <HotelBookingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Guest Routes */}
          <Route
            path="/guest/bookings"
            element={
              <ProtectedRoute allowedRoles={['guest']}>
                <DashboardLayout>
                  <GuestBookingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <BrowseEventsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/approvals"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <AdminApprovalsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <AdminFeedbackPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <AdminUsersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <AdminEventsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <AdminAnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <AdminLogsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {isAuthenticated && <ChatBot />}
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
