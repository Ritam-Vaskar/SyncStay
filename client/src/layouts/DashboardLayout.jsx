import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
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
  Home,
  MessageSquare,
  Sun,
  Moon,
} from 'lucide-react';

export const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, clearAuth } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
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
        { name: 'Proposals', href: '/planner/proposals', icon: FileText },
        { name: 'Bookings', href: '/planner/bookings', icon: CreditCard },
        { name: 'Analytics', href: '/planner/analytics', icon: BarChart3 },
        { name: 'Messages', href: '/planner/feedback', icon: MessageSquare },
      ];
    }

    if (user?.role === 'hotel') {
      return [
        ...baseItems,
        { name: 'Overview', href: '/hotel/dashboard', icon: Home },
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
        { name: 'All Events', href: '/admin/events', icon: Calendar },
        { name: 'Feedback Conversations', href: '/admin/feedback', icon: MessageSquare },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Audit Logs', href: '/admin/logs', icon: FileText },
      ];
    }

    return baseItems;
  }, [user?.role]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-950 border-r border-transparent dark:border-gray-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6">
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
              className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                      ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white font-semibold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
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
        <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 shadow-sm dark:shadow-none">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Welcome back, {user?.name}!
            </h2>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
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
