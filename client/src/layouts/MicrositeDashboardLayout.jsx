import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { 
  LayoutDashboard, 
  Calendar, 
  Hotel, 
  Users, 
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export const MicrositeDashboardLayout = ({ children, event }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    toast.success('Logged out successfully');
    navigate(`/microsite/${slug}`);
  };

  // Navigation based on user role
  const guestNavigation = [
    { name: 'Event Home', href: `/microsite/${slug}`, icon: Home },
    { name: 'My Dashboard', href: `/microsite/${slug}/dashboard`, icon: LayoutDashboard },
    { name: 'My Bookings', href: `/microsite/${slug}/my-bookings`, icon: Calendar },
    { name: 'Payments', href: `/microsite/${slug}/payments`, icon: CreditCard },
  ];

  const plannerNavigation = [
    { name: 'Event Home', href: `/microsite/${slug}`, icon: Home },
    { name: 'Dashboard', href: `/microsite/${slug}/dashboard`, icon: LayoutDashboard },
    { name: 'Select Hotels', href: `/microsite/${slug}/hotels`, icon: Hotel },
    { name: 'Manage Inventory', href: `/microsite/${slug}/inventory`, icon: Hotel },
    { name: 'All Bookings', href: `/microsite/${slug}/bookings`, icon: Calendar },
    { name: 'Guest List', href: `/microsite/${slug}/guests`, icon: Users },
    { name: 'Reports', href: `/microsite/${slug}/reports`, icon: FileText },
  ];

  const navigation = user?.role === 'planner' ? plannerNavigation : guestNavigation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* StaySync Logo */}
          <div className="px-6 pt-6 pb-2 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  StaySync
                </span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Event branding */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 mb-1">{event?.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Event Dashboard</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="px-4 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quick Info
                </p>
              </div>
              <div className="space-y-3 px-4 py-2">
                <div>
                  <p className="text-xs text-gray-600">Event Type</p>
                  <p className="text-sm font-semibold capitalize">{event?.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Location</p>
                  <p className="text-sm font-semibold">{event?.location?.city}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Your Role</p>
                  <p className="text-sm font-semibold capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-600 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <Menu className="h-6 w-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Event Dashboard</h1>
                  <p className="text-sm text-gray-600">
                    {user?.role === 'planner' 
                      ? 'Manage your event in real-time' 
                      : 'View your bookings and event details'}
                  </p>
                </div>
              </div>
              
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-primary-600 flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Main Site
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
