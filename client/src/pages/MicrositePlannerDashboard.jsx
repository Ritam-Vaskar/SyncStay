import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventService, bookingService, inventoryService } from '@/services/apiServices';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingPage } from '@/components/LoadingSpinner';
import { Hotel, Users, CreditCard, TrendingUp, Calendar, DollarSign, Package, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

export const MicrositePlannerDashboard = () => {
  const { slug } = useParams();

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['event-bookings', eventData?.data?._id],
    queryFn: () => bookingService.getAll({ event: eventData.data._id }),
    enabled: !!eventData?.data?._id,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['event-inventory', eventData?.data?._id],
    queryFn: () => inventoryService.getAll({ event: eventData.data._id }),
    enabled: !!eventData?.data?._id,
  });

  if (eventLoading) return <LoadingPage />;

  const event = eventData?.data;
  const bookings = bookingsData?.data || [];
  const inventory = inventoryData?.data || [];

  const stats = {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    totalRevenue: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    totalInventory: inventory.reduce((sum, i) => sum + i.totalRooms, 0),
    bookedRooms: inventory.reduce((sum, i) => sum + (i.totalRooms - i.availableRooms), 0),
    uniqueGuests: new Set(bookings.map(b => b.user?._id || b.guestDetails?.email)).size,
  };

  const occupancyRate = stats.totalInventory > 0 
    ? ((stats.bookedRooms / stats.totalInventory) * 100).toFixed(1) 
    : 0;

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="card bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Event Management Dashboard</h2>
              <p className="text-purple-100">Real-time overview of {event.name}</p>
            </div>
            <TrendingUp className="h-16 w-16 text-purple-200" />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Bookings</p>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
            <p className="text-xs text-green-600 mt-1">{stats.confirmedBookings} confirmed</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">From all bookings</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Room Occupancy</p>
              <div className="bg-purple-100 p-2 rounded-lg">
                <Hotel className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{occupancyRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{stats.bookedRooms} / {stats.totalInventory} rooms</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Registered Guests</p>
              <div className="bg-orange-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.uniqueGuests}</p>
            <p className="text-xs text-gray-500 mt-1">Unique attendees</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to={`/microsite/${slug}/inventory`}
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="bg-blue-600 p-3 rounded-lg">
                <Hotel className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Manage Inventory</p>
                <p className="text-sm text-gray-600">Update room availability</p>
              </div>
            </Link>

            <Link
              to={`/microsite/${slug}/bookings`}
              className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <div className="bg-green-600 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">View All Bookings</p>
                <p className="text-sm text-gray-600">Manage guest bookings</p>
              </div>
            </Link>

            <Link
              to={`/microsite/${slug}/guests`}
              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <div className="bg-purple-600 p-3 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Guest List</p>
                <p className="text-sm text-gray-600">View all attendees</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Event Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-xl font-bold mb-4">Event Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Event Type</p>
                <p className="font-semibold capitalize">{event.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dates</p>
                <p className="font-semibold">{formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold">{event.location?.venue || event.location?.city}, {event.location?.country}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Booking Deadline</p>
                <p className="font-semibold text-amber-600">{formatDate(event.bookingDeadline)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Guests</p>
                <p className="font-semibold">{event.expectedGuests} attendees</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-bold mb-4">Microsite Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Published</span>
                </div>
                <span className="badge badge-success">Live</span>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Microsite URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm">
                    {window.location.origin}/microsite/{event.micrositeConfig?.customSlug || slug}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/microsite/${event.micrositeConfig?.customSlug || slug}`);
                      toast.success('Link copied!');
                    }}
                    className="btn btn-sm btn-secondary"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <span className="badge badge-success">Event Active</span>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Total Views (Coming Soon)</p>
                <p className="text-2xl font-bold text-gray-400">---</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Recent Bookings</h3>
            <Link to={`/microsite/${slug}/bookings`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All →
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No bookings yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Guest</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Hotel</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Rooms</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, 5).map((booking) => (
                    <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium">{booking.guestDetails?.name}</p>
                        <p className="text-sm text-gray-600">{booking.guestDetails?.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{booking.roomDetails?.hotelName}</p>
                        <p className="text-sm text-gray-600">{booking.roomDetails?.roomType}</p>
                      </td>
                      <td className="py-3 px-4">{booking.roomDetails?.numberOfRooms}</td>
                      <td className="py-3 px-4 font-semibold">{formatCurrency(booking.totalAmount)}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${
                          booking.status === 'confirmed' ? 'badge-success' :
                          booking.status === 'pending' ? 'badge-warning' :
                          'badge-secondary'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MicrositeDashboardLayout>
  );
};
