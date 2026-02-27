import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User, Hotel, IndianRupee, Search, BedDouble, Clock, CheckCircle, XCircle, LogIn, LogOut } from 'lucide-react';
import { bookingService } from '@/services/apiServices';

const formatINR = (amount) =>
  `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const PlannerBookingsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['planner-bookings'],
    queryFn: () => bookingService.getAll(),
  });

  const bookings = bookingsData?.data || [];

  // Helper to extract guest name/email from either populated `guest` or `guestDetails`
  const getGuestName = (b) => b.guest?.name || b.guestDetails?.name || '—';
  const getGuestEmail = (b) => b.guest?.email || b.guestDetails?.email || '—';
  // Hotel name from populated inventory OR roomDetails fallback
  const getHotelName = (b) => b.inventory?.hotelName || b.roomDetails?.hotelName || '—';
  const getRoomType = (b) => b.inventory?.roomType || b.roomDetails?.roomType || '—';
  const getNumRooms = (b) => b.roomDetails?.numberOfRooms || 1;
  const getCheckIn = (b) => b.roomDetails?.checkIn;
  const getCheckOut = (b) => b.roomDetails?.checkOut;

  const filteredBookings = bookings.filter((booking) => {
    const guestName = getGuestName(booking).toLowerCase();
    const guestEmail = getGuestEmail(booking).toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      guestName.includes(search) ||
      guestEmail.includes(search) ||
      booking._id.toLowerCase().includes(search) ||
      (booking.bookingId || '').toLowerCase().includes(search);

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    checkedIn: bookings.filter((b) => b.status === 'checked-in').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length,
    totalRevenue: bookings
      .filter((b) => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
      .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0),
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending:      { cls: 'bg-yellow-100 text-yellow-800 border border-yellow-200', icon: Clock, label: 'Pending' },
      confirmed:    { cls: 'bg-green-100 text-green-800 border border-green-200',   icon: CheckCircle, label: 'Confirmed' },
      'checked-in': { cls: 'bg-blue-100 text-blue-800 border border-blue-200',      icon: LogIn, label: 'Checked In' },
      'checked-out':{ cls: 'bg-gray-100 text-gray-700 border border-gray-200',      icon: LogOut, label: 'Checked Out' },
      cancelled:    { cls: 'bg-red-100 text-red-800 border border-red-200',         icon: XCircle, label: 'Cancelled' },
      rejected:     { cls: 'bg-red-100 text-red-800 border border-red-200',         icon: XCircle, label: 'Rejected' },
    };
    return configs[status] || configs.pending;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Bookings</h1>
        <p className="text-gray-600 mt-1">View and manage all bookings across your events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Confirmed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-primary-600 mt-1">{formatINR(stats.totalRevenue)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center">
              <IndianRupee className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by guest name, email, or booking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input md:w-48"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked In</option>
            <option value="checked-out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {(searchTerm || statusFilter !== 'all') && (
        <p className="text-sm text-gray-500 -mt-2">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </p>
      )}

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : "You don't have any bookings yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const statusCfg = getStatusConfig(booking.status);
            const StatusIcon = statusCfg.icon;
            const checkIn = getCheckIn(booking);
            const checkOut = getCheckOut(booking);

            return (
              <div key={booking._id} className="card hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                  {/* Left: Avatar + Guest + Booking ID */}
                  <div className="flex items-center gap-3 min-w-0 sm:w-48">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary-700">
                        {getGuestName(booking).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{getGuestName(booking)}</p>
                      <p className="text-xs text-gray-500 truncate">{getGuestEmail(booking)}</p>
                      <span className="text-xs font-mono text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        #{(booking.bookingId || booking._id).slice(-8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-px h-12 bg-gray-200 flex-shrink-0" />

                  {/* Center: Event + Hotel */}
                  <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 min-w-0">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Event</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{booking.event?.name || '—'}</p>
                      <p className="text-xs text-gray-500 capitalize">{booking.event?.type || ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Hotel & Room</p>
                      <div className="flex items-center gap-1">
                        <Hotel className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900 truncate">{getHotelName(booking)}</p>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <BedDouble className="h-3 w-3" />
                        <span className="capitalize">{getRoomType(booking)}</span> &bull; {getNumRooms(booking)} room(s)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Dates</p>
                      <p className="text-sm text-gray-900">{formatDate(checkIn)} → {formatDate(checkOut)}</p>
                      {booking.roomDetails?.numberOfNights && (
                        <p className="text-xs text-gray-400">{booking.roomDetails.numberOfNights} night(s)</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-medium">Amount</p>
                      <p className="text-sm font-bold text-gray-900">{formatINR(booking.pricing?.totalAmount)}</p>
                      {booking.pricing?.pricePerNight && (
                        <p className="text-xs text-gray-500">{formatINR(booking.pricing.pricePerNight)}/night</p>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block w-px h-12 bg-gray-200 flex-shrink-0" />

                  {/* Right: Payment + Status */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${statusCfg.cls}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                        booking.paymentStatus === 'paid'     ? 'bg-green-100 text-green-700' :
                        booking.paymentStatus === 'partial'  ? 'bg-blue-100 text-blue-700' :
                        booking.paymentStatus === 'refunded' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {booking.paymentStatus || 'unpaid'}
                      </span>
                      {booking.isPaidByPlanner && (
                        <p className="text-xs text-primary-500 mt-0.5">by planner</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
