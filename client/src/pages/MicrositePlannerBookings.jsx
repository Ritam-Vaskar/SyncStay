import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService, bookingService } from '@/services/apiServices';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingPage } from '@/components/LoadingSpinner';
import { Calendar, CheckCircle, Clock, XCircle, Search, Filter, IndianRupee, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

export const MicrositePlannerBookings = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedBookingsForPayment, setSelectedBookingsForPayment] = useState([]);
  const hasAutoSelected = useRef(false);

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['microsite-event', slug],
    queryFn: () => eventService.getBySlug(slug),
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['planner-event-bookings', eventData?.data?._id],
    queryFn: () => bookingService.getAll({ event: eventData.data._id }),
    enabled: !!eventData?.data?._id,
  });

  const approveMutation = useMutation({
    mutationFn: (bookingId) => bookingService.approve(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries(['planner-event-bookings']);
      toast.success('Booking approved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve booking');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ bookingId, reason }) => bookingService.reject(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['planner-event-bookings']);
      setShowRejectModal(false);
      setSelectedBooking(null);
      setRejectionReason('');
      toast.success('Booking rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reject booking');
    },
  });

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Auto-select all unpaid bookings on initial load only
  useEffect(() => {
    const bookings = bookingsData?.data || [];
    const currentEvent = eventData?.data;
    
    if (bookings.length > 0 && currentEvent?.isPrivate && !hasAutoSelected.current) {
      const unpaid = bookings.filter(b => 
        b.isPaidByPlanner && 
        b.paymentStatus === 'unpaid' && 
        b.status !== 'rejected' && 
        b.status !== 'cancelled'
      );
      if (unpaid.length > 0) {
        setSelectedBookingsForPayment(unpaid.map(b => b._id));
        hasAutoSelected.current = true;
      }
    }
  }, [bookingsData?.data?.length, eventData?.data?.isPrivate]);

  if (eventLoading || bookingsLoading) return <LoadingPage />;

  const event = eventData?.data;
  const allBookings = bookingsData?.data || [];

  // Filter bookings
  const filteredBookings = allBookings.filter((booking) => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      booking.guestDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.guestDetails?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.bookingId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    pending: allBookings.filter((b) => b.status === 'pending').length,
    confirmed: allBookings.filter((b) => b.status === 'confirmed').length,
    rejected: allBookings.filter((b) => b.status === 'rejected').length,
    total: allBookings.length,
    totalRevenue: allBookings
      .filter((b) => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0),
  };

  // Get unpaid bookings for private events (exclude rejected and cancelled)
  const unpaidBookings = event?.isPrivate
    ? allBookings.filter((b) => 
        b.isPaidByPlanner && 
        b.paymentStatus === 'unpaid' && 
        b.status !== 'rejected' && 
        b.status !== 'cancelled'
      )
    : [];

  // Calculate total unpaid amount
  const totalUnpaid = unpaidBookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
  
  // Calculate selected bookings amount
  const selectedPaymentAmount = unpaidBookings
    .filter(b => selectedBookingsForPayment.includes(b._id))
    .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);

  // Toggle all bookings selection
  const handleSelectAllBookings = () => {
    if (selectedBookingsForPayment.length === unpaidBookings.length) {
      setSelectedBookingsForPayment([]);
    } else {
      setSelectedBookingsForPayment(unpaidBookings.map(b => b._id));
    }
  };

  // Toggle individual booking selection
  const handleToggleBooking = (bookingId) => {
    setSelectedBookingsForPayment(prev => 
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleApprove = (booking) => {
    if (window.confirm(`Approve booking for ${booking.guestDetails?.name}?`)) {
      approveMutation.mutate(booking._id);
    }
  };

  const handleReject = (booking) => {
    setSelectedBooking(booking);
    setShowRejectModal(true);
  };

  const submitRejection = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({
      bookingId: selectedBooking._id,
      reason: rejectionReason,
    });
  };

  const handlePayForBookings = async () => {
    if (!window.Razorpay) {
      toast.error('Payment system not loaded. Please refresh the page.');
      return;
    }

    if (selectedBookingsForPayment.length === 0) {
      toast.error('Please select at least one booking to pay for');
      return;
    }

    try {
      setIsProcessingPayment(true);

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

      // 1. Create Razorpay order
      const orderResponse = await fetch(`${API_BASE_URL}/payments/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount: selectedPaymentAmount,
          currency: 'INR',
          notes: {
            eventId: event._id,
            eventName: event.name,
            type: 'planner_bulk_payment',
            bookingIds: selectedBookingsForPayment,
            bookingCount: selectedBookingsForPayment.length
          }
        })
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      // 2. Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        order_id: orderData.data.id,
        name: 'SyncStay',
        description: `Payment for ${event.name} - ${selectedBookingsForPayment.length} Booking(s)`,
        handler: async function(response) {
          try {
            // 3. Verify and process payment
            const paymentResponse = await fetch(`${API_BASE_URL}/events/${event._id}/planner-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const data = await paymentResponse.json();

            if (data.success) {
              toast.success(`Payment successful! ${selectedBookingsForPayment.length} booking(s) confirmed.`);
              setSelectedBookingsForPayment([]); // Clear selection
              hasAutoSelected.current = false; // Reset to allow auto-select for remaining bookings
              queryClient.invalidateQueries(['planner-event-bookings']);
              queryClient.invalidateQueries(['microsite-event']);
            } else {
              throw new Error(data.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment handler error:', error);
            toast.error('Payment processing failed');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: event.planner?.name || '',
          email: event.planner?.email || '',
          contact: event.planner?.phone || ''
        },
        theme: {
          color: '#3b82f6'
        },
        modal: {
          ondismiss: function() {
            setIsProcessingPayment(false);
            toast.error('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setIsProcessingPayment(false);
    }
  };

  return (
    <MicrositeDashboardLayout event={event}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold">All Bookings</h2>
          <p className="text-gray-600 mt-1">Manage guest booking requests for this event</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Bookings</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="card bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-700">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
          </div>
          <div className="card bg-green-50 border-green-200">
            <p className="text-sm text-green-700">Confirmed</p>
            <p className="text-2xl font-bold text-green-900">{stats.confirmed}</p>
          </div>
          <div className="card bg-red-50 border-red-200">
            <p className="text-sm text-red-700">Rejected</p>
            <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
          </div>
          <div className="card bg-primary-50 border-primary-200">
            <p className="text-sm text-primary-700">Total Revenue</p>
            <p className="text-xl font-bold text-primary-900">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>

        {/* Payment Alert for Unpaid Bookings (Private Events) */}
        {event?.isPrivate && totalUnpaid > 0 && event?.plannerPaymentStatus !== 'paid' && (
          <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 shadow-lg">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="bg-amber-500 p-3 rounded-lg shadow-md">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-amber-900 mb-1">
                    Payment Required
                  </h3>
                  <p className="text-amber-700 text-sm mb-2">
                    Select bookings you want to pay for now. You can pay for remaining bookings later.
                  </p>
                </div>
              </div>

              {/* Quick Selection Buttons */}
              {unpaidBookings.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedBookingsForPayment(unpaidBookings.slice(0, Math.ceil(unpaidBookings.length / 2)).map(b => b._id))}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    Select First Half ({Math.ceil(unpaidBookings.length / 2)})
                  </button>
                  {unpaidBookings.length >= 5 && (
                    <button
                      onClick={() => setSelectedBookingsForPayment(unpaidBookings.slice(0, 5).map(b => b._id))}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      Select First 5
                    </button>
                  )}
                  {unpaidBookings.length >= 10 && (
                    <button
                      onClick={() => setSelectedBookingsForPayment(unpaidBookings.slice(0, 10).map(b => b._id))}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      Select First 10
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedBookingsForPayment([])}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              {/* Selection Controls */}
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="select-all-bookings"
                    checked={selectedBookingsForPayment.length === unpaidBookings.length && unpaidBookings.length > 0}
                    onChange={handleSelectAllBookings}
                    className="h-5 w-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="select-all-bookings" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Select All ({unpaidBookings.length} bookings)
                  </label>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Selected: {selectedBookingsForPayment.length}</p>
                  <p className="text-sm font-bold text-amber-900">
                    {formatCurrency(selectedPaymentAmount)}
                  </p>
                </div>
              </div>

              {/* Bookings List */}
              <div className="max-h-64 overflow-y-auto space-y-2 p-2 bg-white/40 rounded-lg border border-amber-200">
                {unpaidBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedBookingsForPayment.includes(booking._id)
                        ? 'bg-amber-100 border-amber-400 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`booking-${booking._id}`}
                      checked={selectedBookingsForPayment.includes(booking._id)}
                      onChange={() => handleToggleBooking(booking._id)}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor={`booking-${booking._id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {booking.guestDetails?.name || booking.guestName || 'Guest'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {booking.guestDetails?.email || booking.email}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {booking.roomDetails?.numberOfRooms || 0} room(s) • {booking.hotelProposal?.name || 'Hotel'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(booking.pricing?.totalAmount || 0)}
                          </p>
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 mt-1">
                            Unpaid
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Payment Summary and Button */}
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-amber-200">
                <div className="flex-1">
                  <p className="text-xs text-gray-600 mb-2">Payment Summary</p>
                  <div className="space-y-1.5">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{selectedBookingsForPayment.length}</span> of{' '}
                      <span className="font-semibold">{unpaidBookings.length}</span> bookings selected
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-bold text-amber-900">
                        {formatCurrency(selectedPaymentAmount)}
                      </p>
                      {selectedPaymentAmount < totalUnpaid && (
                        <p className="text-xs text-gray-600">
                          of {formatCurrency(totalUnpaid)} total
                        </p>
                      )}
                    </div>
                    {selectedPaymentAmount > 0 && selectedPaymentAmount < totalUnpaid && (
                      <p className="text-xs text-amber-600">
                        Remaining: {formatCurrency(totalUnpaid - selectedPaymentAmount)} ({unpaidBookings.length - selectedBookingsForPayment.length} bookings)
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (selectedBookingsForPayment.length === 0) {
                      toast.error('Please select at least one booking');
                      return;
                    }
                    if (window.confirm(`Confirm payment of ${formatCurrency(selectedPaymentAmount)} for ${selectedBookingsForPayment.length} booking(s)?`)) {
                      handlePayForBookings();
                    }
                  }}
                  disabled={isProcessingPayment || selectedBookingsForPayment.length === 0}
                  className="btn-primary whitespace-nowrap flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="h-5 w-5" />
                  {isProcessingPayment ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Payment...
                    </>
                  ) : (
                    <>Pay {formatCurrency(selectedPaymentAmount)}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Success Message */}
        {event?.isPrivate && event?.plannerPaymentStatus === 'paid' && (
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="bg-green-500 p-3 rounded-lg shadow-md">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-900 mb-1">
                  Payment Completed Successfully!
                </h3>
                <p className="text-green-700 text-sm mb-2">
                  All guest bookings have been confirmed and your event is now active.
                </p>
                <div className="mt-3 p-3 bg-white/60 rounded-lg border border-green-200">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Total Paid:</span>
                      <p className="font-bold text-green-900 text-lg">{formatCurrency(stats.totalRevenue)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Confirmed Bookings:</span>
                      <p className="font-bold text-green-900 text-lg">{stats.confirmed}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by guest name, email, or booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="card">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No bookings have been made yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Booking ID
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Guest</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Hotel</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Rooms</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Payment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-mono text-sm">{booking.bookingId}</p>
                        <p className="text-xs text-gray-500">{formatDate(booking.createdAt)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{booking.guestDetails?.name}</p>
                        <p className="text-sm text-gray-600">{booking.guestDetails?.email}</p>
                        <p className="text-sm text-gray-600">{booking.guestDetails?.phone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{booking.roomDetails?.hotelName}</p>
                        <p className="text-sm text-gray-600">{booking.roomDetails?.roomType}</p>
                      </td>
                      <td className="py-3 px-4">{booking.roomDetails?.numberOfRooms}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold">{formatCurrency(booking.pricing?.totalAmount || 0)}</p>
                        <p className="text-xs text-gray-500">{booking.pricing?.currency || 'INR'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`badge ${
                              booking.paymentStatus === 'paid'
                                ? 'badge-success'
                                : booking.paymentStatus === 'partial'
                                ? 'badge-warning'
                                : 'badge-secondary'
                            }`}
                          >
                            {booking.paymentStatus === 'paid' ? '✅ Paid' : 
                             booking.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                        </div>
                        {booking.razorpay_payment_id && (
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            ID: {booking.razorpay_payment_id.substring(0, 15)}...
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge ${
                            booking.status === 'confirmed'
                              ? 'badge-success'
                              : booking.status === 'pending'
                              ? 'badge-warning'
                              : booking.status === 'rejected'
                              ? 'badge-error'
                              : 'badge-secondary'
                          }`}
                        >
                          {booking.status}
                        </span>
                        {booking.status === 'confirmed' && booking.approvedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Approved: {formatDate(booking.approvedAt)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {booking.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(booking)}
                              className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
                              disabled={approveMutation.isLoading}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(booking)}
                              className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                              disabled={rejectMutation.isLoading}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                        {booking.status === 'rejected' && booking.rejectionReason && (
                          <p className="text-xs text-red-600">Reason: {booking.rejectionReason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Reject Booking</h3>
            <p className="text-gray-600 mb-4">
              Rejecting booking for <strong>{selectedBooking.guestDetails?.name}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input"
                rows="4"
                placeholder="Please provide a reason..."
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedBooking(null);
                  setRejectionReason('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                disabled={rejectMutation.isLoading || !rejectionReason.trim()}
                className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
              >
                Reject Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </MicrositeDashboardLayout>
  );
};
