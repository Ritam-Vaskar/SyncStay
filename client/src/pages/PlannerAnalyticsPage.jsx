import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Hotel,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { bookingService, eventService, inventoryService } from '@/services/apiServices';

export const PlannerAnalyticsPage = () => {
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
  const activeEvents = events.filter(e => e.status === 'active').length;
  
  const totalRooms = inventory.reduce((sum, i) => sum + i.totalRooms, 0);
  const availableRooms = inventory.reduce((sum, i) => sum + i.availableRooms, 0);
  const occupancyRate = totalRooms > 0 ? ((totalRooms - availableRooms) / totalRooms * 100).toFixed(1) : 0;

  const uniqueGuests = new Set(bookings.map(b => b.email)).size;

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
    checkedIn: bookings.filter(b => b.status === 'checked-in').length,
    checkedOut: bookings.filter(b => b.status === 'checked-out').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  // Recent bookings trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBookings = bookings.filter(b => new Date(b.createdAt) >= thirtyDaysAgo);
  const trendPercentage = bookings.length > 0 
    ? ((recentBookings.length / bookings.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your business performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">${totalRevenue.toFixed(2)}</p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>From confirmed bookings</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalBookings}</p>
              <div className="flex items-center mt-2 text-sm text-blue-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>{trendPercentage}% in last 30 days</span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Unique Guests</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{uniqueGuests}</p>
              <div className="flex items-center mt-2 text-sm text-purple-600">
                <Users className="h-4 w-4 mr-1" />
                <span>Across {activeEvents} active events</span>
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{occupancyRate}%</p>
              <div className="flex items-center mt-2 text-sm text-orange-600">
                <Hotel className="h-4 w-4 mr-1" />
                <span>{totalRooms - availableRooms}/{totalRooms} rooms booked</span>
              </div>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Hotel className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bookings by Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Bookings by Status</h2>
          <div className="space-y-4">
            {Object.entries(bookingsByStatus).map(([status, count]) => {
              const percentage = totalBookings > 0 ? (count / totalBookings * 100).toFixed(1) : 0;
              const colors = {
                pending: 'bg-yellow-500',
                confirmed: 'bg-green-500',
                checkedIn: 'bg-blue-500',
                checkedOut: 'bg-gray-500',
                cancelled: 'bg-red-500'
              };
              
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {status.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[status]} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Event */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top Events by Revenue</h2>
          <div className="space-y-4">
            {revenueByEvent.slice(0, 5).map((event, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{event.name}</p>
                  <p className="text-sm text-gray-600">{event.bookings} bookings</p>
                </div>
                <p className="text-lg font-bold text-primary-600">${event.revenue.toFixed(2)}</p>
              </div>
            ))}
            {revenueByEvent.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No event revenue data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Performance */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Event Performance Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Guests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <tr key={event._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{event.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{event.expectedGuests || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{eventBookings.length}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">${eventRevenue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">{conversion}%</span>
                        {conversion > 50 ? (
                          <ArrowUp className="h-4 w-4 ml-1 text-green-600" />
                        ) : conversion > 0 ? (
                          <ArrowDown className="h-4 w-4 ml-1 text-orange-600" />
                        ) : null}
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
