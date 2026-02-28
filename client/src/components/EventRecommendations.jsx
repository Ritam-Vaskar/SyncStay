import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Sparkles,
  Heart,
  Eye,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const EventRecommendations = () => {
  const { isAuthenticated, token } = useAuthStore();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedEvents, setBookmarkedEvents] = useState(new Set());
  const [isColdStart, setIsColdStart] = useState(false);

  useEffect(() => {
    fetchRecommendations();
    if (isAuthenticated && token) {
      fetchBookmarks();
    }
  }, [isAuthenticated, token]);

  const fetchBookmarks = async () => {
    try {
      const response = await api.get('/activity/history?type=bookmark');
      const bookmarkIds = response.data.data.map(activity => activity.entityId._id || activity.entityId);
      setBookmarkedEvents(new Set(bookmarkIds));
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      if (isAuthenticated && token) {
        // Authenticated user - get personalized recommendations
        const response = await api.get('/recommendations/user?limit=6');
        console.log('Raw recommendations response:', response);
        
        // API returns: { success, data: [events], coldStart }
        const eventList = response.data || [];
        console.log('Parsed event list:', eventList);
        
        // Transform events to recommendation format if they're plain event objects
        const formattedRecommendations = eventList.map(item => {
          // Check if already in recommendation format {event, score, reason}
          if (item.event) {
            return item;
          }
          // Otherwise it's a plain event object, wrap it
          return {
            event: item,
            score: item.recommendationScore || 0,
            reason: item.breakdown?.trending ? 'Trending now' : 'Recommended'
          };
        });
        
        setRecommendations(formattedRecommendations);
        setIsColdStart(response.coldStart || false);
      } else {
        // Guest user - show trending/active events
        const response = await api.get('/events?status=active&limit=6');
        console.log('Raw events response:', response);
        
        const events = response.data || [];
        console.log('Parsed events:', events);
        
        // Transform to match recommendation format
        setRecommendations(events.map(event => ({
          event,
          score: 0,
          reason: 'Popular event'
        })));
        setIsColdStart(true);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      console.error('Error details:', error.response?.data);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (eventId) => {
    if (!isAuthenticated || !token) return;
    
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

      // Track bookmark activity
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

  const handleEventClick = (eventId) => {
    trackView(eventId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <section className="py-20 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-4 animate-pulse"></div>
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-72 mx-auto mb-3 animate-pulse"></div>
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 animate-pulse">
                <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-4"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full mb-6"></div>
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0 && !loading) {
    return (
      <section className="py-20 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Events Available</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Check back soon for exciting events!</p>
          </div>
        </div>
      </section>
    );
  }

  const normalizeScore = (score) => {
    if (!score || score === 0) return 0;
    // If score is already a 0-1 decimal, use as-is; if it's 0-100 range, divide by 100
    return score > 1 ? Math.min(score / 100, 1) : score;
  };

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            {isColdStart ? 'Trending Events' : 'Personalized For You'}
          </div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {isColdStart ? 'Popular Events Right Now' : 'Recommended Just For You'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            {isColdStart
              ? 'Explore trending events. View and bookmark to unlock personalized picks.'
              : 'Based on your interests and activity, here are events you might love.'}
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {recommendations.filter(item => item && item.event).map(({ event, score, reason }) => {
            const pct = normalizeScore(score);
            return (
              <Link
                key={event._id}
                to={`/microsite/${event.micrositeConfig?.customSlug || event._id}`}
                onClick={() => handleEventClick(event._id)}
                className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-md transition-all duration-200 p-6 flex flex-col"
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isAuthenticated && pct > 0.8 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">
                        <Sparkles className="h-3 w-3" />
                        Best Match
                      </span>
                    )}
                    {isColdStart && (
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full">
                        Trending
                      </span>
                    )}
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      event.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
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
                      bookmarkedEvents.has(event._id) ? 'text-rose-500' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'
                    }`}
                  >
                    <Heart className="h-4 w-4" fill={bookmarkedEvents.has(event._id) ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {event.name}
                </h3>

                {/* Reason tag */}
                {!isColdStart && reason && (
                  <p className="text-xs text-indigo-500 flex items-center gap-1 mb-3">
                    <TrendingUp className="h-3 w-3" />
                    {reason}
                  </p>
                )}

                {/* Meta info */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-auto space-y-2">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="text-xs truncate">
                      {event.location?.city || 'Location TBD'}{event.location?.country ? `, ${event.location.country}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                      <span className="text-xs">{formatDate(event.startDate)} – {formatDate(event.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <Users className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-xs">{event.attendees || 0}</span>
                    </div>
                  </div>

                  {/* Match score bar */}
                  {!isColdStart && pct > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                        <span>Match</span>
                        <span className="font-semibold text-indigo-600">{Math.round(pct * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(pct * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA row */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                      View Details <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    {event.viewCount > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {event.viewCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Browse All Events
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
