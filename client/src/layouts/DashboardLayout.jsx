import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Calendar,
  Package,
  FileText,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  Users,
} from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const navigation = React.useMemo(() => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ];

    if (user?.role === 'planner') {
      return [
        ...baseItems,
        { name: 'Events', href: '/planner/events', icon: Calendar },
        { name: 'Inventory', href: '/planner/inventory', icon: Package },
        { name: 'Proposals', href: '/planner/proposals', icon: FileText },
        { name: 'Bookings', href: '/planner/bookings', icon: CreditCard },
        { name: 'Analytics', href: '/planner/analytics', icon: BarChart3 },
      ];
    }

    if (user?.role === 'hotel') {
      return [
        ...baseItems,
        { name: 'RFPs', href: '/hotel/rfps', icon: FileText },
        { name: 'My Inventory', href: '/hotel/inventory', icon: Package },
        { name: 'Bookings', href: '/hotel/bookings', icon: CreditCard },
      ];
    }

    if (user?.role === 'guest') {
      return [
        ...baseItems,
        { name: 'My Bookings', href: '/guest/bookings', icon: CreditCard },
        { name: 'Browse Events', href: '/guest/events', icon: Calendar },
      ];
    }

    if (user?.role === 'admin') {
      return [
        ...baseItems,
        { name: 'Event Approvals', href: '/admin/approvals', icon: FileText },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'All Events', href: '/admin/events', icon: Calendar },
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Audit Logs', href: '/admin/logs', icon: FileText },
      ];
    }

    return baseItems;
  }, [user?.role]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <h1 className="text-xl font-bold text-primary-600">GroupInv</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white font-semibold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Welcome back, {user?.name}!
            </h2>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
