import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/services/apiServices';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate } from '@/utils/helpers';
import { MessageSquare, ChevronDown, ChevronUp, Calendar, Users, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminFeedbackPage = () => {
  const [expandedEvents, setExpandedEvents] = useState({});

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['admin-all-events'],
    queryFn: () => eventService.getAll(),
  });

  // Filter events that have admin comments
  const eventsWithComments = (eventsData?.data || [])
    .filter(event => event.adminComments && event.adminComments.length > 0)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const toggleEvent = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Event Feedback Conversations</h1>
        <p className="text-gray-600 mt-1">View all feedback conversations between admin and planners</p>
      </div>

      {eventsWithComments.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Conversations Yet</h3>
          <p className="text-gray-600">No events have feedback comments at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {eventsWithComments.map((event) => (
            <div key={event._id} className="card">
              {/* Event Header */}
              <button
                onClick={() => toggleEvent(event._id)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{event.name}</h3>
                      <span className={`badge text-xs font-medium ${
                        event.status === 'pending-approval' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'rfp-published' ? 'bg-blue-100 text-blue-800' :
                        event.status === 'reviewing-proposals' ? 'bg-purple-100 text-purple-800' :
                        event.status === 'active' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location?.city}, {event.location?.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{event.expectedGuests} guests</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">
                        <strong>Planner:</strong> {event.planner?.name} ({event.planner?.email})
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      <MessageSquare className="h-4 w-4" />
                      {event.adminComments.length} comment{event.adminComments.length !== 1 ? 's' : ''}
                    </div>
                    {expandedEvents[event._id] ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </button>

              {/* Conversation Thread */}
              {expandedEvents[event._id] && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-4">
                    {event.adminComments.map((comment, idx) => (
                      <div key={idx} className="space-y-3">
                        {/* Admin Comment */}
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-sm font-semibold">
                                {comment.commentedBy?.name?.charAt(0).toUpperCase() || 'A'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-blue-900">
                                  {comment.commentedBy?.name || 'Admin'} (Admin)
                                </p>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  Admin
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
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
                          <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                            {comment.comment}
                          </p>
                        </div>

                        {/* Planner Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-6 space-y-3">
                            {comment.replies.map((reply, replyIdx) => (
                              <div key={replyIdx} className="bg-white rounded-lg p-4 border border-green-200">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-sm font-semibold">
                                      {reply.repliedBy?.name?.charAt(0).toUpperCase() || 'P'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-green-900">
                                        {reply.repliedBy?.name || 'Planner'} (Planner)
                                      </p>
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                        Planner
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
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
                                <p className="text-sm text-gray-700 bg-green-50 p-3 rounded border-l-4 border-green-500">
                                  {reply.reply}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* No Replies Yet */}
                        {(!comment.replies || comment.replies.length === 0) && (
                          <div className="ml-6 text-xs text-gray-500 italic py-2">
                            No reply from planner yet
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
