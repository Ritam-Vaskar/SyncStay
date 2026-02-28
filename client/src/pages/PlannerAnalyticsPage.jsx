import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Calendar, 
  IndianRupee,
  Users, 
  Hotel,
  ArrowUp,
  ArrowDown,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { bookingService, eventService, inventoryService } from '@/services/apiServices';
import { useThemeStore } from '@/store/themeStore';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

export const PlannerAnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('30'); // 7, 30, 90 days
  const { isDark } = useThemeStore();
  const chartGridColor = isDark ? '#374151' : '#e5e7eb';
  const chartTickColor = isDark ? '#9ca3af' : '#6b7280';
  const chartTooltipStyle = isDark
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }
    : { backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' };

  const { data: bookingsData } = useQuery({
    queryKey: ['planner-bookings'],
    queryFn: () => bookingService.getAll(),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['planner-events'],
    queryFn: () => eventService.getAll(),
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['planner-inventory'],
    queryFn: () => inventoryService.getAll(),
  });

  const bookings = bookingsData?.data || [];
  const events = eventsData?.data || [];
  const inventory = inventoryData?.data || [];

  // Calculate metrics
  const totalRevenue = bookings
    .filter(b => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
    .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const activeEvents = events.filter(e => e.status === 'active' || e.status === 'rfp-published').length;
  
  // Calculate occupancy from inventory
  const totalRooms = inventory.reduce((sum, i) => sum + (i.totalRooms || 0), 0);
  const availableRooms = inventory.reduce((sum, i) => sum + (i.availableRooms || 0), 0);
  
  // Calculate booked rooms from bookings (more reliable)
  const bookedRoomsFromBookings = bookings
    .filter(b => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
    .reduce((sum, b) => sum + (b.roomDetails?.numberOfRooms || 0), 0);
  
  // Use the higher value between inventory calculation and booking calculation
  const bookedRooms = Math.max(totalRooms - availableRooms, bookedRoomsFromBookings);
  const effectiveTotalRooms = totalRooms > 0 ? totalRooms : bookedRooms; // If no inventory, use booked rooms as baseline
  
  const occupancyRate = effectiveTotalRooms > 0 
    ? ((bookedRooms / effectiveTotalRooms) * 100).toFixed(1) 
    : 0;

  const uniqueGuests = new Set(bookings.map(b => b.guestDetails?.email || b.guest?.email).filter(Boolean)).size;

  // Revenue by event
  const revenueByEvent = events.map(event => {
    const eventBookings = bookings.filter(b => b.event?._id === event._id || b.event === event._id);
    const revenue = eventBookings
      .filter(b => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
      .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
    return {
      name: event.name,
      revenue,
      bookings: eventBookings.length
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Bookings by status
  const bookingsByStatus = {
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    'checked-in': bookings.filter(b => b.status === 'checked-in').length,
    'checked-out': bookings.filter(b => b.status === 'checked-out').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  // Prepare chart data for bookings by status
  const statusChartData = Object.entries(bookingsByStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
    value: count,
    percentage: totalBookings > 0 ? ((count / totalBookings) * 100).toFixed(1) : 0
  }));

  // Colors for pie chart
  const COLORS = {
    'Pending': '#f59e0b',
    'Confirmed': '#10b981',
    'Checked in': '#3b82f6',
    'Checked out': '#6b7280',
    'Cancelled': '#ef4444'
  };

  // Revenue trend data (last 30 days)
  const daysAgo = parseInt(timeRange);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  
  const revenueTrendData = [];
  for (let i = daysAgo; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    
    const dayBookings = bookings.filter(b => {
      const bookingDate = new Date(b.createdAt);
      return bookingDate.toDateString() === date.toDateString() &&
             ['confirmed', 'checked-in', 'checked-out'].includes(b.status);
    });
    
    const dayRevenue = dayBookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
    
    revenueTrendData.push({
      date: dateStr,
      revenue: dayRevenue,
      bookings: dayBookings.length
    });
  }

  // Top events chart data
  const topEventsChartData = revenueByEvent.slice(0, 5).map(event => ({
    name: event.name.length > 20 ? event.name.substring(0, 20) + '...' : event.name,
    revenue: event.revenue,
    bookings: event.bookings
  }));

  // Recent bookings trend
  const recentBookings = bookings.filter(b => new Date(b.createdAt) >= startDate);
  const trendPercentage = bookings.length > 0 
    ? ((recentBookings.length / bookings.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive overview of your business performance</p>
        </div>
        
        {/* Time Range Filter */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          {[
            { value: '7', label: '7 Days' },
            { value: '30', label: '30 Days' },
            { value: '90', label: '90 Days' }
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range.value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2 flex items-center">
                <IndianRupee className="h-6 w-6" />
                {totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>From confirmed bookings</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 p-3 rounded-lg">
              <IndianRupee className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalBookings}</p>
              <div className="flex items-center mt-2 text-sm text-blue-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>{trendPercentage}% in selected period</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Unique Guests</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{uniqueGuests}</p>
              <div className="flex items-center mt-2 text-sm text-purple-600">
                <Activity className="h-4 w-4 mr-1" />
                <span>Across {activeEvents} active events</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 p-3 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{occupancyRate}%</p>
              <div className="flex items-center mt-2 text-sm text-orange-600">
                <Hotel className="h-4 w-4 mr-1" />
                <span>{bookedRooms}/{effectiveTotalRooms} rooms booked</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 p-3 rounded-lg">
              <Hotel className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Revenue Trend</h2>
            <p className="text-sm text-gray-600 mt-1">Daily revenue over the selected period</p>
          </div>
          <BarChart3 className="h-6 w-6 text-primary-600" />
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={revenueTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: chartTickColor }} 
              angle={-45} 
              textAnchor="end" 
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: chartTickColor }} 
              tickFormatter={(value) => `₹${value.toLocaleString('en-IN', { notation: 'compact' })}`}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'Revenue (₹)') return [`₹${value.toLocaleString('en-IN')}`, 'Revenue'];
                return [value, 'Bookings'];
              }}
              contentStyle={chartTooltipStyle}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
              name="Revenue (₹)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bookings by Status Pie Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Bookings by Status</h2>
              <p className="text-sm text-gray-600 mt-1">Distribution of booking statuses</p>
            </div>
            <PieChart className="h-6 w-6 text-primary-600" />
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <RechartsPieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percentage }) => percentage > 0 ? `${name}: ${percentage}%` : ''}
                outerRadius={110}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [
                  `${value} bookings (${props.payload.percentage}%)`,
                  name
                ]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Events by Revenue */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Top Events by Revenue</h2>
              <p className="text-sm text-gray-600 mt-1">Best performing events</p>
            </div>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          {topEventsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topEventsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12, fill: chartTickColor }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: chartTickColor }} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'Revenue (₹)') return [`₹${value.toLocaleString('en-IN')}`, 'Revenue'];
                    return [value, 'Bookings'];
                  }}
                  contentStyle={chartTooltipStyle}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue (₹)" radius={[0, 8, 8, 0]} barSize={20} />
                <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No event data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenue by Event List */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">All Events Revenue Breakdown</h2>
        <div className="space-y-3">
          {revenueByEvent.slice(0, 10).map((event, index) => {
            const percentage = totalRevenue > 0 ? ((event.revenue / totalRevenue) * 100).toFixed(1) : 0;
            return (
              <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-600">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{event.name}</p>
                  <p className="text-sm text-gray-600">{event.bookings} bookings • {percentage}% of total revenue</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-600 flex items-center justify-end">
                    <IndianRupee className="h-4 w-4" />
                    {event.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            );
          })}
          {revenueByEvent.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No event revenue data yet</p>
              <p className="text-sm mt-1">Revenue will appear here once bookings are confirmed</p>
            </div>
          )}
        </div>
      </div>

      {/* Event Performance Table */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Event Performance Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Event Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Expected Guests
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Conversion
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => {
                const eventBookings = bookings.filter(b => b.event?._id === event._id || b.event === event._id);
                const eventRevenue = eventBookings
                  .filter(b => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
                  .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
                const conversion = event.expectedGuests > 0 
                  ? ((eventBookings.length / event.expectedGuests) * 100).toFixed(1)
                  : 0;

                return (
                  <tr key={event._id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{event.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                        event.status === 'active' ? 'bg-green-100 text-green-800' : 
                        event.status === 'rfp-published' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status === 'rfp-published' ? 'Active' : event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{event.expectedGuests || 0}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">{eventBookings.length}</td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600 flex items-center">
                      <IndianRupee className="h-4 w-4" />
                      {eventRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{conversion}%</span>
                        {conversion >= 50 ? (
                          <span className="flex items-center text-green-600 text-xs font-medium">
                            <ArrowUp className="h-3 w-3 mr-1" />
                            High
                          </span>
                        ) : conversion > 0 ? (
                          <span className="flex items-center text-orange-600 text-xs font-medium">
                            <ArrowDown className="h-3 w-3 mr-1" />
                            Low
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
