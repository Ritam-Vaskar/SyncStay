import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/apiServices';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate, formatDistanceDate } from '@/utils/helpers';
import { CheckCircle, XCircle, Clock, ExternalLink, Calendar, MapPin, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

export const AdminApprovalsPage = () => {
  const { user } = useAuthStore();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const queryClient = useQueryClient();



  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', 'pending-approval'],
    queryFn: () => eventService.getAll({ status: 'pending-approval' }),
  });

  const approveMutation = useMutation({
    mutationFn: (eventId) => eventService.approve(eventId),
    onSuccess: (data) => {
      toast.success(`Event approved! Microsite: ${data.micrositeUrl}`);
      // Invalidate all event-related queries to refresh planner dashboards
      queryClient.invalidateQueries(['events']);
      queryClient.invalidateQueries(['planner-events']);
      queryClient.invalidateQueries(['planner-proposals']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to approve event');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ eventId, reason }) => eventService.reject(eventId, reason),
    onSuccess: () => {
      toast.success('Event rejected');
      // Invalidate all event-related queries to refresh planner dashboards
      queryClient.invalidateQueries(['events']);
      queryClient.invalidateQueries(['planner-events']);
      queryClient.invalidateQueries(['planner-proposals']);
      setShowRejectModal(false);
      setSelectedEvent(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reject event');
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ eventId, comment }) => eventService.addComment(eventId, comment),
    onSuccess: () => {
      toast.success('Comment added successfully. Planner has been notified.');
      // Invalidate all event-related queries
      queryClient.invalidateQueries(['events']);
      queryClient.invalidateQueries(['planner-events']);
      queryClient.invalidateQueries(['planner-proposals']);
      setShowCommentModal(false);
      setSelectedEvent(null);
      setAdminComment('');
    },
    onError: (error) => {
      console.error('❌ Comment error:', error);
      const message = error.message || 'Failed to add comment';
      if (message.includes('not authorized') || message.includes('403')) {
        toast.error('You need to be logged in as an admin. Current role: ' + (user?.role || 'unknown'));
      } else {
        toast.error(message);
      }
    },
  });

  const handleApprove = (event) => {
    if (window.confirm(`Approve "${event.name}" and publish microsite?`)) {
      approveMutation.mutate(event._id);
    }
  };

  const handleRejectClick = (event) => {
    setSelectedEvent(event);
    setShowRejectModal(true);
  };

  const handleCommentClick = (event) => {
    setSelectedEvent(event);
    setShowCommentModal(true);
  };

  const handlePreviewClick = (event) => {
    setSelectedEvent(event);
    setShowPreviewModal(true);
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectMutation.mutate({ eventId: selectedEvent._id, reason: rejectionReason });
  };

  const handleCommentSubmit = () => {
    if (!adminComment.trim()) {
      toast.error('Please provide a comment');
      return;
    }
    commentMutation.mutate({ eventId: selectedEvent._id, comment: adminComment });
  };

  const formatValue = (value, fallback = '—') => {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
  };

  const formatBoolean = (value) => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '—';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const pendingEvents = eventsData?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Event Approvals</h1>
          <p className="text-gray-600 mt-1">Review and approve events to publish microsites</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg">
          <Clock className="h-5 w-5" />
          <span className="font-semibold">{pendingEvents.length} Pending</span>
        </div>
      </div>



      {pendingEvents.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No events pending approval at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingEvents.map((event) => (
            <div key={event._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Event Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{event.name}</h3>
                      <span className="badge badge-warning">Pending Approval</span>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>Submitted {formatDistanceDate(event.createdAt)}</p>
                      <p className="font-medium text-gray-900">{event.planner?.name}</p>
                      {event.planner?.organization && (
                        <p className="text-gray-500">{event.planner.organization}</p>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{event.description}</p>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Event Dates</p>
                        <p className="font-medium">{formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Location</p>
                        <p className="font-medium">{event.location?.city}, {event.location?.country}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-gray-600">Booking Deadline</p>
                        <p className="font-medium">{formatDate(event.bookingDeadline)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      Type: {event.type}
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                      Expected Guests: {event.expectedGuests}
                    </span>
                    {event.micrositeConfig?.customSlug && (
                      <span className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-mono">
                        Slug: {event.micrositeConfig.customSlug}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 lg:w-48">
                  <button
                    onClick={() => handleApprove(event)}
                    disabled={approveMutation.isPending}
                    className="btn bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <CheckCircle className="h-5 w-5" /> Approve & Publish
                  </button>

                  <button
                    onClick={() => handleCommentClick(event)}
                    disabled={commentMutation.isPending}
                    className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Request Changes
                  </button>

                  <button
                    onClick={() => handleRejectClick(event)}
                    disabled={rejectMutation.isPending}
                    className="btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject
                  </button>

                  {event.micrositeConfig?.customSlug && (
                    <button
                      onClick={() => handlePreviewClick(event)}
                      className="btn btn-outline flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Preview
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Reject Event</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting <strong>{selectedEvent.name}</strong>
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="input mb-4"
              rows="4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedEvent(null);
                  setRejectionReason('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {showCommentModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Request Changes
            </h3>
            <p className="text-gray-600 mb-4">
              Provide feedback to the planner for <strong>{selectedEvent.name}</strong>. 
              They will be notified via email and can see your comments in their dashboard.
            </p>

            <textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Describe the changes you'd like the planner to make..."
              className="input mb-4"
              rows="5"
              autoFocus
            />

            <div className="bg-blue-50 border-l-4 border-blue-600 p-3 mb-4 rounded">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Be specific about what needs to be changed. The planner will receive an email notification and can view your feedback in their proposals dashboard.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedEvent(null);
                  setAdminComment('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={commentMutation.isPending || !adminComment.trim()}
                className="btn bg-blue-600 text-white hover:bg-blue-700 flex-1"
              >
                {commentMutation.isPending ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">Event Proposal Preview</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Event Name</p>
                <p className="text-lg font-semibold">{formatValue(selectedEvent.name)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Planner</p>
                <p className="text-lg font-semibold">{formatValue(selectedEvent.planner?.name)}</p>
                <p className="text-sm text-gray-600">{formatValue(selectedEvent.planner?.email)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Dates</p>
                <p className="text-lg font-semibold">
                  {formatDate(selectedEvent.startDate)} - {formatDate(selectedEvent.endDate)}
                </p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-lg font-semibold">
                  {formatValue(selectedEvent.location?.city)}, {formatValue(selectedEvent.location?.country)}
                </p>
                {selectedEvent.location?.venue && (
                  <p className="text-sm text-gray-600">{selectedEvent.location.venue}</p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Description</h4>
              <p className="text-gray-700">{formatValue(selectedEvent.description)}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Event Type</p>
                <p className="text-lg font-semibold capitalize">{formatValue(selectedEvent.type)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-lg font-semibold capitalize">{formatValue(selectedEvent.status)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Expected Guests</p>
                <p className="text-lg font-semibold">{formatValue(selectedEvent.expectedGuests)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Booking Deadline</p>
                <p className="text-lg font-semibold">{formatDate(selectedEvent.bookingDeadline)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-lg font-semibold">{formatValue(selectedEvent.budget)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-lg font-semibold">{formatValue(selectedEvent.totalRevenue)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Total Bookings</p>
                <p className="text-lg font-semibold">{formatValue(selectedEvent.totalBookings)}</p>
              </div>
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Private Event</p>
                <p className="text-lg font-semibold">{formatBoolean(selectedEvent.isPrivate)}</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Accommodation Needs</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card bg-gray-50">
                  <p className="text-xs text-gray-500">Total Rooms</p>
                  <p className="text-lg font-semibold">
                    {formatValue(selectedEvent.accommodationNeeds?.totalRooms)}
                  </p>
                </div>
                <div className="card bg-gray-50">
                  <p className="text-xs text-gray-500">Room Types</p>
                  <p className="text-sm text-gray-700">
                    Single: {formatValue(selectedEvent.accommodationNeeds?.roomTypes?.single)}
                  </p>
                  <p className="text-sm text-gray-700">
                    Double: {formatValue(selectedEvent.accommodationNeeds?.roomTypes?.double)}
                  </p>
                  <p className="text-sm text-gray-700">
                    Suite: {formatValue(selectedEvent.accommodationNeeds?.roomTypes?.suite)}
                  </p>
                </div>
                <div className="card bg-gray-50 md:col-span-2">
                  <p className="text-xs text-gray-500">Preferred Hotels</p>
                  <p className="text-sm text-gray-700">
                    {selectedEvent.accommodationNeeds?.preferredHotels?.length
                      ? selectedEvent.accommodationNeeds.preferredHotels.join(', ')
                      : '—'}
                  </p>
                </div>
                <div className="card bg-gray-50 md:col-span-2">
                  <p className="text-xs text-gray-500">Amenities Required</p>
                  <p className="text-sm text-gray-700">
                    {selectedEvent.accommodationNeeds?.amenitiesRequired?.length
                      ? selectedEvent.accommodationNeeds.amenitiesRequired.join(', ')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Additional Services</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card bg-gray-50">
                  <p className="text-xs text-gray-500">Transportation</p>
                  <p className="text-lg font-semibold">
                    {formatBoolean(selectedEvent.additionalServices?.transportation)}
                  </p>
                </div>
                <div className="card bg-gray-50">
                  <p className="text-xs text-gray-500">Catering</p>
                  <p className="text-lg font-semibold">
                    {formatBoolean(selectedEvent.additionalServices?.catering)}
                  </p>
                </div>
                <div className="card bg-gray-50">
                  <p className="text-xs text-gray-500">Other Services</p>
                  <p className="text-sm text-gray-700">
                    {formatValue(selectedEvent.additionalServices?.other)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Special Requirements</h4>
              <p className="text-gray-700">{formatValue(selectedEvent.specialRequirements)}</p>
            </div>

            {/* Admin Feedback/Comments */}
            {selectedEvent.adminComments && selectedEvent.adminComments.length > 0 && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3 text-blue-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Feedback Conversation ({selectedEvent.adminComments.length})
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {selectedEvent.adminComments.map((comment, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {comment.commentedBy?.name?.charAt(0).toUpperCase() || 'A'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {comment.commentedBy?.name || 'Admin'} (Your feedback)
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(comment.commentedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed pl-10">
                        {comment.comment}
                      </p>

                      {/* Planner Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 ml-8 pl-3 border-l-2 border-green-300 space-y-2">
                          {comment.replies.map((reply, replyIdx) => (
                            <div key={replyIdx} className="bg-green-50 rounded p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {reply.repliedBy?.name?.charAt(0).toUpperCase() || 'P'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-900">
                                    {reply.repliedBy?.name || 'Planner'} (Planner's reply)
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(reply.repliedAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-700 pl-8">
                                {reply.reply}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Audit Fields</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card bg-gray-50">
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="text-lg font-semibold">
                    {selectedEvent.createdAt ? formatDate(selectedEvent.createdAt) : '—'}
                  </p>
                </div>
                <div className="card bg-gray-50">
                  <p className="text-xs text-gray-500">Updated At</p>
                  <p className="text-lg font-semibold">
                    {selectedEvent.updatedAt ? formatDate(selectedEvent.updatedAt) : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedEvent(null);
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
