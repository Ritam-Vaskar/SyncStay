import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService, bookingService } from '@/services/apiServices';
import { MicrositeDashboardLayout } from '@/layouts/MicrositeDashboardLayout';
import { LoadingPage } from '@/components/LoadingSpinner';
import { Calendar, CheckCircle, Clock, XCircle, Search, Filter, DollarSign, CreditCard } from 'lucide-react';
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

  // Calculate total unpaid bookings for private events
  const totalUnpaid = event?.isPrivate
    ? allBookings
        .filter((b) => b.isPaidByPlanner && b.paymentStatus === 'unpaid')
        .reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0)
    : 0;

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
          amount: totalUnpaid,
          currency: 'INR',
          notes: {
            eventId: event._id,
            eventName: event.name,
            type: 'planner_bulk_payment'
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
        description: `Payment for ${event.name} - All Guest Bookings`,
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
              toast.success('Payment successful! All guest bookings confirmed.');
              queryClient.invalidateQueries(['microsite-bookings']);
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
          <div className="card bg-amber-50 border-2 border-amber-300">
            <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
              <div className="flex items-start gap-4">
                <div className="bg-amber-100 p-3 rounded-lg">
                  <CreditCard className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-900 mb-1">
                    Payment Required
                  </h3>
                  <p className="text-amber-700 text-sm mb-2">
                    Your guests have made bookings totaling{' '}
                    <span className="font-bold text-lg">{formatCurrency(totalUnpaid)}</span>
                  </p>
                  <p className="text-amber-600 text-sm">
                    Complete the payment to confirm all guest bookings and activate your event.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePayForBookings}
                disabled={isProcessingPayment}
                className="btn-primary whitespace-nowrap flex items-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                {isProcessingPayment ? 'Processing...' : `Pay ${formatCurrency(totalUnpaid)}`}
              </button>
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
