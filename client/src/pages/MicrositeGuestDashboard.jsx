import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventService, bookingService } from '@/services/apiServices';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingPage } from '@/components/LoadingSpinner';
import { Calendar, Hotel, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

export const MicrositeGuestDashboard = () => {
  const { slug } = useParams();

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-event-bookings', eventData?.data?._id],
    queryFn: () => bookingService.getAll({ event: eventData.data._id }),
    enabled: !!eventData?.data?._id,
  });

  if (eventLoading || bookingsLoading) return <LoadingPage />;

  const event = eventData?.data;
  const bookings = bookingsData?.data || [];

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    totalAmount: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
  };

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to {event.name}!</h2>
              <p className="text-primary-100">Manage your bookings and stay updated with event details</p>
            </div>
            <Calendar className="h-16 w-16 text-primary-200" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Hotel className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed</p>
                <p className="text-3xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-primary-600">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Event Information */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Event Information</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Event Dates</p>
              <p className="font-semibold">{formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Location</p>
              <p className="font-semibold">{event.location?.venue || event.location?.city}, {event.location?.country}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Booking Deadline</p>
              <p className="font-semibold text-amber-600">{formatDate(event.bookingDeadline)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Expected Guests</p>
              <p className="font-semibold">{event.expectedGuests} attendees</p>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Your Recent Bookings</h3>
            <Link to={`/microsite/${slug}/my-bookings`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All →
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <Hotel className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No bookings yet</p>
              <Link to={`/microsite/${slug}`} className="btn btn-primary">
                Browse Hotels
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary-100 p-3 rounded-lg">
                      <Hotel className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{booking.roomDetails?.hotelName}</p>
                      <p className="text-sm text-gray-600">
                        {booking.roomDetails?.roomType} × {booking.roomDetails?.numberOfRooms}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Booked on {formatDate(booking.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(booking.totalAmount)}</p>
                    <span className={`badge ${
                      booking.status === 'confirmed' ? 'badge-success' :
                      booking.status === 'pending' ? 'badge-warning' :
                      'badge-secondary'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Important Notice */}
        {new Date(event.bookingDeadline) < new Date() ? (
          <div className="card bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Booking Deadline Passed</h4>
                <p className="text-sm text-red-700">
                  The booking deadline for this event has passed. Please contact the organizer if you need assistance.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Calendar className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Booking Still Open!</h4>
                <p className="text-sm text-blue-700">
                  You can still book accommodations until {formatDate(event.bookingDeadline)}.
                  <Link to={`/microsite/${slug}`} className="font-medium underline ml-2">
                    Book Now
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MicrositeDashboardLayout>
  );
};
