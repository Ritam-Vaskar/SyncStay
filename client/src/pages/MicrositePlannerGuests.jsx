import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventService, bookingService } from '@/services/apiServices';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingPage } from '@/components/LoadingSpinner';
import { Users, Mail, Phone, Calendar, Hotel } from 'lucide-react';
import { formatDate } from '@/utils/helpers';

export const MicrositePlannerGuests = () => {
  const { slug } = useParams();

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['planner-event-bookings', eventData?.data?._id],
    queryFn: () => bookingService.getAll({ event: eventData.data._id }),
    enabled: !!eventData?.data?._id,
  });

  if (eventLoading || bookingsLoading) return <LoadingPage />;

  const event = eventData?.data;
  const bookings = bookingsData?.data || [];

  // Get unique guests with their booking details
  const guestMap = new Map();
  bookings.forEach((booking) => {
    const email = booking.guestDetails?.email;
    if (!email) return;

    if (!guestMap.has(email)) {
      guestMap.set(email, {
        name: booking.guestDetails.name,
        email: booking.guestDetails.email,
        phone: booking.guestDetails.phone,
        bookings: [],
        totalRooms: 0,
        status: 'registered',
      });
    }

    const guest = guestMap.get(email);
    guest.bookings.push(booking);
    guest.totalRooms += booking.roomDetails?.numberOfRooms || 0;
    
    if (booking.status === 'confirmed') {
      guest.status = 'confirmed';
    }
  });

  const guests = Array.from(guestMap.values());

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Guest List</h2>
            <p className="text-gray-600 mt-1">All registered attendees for this event</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Guests</p>
            <p className="text-3xl font-bold">{guests.length}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Confirmed Guests</p>
                <p className="text-2xl font-bold">
                  {guests.filter((g) => g.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Hotel className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Rooms Booked</p>
                <p className="text-2xl font-bold">
                  {guests.reduce((sum, g) => sum + g.totalRooms, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold">{bookings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guest List */}
        <div className="card">
          {guests.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Guests Yet</h3>
              <p className="text-gray-600">Guest list will appear here once bookings are made</p>
            </div>
          ) : (
            <div className="space-y-4">
              {guests.map((guest, index) => (
                <div key={guest.email} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary-100 text-primary-600 rounded-full h-12 w-12 flex items-center justify-center font-bold text-lg">
                        {guest.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{guest.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {guest.email}
                          </div>
                          {guest.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {guest.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        guest.status === 'confirmed' ? 'badge-success' : 'badge-secondary'
                      }`}
                    >
                      {guest.status}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Bookings:</p>
                    <div className="space-y-2">
                      {guest.bookings.map((booking) => (
                        <div
                          key={booking._id}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <Hotel className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{booking.roomDetails?.hotelName}</p>
                              <p className="text-xs text-gray-600">
                                {booking.roomDetails?.roomType} × {booking.roomDetails?.numberOfRooms}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`badge badge-sm ${
                                booking.status === 'confirmed'
                                  ? 'badge-success'
                                  : booking.status === 'pending'
                                  ? 'badge-warning'
                                  : 'badge-secondary'
                              }`}
                            >
                              {booking.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(booking.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MicrositeDashboardLayout>
  );
};
