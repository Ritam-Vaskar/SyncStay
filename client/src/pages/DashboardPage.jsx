import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { eventService, bookingService, analyticsService } from '@/services/apiServices';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatCurrency } from '@/utils/helpers';

export const DashboardPage = () => {
  const { user } = useAuthStore();

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventService.getAll(),
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingService.getAll(),
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsService.getOverview(),
    enabled: user?.role === 'admin',
  });

  if (eventsLoading || bookingsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const renderPlannerDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
              <Calendar className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold">{events?.count || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold">{bookings?.count || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Events</p>
              <p className="text-2xl font-bold">
                {events?.data?.filter((e) => e.status === 'active').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold">
                {formatCurrency(events?.data?.reduce((sum, e) => sum + (e.totalRevenue || 0), 0) || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
          <div className="space-y-3">
            {events?.data?.slice(0, 5).map((event) => (
              <Link
                key={event._id}
                to={`/planner/events/${event._id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium">{event.name}</p>
                  <p className="text-sm text-gray-600">{event.type}</p>
                </div>
                <span className={`badge ${event.status === 'active' ? 'badge-success' : 'badge-info'}`}>
                  {event.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
          <div className="space-y-3">
            {bookings?.data?.slice(0, 5).map((booking) => (
              <div
                key={booking._id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div>
                  <p className="font-medium">{booking.guestDetails?.name}</p>
                  <p className="text-sm text-gray-600">{booking.roomDetails?.hotelName}</p>
                </div>
                <span className={`badge ${booking.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderGuestDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
              <CreditCard className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">My Bookings</p>
              <p className="text-2xl font-bold">{bookings?.count || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upcoming Events</p>
              <p className="text-2xl font-bold">
                {bookings?.data?.filter((b) => b.status === 'confirmed').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  bookings?.data?.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0) || 0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 card">
        <h3 className="text-lg font-semibold mb-4">My Bookings</h3>
        <div className="space-y-3">
          {bookings?.data?.map((booking) => (
            <Link
              key={booking._id}
              to={`/guest/bookings/${booking._id}`}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors border"
            >
              <div>
                <p className="font-semibold">{booking.roomDetails?.hotelName}</p>
                <p className="text-sm text-gray-600">{booking.roomDetails?.roomType}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(booking.roomDetails?.checkIn).toLocaleDateString()} -{' '}
                  {new Date(booking.roomDetails?.checkOut).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className={`badge ${booking.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                  {booking.status}
                </span>
                <p className="text-sm font-semibold mt-2">{formatCurrency(booking.pricing?.totalAmount)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );

  const renderAdminDashboard = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
              <Users className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">{analytics?.data?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold">{analytics?.data?.totalEvents || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold">{analytics?.data?.totalBookings || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics?.data?.totalRevenue || 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {user?.role === 'planner' && renderPlannerDashboard()}
      {user?.role === 'guest' && renderGuestDashboard()}
      {user?.role === 'admin' && renderAdminDashboard()}
      {user?.role === 'hotel' && renderPlannerDashboard()}
    </div>
  );
};
