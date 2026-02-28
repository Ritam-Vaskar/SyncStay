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
  Eye,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../services/api';

export const BrowseEventsPage = () => {
  const { isAuthenticated } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
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
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">StaySync</span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2">
                Home
              </Link>
              {isAuthenticated ? (
                <Link to="/dashboard" className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-2">Log in</Link>
                  <Link to="/register" className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Browse Events</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Discover and book amazing events</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 mb-7 shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events by name, location, or type..."
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Event Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="all">All Types</option>
                  <option value="conference">Conference</option>
                  <option value="wedding">Wedding</option>
                  <option value="corporate">Corporate</option>
                  <option value="social">Social</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="active">Active</option>
                  <option value="rfp-published">Published</option>
                  <option value="all">All Status</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading...' : `${events.length} event${events.length !== 1 ? 's' : ''} found`}
          </p>
          {isAuthenticated && (
            <Link to="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              View Personalized Recommendations
            </Link>
          )}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-1/3 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-6"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Events Found</h3>
            <p className="text-sm text-gray-500 mb-6">Try adjusting your search or filters</p>
            <button onClick={clearSearch} className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <Link
                key={event._id}
                to={`/microsite/${event.micrositeConfig?.customSlug || event._id}`}
                onClick={() => trackView(event._id)}
                className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-md transition-all duration-200 p-6 flex flex-col"
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      event.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {event.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full capitalize">
                      {event.type || 'Event'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleBookmark(event._id, e)}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                      bookmarkedEvents.has(event._id)
                        ? 'text-rose-500'
                        : 'text-gray-300 hover:text-gray-500'
                    }`}
                  >
                    <Heart
                      className="h-4 w-4"
                      fill={bookmarkedEvents.has(event._id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>

                {/* Title & description */}
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {event.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-5 flex-1">
                  {event.description || 'No description available.'}
                </p>

                {/* Meta info */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="text-xs truncate">
                      {event.location?.city || 'TBD'}{event.location?.country ? `, ${event.location.country}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                      <span className="text-xs">{formatDate(event.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Users className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-xs">{event.expectedGuests || event.attendees || 0} guests</span>
                    </div>
                  </div>
                  {event.viewCount > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Eye className="h-3 w-3" />
                      <span className="text-xs">{event.viewCount} views</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
