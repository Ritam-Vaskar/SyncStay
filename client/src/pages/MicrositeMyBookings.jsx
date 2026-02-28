import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventService, bookingService } from '@/services/apiServices';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingPage } from '@/components/LoadingSpinner';
import { Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';

export const MicrositeMyBookings = () => {
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

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">My Bookings</h2>
            <p className="text-gray-600 mt-1">View all your bookings for this event</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Bookings</p>
            <p className="text-2xl font-bold">{bookings.length}</p>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Yet</h3>
            <p className="text-gray-600 mb-6">You haven't made any bookings for this event.</p>
            <a href={`/microsite/${slug}`} className="btn btn-primary">
              Browse Hotels
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      booking.status === 'confirmed' ? 'bg-green-100' :
                      booking.status === 'pending' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {booking.status === 'confirmed' ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : booking.status === 'pending' ? (
                        <Clock className="h-6 w-6 text-yellow-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{booking.roomDetails?.hotelName}</h3>
                      <p className="text-gray-600">{booking.roomDetails?.roomType}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Booking ID: {booking.bookingId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${
                      booking.status === 'confirmed' ? 'badge-success' :
                      booking.status === 'pending' ? 'badge-warning' :
                      'badge-secondary'
                    }`}>
                      {booking.status}
                    </span>
                    {event.isPrivate ? (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <p className="text-sm font-semibold text-blue-900">Paid by planner</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(booking.totalAmount)}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Number of Rooms</p>
                    <p className="font-semibold">{booking.roomDetails?.numberOfRooms} room(s)</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Check-in / Check-out</p>
                    <p className="font-semibold">
                      {formatDate(booking.roomDetails?.checkIn)} - {formatDate(booking.roomDetails?.checkOut)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booked On</p>
                    <p className="font-semibold">{formatDate(booking.createdAt)}</p>
                  </div>
                </div>

                {booking.specialRequests && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Special Requests</p>
                    <p className="text-gray-900">{booking.specialRequests}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MicrositeDashboardLayout>
  );
};
