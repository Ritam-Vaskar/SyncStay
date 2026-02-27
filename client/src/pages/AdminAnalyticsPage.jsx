import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  Users,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  BarChart3,
} from 'lucide-react';
import api from '@/services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AdminAnalyticsPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/admin/dashboard');
      return response;
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const { overview, breakdowns, recentActivity, trends, topPerformers } = dashboardData || {};

  // Prepare chart data
  const userGrowthData = trends?.userGrowth?.map(item => ({
    date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: item.count,
  })) || [];

  const eventGrowthData = trends?.eventGrowth?.map(item => ({
    date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    events: item.count,
  })) || [];

  const bookingGrowthData = trends?.bookingGrowth?.map(item => ({
    date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    bookings: item.count,
  })) || [];

  const revenueTrendData = trends?.revenueTrend?.map(item => ({
    date: new Date(item._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.total,
    transactions: item.count,
  })) || [];

  const usersByRoleData = Object.entries(breakdowns?.usersByRole || {}).map(([role, count]) => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value: count,
  }));

  const eventsByStatusData = Object.entries(breakdowns?.eventsByStatus || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  const bookingsByStatusData = Object.entries(breakdowns?.bookingsByStatus || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">Comprehensive platform statistics and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={overview?.totalUsers || 0}
          subtitle={`${overview?.activeUsers || 0} active`}
          icon={Users}
          color="bg-blue-500"
          trend={recentActivity?.users}
          trendLabel="New (30 days)"
        />
        <StatCard
          title="Total Events"
          value={overview?.totalEvents || 0}
          subtitle={`${overview?.activeEvents || 0} active`}
          icon={Calendar}
          color="bg-green-500"
          trend={recentActivity?.events}
          trendLabel="New (30 days)"
        />
        <StatCard
          title="Total Bookings"
          value={overview?.totalBookings || 0}
          subtitle={`${overview?.confirmedBookings || 0} confirmed`}
          icon={CreditCard}
          color="bg-purple-500"
          trend={recentActivity?.bookings}
          trendLabel="New (30 days)"
        />
        <StatCard
          title="Total Revenue"
          value={`$${(overview?.totalRevenue || 0).toLocaleString()}`}
          subtitle="All time"
          icon={DollarSign}
          color="bg-yellow-500"
        />
      </div>

      {/* Charts Row 1: Growth Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <ChartCard title="User Growth (Last 7 Days)" icon={Users}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Event Growth */}
        <ChartCard title="Event Growth (Last 7 Days)" icon={Calendar}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={eventGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="events" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2: Booking & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Growth */}
        <ChartCard title="Booking Growth (Last 7 Days)" icon={CreditCard}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Revenue Trend */}
        <ChartCard title="Revenue Trend (Last 30 Days)" icon={DollarSign}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3: Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users by Role */}
        <ChartCard title="Users by Role" icon={Users}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={usersByRoleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {usersByRoleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Events by Status */}
        <ChartCard title="Events by Status" icon={Calendar}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={eventsByStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {eventsByStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bookings by Status */}
        <ChartCard title="Bookings by Status" icon={CreditCard}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={bookingsByStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {bookingsByStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Events */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Top Events by Bookings</h3>
          </div>
          <div className="space-y-3">
            {topPerformers?.events?.map((event, index) => (
              <div key={event._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{event.eventName}</p>
                    <p className="text-sm text-gray-600">{event.eventType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{event.bookingCount}</p>
                  <p className="text-xs text-gray-600">bookings</p>
                </div>
              </div>
            ))}
            {(!topPerformers?.events || topPerformers.events.length === 0) && (
              <p className="text-center text-gray-500 py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Top Planners */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Award className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Top Planners by Events</h3>
          </div>
          <div className="space-y-3">
            {topPerformers?.planners?.map((planner, index) => (
              <div key={planner._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{planner.plannerName}</p>
                    <p className="text-sm text-gray-600">{planner.plannerEmail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{planner.eventCount}</p>
                  <p className="text-xs text-gray-600">events</p>
                </div>
              </div>
            ))}
            {(!topPerformers?.planners || topPerformers.planners.length === 0) && (
              <p className="text-center text-gray-500 py-4">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendLabel }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${color} rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">+{trend}</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        {trendLabel && trend !== undefined && (
          <p className="text-xs text-gray-500 mt-1">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}
