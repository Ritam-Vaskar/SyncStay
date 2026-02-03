import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Lock,
  UserCog
} from 'lucide-react';
import { eventService } from '@/services/apiServices';
import toast from 'react-hot-toast';

export const PlannerEventsPage = () => {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['planner-events'],
    queryFn: () => eventService.getAll(),
  });

  const events = eventsData?.data || [];

  const filteredEvents = events.filter(event => {
    if (statusFilter === 'all') return true;
    return event.status === statusFilter;
  });

  const getStatusConfig = (status) => {
    const configs = {
      'pending-approval': { 
        label: 'Pending Approval', 
        color: 'bg-yellow-100 text-yellow-800',
        icon: AlertCircle,
        iconColor: 'text-yellow-600'
      },
      'active': { 
        label: 'Active', 
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        iconColor: 'text-green-600'
      },
      'rejected': { 
        label: 'Rejected', 
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
        iconColor: 'text-red-600'
      },
      'completed': { 
        label: 'Completed', 
        color: 'bg-gray-100 text-gray-800',
        icon: CheckCircle,
        iconColor: 'text-gray-600'
      },
    };
    return configs[status] || configs['pending-approval'];
  };

  const copyMicrositeUrl = (slug) => {
    const url = `${window.location.origin}/microsite/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Microsite URL copied to clipboard!');
  };

  const stats = {
    total: events.length,
    pending: events.filter(e => e.status === 'pending-approval').length,
    active: events.filter(e => e.status === 'active').length,
    rejected: events.filter(e => e.status === 'rejected').length,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
          <p className="text-gray-600 mt-1">Manage your events and track their status</p>
        </div>
        <Link to="/planner/proposals/create" className="btn btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Event
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <Calendar className="h-12 w-12 text-primary-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Events</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.active}</p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
            </div>
            <XCircle className="h-12 w-12 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by status:</span>
          <div className="flex gap-2">
            {['all', 'pending-approval', 'active', 'rejected', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Found</h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === 'all' 
              ? "You haven't created any events yet. Start by creating a new event proposal."
              : `No events with status "${statusFilter.replace('-', ' ')}".`
            }
          </p>
          <Link to="/planner/proposals/create" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredEvents.map((event) => {
            const statusConfig = getStatusConfig(event.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={event._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{event.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                      {event.isPrivate && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 bg-purple-100 text-purple-800">
                          <Lock className="h-3 w-3" />
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{event.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Event Dates</p>
                      <p className="text-sm font-medium">
                        {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm font-medium">
                        {typeof event.location === 'string' 
                          ? event.location 
                          : event.location?.city 
                            ? `${event.location.city}, ${event.location.country || ''}` 
                            : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Expected Guests</p>
                      <p className="text-sm font-medium">{event.expectedGuests || 0}</p>
                    </div>
                  </div>
                </div>

                {event.bookingDeadline && (
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <Clock className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-xs text-gray-500">Booking Deadline</p>
                      <p className="text-sm font-medium">{new Date(event.bookingDeadline).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  {event.status === 'active' && event.micrositeUrl && (
                    <>
                      <Link
                        to={`/microsite/${event.micrositeUrl}`}
                        target="_blank"
                        className="btn btn-sm bg-primary-600 text-white hover:bg-primary-700 flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Microsite
                      </Link>
                      <button
                        onClick={() => copyMicrositeUrl(event.micrositeUrl)}
                        className="btn btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy URL
                      </button>
                      <Link
                        to={`/microsite/${event.micrositeUrl}/dashboard`}
                        className="btn btn-sm bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Event Dashboard
                      </Link>
                    </>
                  )}
                  
                  {event.status === 'pending-approval' && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 px-4 py-2 rounded-lg">
                      <AlertCircle className="h-5 w-5" />
                      <span>Waiting for admin approval</span>
                    </div>
                  )}

                  {event.status === 'rejected' && event.rejectionReason && (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-4 py-2 rounded-lg">
                      <XCircle className="h-5 w-5" />
                      <span><strong>Rejected:</strong> {event.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
