import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/services/apiServices';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate, formatDistanceDate } from '@/utils/helpers';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminEventsPage = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['admin-all-events'],
    queryFn: () => eventService.getAll(),
  });

  const allEvents = eventsData?.data || [];

  // Filter events
  let filteredEvents = allEvents;
  if (statusFilter !== 'all') {
    filteredEvents = allEvents.filter(e => e.status === statusFilter);
  }
  if (searchQuery.trim()) {
    filteredEvents = filteredEvents.filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.planner?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.city?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const stats = {
    total: allEvents.length,
    rfpPublished: allEvents.filter(p => p.status === 'rfp-published').length,
    reviewing: allEvents.filter(p => p.status === 'reviewing-proposals').length,
    active: allEvents.filter(p => p.status === 'active').length,
    completed: allEvents.filter(p => p.status === 'completed').length,
    rejected: allEvents.filter(p => p.status === 'rejected').length,
  };

  const getStatusBadge = (status) => {
    const badges = {
      'rfp-published': { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle, label: 'RFP Published' },
      'reviewing-proposals': { bg: 'bg-purple-100', text: 'text-purple-800', icon: Eye, label: 'Reviewing Proposals' },
      'active': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Active' },
      'completed': { bg: 'bg-gray-100', text: 'text-gray-800', icon: CheckCircle, label: 'Completed' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' },
      'cancelled': { bg: 'bg-gray-200', text: 'text-gray-900', icon: XCircle, label: 'Cancelled' },
    };
    return badges[status] || badges['rfp-published'];
  };

  const handleViewDetails = (event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const formatValue = (value, fallback = '—') => {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">All Events</h1>
        <p className="text-gray-600 mt-1">Manage and monitor all events in the system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-gray-600 text-sm">Total Events</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm">RFP Published</p>
          <p className="text-3xl font-bold text-blue-600">{stats.rfpPublished}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm">Active</p>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm">Completed</p>
          <p className="text-3xl font-bold text-gray-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by event name, planner, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <Filter className="h-5 w-5 text-gray-500 mt-3" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="rfp-published">RFP Published</option>
              <option value="reviewing-proposals">Reviewing Proposals</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const badge = getStatusBadge(event.status);
            const StatusIcon = badge.icon;

            return (
              <div key={event._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex flex-col lg:flex-row gap-6 p-4">
                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold">{event.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                            <StatusIcon className="h-3 w-3" />
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Planner:</strong> {event.planner?.name} • {event.planner?.email}
                        </p>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-gray-700 mb-4 text-sm line-clamp-2">{event.description}</p>
                    )}

                    {/* Quick Info Grid */}
                    <div className="grid md:grid-cols-4 gap-3 mb-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Event Dates</p>
                          <p className="font-medium">{formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Location</p>
                          <p className="font-medium">{event.location?.city}, {event.location?.country}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Expected Guests</p>
                          <p className="font-medium">{event.expectedGuests}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="text-gray-600">Budget</p>
                          <p className="font-medium">${formatValue(event.budget)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                        Type: {event.type}
                      </span>
                      {event.adminComments?.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                          {event.adminComments.length} feedback comment{event.adminComments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {event.isPrivate && (
                        <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                          Private Event
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 lg:w-40">
                    <button
                      onClick={() => handleViewDetails(event)}
                      className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">{selectedEvent.name}</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedEvent(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Event Details Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const badge = getStatusBadge(selectedEvent.status);
                    const Icon = badge.icon;
                    return (
                      <>
                        <Icon className="h-4 w-4" />
                        <span className="font-semibold capitalize">{badge.label}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Planner</p>
                <p className="text-lg font-semibold">{selectedEvent.planner?.name}</p>
                <p className="text-sm text-gray-600">{selectedEvent.planner?.email}</p>
              </div>

              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Event Dates</p>
                <p className="text-lg font-semibold">
                  {formatDate(selectedEvent.startDate)} - {formatDate(selectedEvent.endDate)}
                </p>
              </div>

              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-lg font-semibold">
                  {selectedEvent.location?.city}, {selectedEvent.location?.country}
                </p>
              </div>

              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Expected Guests</p>
                <p className="text-lg font-semibold">{selectedEvent.expectedGuests}</p>
              </div>

              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-lg font-semibold">${formatValue(selectedEvent.budget)}</p>
              </div>

              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-lg font-semibold capitalize">{selectedEvent.type}</p>
              </div>

              <div className="card bg-gray-50">
                <p className="text-xs text-gray-500">Booking Deadline</p>
                <p className="text-lg font-semibold">{formatDate(selectedEvent.bookingDeadline)}</p>
              </div>
            </div>

            {/* Description */}
            {selectedEvent.description && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-2">Description</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedEvent.description}</p>
              </div>
            )}

            {/* Admin Feedback */}
            {selectedEvent.adminComments && selectedEvent.adminComments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Feedback Comments ({selectedEvent.adminComments.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedEvent.adminComments.map((comment, idx) => (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{comment.commentedBy?.name || 'Admin'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.commentedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700">{comment.comment}</p>
                      {comment.replies?.length > 0 && (
                        <div className="mt-2 ml-3 border-l-2 border-green-300 pl-3 text-xs">
                          <p className="text-green-700 font-medium">{comment.replies.length} reply(ies) from planner</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
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
