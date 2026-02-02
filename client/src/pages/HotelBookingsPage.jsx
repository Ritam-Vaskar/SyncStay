import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  Hotel,
  Bed,
  DollarSign,
  MapPin,
  LogIn,
  LogOut,
  FileText,
  Eye
} from 'lucide-react';
import { bookingService } from '@/services/apiServices';
import toast from 'react-hot-toast';

export const HotelBookingsPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: () => bookingService.getAll(),
  });

  const bookings = bookingsData?.data || [];

  // Stats
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    checkedIn: bookings.filter(b => b.status === 'checked-in').length,
    checkedOut: bookings.filter(b => b.status === 'checked-out').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings
      .filter(b => ['confirmed', 'checked-in', 'checked-out'].includes(b.status))
      .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0)
  };

  // Check-In mutation (confirmed → checked-in)
  const checkInMutation = useMutation({
    mutationFn: (id) => bookingService.update(id, { status: 'checked-in' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['hotel-bookings']);
      toast.success('Guest checked in successfully');
    },
    onError: () => {
      toast.error('Failed to check in guest');
    }
  });

  // Check-Out mutation (checked-in → checked-out)
  const checkOutMutation = useMutation({
    mutationFn: (id) => bookingService.update(id, { status: 'checked-out' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['hotel-bookings']);
      toast.success('Guest checked out successfully');
    },
    onError: () => {
      toast.error('Failed to check out guest');
    }
  });

  // Filter bookings
  let filteredBookings = bookings;
  if (searchTerm) {
    filteredBookings = filteredBookings.filter(booking =>
      booking.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking._id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  if (statusFilter !== 'all') {
    filteredBookings = filteredBookings.filter(booking => booking.status === statusFilter);
  }

  const getStatusConfig = (status) => {
    const configs = {
      'pending': { color: 'yellow', icon: Clock, label: 'Pending' },
      'confirmed': { color: 'green', icon: CheckCircle, label: 'Confirmed' },
      'checked-in': { color: 'blue', icon: LogIn, label: 'Checked In' },
      'checked-out': { color: 'gray', icon: LogOut, label: 'Checked Out' },
      'cancelled': { color: 'red', icon: XCircle, label: 'Cancelled' }
    };
    return configs[status] || configs.pending;
  };

  const handleCheckIn = (booking) => {
    if (booking.status !== 'confirmed') {
      toast.error('Only confirmed bookings can be checked in');
      return;
    }
    if (window.confirm(`Check in ${booking.guestName}?`)) {
      checkInMutation.mutate(booking._id);
    }
  };

  const handleCheckOut = (booking) => {
    if (booking.status !== 'checked-in') {
      toast.error('Only checked-in guests can be checked out');
      return;
    }
    if (window.confirm(`Check out ${booking.guestName}?`)) {
      checkOutMutation.mutate(booking._id);
    }
  };

  const viewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
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
        <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
        <p className="text-gray-600 mt-1">Manage guest check-ins and check-outs (bookings approved by planners)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.confirmed}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Checked In</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.checkedIn}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Checked Out</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{stats.checkedOut}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.cancelled}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Revenue</p>
          <p className="text-2xl font-bold text-green-600 mt-1">${stats.totalRevenue.toFixed(0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by guest name, email, or booking ID..."
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input pl-10"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked In</option>
              <option value="checked-out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No bookings found</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const statusConfig = getStatusConfig(booking.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-xs font-mono text-gray-600">
                          {booking._id.slice(-8).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary-100 p-2 rounded-full">
                            <User className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{booking.guestName}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {booking.email}
                            </p>
                            {booking.phone && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {booking.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <Hotel className="h-4 w-4 text-gray-500" />
                            {booking.inventory?.hotelName || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 capitalize">
                            <Bed className="h-4 w-4 text-gray-400" />
                            {booking.inventory?.roomType} - {booking.numberOfRooms} room(s)
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(booking.checkInDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(booking.checkOutDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {booking.pricing?.totalAmount?.toFixed(2) || '0.00'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig.color}-100 text-${statusConfig.color}-800`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewDetails(booking)}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>

                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => handleCheckIn(booking)}
                              className="btn btn-primary text-sm py-1 px-3 flex items-center gap-1"
                              title="Check In Guest"
                            >
                              <LogIn className="h-4 w-4" />
                              Check In
                            </button>
                          )}

                          {booking.status === 'checked-in' && (
                            <button
                              onClick={() => handleCheckOut(booking)}
                              className="btn bg-purple-600 text-white hover:bg-purple-700 text-sm py-1 px-3 flex items-center gap-1"
                              title="Check Out Guest"
                            >
                              <LogOut className="h-4 w-4" />
                              Check Out
                            </button>
                          )}

                          {booking.status === 'pending' && (
                            <span className="text-xs text-gray-500 italic">Awaiting planner approval</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedBooking(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Booking ID & Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Booking ID</p>
                    <p className="font-mono font-bold text-gray-900">{selectedBooking._id.slice(-12).toUpperCase()}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
                    selectedBooking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    selectedBooking.status === 'checked-in' ? 'bg-blue-100 text-blue-800' :
                    selectedBooking.status === 'checked-out' ? 'bg-gray-100 text-gray-800' :
                    selectedBooking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusConfig(selectedBooking.status).label}
                  </span>
                </div>

                {/* Guest Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary-600" />
                      Guest Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium text-gray-900">{selectedBooking.guestName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium text-gray-900">{selectedBooking.email}</p>
                      </div>
                      {selectedBooking.phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium text-gray-900">{selectedBooking.phone}</p>
                        </div>
                      )}
                      {selectedBooking.guests && (
                        <div>
                          <p className="text-sm text-gray-600">Number of Guests</p>
                          <p className="font-medium text-gray-900">{selectedBooking.guests}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Room Information */}
                  <div className="card">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Hotel className="h-5 w-5 text-primary-600" />
                      Room Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Hotel</p>
                        <p className="font-medium text-gray-900">{selectedBooking.inventory?.hotelName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Room Type</p>
                        <p className="font-medium text-gray-900 capitalize">{selectedBooking.inventory?.roomType || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Number of Rooms</p>
                        <p className="font-medium text-gray-900">{selectedBooking.numberOfRooms}</p>
                      </div>
                      {selectedBooking.inventory?.location && (
                        <div>
                          <p className="text-sm text-gray-600">Location</p>
                          <p className="font-medium text-gray-900">{selectedBooking.inventory.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stay Details */}
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    Stay Details
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Check-In Date</p>
                      <p className="font-medium text-gray-900">{new Date(selectedBooking.checkInDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Check-Out Date</p>
                      <p className="font-medium text-gray-900">{new Date(selectedBooking.checkOutDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">
                        {Math.ceil((new Date(selectedBooking.checkOutDate) - new Date(selectedBooking.checkInDate)) / (1000 * 60 * 60 * 24))} nights
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                {selectedBooking.pricing && (
                  <div className="card bg-green-50">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Pricing Details
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {selectedBooking.pricing.pricePerNight && (
                        <div>
                          <p className="text-sm text-gray-600">Price Per Night</p>
                          <p className="font-medium text-gray-900">${selectedBooking.pricing.pricePerNight.toFixed(2)}</p>
                        </div>
                      )}
                      {selectedBooking.pricing.numberOfNights && (
                        <div>
                          <p className="text-sm text-gray-600">Number of Nights</p>
                          <p className="font-medium text-gray-900">{selectedBooking.pricing.numberOfNights}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold text-green-600">${selectedBooking.pricing.totalAmount?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Special Requirements */}
                {selectedBooking.specialRequirements && (
                  <div className="card bg-yellow-50">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-yellow-600" />
                      Special Requirements
                    </h3>
                    <p className="text-gray-700">{selectedBooking.specialRequirements}</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  {selectedBooking.status === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 w-full">
                      <p className="text-sm text-yellow-800">
                        <strong>Awaiting Planner Approval:</strong> This booking is pending approval from the event planner. Once approved, you can check in the guest.
                      </p>
                    </div>
                  )}

                  {selectedBooking.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        handleCheckIn(selectedBooking);
                        setShowDetailsModal(false);
                      }}
                      className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                    >
                      <LogIn className="h-5 w-5" />
                      Check In Guest
                    </button>
                  )}

                  {selectedBooking.status === 'checked-in' && (
                    <button
                      onClick={() => {
                        handleCheckOut(selectedBooking);
                        setShowDetailsModal(false);
                      }}
                      className="btn bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
                    >
                      <LogOut className="h-5 w-5" />
                      Check Out Guest
                    </button>
                  )}

                  {selectedBooking.status === 'checked-out' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full">
                      <p className="text-sm text-gray-600">
                        <strong>Completed:</strong> This guest has been checked out.
                      </p>
                    </div>
                  )}

                  {selectedBooking.status === 'cancelled' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full">
                      <p className="text-sm text-red-800">
                        <strong>Cancelled:</strong> This booking has been cancelled by the planner.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};