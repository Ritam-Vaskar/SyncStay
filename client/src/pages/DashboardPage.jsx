import React from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Calendar, Package, CreditCard, TrendingUp, Users, IndianRupee, ArrowRight, CheckCircle, Clock, XCircle, Hotel, Activity, FileText, Shield, BarChart3, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { eventService, bookingService, analyticsService } from '@/services/apiServices';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatCurrency } from '@/utils/helpers';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Redirect hotel users to their specific dashboard
  if (user?.role === 'hotel') {
    return <Navigate to="/hotel/dashboard" replace />;
  }

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

  const renderPlannerDashboard = () => {
    const allBookings = bookings?.data || [];
    const allEvents = events?.data || [];

    const totalRevenue = allBookings
      .filter((b) => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
      .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);

    const pendingBookings = allBookings.filter((b) => b.status === 'pending').length;
    const confirmedBookings = allBookings.filter((b) => b.status === 'confirmed').length;
    const activeEvents = allEvents.filter((e) => ['rfp-published', 'active', 'reviewing-proposals'].includes(e.status)).length;

    const getEventStatusConfig = (status) => {
      if (status === 'rfp-published' || status === 'active') return { label: 'Active', cls: 'bg-green-100 text-green-700' };
      if (status === 'reviewing-proposals') return { label: 'Reviewing', cls: 'bg-purple-100 text-purple-700' };
      if (status === 'completed') return { label: 'Completed', cls: 'bg-gray-100 text-gray-600' };
      if (status === 'rejected') return { label: 'Rejected', cls: 'bg-red-100 text-red-700' };
      return { label: status, cls: 'bg-gray-100 text-gray-600' };
    };

    const getBookingStatusConfig = (status) => {
      if (status === 'confirmed') return { cls: 'bg-green-100 text-green-700', icon: CheckCircle };
      if (status === 'pending') return { cls: 'bg-yellow-100 text-yellow-700', icon: Clock };
      if (status === 'rejected' || status === 'cancelled') return { cls: 'bg-red-100 text-red-700', icon: XCircle };
      return { cls: 'bg-gray-100 text-gray-600', icon: Clock };
    };

    return (
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="card bg-gradient-to-br from-primary-50 to-white border border-primary-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-600" />
              </div>
              <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{activeEvents} active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{allEvents.length}</p>
            <p className="text-sm text-gray-500 mt-0.5">Total Events</p>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-white border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{confirmedBookings} confirmed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{allBookings.length}</p>
            <p className="text-sm text-gray-500 mt-0.5">Total Bookings</p>
          </div>

          <div className="card bg-gradient-to-br from-yellow-50 to-white border border-yellow-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">awaiting</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pendingBookings}</p>
            <p className="text-sm text-gray-500 mt-0.5">Pending Bookings</p>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">confirmed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-gray-500 mt-0.5">Total Revenue</p>
          </div>
        </div>

        {/* Recent sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Events */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary-600" />
                Recent Events
              </h3>
              <Link to="/planner/events" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {allEvents.slice(0, 5).map((event) => {
                const sc = getEventStatusConfig(event.status);
                const slug = event.micrositeConfig?.customSlug;
                return (
                  <button
                    key={event._id}
                    onClick={() => slug ? navigate(`/microsite/${slug}/dashboard`) : navigate('/planner/events')}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 text-primary-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">{event.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{event.type}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${sc.cls}`}>
                      {sc.label}
                    </span>
                  </button>
                );
              })}
              {allEvents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No events yet</p>
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Hotel className="h-4 w-4 text-green-600" />
                Recent Bookings
              </h3>
              <Link to="/planner/bookings" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {allBookings.slice(0, 5).map((booking) => {
                const sc = getBookingStatusConfig(booking.status);
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={booking._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-600">
                          {(booking.guest?.name || booking.guestDetails?.name || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {booking.guest?.name || booking.guestDetails?.name || '—'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {booking.inventory?.hotelName || booking.roomDetails?.hotelName || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <p className="text-xs font-semibold text-gray-700">{formatCurrency(booking.pricing?.totalAmount)}</p>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}>
                        <StatusIcon className="h-3 w-3" />
                        {booking.status}
                      </span>
                    </div>
                  </div>
                );
              })}
              {allBookings.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No bookings yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/planner/proposals/create" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-primary-200 hover:border-primary-400 hover:bg-primary-50 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <Calendar className="h-5 w-5 text-primary-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Create Event</span>
            </Link>
            <Link to="/planner/bookings" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-green-200 hover:border-green-400 hover:bg-green-50 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">View Bookings</span>
            </Link>
            <Link to="/planner/events" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">My Events</span>
            </Link>
            <Link to="/planner/analytics" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Analytics</span>
            </Link>
          </div>
        </div>
      </div>
    );
  };

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
              <IndianRupee className="h-6 w-6 text-blue-600" />
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

  const renderAdminDashboard = () => {
    const recentEvents = events?.data?.slice(0, 5) || [];
    const recentBookings = bookings?.data?.slice(0, 5) || [];
    const allBookings = bookings?.data || [];
    const allEvents = events?.data || [];

    const pendingBookings = allBookings.filter(b => b.status === 'pending').length;
    const activeEvents = allEvents.filter(e => ['rfp-published', 'active', 'reviewing-proposals'].includes(e.status)).length;

    const getEventStatusCls = (status) => {
      if (status === 'rfp-published' || status === 'active') return 'bg-green-100 text-green-700';
      if (status === 'reviewing-proposals') return 'bg-purple-100 text-purple-700';
      if (status === 'rejected') return 'bg-red-100 text-red-700';
      if (status === 'completed') return 'bg-gray-100 text-gray-600';
      return 'bg-blue-100 text-blue-700';
    };
    const getEventStatusLabel = (status) => {
      if (status === 'rfp-published') return 'Active';
      if (status === 'reviewing-proposals') return 'Reviewing';
      return status.charAt(0).toUpperCase() + status.slice(1);
    };
    const getBookingStatusCls = (status) => {
      if (status === 'confirmed') return 'bg-green-100 text-green-700';
      if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
      if (status === 'rejected' || status === 'cancelled') return 'bg-red-100 text-red-700';
      return 'bg-gray-100 text-gray-600';
    };

    return (
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="card bg-gradient-to-br from-blue-50 to-white border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <Link to="/admin/users" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">View <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.data?.totalUsers || 0}</p>
            <p className="text-sm text-gray-500 mt-0.5">Total Users</p>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-white border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <Link to="/admin/events" className="text-xs text-green-600 hover:underline flex items-center gap-0.5">View <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.data?.totalEvents || allEvents.length || 0}</p>
            <p className="text-sm text-gray-500 mt-0.5">Total Events <span className="text-green-600">({activeEvents} active)</span></p>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">{pendingBookings} pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics?.data?.totalBookings || allBookings.length || 0}</p>
            <p className="text-sm text-gray-500 mt-0.5">Total Bookings</p>
          </div>

          <div className="card bg-gradient-to-br from-yellow-50 to-white border border-yellow-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-yellow-600" />
              </div>
              <Link to="/admin/analytics" className="text-xs text-yellow-600 hover:underline flex items-center gap-0.5">Analytics <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics?.data?.totalRevenue || 0)}</p>
            <p className="text-sm text-gray-500 mt-0.5">Total Revenue</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Events */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                Recent Events
              </h3>
              <Link to="/admin/events" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div key={event._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{event.name}</p>
                      <p className="text-xs text-gray-500">{event.planner?.name || 'Unknown planner'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${getEventStatusCls(event.status)}`}>
                    {getEventStatusLabel(event.status)}
                  </span>
                </div>
              ))}
              {recentEvents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No events yet</p>
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-600" />
                Recent Bookings
              </h3>
            </div>
            <div className="space-y-2">
              {recentBookings.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-600">
                        {(booking.guest?.name || booking.guestDetails?.name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {booking.guest?.name || booking.guestDetails?.name || '—'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {booking.inventory?.hotelName || booking.roomDetails?.hotelName || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <p className="text-xs font-semibold text-gray-700">{formatCurrency(booking.pricing?.totalAmount)}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getBookingStatusCls(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
              {recentBookings.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No bookings yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-600" />
            Admin Controls
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/admin/events" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-green-200 hover:border-green-400 hover:bg-green-50 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">All Events</span>
            </Link>
            <Link to="/admin/users" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Manage Users</span>
            </Link>
            <Link to="/admin/analytics" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                <BarChart3 className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Analytics</span>
            </Link>
            <Link to="/admin/logs" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all group">
              <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">Audit Logs</span>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your events today.</p>
      </div>
      {user?.role === 'planner' && renderPlannerDashboard()}
      {user?.role === 'guest' && renderGuestDashboard()}
      {user?.role === 'admin' && renderAdminDashboard()}
      {user?.role === 'hotel' && renderPlannerDashboard()}
    </div>
  );
};
