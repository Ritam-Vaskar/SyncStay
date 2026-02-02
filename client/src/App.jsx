import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Placeholder pages
const EventsPage = () => <div className="card"><h2 className="text-2xl font-bold">Events</h2><p className="mt-4">Events management coming soon...</p></div>;
const InventoryPage = () => <div className="card"><h2 className="text-2xl font-bold">Inventory</h2><p className="mt-4">Inventory management coming soon...</p></div>;
const ProposalsPage = () => <div className="card"><h2 className="text-2xl font-bold">Proposals</h2><p className="mt-4">Proposals management coming soon...</p></div>;
const BookingsPage = () => <div className="card"><h2 className="text-2xl font-bold">Bookings</h2><p className="mt-4">Bookings management coming soon...</p></div>;
const AnalyticsPage = () => <div className="card"><h2 className="text-2xl font-bold">Analytics</h2><p className="mt-4">Analytics dashboard coming soon...</p></div>;

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />}
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
                  <EventsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/inventory"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <InventoryPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/proposals"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <ProposalsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/bookings"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <BookingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner/analytics"
            element={
              <ProtectedRoute allowedRoles={['planner']}>
                <DashboardLayout>
                  <AnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Hotel Routes */}
          <Route
            path="/hotel/rfps"
            element={
              <ProtectedRoute allowedRoles={['hotel']}>
                <DashboardLayout>
                  <ProposalsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hotel/inventory"
            element={
              <ProtectedRoute allowedRoles={['hotel']}>
                <DashboardLayout>
                  <InventoryPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hotel/bookings"
            element={
              <ProtectedRoute allowedRoles={['hotel']}>
                <DashboardLayout>
                  <BookingsPage />
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
                  <BookingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/guest/events"
            element={
              <ProtectedRoute allowedRoles={['guest']}>
                <DashboardLayout>
                  <EventsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <div className="card"><h2 className="text-2xl font-bold">Users</h2></div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <EventsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <AnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <div className="card"><h2 className="text-2xl font-bold">Audit Logs</h2></div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
