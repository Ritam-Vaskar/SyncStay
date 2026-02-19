import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  MapPin, 
  Users, 
  Heart,
  Filter,
  X,
  Sparkles,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const BrowseEventsPage = () => {
  const { isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'active',
    location: ''
  });
  const [bookmarkedEvents, setBookmarkedEvents] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEvents();
    if (isAuthenticated) {
      fetchBookmarks();
    }
  }, [filters.type, filters.status, isAuthenticated]);

  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/activity/history?type=bookmark');
      const bookmarkIds = response.data.data.map(activity => activity.entityId._id || activity.entityId);
      setBookmarkedEvents(new Set(bookmarkIds));
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.type !== 'all') params.append('type', filters.type);
      
      const response = await api.get(`/events?${params.toString()}`);
      setEvents(response.data || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchEvents();
      return;
    }

    // Filter events locally
    const filtered = events.filter(event => 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Track search activity
    if (isAuthenticated && searchQuery.trim()) {
      try {
        await api.post('/activity/search', { 
          searchQuery: searchQuery.trim(),
          matchedEntityIds: filtered.map(e => e._id)
        });
      } catch (error) {
        console.error('Failed to track search:', error);
      }
    }

    setEvents(filtered);
  };

  const trackView = async (eventId) => {
    if (!isAuthenticated) return;
    try {
      await api.post('/activity/view', { entityId: eventId });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  };

  const handleBookmark = async (eventId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      alert('Please login to bookmark events');
      return;
    }

    try {
      const isBookmarked = bookmarkedEvents.has(eventId);
      
      // Optimistically update UI
      setBookmarkedEvents(prev => {
        const updated = new Set(prev);
        if (isBookmarked) {
          updated.delete(eventId);
        } else {
          updated.add(eventId);
        }
        return updated;
      });

      // Track bookmark activity (backend handles toggle)
      await api.post('/activity/bookmark', { entityId: eventId });
      
    } catch (error) {
      console.error('Failed to bookmark:', error);
      // Revert on error
      setBookmarkedEvents(prev => {
        const updated = new Set(prev);
        if (updated.has(eventId)) {
          updated.delete(eventId);
        } else {
          updated.add(eventId);
        }
        return updated;
      });
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    fetchEvents();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-2 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                StaySync
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-600 hover:text-primary-600 transition-colors">
                Home
              </Link>
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-primary-600 transition-colors">Login</Link>
                  <Link to="/register" className="btn btn-primary">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white py-12 mt-20">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl font-bold mb-2">Browse Events</h1>
          <p className="text-primary-100">Discover and book amazing events</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by name, location, or type..."
                className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary px-8">
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="btn bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="h-5 w-5" />
              Filters
            </button>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="conference">Conference</option>
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate</option>
                  <option value="social">Social</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="pending-approval">Pending</option>
                  <option value="all">All Status</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${events.length} event${events.length !== 1 ? 's' : ''} found`}
          </p>
          {isAuthenticated && (
            <Link to="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              View Personalized Recommendations
            </Link>
          )}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Events Found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
            <button onClick={clearSearch} className="btn btn-primary">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event._id}
                to={`/microsite/${event.micrositeConfig?.customSlug || event._id}`}
                onClick={() => trackView(event._id)}
                className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Event Image */}
                <div className="relative h-48 bg-gradient-to-br from-primary-400 to-purple-600">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 text-white text-xs font-bold rounded-full ${
                      event.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}>
                      {event.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => handleBookmark(event._id, e)}
                      className={`p-2 rounded-full transition-all ${
                        bookmarkedEvents.has(event._id)
                          ? 'bg-red-500 text-white'
                          : 'bg-white/90 text-gray-600 hover:bg-white'
                      }`}
                    >
                      <Heart 
                        className="h-5 w-5" 
                        fill={bookmarkedEvents.has(event._id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calendar className="h-20 w-20 text-white/30" />
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full capitalize">
                      {event.type || 'Event'}
                    </span>
                    {event.viewCount > 0 && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {event.viewCount}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                    {event.name}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 text-primary-600 flex-shrink-0" />
                      <span className="text-sm truncate">
                        {event.location?.city || 'TBD'}, {event.location?.country || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4 text-primary-600 flex-shrink-0" />
                      <span className="text-sm">
                        {formatDate(event.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4 text-primary-600 flex-shrink-0" />
                      <span className="text-sm">{event.expectedGuests || event.attendees || 0} guests</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
