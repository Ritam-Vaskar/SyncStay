import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Hotel,
  Calendar,
  ArrowUp,
  ArrowDown,
  PieChart,
  BarChart3
} from 'lucide-react';
import { bookingService, eventService } from '@/services/apiServices';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate } from '@/utils/helpers';

export const MicrositeEventReports = () => {
  const { slug } = useParams();

  // Fetch event details
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  // Fetch bookings for this event
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['event-bookings', eventData?.data?._id],
    queryFn: () => bookingService.getAll({ event: eventData.data._id }),
    enabled: !!eventData?.data?._id,
  });

  if (eventLoading || bookingsLoading) {
    return (
      <MicrositeDashboardLayout event={eventData?.data}>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </MicrositeDashboardLayout>
    );
  }

  const event = eventData?.data;
  const bookings = bookingsData?.data || [];

  // Calculate event-specific metrics
  const totalRevenue = bookings
    .filter(b => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
    .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const checkedInBookings = bookings.filter(b => b.status === 'checked-in').length;
  const checkedOutBookings = bookings.filter(b => b.status === 'checked-out').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  const uniqueGuests = new Set(bookings.map(b => b.guestDetails?.email || b.email)).size;
  const totalRooms = bookings.reduce((sum, b) => sum + (b.roomDetails?.numberOfRooms || 0), 0);
  
  const conversionRate = event?.expectedGuests > 0
    ? ((totalBookings / event.expectedGuests) * 100).toFixed(1)
    : 0;

  const avgRevenuePerBooking = totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : 0;

  // Bookings by status
  const bookingsByStatus = {
    pending: pendingBookings,
    confirmed: confirmedBookings,
    checkedIn: checkedInBookings,
    checkedOut: checkedOutBookings,
    cancelled: cancelledBookings,
  };

  // Revenue trend (create Date range data)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBookings = bookings.filter(b => new Date(b.createdAt) >= thirtyDaysAgo);
  const trendPercentage = totalBookings > 0
    ? ((recentBookings.length / totalBookings) * 100).toFixed(1)
    : 0;

  // Room type breakdown
  const roomTypeBreakdown = {};
  bookings.forEach(b => {
    if (b.roomDetails?.roomType) {
      roomTypeBreakdown[b.roomDetails.roomType] = (roomTypeBreakdown[b.roomDetails.roomType] || 0) + 1;
    }
  });

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Detailed performance metrics for {event?.name}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${totalRevenue.toFixed(2)}</p>
                <div className="flex items-center mt-2 text-sm text-green-600">
                  <ArrowUp className="h-4 w-4 mr-1" />
                  <span>From {confirmedBookings} confirmed bookings</span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Bookings */}
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

          {/* Unique Guests */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Unique Guests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{uniqueGuests}</p>
                <div className="flex items-center mt-2 text-sm text-purple-600">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{(uniqueGuests / totalBookings || 0).toFixed(1)} bookings/guest</span>
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{conversionRate}%</p>
                <div className="flex items-center mt-2 text-sm text-orange-600">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  <span>{totalBookings}/{event?.expectedGuests} expected guests</span>
                </div>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Rooms */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Rooms Booked</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalRooms}</p>
                <p className="text-sm text-gray-600 mt-2">Avg {(totalRooms / totalBookings || 0).toFixed(1)} rooms/booking</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Hotel className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Avg Revenue Per Booking */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Avg Revenue/Booking</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${avgRevenuePerBooking}</p>
                <p className="text-sm text-gray-600 mt-2">Total {totalBookings} bookings</p>
              </div>
              <div className="bg-cyan-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </div>

          {/* Event Status */}
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Event Status</p>
                <p className="text-lg font-bold text-gray-900 mt-2 capitalize">{event?.status}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {formatDate(event?.startDate)} to {formatDate(event?.endDate)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                event?.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Calendar className={`h-6 w-6 ${
                  event?.status === 'active' ? 'text-green-600' : 'text-gray-600'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Bookings by Status */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Booking Status Breakdown</h2>
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

          {/* Room Type Breakdown */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Room Type Distribution</h2>
            <div className="space-y-4">
              {Object.entries(roomTypeBreakdown).length > 0 ? (
                Object.entries(roomTypeBreakdown).map(([roomType, count]) => {
                  const percentage = totalBookings > 0 ? (count / totalBookings * 100).toFixed(1) : 0;
                  const colorMap = {
                    'single': 'bg-blue-500',
                    'double': 'bg-purple-500',
                    'suite': 'bg-pink-500',
                    'deluxe': 'bg-amber-500',
                    'standard': 'bg-cyan-500'
                  };

                  return (
                    <div key={roomType}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {roomType}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${colorMap[roomType.toLowerCase()] || 'bg-gray-500'} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No room type data yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Bookings List */}
        {bookings.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Guest</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Rooms Booked</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.slice(0, 10).map((booking, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {booking.guestDetails?.name || booking.guestName || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {booking.guestDetails?.email || booking.email || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                          {booking.roomDetails?.numberOfRooms || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                        ${(booking.pricing?.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'checked-in' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'checked-out' ? 'bg-gray-100 text-gray-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bookings.length > 10 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-center">
                <p className="text-sm text-gray-600">
                  Showing 10 of {bookings.length} bookings
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {bookings.length === 0 && (
          <div className="card text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Yet</h3>
            <p className="text-gray-600">
              Booking analytics will appear here once guests start booking accommodations.
            </p>
          </div>
        )}
      </div>
    </MicrositeDashboardLayout>
  );
};
